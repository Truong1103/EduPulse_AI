-- ============================================================================
-- Migration: 20261106000000_todo_app_extensions.sql
-- Mở rộng plan_tasks và goals cho Todo App
-- An toàn: Chỉ thêm cột mới, không phá vỡ cấu trúc cũ
-- ============================================================================

begin;

-- -------------------------------------------------------------------------
-- 1. MỞ RỘNG plan_tasks
-- -------------------------------------------------------------------------

-- Thêm thời gian ước tính (phút)
alter table public.plan_tasks
  add column if not exists estimated_minutes integer
    check (estimated_minutes is null or (estimated_minutes >= 1 and estimated_minutes <= 480));

-- Thêm độ khó (1-5)
alter table public.plan_tasks
  add column if not exists difficulty integer
    check (difficulty is null or (difficulty >= 1 and difficulty <= 5));

-- Thêm thời điểm hoàn thành
alter table public.plan_tasks
  add column if not exists completed_at timestamptz;

-- -------------------------------------------------------------------------
-- 2. MỞ RỘNG goals
-- -------------------------------------------------------------------------

-- Thêm thông tin cho AI Plan Generator
alter table public.goals
  add column if not exists interests text[] not null default '{}';

alter table public.goals
  add column if not exists daily_minutes integer
    check (daily_minutes is null or (daily_minutes >= 5 and daily_minutes <= 480));

alter table public.goals
  add column if not exists motivation_text text;

-- -------------------------------------------------------------------------
-- 3. INDEX MỚI CHO CALENDAR QUERIES
-- -------------------------------------------------------------------------

-- Index cho truy vấn calendar theo ngày
create index if not exists plan_tasks_student_due_idx
  on public.plan_tasks (student_id, due_date)
  where due_date is not null;

-- Index cho truy vấn task hôm nay
create index if not exists plan_tasks_student_due_completed_idx
  on public.plan_tasks (student_id, due_date, completed)
  where due_date is not null;

-- Index cho completed_at (streak calculation)
create index if not exists plan_tasks_student_completed_at_idx
  on public.plan_tasks (student_id, completed_at)
  where completed_at is not null;

-- -------------------------------------------------------------------------
-- 4. DỌN DẸP completed_at cho task đã hoàn thành (nếu có)
-- -------------------------------------------------------------------------
-- Backfill completed_at cho các task đã completed nhưng chưa có completed_at
-- Dùng created_at làm fallback (chấp nhận được vì đây chỉ là historical data)
update public.plan_tasks
set completed_at = coalesce(completed_at, created_at)
where completed = true and completed_at is null;

commit;

