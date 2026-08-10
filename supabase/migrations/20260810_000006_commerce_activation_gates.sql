create table if not exists public.commerce_settings (
  singleton boolean primary key default true check (singleton),
  checkout_release_authorized boolean not null default false,
  payment_currency text check (payment_currency is null or payment_currency ~ '^[A-Z]{3}$'),
  flat_shipping_amount bigint check (flat_shipping_amount is null or flat_shipping_amount >= 0),
  approved_at timestamptz,
  approval_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commerce_settings enable row level security;
insert into public.commerce_settings(singleton, checkout_release_authorized, payment_currency, flat_shipping_amount)
values(true,false,null,null)
on conflict(singleton) do nothing;

create or replace function public.maxines_get_payment_provider_token()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name in ('TELEGRAM_PAYMENT_PROVIDER_TOKEN','MAXINES_PAYMENT_PROVIDER_TOKEN')
  order by case name when 'MAXINES_PAYMENT_PROVIDER_TOKEN' then 0 else 1 end
  limit 1;
$$;

revoke all on function public.maxines_get_payment_provider_token() from public, anon, authenticated;
grant execute on function public.maxines_get_payment_provider_token() to service_role;
