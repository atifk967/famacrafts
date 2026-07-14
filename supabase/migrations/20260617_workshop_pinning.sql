-- ============================================================
-- Workshop pinning
-- ------------------------------------------------------------
-- Mirrors products.featured: a pinned workshop sorts above the rest on the
-- homepage. Ordering within each group still follows display_order.
--
-- Safe to run more than once, and safe to run while the site is live.
-- ============================================================

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
