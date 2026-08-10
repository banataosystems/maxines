do $$
begin
  if not exists (select 1 from vault.secrets where name = 'MAXINES_TELEGRAM_WEBHOOK_SECRET') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'MAXINES_TELEGRAM_WEBHOOK_SECRET', 'MAXINES Telegram webhook verification secret');
  end if;
end $$;

create or replace function public.maxines_get_telegram_webhook_secret()
returns text
language sql
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'MAXINES_TELEGRAM_WEBHOOK_SECRET'
  limit 1;
$$;

revoke all on function public.maxines_get_telegram_webhook_secret() from public, anon, authenticated;
grant execute on function public.maxines_get_telegram_webhook_secret() to service_role;
