-- ============================================================
-- Workshop event date
-- ------------------------------------------------------------
-- `date_label` is free text ("Saturday, 14 June 2026") and can't be compared,
-- so the site had no way to tell an upcoming workshop from a past one.
-- `event_date` is a real DATE used purely for logic:
--   * event_date >= today (or NULL) → Upcoming
--   * event_date <  today           → Previous
-- NULL is deliberately treated as Upcoming so a workshop can never vanish from
-- the site just because a date wasn't filled in.
--
-- date_label stays as the pretty text shown to visitors.
-- Safe to run more than once, and safe to run while the site is live.
-- ============================================================

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS event_date DATE;
