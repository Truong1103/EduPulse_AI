begin;

create table if not exists public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  due_date date,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists plan_tasks_goal_position_idx
  on public.plan_tasks (goal_id, position, created_at);

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

revoke insert, update on public.weekly_status from public, anon, authenticated;

create or replace function public.confirm_student_weekly_status(
  p_week_start date,
  p_status text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  target_goal_id uuid;
  resolved_outcome text;
  outcome_definition_version integer := 1;
  event_id uuid;
  normalized_note text := nullif(trim(p_note), '');
begin
  if v_student_id is null or public.jwt_role() <> 'student' then
    raise exception 'Chỉ học sinh đã đăng nhập mới được tự xác nhận trạng thái tuần.';
  end if;
  if p_status is null or p_status not in ('training', 'resting', 'achieved', 'stopped') then
    raise exception 'Trạng thái tuần không hợp lệ.';
  end if;
  if p_week_start is null or p_week_start <> date_trunc('week', p_week_start::timestamp)::date then
    raise exception 'Ngày bắt đầu tuần phải là thứ Hai.';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = v_student_id and p.role = 'student' and p.status = 'active'
  ) or not exists (
    select 1 from public.consents c
    where c.student_id = v_student_id and c.withdrawn_at is null
  ) then
    raise exception 'Bạn cần xác nhận tham gia trước khi xác nhận trạng thái tuần.';
  end if;

  select g.id into target_goal_id
  from public.goals g
  where g.student_id = v_student_id
    and (to_jsonb(g) ->> 'archived_at') is null
  order by (g.status = 'active') desc, g.created_at desc
  limit 1;
  if target_goal_id is null then
    raise exception 'Bạn cần tạo kế hoạch trước khi xác nhận trạng thái tuần.';
  end if;
  if exists (
    select 1
    from public.study_outcome_events e
    where e.goal_id = target_goal_id
      and e.week_start < p_week_start
      and e.outcome in ('dropout_confirmed', 'achieved')
  ) then
    raise exception 'Mục tiêu đã có trạng thái kết thúc; hãy tạo mục tiêu mới thay vì mở lại trạng thái cũ.';
  end if;

  resolved_outcome := case p_status
    when 'training' then 'continuing'
    when 'resting' then 'resting'
    when 'achieved' then 'achieved'
    when 'stopped' then 'dropout_confirmed'
  end;

  select d.version into outcome_definition_version
  from public.definitions d
  where d.key = case p_status
    when 'stopped' then 'drop_out'
    when 'achieved' then 'completion'
    else 'pause'
  end;
  outcome_definition_version := coalesce(outcome_definition_version, 1);

  insert into public.weekly_status (student_id, week_start, status, confirmed_by, note, updated_at)
  values (
    v_student_id,
    p_week_start,
    p_status,
    'student',
    coalesce(normalized_note, 'Học sinh tự xác nhận trạng thái tuần trong ứng dụng.'),
    now()
  )
  on conflict (student_id, week_start) do update set
    status = excluded.status,
    confirmed_by = excluded.confirmed_by,
    note = excluded.note,
    updated_at = excluded.updated_at;

  insert into public.study_outcome_events (
    student_id, goal_id, outcome, effective_date, week_start,
    confirmed_by, confirmer_role, definition_version, note
  ) values (
    v_student_id,
    target_goal_id,
    resolved_outcome,
    p_week_start,
    p_week_start,
    v_student_id,
    'student',
    outcome_definition_version,
    coalesce(normalized_note, 'Học sinh tự xác nhận trạng thái tuần trong ứng dụng.')
  ) returning id into event_id;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (
    v_student_id,
    'student',
    'confirm_own_study_outcome',
    'study_outcome_events:' || event_id::text,
    jsonb_build_object(
      'goalId', target_goal_id,
      'weekStart', p_week_start,
      'outcome', resolved_outcome,
      'definitionVersion', outcome_definition_version
    )
  );

  return event_id;
end;
$$;

revoke all on function public.confirm_student_weekly_status(date, text, text) from public;
grant execute on function public.confirm_student_weekly_status(date, text, text) to authenticated;

commit;