-- ============================================================
-- Workshop photos
-- ------------------------------------------------------------
-- Gives workshops the same image model products already have:
--   image_url = the cover (mirrors images[0])
--   images    = every photo, for the card carousel
--
-- Storage intentionally REUSES the existing `product-images` bucket — its
-- "approved admin + AAL2" policies already cover these uploads, so there is no
-- new bucket, no new RLS, and no extra cost.
--
-- Safe to run more than once (IF NOT EXISTS), and safe to run while the site is
-- live: existing rows just get the defaults.
-- ============================================================

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS image_url TEXT            DEFAULT '',
  ADD COLUMN IF NOT EXISTS images    TEXT[] NOT NULL DEFAULT '{}';
