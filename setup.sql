-- ============================================================
-- Famacrafts — Supabase Setup SQL
-- Paste this entire file into:
--   supabase.com → Your Project → SQL Editor → New Query → Run
-- ============================================================
-- Security model:
--   • A data-driven ADMIN ALLOWLIST (public.app_admins) decides who can edit.
--   • Only the OWNER can add/remove admins (master approval rights).
--   • Every write requires a two-factor (AAL2) session — a stolen password
--     alone can change nothing.
--   • Public sign-up must stay DISABLED (Authentication → Providers). The only
--     way to add an admin is the owner's invitation (admin-invite edge fn).
-- ============================================================


-- ── Products table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT        UNIQUE NOT NULL,
  name          TEXT        NOT NULL,
  tagline       TEXT        DEFAULT '',
  description   TEXT        DEFAULT '',
  category      TEXT        DEFAULT '',
  image_url     TEXT        DEFAULT '',          -- primary/cover image (= images[0])
  images        TEXT[]      NOT NULL DEFAULT '{}', -- all images for the product carousel
  tags          TEXT[]      DEFAULT '{}',
  available     BOOLEAN     DEFAULT true,
  featured      BOOLEAN     DEFAULT false,
  display_order INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Workshops table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workshops (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title         TEXT        NOT NULL,
  date_label    TEXT        DEFAULT '',
  time_label    TEXT        DEFAULT '',
  location      TEXT        DEFAULT '',
  description   TEXT        DEFAULT '',
  cta_label     TEXT        DEFAULT 'Reserve my seat',
  active        BOOLEAN     DEFAULT true,
  display_order INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Auto-update updated_at on products ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ADMIN ALLOWLIST + OWNER APPROVAL + AAL2 (MFA) ENFORCEMENT
-- ============================================================

-- ── Allowlist / team table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_admins (
  email       TEXT PRIMARY KEY CHECK (email = lower(email)),
  role        TEXT NOT NULL DEFAULT 'admin'   CHECK (role   IN ('owner','admin')),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','revoked')),
  invited_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at  TIMESTAMPTZ,
  revoked_by  TEXT
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- Seed the OWNER (master account). Change the email to yours.
INSERT INTO public.app_admins (email, role, status, approved_at)
VALUES ('famacrafts@gmail.com', 'owner', 'approved', now())
ON CONFLICT (email) DO UPDATE SET role = 'owner', status = 'approved';

-- ── RLS helper functions (private schema → not exposed as RPC) ──
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_approved_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins a
    WHERE a.email = lower(nullif(auth.jwt() ->> 'email', '')) AND a.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins a
    WHERE a.email = lower(nullif(auth.jwt() ->> 'email', '')) AND a.role = 'owner' AND a.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION private.is_aal2()
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

GRANT EXECUTE ON FUNCTION private.is_approved_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_owner()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_aal2()           TO anon, authenticated;

-- ── Owner self-lockout protection + audit trail ─────────────
CREATE OR REPLACE FUNCTION private.app_admins_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF tg_op = 'DELETE' THEN
    IF old.role = 'owner' THEN RAISE EXCEPTION 'The owner account cannot be deleted'; END IF;
    RETURN old;
  END IF;
  IF old.role = 'owner' AND (new.role <> 'owner' OR new.status <> 'approved') THEN
    RAISE EXCEPTION 'The owner account cannot be demoted or revoked';
  END IF;
  new.updated_at := now();
  IF new.status = 'revoked' AND old.status IS DISTINCT FROM 'revoked' THEN
    new.revoked_at := now();
    new.revoked_by := lower(nullif(auth.jwt() ->> 'email', ''));
  ELSIF new.status <> 'revoked' THEN
    new.revoked_at := NULL;
    new.revoked_by := NULL;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_admins_guard ON public.app_admins;
CREATE TRIGGER trg_app_admins_guard
  BEFORE UPDATE OR DELETE ON public.app_admins
  FOR EACH ROW EXECUTE FUNCTION private.app_admins_guard();


-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

-- Public visitors can read products and workshops
CREATE POLICY "public_read_products"  ON products  FOR SELECT USING (true);
CREATE POLICY "public_read_workshops" ON workshops FOR SELECT USING (true);

-- Allowlist (team) — approved admins can view; only the owner (at AAL2) can change
CREATE POLICY "app_admins_select" ON public.app_admins FOR SELECT USING (private.is_approved_admin());
CREATE POLICY "app_admins_insert" ON public.app_admins FOR INSERT WITH CHECK (private.is_owner() AND private.is_aal2());
CREATE POLICY "app_admins_update" ON public.app_admins FOR UPDATE USING (private.is_owner() AND private.is_aal2()) WITH CHECK (private.is_owner() AND private.is_aal2());
CREATE POLICY "app_admins_delete" ON public.app_admins FOR DELETE USING (private.is_owner() AND private.is_aal2());

-- Catalog writes — any approved admin, but only with two-factor (AAL2)
CREATE POLICY "admin_insert_products" ON products FOR INSERT WITH CHECK (private.is_approved_admin() AND private.is_aal2());
CREATE POLICY "admin_update_products" ON products FOR UPDATE USING (private.is_approved_admin() AND private.is_aal2()) WITH CHECK (private.is_approved_admin() AND private.is_aal2());
CREATE POLICY "admin_delete_products" ON products FOR DELETE USING (private.is_approved_admin() AND private.is_aal2());

CREATE POLICY "admin_insert_workshops" ON workshops FOR INSERT WITH CHECK (private.is_approved_admin() AND private.is_aal2());
CREATE POLICY "admin_update_workshops" ON workshops FOR UPDATE USING (private.is_approved_admin() AND private.is_aal2()) WITH CHECK (private.is_approved_admin() AND private.is_aal2());
CREATE POLICY "admin_delete_workshops" ON workshops FOR DELETE USING (private.is_approved_admin() AND private.is_aal2());


-- ── Storage bucket for product images ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', true,
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Public image display uses the bucket's public object URL (no RLS). We do NOT
-- grant a public SELECT/list policy. Admin upload/read/delete require an
-- approved admin with two-factor (AAL2).
CREATE POLICY "admin_read_images"   ON storage.objects FOR SELECT USING (bucket_id = 'product-images' AND private.is_approved_admin() AND private.is_aal2());
CREATE POLICY "admin_upload_images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND private.is_approved_admin() AND private.is_aal2());
CREATE POLICY "admin_delete_images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND private.is_approved_admin() AND private.is_aal2());


-- ── Done! ────────────────────────────────────────────────────
-- After running this SQL:
-- 1. Authentication → Providers → DISABLE public sign-ups.
-- 2. Authentication → Users → Add user: the OWNER email above + a password.
--    On first login at /admin the owner is forced to set up two-factor (TOTP).
-- 3. Deploy the admin-invite edge function (supabase/functions/admin-invite)
--    so the owner can invite more admins from the Team tab.
-- 4. Settings → API: copy Project URL + anon key into config.js.
