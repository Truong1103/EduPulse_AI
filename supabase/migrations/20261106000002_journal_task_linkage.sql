-- ============================================================================
-- Migration: 20261106000002_journal_task_linkage.sql
-- Liên kết nhật ký (session_logs) với task_id của plan_tasks
-- ============================================================================

begin;

-- Thêm cột task_id vào session_logs nếu chưa có
alter table public.session_logs
  add column if not exists task_id uuid references public.plan_tasks(id) on delete set null;

-- Tạo index để truy vấn nhật ký theo task
create index if not exists session_logs_task_id_idx
  on public.session_logs (task_id)
  where task_id is not null;

create index if not exists session_logs_student_date_idx
  on public.session_logs (student_id, session_date desc);

commit;

