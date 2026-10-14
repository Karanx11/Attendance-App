-- Adds a profile photo column. The app stores a small, compressed image as a
-- data URL here (center-cropped to 256×256, ~15–30 KB), so no storage bucket
-- is needed. Safe to run more than once.
-- Run in Supabase → SQL Editor.

alter table public.profiles add column if not exists avatar_url text;

notify pgrst, 'reload schema';
