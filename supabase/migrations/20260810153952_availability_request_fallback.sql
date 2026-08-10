create table if not exists public.availability_requests (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  items jsonb not null,
  status text not null default 'pending' check (status in ('pending','reviewing','contacted','closed','cancelled')),
  source text not null default 'telegram_mini_app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_requests_items_array check (jsonb_typeof(items) = 'array'),
  constraint availability_requests_items_count check (jsonb_array_length(items) between 1 and 20)
);

alter table public.availability_requests enable row level security;
revoke all on table public.availability_requests from anon, authenticated;

create index if not exists availability_requests_user_created_idx
  on public.availability_requests (telegram_user_id, created_at desc);
create index if not exists availability_requests_status_created_idx
  on public.availability_requests (status, created_at desc);

drop trigger if exists availability_requests_touch_updated_at on public.availability_requests;
create trigger availability_requests_touch_updated_at
before update on public.availability_requests
for each row execute function public.touch_updated_at();

create or replace function public.create_availability_request(
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_telegram_first_name text,
  p_telegram_last_name text,
  p_items jsonb
)
returns table(request_id uuid, request_status text, request_created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.availability_requests%rowtype;
  v_new public.availability_requests%rowtype;
begin
  if p_telegram_user_id is null or p_telegram_user_id <= 0 then
    raise exception 'invalid_telegram_user';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception 'invalid_items';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    where coalesce(e->>'sku','') !~ '^[A-Z0-9-]{2,40}$'
       or coalesce(e->>'size','') !~ '^[A-Z0-9+._-]{1,16}$'
       or coalesce(e->>'quantity','') !~ '^[1-9][0-9]?$'
       or (e->>'quantity')::int > 10
  ) then
    raise exception 'invalid_item';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) e
    left join public.products p on p.sku = e->>'sku' and p.active = true
    left join public.product_variants v on v.product_id = p.id and v.size = e->>'size' and v.enabled = true
    where p.id is null or v.id is null
  ) then
    raise exception 'unknown_product_or_variant';
  end if;

  select * into v_existing
  from public.availability_requests
  where telegram_user_id = p_telegram_user_id
    and items = p_items
    and status in ('pending','reviewing')
    and created_at > now() - interval '10 minutes'
  order by created_at desc
  limit 1;

  if found then
    return query select v_existing.id, v_existing.status, v_existing.created_at;
    return;
  end if;

  insert into public.availability_requests(
    telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, items
  ) values (
    p_telegram_user_id,
    nullif(left(coalesce(p_telegram_username,''),64),''),
    nullif(left(coalesce(p_telegram_first_name,''),128),''),
    nullif(left(coalesce(p_telegram_last_name,''),128),''),
    p_items
  ) returning * into v_new;

  return query select v_new.id, v_new.status, v_new.created_at;
end;
$$;

revoke all on function public.create_availability_request(bigint,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_availability_request(bigint,text,text,text,jsonb) to service_role;
