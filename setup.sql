-- ============================================================
-- Famacrafts — Supabase Setup SQL
-- Paste this entire file into:
--   supabase.com → Your Project → SQL Editor → New Query → Run
-- ============================================================


-- ── Products table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          TEXT        UNIQUE NOT NULL,
  name          TEXT        NOT NULL,
  tagline       TEXT        DEFAULT '',
  description   TEXT        DEFAULT '',
  category      TEXT        DEFAULT '',
  image_url     TEXT        DEFAULT '',
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

-- Public visitors can read products and workshops
CREATE POLICY "public_read_products"
  ON products FOR SELECT USING (true);

CREATE POLICY "public_read_workshops"
  ON workshops FOR SELECT USING (true);

-- Only logged-in admins can write
CREATE POLICY "admin_insert_products"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_update_products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_products"
  ON products FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_insert_workshops"
  ON workshops FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "admin_update_workshops"
  ON workshops FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "admin_delete_workshops"
  ON workshops FOR DELETE
  USING (auth.role() = 'authenticated');


-- ── Storage bucket for product images ───────────────────────
-- Creates a public bucket — images served via Supabase CDN
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view images in the bucket
CREATE POLICY "public_read_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Only logged-in admins can upload
CREATE POLICY "admin_upload_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Only logged-in admins can delete
CREATE POLICY "admin_delete_images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');


-- ── Done! ────────────────────────────────────────────────────
-- After running this SQL:
-- 1. Go to Authentication → Users → Add user
--    Enter your admin email + password. This is your login for admin.html.
-- 2. Copy your Project URL and anon key from Settings → API
--    Paste them into config.js
-- 3. Open the site and go to /admin.html to log in
