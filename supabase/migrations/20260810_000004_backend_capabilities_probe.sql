create or replace function public.maxines_backend_capabilities()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
  select jsonb_build_object(
    'telegram_bot_configured', exists(select 1 from vault.secrets where name='TELEGRAM_BOT_API'),
    'payment_provider_configured', exists(select 1 from vault.secrets where name in ('TELEGRAM_PAYMENT_PROVIDER_TOKEN','MAXINES_PAYMENT_PROVIDER_TOKEN')),
    'webhook_secret_configured', exists(select 1 from vault.secrets where name='MAXINES_TELEGRAM_WEBHOOK_SECRET')
  );
$$;

revoke all on function public.maxines_backend_capabilities() from public, anon, authenticated;
grant execute on function public.maxines_backend_capabilities() to service_role;
