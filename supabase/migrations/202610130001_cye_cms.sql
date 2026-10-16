-- Additive CYE schema. Never drops or replaces existing project tables.
create table if not exists public.cye_site_settings (
  id boolean primary key default true check (id),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.cye_content (
  id text primary key,
  kind text not null check (kind in ('conferences','speakers','team','contests','sponsors')),
  data jsonb not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cye_content_kind_idx on public.cye_content (kind, deleted_at);
create table if not exists public.cye_admin_users (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  must_change_password boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.cye_admin_sessions (
  token_hash text primary key,
  admin_id uuid not null references public.cye_admin_users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists cye_sessions_expiry_idx on public.cye_admin_sessions (expires_at);
create table if not exists public.cye_applications (
  id uuid primary key,
  reference text not null unique,
  kind text not null check (kind in ('contest','conference','ambassador','contact')),
  entry_id text references public.cye_content(id),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cye_applications_status_idx on public.cye_applications (status, deleted_at, created_at desc);
create index if not exists cye_applications_entry_idx on public.cye_applications (entry_id, status) where deleted_at is null;
create unique index if not exists cye_application_duplicate_idx on public.cye_applications (lower(payload->>'email'), kind, coalesce(entry_id,'')) where deleted_at is null and kind <> 'contact';
create table if not exists public.cye_rate_limits (
  bucket text primary key,
  count integer not null default 1,
  resets_at timestamptz not null
);
create table if not exists public.cye_media (
  id uuid primary key,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  bytes bytea not null check (octet_length(bytes) between 1 and 2097152),
  admin_id uuid not null references public.cye_admin_users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.cye_audit (
  id uuid primary key,
  action text not null,
  target_id text not null,
  admin_email text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cye_audit_created_idx on public.cye_audit (created_at desc);
-- Data API clients receive no access. The trusted Next.js server uses PostgreSQL.
alter table public.cye_site_settings enable row level security;
alter table public.cye_content enable row level security;
alter table public.cye_admin_users enable row level security;
alter table public.cye_admin_sessions enable row level security;
alter table public.cye_applications enable row level security;
alter table public.cye_rate_limits enable row level security;
alter table public.cye_media enable row level security;
alter table public.cye_audit enable row level security;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('revoke all on table public.cye_site_settings, public.cye_content, public.cye_admin_users, public.cye_admin_sessions, public.cye_applications, public.cye_rate_limits, public.cye_media, public.cye_audit from %I', role_name);
    end if;
  end loop;
end $$;
