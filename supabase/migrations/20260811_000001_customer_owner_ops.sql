create table if not exists public.user_favorites (
  telegram_user_id bigint not null,
  sku text not null references public.products(sku) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (telegram_user_id, sku)
);

create table if not exists public.staff_users (
  telegram_user_id bigint primary key,
  role text not null check (role in ('owner','admin','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_telegram_user_id bigint,
  actor_role text,
  event_name text not null check (event_name ~ '^[a-z0-9_]{3,80}$'),
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_favorites_user_created_idx on public.user_favorites(telegram_user_id, created_at desc);
create index if not exists audit_events_created_idx on public.audit_events(created_at desc);
create index if not exists audit_events_actor_created_idx on public.audit_events(actor_telegram_user_id, created_at desc);

alter table public.user_favorites enable row level security;
alter table public.staff_users enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.user_favorites from public, anon, authenticated;
revoke all on public.staff_users from public, anon, authenticated;
revoke all on public.audit_events from public, anon, authenticated;

create or replace function public.maxines_record_audit(
  p_actor_telegram_user_id bigint,
  p_actor_role text,
  p_event_name text,
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id bigint;
begin
  if p_event_name is null or p_event_name !~ '^[a-z0-9_]{3,80}$' then raise exception 'invalid_event_name'; end if;
  insert into public.audit_events(actor_telegram_user_id,actor_role,event_name,entity_type,entity_id,metadata)
  values(p_actor_telegram_user_id,nullif(left(coalesce(p_actor_role,''),32),''),p_event_name,nullif(left(coalesce(p_entity_type,''),64),''),nullif(left(coalesce(p_entity_id,''),128),''),coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.maxines_record_audit(bigint,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.maxines_record_audit(bigint,text,text,text,text,jsonb) to service_role;

drop trigger if exists staff_users_touch_updated_at on public.staff_users;
create trigger staff_users_touch_updated_at before update on public.staff_users for each row execute function public.touch_updated_at();
