begin;

create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  due_date date,
  priority text not null default 'medium',
  status text not null default 'not_started',
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint plan_tasks_priority_check check (priority in ('low', 'medium', 'high')),
  constraint plan_tasks_status_check check (status in ('not_started', 'in_progress', 'completed'))
);

alter table public.goals
  add column if not exists plan_title text,
  add column if not exists plan_description text not null default '',
  add column if not exists start_date date,
  add column if not exists priority text not null default 'medium',
  add column if not exists planning_status text not null default 'in_progress',
  add column if not exists archived_at timestamptz;

update public.goals
set plan_title = coalesce(nullif(trim(plan_title), ''), success_criteria),
    start_date = coalesce(start_date, created_at::date),
    planning_status = case status
      when 'achieved' then 'completed'
      when 'paused' then 'not_started'
      when 'stopped' then 'not_started'
      else coalesce(planning_status, 'in_progress')
    end;

alter table public.goals
  alter column plan_title set not null,
  alter column start_date set default current_date,
  alter column start_date set not null;

alter table public.plan_tasks
  add column if not exists description text not null default '',
  add column if not exists priority text not null default 'medium',
  add column if not exists status text not null default 'not_started';

update public.plan_tasks
set status = case when completed then 'completed' else coalesce(status, 'not_started') end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.goals'::regclass and conname = 'goals_priority_check'
  ) then
    alter table public.goals
      add constraint goals_priority_check check (priority in ('low', 'medium', 'high'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.goals'::regclass and conname = 'goals_planning_status_check'
  ) then
    alter table public.goals
      add constraint goals_planning_status_check check (planning_status in ('not_started', 'in_progress', 'completed'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.plan_tasks'::regclass and conname = 'plan_tasks_priority_check'
  ) then
    alter table public.plan_tasks
      add constraint plan_tasks_priority_check check (priority in ('low', 'medium', 'high'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.plan_tasks'::regclass and conname = 'plan_tasks_status_check'
  ) then
    alter table public.plan_tasks
      add constraint plan_tasks_status_check check (status in ('not_started', 'in_progress', 'completed'));
  end if;
end;
$$;

create index if not exists goals_student_archive_created_idx
  on public.goals (student_id, archived_at, created_at desc);
create index if not exists plan_tasks_goal_status_due_idx
  on public.plan_tasks (goal_id, status, due_date);

alter table public.plan_tasks enable row level security;
revoke all on public.plan_tasks from public, anon;
grant select, insert, update, delete on public.plan_tasks to authenticated;

drop policy if exists plan_tasks_select_own on public.plan_tasks;
create policy plan_tasks_select_own on public.plan_tasks
  for select to authenticated
  using (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student');

drop policy if exists plan_tasks_insert_own on public.plan_tasks;
create policy plan_tasks_insert_own on public.plan_tasks
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and (select public.jwt_role()) = 'student'
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.student_id = (select auth.uid())
    )
  );

drop policy if exists plan_tasks_update_own on public.plan_tasks;
create policy plan_tasks_update_own on public.plan_tasks
  for update to authenticated
  using (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student')
  with check (
    student_id = (select auth.uid())
    and (select public.jwt_role()) = 'student'
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.student_id = (select auth.uid())
    )
  );

drop policy if exists plan_tasks_delete_own on public.plan_tasks;
create policy plan_tasks_delete_own on public.plan_tasks
  for delete to authenticated
  using (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student');

commit;