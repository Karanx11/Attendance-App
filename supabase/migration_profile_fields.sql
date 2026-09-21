-- Adds personal profile fields (designation, phone, date of birth) to profiles.
-- Safe to run more than once. Values are entered by the user in Settings → Profile.
-- Run in Supabase → SQL Editor.

alter table public.profiles add column if not exists designation   text;
alter table public.profiles add column if not exists phone         text;
alter table public.profiles add column if not exists date_of_birth date;
