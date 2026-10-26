-- Additive indexes for bounded admin pages, exports, queues and session revocation.
-- No new tables, functions or authorization changes.
create index if not exists cye_applications_created_id_idx
  on public.cye_applications (created_at desc, id desc);
create index if not exists cye_applications_active_created_idx
  on public.cye_applications (created_at desc, id desc) where deleted_at is null;
create index if not exists cye_applications_pending_created_idx
  on public.cye_applications (created_at desc, id desc) where deleted_at is null and status='pending';
create index if not exists cye_applications_archived_created_idx
  on public.cye_applications (created_at desc, id desc) where deleted_at is not null;
create index if not exists cye_sessions_admin_idx on public.cye_admin_sessions (admin_id);
