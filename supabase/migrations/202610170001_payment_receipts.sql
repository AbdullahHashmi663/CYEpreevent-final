create table if not exists public.cye_payment_receipts (
  application_id uuid primary key references public.cye_applications(id) on delete cascade,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  bytes bytea not null check (octet_length(bytes) between 1 and 2097152),
  created_at timestamptz not null default now()
);
alter table public.cye_payment_receipts enable row level security;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on table public.cye_payment_receipts from %I',role_name);
    end if;
  end loop;
end $$;
