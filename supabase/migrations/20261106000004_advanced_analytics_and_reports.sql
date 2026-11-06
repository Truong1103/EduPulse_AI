-- ============================================================================
-- Migration: 20261106000004_advanced_analytics_and_reports.sql
-- Bổ sung theo dõi hành vi trì hoãn & Báo cáo cá nhân hóa AI
-- ============================================================================

begin;

-- 1. Bổ sung tracking hành vi vào plan_tasks
alter table public.plan_tasks
  add column if not exists rescheduled_count integer not null default 0,
  add column if not exists actual_minutes integer,
  add column if not exists original_due_date date;

-- Khởi tạo original_due_date nếu chưa có
update public.plan_tasks
set original_due_date = due_date
where original_due_date is null and due_date is not null;

-- 2. Bảng lưu trữ báo cáo định kỳ cá nhân hóa (AI Personalized Reports)
create table if not exists public.ai_personalized_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  report_type text not null check (report_type in ('weekly', 'monthly', 'quarterly', 'goal_deepdive')),
  period_start date not null,
  period_end date not null,
  title text not null,
  summary text not null,
  metrics jsonb not null default '{}'::jsonb,
  insights jsonb not null default '{}'::jsonb,
  action_plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_personalized_reports enable row level security;
revoke all on public.ai_personalized_reports from public, anon;
grant select, insert, update, delete on public.ai_personalized_reports to authenticated;

drop policy if exists ai_personalized_reports_own on public.ai_personalized_reports;
create policy ai_personalized_reports_own on public.ai_personalized_reports
  for all to authenticated
  using (
    student_id = (select auth.uid()) or
    coalesce((select public.jwt_role()), '') = 'admin' or
    exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
  )
  with check (
    student_id = (select auth.uid()) or
    coalesce((select public.jwt_role()), '') = 'admin' or
    exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
  );

create index if not exists ai_personalized_reports_student_type_idx
  on public.ai_personalized_reports (student_id, report_type, created_at desc);

commit;

