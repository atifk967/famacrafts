-- ============================================================
-- Famacrafts — Admin allowlist + owner approval + AAL2 (MFA) enforcement
-- ------------------------------------------------------------
-- Replaces the single hard-coded admin email with a data-driven allowlist.
-- Only the OWNER can add/remove admins. Every write requires a two-factor
-- (AAL2) session, so a stolen password alone cannot change anything. Public
-- sign-up stays disabled — invitation (via the admin-invite edge function) is
-- the only way in.
--
-- Helper functions live in a PRIVATE schema so they are NOT reachable as
-- /rest/v1/rpc endpoints, while RLS can still call them.
--
-- Safe to re-run: applies as one transaction; a failure rolls back cleanly.
-- ============================================================

-- 1. Allowlist / team table -------------------------------------------------
create table if not exists public.app_admins (
  email       text primary key check (email = lower(email)),
  role        text        not null default 'admin'    check (role   in ('owner','admin')),
  status      text        not null default 'pending'  check (status in ('pending','approved','revoked')),
  invited_by  text,
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  updated_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  revoked_by  text
);
alter table public.app_admins add column if not exists updated_at timestamptz not null default now();
alter table public.app_admins add column if not exists revoked_at timestamptz;
alter table public.app_admins add column if not exists revoked_by text;

alter table public.app_admins enable row level security;

-- Seed the real owner (idempotent). This is the master account.
insert into public.app_admins (email, role, status, approved_at)
values ('famacrafts@gmail.com', 'owner', 'approved', now())
on conflict (email) do update set role = 'owner', status = 'approved';


-- 2. Private schema + RLS helper functions ----------------------------------
--    SECURITY DEFINER → run as owner → bypass RLS → no recursion on app_admins.
--    In a private (non-API) schema → not exposed as RPC.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

create or replace function private.is_approved_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(nullif(auth.jwt() ->> 'email', '')) and a.status = 'approved'
  );
$$;

create or replace function private.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_admins a
    where a.email = lower(nullif(auth.jwt() ->> 'email', '')) and a.role = 'owner' and a.status = 'approved'
  );
$$;

create or replace function private.is_aal2()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

grant execute on function private.is_approved_admin() to anon, authenticated;
grant execute on function private.is_owner()          to anon, authenticated;
grant execute on function private.is_aal2()           to anon, authenticated;


-- 3. Owner self-lockout protection + audit trail ----------------------------
create or replace function private.app_admins_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then raise exception 'The owner account cannot be deleted'; end if;
    return old;
  end if;
  if old.role = 'owner' and (new.role <> 'owner' or new.status <> 'approved') then
    raise exception 'The owner account cannot be demoted or revoked';
  end if;
  new.updated_at := now();
  if new.status = 'revoked' and old.status is distinct from 'revoked' then
    new.revoked_at := now();
    new.revoked_by := lower(nullif(auth.jwt() ->> 'email', ''));
  elsif new.status <> 'revoked' then
    new.revoked_at := null;
    new.revoked_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_owner    on public.app_admins;
drop trigger if exists trg_app_admins_guard on public.app_admins;
create trigger trg_app_admins_guard
  before update or delete on public.app_admins
  for each row execute function private.app_admins_guard();


-- 4. RLS on the allowlist — view = any approved admin; change = owner @ AAL2 --
drop policy if exists app_admins_select on public.app_admins;
drop policy if exists app_admins_insert on public.app_admins;
drop policy if exists app_admins_update on public.app_admins;
drop policy if exists app_admins_delete on public.app_admins;
create policy app_admins_select on public.app_admins for select using (private.is_approved_admin());
create policy app_admins_insert on public.app_admins for insert with check (private.is_owner() and private.is_aal2());
create policy app_admins_update on public.app_admins for update using (private.is_owner() and private.is_aal2()) with check (private.is_owner() and private.is_aal2());
create policy app_admins_delete on public.app_admins for delete using (private.is_owner() and private.is_aal2());


-- 5. Catalog write policies → approved admin + AAL2 -------------------------
drop policy if exists admin_insert_products on public.products;
drop policy if exists admin_update_products on public.products;
drop policy if exists admin_delete_products on public.products;
create policy admin_insert_products on public.products for insert with check (private.is_approved_admin() and private.is_aal2());
create policy admin_update_products on public.products for update using (private.is_approved_admin() and private.is_aal2()) with check (private.is_approved_admin() and private.is_aal2());
create policy admin_delete_products on public.products for delete using (private.is_approved_admin() and private.is_aal2());

drop policy if exists admin_insert_workshops on public.workshops;
drop policy if exists admin_update_workshops on public.workshops;
drop policy if exists admin_delete_workshops on public.workshops;
create policy admin_insert_workshops on public.workshops for insert with check (private.is_approved_admin() and private.is_aal2());
create policy admin_update_workshops on public.workshops for update using (private.is_approved_admin() and private.is_aal2()) with check (private.is_approved_admin() and private.is_aal2());
create policy admin_delete_workshops on public.workshops for delete using (private.is_approved_admin() and private.is_aal2());


-- 6. Storage policies → approved admin + AAL2 -------------------------------
drop policy if exists admin_read_images   on storage.objects;
drop policy if exists admin_upload_images on storage.objects;
drop policy if exists admin_delete_images on storage.objects;
create policy admin_read_images on storage.objects for select using (bucket_id = 'product-images' and private.is_approved_admin() and private.is_aal2());
create policy admin_upload_images on storage.objects for insert with check (bucket_id = 'product-images' and private.is_approved_admin() and private.is_aal2());
create policy admin_delete_images on storage.objects for delete using (bucket_id = 'product-images' and private.is_approved_admin() and private.is_aal2());

-- NOTE: public_read_products / public_read_workshops (SELECT using true) stay
-- in place so the public site keeps working. Reads never require AAL2.
