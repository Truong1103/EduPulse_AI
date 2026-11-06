-- ============================================================================
-- Migration: 20261106000001_user_preferences.sql
-- Bảng user_preferences: Sở thích cá nhân cho AI
-- ============================================================================

begin;

create table if not exists public.user_preferences (
  student_id          uuid primary key references public.profiles(id) on delete cascade,
  interests           text[] not null default '{}',
  daily_available_min integer check (daily_available_min is null or daily_available_min between 5 and 480),
  weekly_available_days integer check (weekly_available_days is null or weekly_available_days between 1 and 7),
  current_level       text,
  learning_style      text check (learning_style is null or learning_style in ('visual', 'auditory', 'reading', 'kinesthetic')),
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

-- Chỉ student truy cập được preferences của chính mình
alter table public.user_preferences enable row level security;
revoke all on public.user_preferences from public, anon;
grant select, insert, update on public.user_preferences to authenticated;

drop policy if exists user_prefs_own on public.user_preferences;
create policy user_prefs_own on public.user_preferences
  to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create index if not exists user_preferences_student_idx
  on public.user_preferences (student_id);

commit;

