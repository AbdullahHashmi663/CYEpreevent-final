create table if not exists public.cye_access_codes (
  admin_id uuid not null references public.cye_admin_users(id) on delete cascade,
  purpose text not null check (purpose in ('login','reset')),
  challenge_id uuid not null unique,
  code_hash text not null,
  password_hash_at_issue text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (admin_id,purpose)
);
alter table public.cye_access_codes enable row level security;
revoke all on table public.cye_access_codes from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on table public.cye_access_codes from %I',role_name);
    end if;
  end loop;
end $$;
