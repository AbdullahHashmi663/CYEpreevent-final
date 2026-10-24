create table if not exists public.cye_partner_speech_languages (
  id uuid primary key,
  participant_email text not null,
  language text not null check (language in ('Urdu', 'English')),
  partner_registration_id bigint unique,
  state text not null default 'pending' check (state in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.cye_partner_speech_languages enable row level security;
revoke all on public.cye_partner_speech_languages from public;
do $$ declare role_name text; begin
  foreach role_name in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on public.cye_partner_speech_languages from %I',role_name);
    end if;
  end loop;
end $$;
create index if not exists cye_partner_speech_pending on public.cye_partner_speech_languages(created_at desc) where state='pending';
