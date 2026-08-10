create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null,
  display_price numeric(14,2) not null check (display_price >= 0),
  display_currency text not null,
  tag text,
  description text,
  image_url text not null,
  source_verified boolean not null default false,
  checkout_enabled boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size)
);

create table if not exists public.payment_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  unit_amount bigint not null check (unit_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, currency)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  status text not null default 'pending' check (status in ('pending','authorized','paid','cancelled','failed')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  subtotal_amount bigint not null default 0 check (subtotal_amount >= 0),
  shipping_amount bigint not null default 0 check (shipping_amount >= 0),
  total_amount bigint not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.product_variants(id),
  sku text not null,
  size text not null,
  quantity integer not null check (quantity > 0 and quantity <= 10),
  unit_amount bigint not null check (unit_amount >= 0),
  line_amount bigint generated always as (unit_amount * quantity) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','consumed','released','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, variant_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  telegram_payment_charge_id text not null unique,
  provider_payment_charge_id text,
  currency text not null,
  total_amount bigint not null check (total_amount >= 0),
  raw_payment jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_variants_product on public.product_variants(product_id);
create index if not exists idx_prices_product_currency on public.payment_prices(product_id, currency) where active;
create index if not exists idx_orders_user_created on public.orders(telegram_user_id, created_at desc);
create index if not exists idx_reservations_variant_active on public.inventory_reservations(variant_id, expires_at) where status = 'active';

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger trg_products_updated before update on public.products for each row execute function public.touch_updated_at();
create or replace trigger trg_variants_updated before update on public.product_variants for each row execute function public.touch_updated_at();
create or replace trigger trg_prices_updated before update on public.payment_prices for each row execute function public.touch_updated_at();
create or replace trigger trg_orders_updated before update on public.orders for each row execute function public.touch_updated_at();
create or replace trigger trg_reservations_updated before update on public.inventory_reservations for each row execute function public.touch_updated_at();

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.payment_prices enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.payments enable row level security;

create or replace function public.expire_inventory_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.inventory_reservations
  set status = 'expired', updated_at = now()
  where status = 'active' and expires_at <= now();
  get diagnostics v_count = row_count;

  update public.orders o
  set status = 'cancelled', updated_at = now()
  where o.status = 'pending'
    and exists (
      select 1 from public.inventory_reservations r
      where r.order_id = o.id and r.status = 'expired'
    );
  return v_count;
end;
$$;

create or replace function public.create_checkout_order(
  p_telegram_user_id bigint,
  p_currency text,
  p_items jsonb,
  p_shipping_amount bigint default 0
)
returns table(order_id uuid, subtotal_amount bigint, shipping_amount bigint, total_amount bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_sku text;
  v_size text;
  v_qty integer;
  v_product_id uuid;
  v_variant_id uuid;
  v_stock integer;
  v_reserved integer;
  v_available integer;
  v_unit_amount bigint;
  v_subtotal bigint := 0;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0 then raise exception 'Invalid Telegram user'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'Invalid payment currency'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Your bag is empty'; end if;
  if jsonb_array_length(p_items) > 20 then raise exception 'Too many line items'; end if;
  if p_shipping_amount < 0 then raise exception 'Invalid shipping amount'; end if;

  perform public.expire_inventory_reservations();
  insert into public.orders(id, telegram_user_id, status, currency, shipping_amount)
  values(v_order_id, p_telegram_user_id, 'pending', p_currency, p_shipping_amount);

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_sku := upper(trim(v_item->>'sku'));
    v_size := upper(trim(coalesce(v_item->>'size', 'OS')));
    v_qty := (v_item->>'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 10 then raise exception 'Invalid quantity for %', v_sku; end if;

    select p.id, pv.id, pv.stock, pp.unit_amount
      into v_product_id, v_variant_id, v_stock, v_unit_amount
    from public.products p
    join public.product_variants pv on pv.product_id = p.id
    join public.payment_prices pp on pp.product_id = p.id
    where p.sku = v_sku and upper(pv.size) = v_size and p.active = true and p.checkout_enabled = true
      and pv.enabled = true and pp.active = true and pp.currency = p_currency
    for update of pv;

    if v_product_id is null then raise exception 'Product, variant, or payment price is not configured for live checkout: % / %', v_sku, v_size; end if;

    select coalesce(sum(r.quantity), 0)::integer into v_reserved
    from public.inventory_reservations r
    where r.variant_id = v_variant_id and r.status = 'active' and r.expires_at > now();

    v_available := v_stock - v_reserved;
    if v_available < v_qty then raise exception 'Insufficient stock for % / %', v_sku, v_size; end if;

    insert into public.order_items(order_id, product_id, variant_id, sku, size, quantity, unit_amount)
    values(v_order_id, v_product_id, v_variant_id, v_sku, v_size, v_qty, v_unit_amount);
    insert into public.inventory_reservations(order_id, variant_id, quantity, status, expires_at)
    values(v_order_id, v_variant_id, v_qty, 'active', now() + interval '15 minutes');
    v_subtotal := v_subtotal + (v_unit_amount * v_qty);
  end loop;

  update public.orders set subtotal_amount=v_subtotal, shipping_amount=p_shipping_amount,
    total_amount=v_subtotal+p_shipping_amount, updated_at=now() where id=v_order_id;
  return query select v_order_id, v_subtotal, p_shipping_amount, v_subtotal + p_shipping_amount;
end;
$$;

create or replace function public.cancel_checkout_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  update public.inventory_reservations set status='released', updated_at=now() where order_id=p_order_id and status='active';
  update public.orders set status='cancelled', updated_at=now() where id=p_order_id and status in ('pending','authorized');
  return true;
end;
$$;

create or replace function public.validate_precheckout(p_order_id uuid,p_currency text,p_total_amount bigint)
returns table(ok boolean,reason text) language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_bad integer;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then return query select false,'Order not found'; return; end if;
  if v_order.status not in ('pending','authorized') then return query select false,'Order is no longer payable'; return; end if;
  if v_order.currency<>p_currency or v_order.total_amount<>p_total_amount then return query select false,'Payment amount changed; reopen checkout'; return; end if;
  select count(*)::integer into v_bad from public.inventory_reservations r where r.order_id=p_order_id and (r.status<>'active' or r.expires_at<=now());
  if v_bad>0 or not exists(select 1 from public.inventory_reservations r where r.order_id=p_order_id) then
    perform public.cancel_checkout_order(p_order_id); return query select false,'Inventory reservation expired'; return;
  end if;
  update public.orders set status='authorized',updated_at=now() where id=p_order_id;
  update public.inventory_reservations set expires_at=greatest(expires_at,now()+interval '10 minutes'),updated_at=now() where order_id=p_order_id and status='active';
  return query select true,''::text;
end;
$$;

create or replace function public.complete_order_payment(p_order_id uuid,p_currency text,p_total_amount bigint,p_telegram_charge_id text,p_provider_charge_id text,p_raw_payment jsonb)
returns table(order_id uuid,status text) language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_res record; v_existing uuid;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status='paid' then return query select v_order.id,v_order.status; return; end if;
  if v_order.status not in ('pending','authorized') then raise exception 'Order is not payable'; end if;
  if v_order.currency<>p_currency or v_order.total_amount<>p_total_amount then raise exception 'Payment amount mismatch'; end if;
  if coalesce(p_telegram_charge_id,'')='' then raise exception 'Missing Telegram payment charge id'; end if;
  select p.id into v_existing from public.payments p where p.telegram_payment_charge_id=p_telegram_charge_id;
  if v_existing is not null then return query select v_order.id,v_order.status; return; end if;
  for v_res in select r.id,r.variant_id,r.quantity from public.inventory_reservations r where r.order_id=p_order_id and r.status='active' order by r.variant_id
  loop
    perform 1 from public.product_variants pv where pv.id=v_res.variant_id and pv.stock>=v_res.quantity for update;
    if not found then raise exception 'Inventory changed before payment finalization'; end if;
    update public.product_variants set stock=stock-v_res.quantity,updated_at=now() where id=v_res.variant_id;
    update public.inventory_reservations set status='consumed',updated_at=now() where id=v_res.id;
  end loop;
  if not exists(select 1 from public.inventory_reservations r where r.order_id=p_order_id and r.status='consumed') then raise exception 'No active inventory reservation found'; end if;
  insert into public.payments(order_id,telegram_payment_charge_id,provider_payment_charge_id,currency,total_amount,raw_payment)
  values(p_order_id,p_telegram_charge_id,nullif(p_provider_charge_id,''),p_currency,p_total_amount,coalesce(p_raw_payment,'{}'::jsonb));
  update public.orders set status='paid',paid_at=now(),updated_at=now() where id=p_order_id;
  return query select p_order_id,'paid'::text;
end;
$$;

revoke all on function public.create_checkout_order(bigint,text,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.cancel_checkout_order(uuid) from public,anon,authenticated;
revoke all on function public.validate_precheckout(uuid,text,bigint) from public,anon,authenticated;
revoke all on function public.complete_order_payment(uuid,text,bigint,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.expire_inventory_reservations() from public,anon,authenticated;
grant execute on function public.create_checkout_order(bigint,text,jsonb,bigint) to service_role;
grant execute on function public.cancel_checkout_order(uuid) to service_role;
grant execute on function public.validate_precheckout(uuid,text,bigint) to service_role;
grant execute on function public.complete_order_payment(uuid,text,bigint,text,text,jsonb) to service_role;
grant execute on function public.expire_inventory_reservations() to service_role;
