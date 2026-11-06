-- ============================================================================
-- Migration: 20261106000003_ai_assessments_and_roles.sql
-- Bảng ai_risk_assessments, ai_plan_adjustments và view an toàn cho quản trị
-- ============================================================================

begin;

-- 1. Bảng lưu đánh giá nguy cơ AI
create table if not exists public.ai_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  assessed_at timestamptz not null default now(),
  risk_level text not null check (risk_level in ('normal', 'attention', 'high_risk', 'insufficient_data')),
  completion_rate numeric,
  overdue_tasks integer not null default 0,
  inactive_days integer not null default 0,
  avg_motivation numeric,
  avg_difficulty numeric,
  overload_score numeric,
  reasons jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  data_evidence jsonb not null default '{}'::jsonb
);

alter table public.ai_risk_assessments enable row level security;
revoke all on public.ai_risk_assessments from public, anon;
grant select, insert, update on public.ai_risk_assessments to authenticated;

drop policy if exists ai_risk_assessments_own on public.ai_risk_assessments;
create policy ai_risk_assessments_own on public.ai_risk_assessments
  for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create index if not exists ai_risk_assessments_student_goal_idx
  on public.ai_risk_assessments (student_id, goal_id, assessed_at desc);

-- 2. Bảng lưu lịch sử đề xuất và điều chỉnh kế hoạch từ AI
create table if not exists public.ai_plan_adjustments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  risk_level text not null,
  summary text not null,
  task_changes jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.ai_plan_adjustments enable row level security;
revoke all on public.ai_plan_adjustments from public, anon;
grant select, insert, update on public.ai_plan_adjustments to authenticated;

drop policy if exists ai_plan_adjustments_own on public.ai_plan_adjustments;
create policy ai_plan_adjustments_own on public.ai_plan_adjustments
  for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create index if not exists ai_plan_adjustments_student_goal_idx
  on public.ai_plan_adjustments (student_id, goal_id, created_at desc);

-- 3. Xử lý phân quyền an toàn:
-- Không xóa giá trị trong postgres enum app_role (vì postgres không hỗ trợ an toàn khi có dữ liệu cũ),
-- mà bảo toàn dữ liệu lịch sử và tạo quy tắc chỉ định cho tài khoản mentor/researcher cũ.
-- Quản trị viên (admin) có thể chuyển đổi role của người dùng qua giao diện quản trị AdminUsersPage.

commit;

