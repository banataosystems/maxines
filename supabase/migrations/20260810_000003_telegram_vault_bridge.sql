create or replace function public.maxines_get_telegram_bot_token()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'TELEGRAM_BOT_API'
  limit 1;
$$;

revoke all on function public.maxines_get_telegram_bot_token() from public, anon, authenticated;
grant execute on function public.maxines_get_telegram_bot_token() to service_role;
