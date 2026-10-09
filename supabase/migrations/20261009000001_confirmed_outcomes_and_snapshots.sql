begin;

alter table public.study_arms
  add column if not exists assigned_at timestamptz,
  add column if not exists assignment_date_source text;

update public.study_arms sa
set assigned_at = coalesce(
      sa.assigned_at,
      sa.approved_at,
      (select min(c.consented_at) from public.consents c where c.student_id = sa.student_id),
      (select min(g.created_at) from public.goals g where g.student_id = sa.student_id),
      now()
    ),
    assignment_date_source = coalesce(
      sa.assignment_date_source,
      case
        when sa.approved_at is not null then 'legacy_approved_at'
        when exists (select 1 from public.consents c where c.student_id = sa.student_id) then 'legacy_consent'
        when exists (select 1 from public.goals g where g.student_id = sa.student_id) then 'legacy_goal'
        else 'legacy_unknown'
      end
    )
where sa.assigned_at is null or sa.assignment_date_source is null;

alter table public.study_arms
  alter column assigned_at set default now(),
  alter column assigned_at set not null,
  alter column assignment_date_source set default 'recorded',
  alter column assignment_date_source set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'study_arms_assignment_date_source_check'
      and conrelid = 'public.study_arms'::regclass
  ) then
    alter table public.study_arms
      add constraint study_arms_assignment_date_source_check
      check (assignment_date_source in ('recorded', 'legacy_approved_at', 'legacy_consent', 'legacy_goal', 'legacy_unknown'));
  end if;
end;
$$;

create table if not exists public.study_outcome_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  outcome text not null check (outcome in ('continuing', 'resting', 'achieved', 'dropout_confirmed', 'unknown')),
  effective_date date not null,
  week_start date not null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmer_role text not null check (confirmer_role in ('student', 'mentor')),
  definition_version integer not null default 1 check (definition_version > 0),
  note text,
  recorded_at timestamptz not null default now(),
  check (week_start = date_trunc('week', week_start::timestamp)::date),
  check (effective_date >= week_start and effective_date < week_start + 7)
);

create index if not exists study_outcome_events_latest_idx
  on public.study_outcome_events (student_id, week_start desc, recorded_at desc);

insert into public.study_outcome_events (
  student_id, goal_id, outcome, effective_date, week_start,
  confirmed_by, confirmer_role, definition_version, note, recorded_at
)
select
  ws.student_id,
  g.id,
  case ws.status
    when 'training' then 'continuing'
    when 'resting' then 'resting'
    when 'achieved' then 'achieved'
    when 'stopped' then 'dropout_confirmed'
  end,
  ws.week_start,
  ws.week_start,
  null,
  ws.confirmed_by,
  coalesce(d.version, 1),
  ws.note,
  ws.updated_at
from public.weekly_status ws
join public.profiles p on p.id = ws.student_id and p.role = 'student' and p.status = 'active'
join lateral (
  select goal.id
  from public.goals goal
  where goal.student_id = ws.student_id
  order by (goal.status = 'active') desc, goal.created_at desc
  limit 1
) g on true
left join public.definitions d on d.key = case ws.status
  when 'stopped' then 'drop_out'
  when 'achieved' then 'completion'
  else 'pause'
end
where ws.confirmed_by in ('student', 'mentor')
  and exists (
    select 1 from public.consents c
    where c.student_id = ws.student_id and c.withdrawn_at is null
  )
  and not exists (
    select 1 from public.study_outcome_events existing
    where existing.student_id = ws.student_id and existing.week_start = ws.week_start
  );

alter table public.study_outcome_events enable row level security;
revoke all on public.study_outcome_events from public, anon, authenticated;

create table if not exists public.research_analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  analysis_version text not null,
  config jsonb not null,
  results jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists research_analysis_snapshots_created_idx
  on public.research_analysis_snapshots (created_at desc);

alter table public.research_analysis_snapshots enable row level security;
revoke all on public.research_analysis_snapshots from public, anon, authenticated;
grant select on public.research_analysis_snapshots to authenticated;

 drop policy if exists research_analysis_snapshots_read on public.research_analysis_snapshots;
create policy research_analysis_snapshots_read on public.research_analysis_snapshots
  for select to authenticated
  using ((select public.jwt_role()) in ('researcher', 'admin'));

create or replace function public.confirm_mentor_weekly_status(
  p_student_id uuid,
  p_week_start date,
  p_status text,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_goal_id uuid;
  resolved_outcome text;
  outcome_definition_version integer := 1;
  event_id uuid;
begin
  if auth.uid() is null or public.jwt_role() <> 'mentor' then
    raise exception 'Chỉ Giáo viên mới được xác nhận trạng thái học sinh.';
  end if;
  if not public.is_assigned_mentor(p_student_id) then
    raise exception 'Học sinh không thuộc danh sách được phân công.';
  end if;
  if p_status is null or p_status not in ('training', 'resting', 'achieved', 'stopped') then
    raise exception 'Trạng thái tuần không hợp lệ.';
  end if;
  if p_week_start is null or p_week_start <> date_trunc('week', p_week_start::timestamp)::date then
    raise exception 'Ngày bắt đầu tuần phải là thứ Hai.';
  end if;
  if nullif(trim(p_note), '') is null then
    raise exception 'Cần ghi căn cứ xác nhận trạng thái.';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_student_id and p.role = 'student' and p.status = 'active'
  ) or not exists (
    select 1
    from public.consents c
    where c.student_id = p_student_id and c.withdrawn_at is null
  ) then
    raise exception 'Học sinh không còn đủ điều kiện đồng ý tham gia nghiên cứu.';
  end if;

  select g.id into target_goal_id
  from public.goals g
  where g.student_id = p_student_id
  order by (g.status = 'active') desc, g.created_at desc
  limit 1;
  if target_goal_id is null then
    raise exception 'Học sinh chưa có mục tiêu để gắn outcome.';
  end if;
  if exists (
    select 1
    from public.study_outcome_events e
    where e.goal_id = target_goal_id
      and e.week_start < p_week_start
      and e.outcome in ('dropout_confirmed', 'achieved')
  ) then
    raise exception 'Mục tiêu đã có outcome kết thúc; hãy tạo mục tiêu mới thay vì mở lại trạng thái cũ.';
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
  values (p_student_id, p_week_start, p_status, 'mentor', trim(p_note), now())
  on conflict (student_id, week_start) do update set
    status = excluded.status,
    confirmed_by = excluded.confirmed_by,
    note = excluded.note,
    updated_at = excluded.updated_at;

  insert into public.study_outcome_events (
    student_id, goal_id, outcome, effective_date, week_start,
    confirmed_by, confirmer_role, definition_version, note
  ) values (
    p_student_id, target_goal_id, resolved_outcome, p_week_start,
    p_week_start, auth.uid(), 'mentor', outcome_definition_version, trim(p_note)
  ) returning id into event_id;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (
    auth.uid(), 'mentor', 'confirm_study_outcome', 'study_outcome_events:' || event_id::text,
    jsonb_build_object('studentId', p_student_id, 'goalId', target_goal_id, 'weekStart', p_week_start, 'outcome', resolved_outcome, 'definitionVersion', outcome_definition_version)
  );

  return event_id;
end;
$$;

revoke all on function public.confirm_mentor_weekly_status(uuid, date, text, text) from public;
grant execute on function public.confirm_mentor_weekly_status(uuid, date, text, text) to authenticated;

create or replace view public.v_research_confirmed_outcomes as
with latest_consent as (
  select distinct on (c.student_id)
    c.student_id,
    c.withdrawn_at
  from public.consents c
  order by c.student_id, c.consented_at desc, c.id desc
), randomized as (
  select
    p.id as student_id,
    p.student_code,
    p.status as profile_status,
    sa.arm,
    sa.assigned_at,
    sa.assignment_date_source,
    case
      when lc.student_id is null then 'consent_missing'
      when lc.withdrawn_at is not null or p.status = 'withdrawn' then 'withdrawn'
      else 'active'
    end as consent_state
  from public.study_arms sa
  join public.profiles p on p.id = sa.student_id and p.role = 'student'
  left join latest_consent lc on lc.student_id = p.id
), outcomes_in_window as (
  select e.*
  from public.study_outcome_events e
  join randomized r on r.student_id = e.student_id
  where r.assignment_date_source = 'recorded'
    and e.week_start >= date_trunc('week', r.assigned_at::timestamp)::date
    and e.week_start < date_trunc('week', r.assigned_at::timestamp)::date + 56
), latest_outcome as (
  select distinct on (e.student_id)
    e.student_id,
    e.outcome,
    e.effective_date,
    e.week_start,
    e.confirmed_by,
    e.confirmer_role,
    e.definition_version,
    e.recorded_at
  from outcomes_in_window e
  order by e.student_id, e.week_start desc, e.recorded_at desc, e.id desc
), classified as (
  select
    r.*,
    lo.outcome as latest_outcome,
    lo.effective_date as latest_effective_date,
    lo.week_start as latest_week_start,
    lo.confirmer_role as latest_confirmer_role,
    lo.definition_version as latest_definition_version,
    lo.recorded_at as latest_recorded_at,
    r.assignment_date_source = 'recorded'
      and current_date >= r.assigned_at::date + 56 as follow_up_due,
    case
      when r.consent_state <> 'active' then null
      when lo.outcome in ('dropout_confirmed', 'achieved') then lo.outcome
      when lo.outcome = 'continuing'
        and r.assignment_date_source = 'recorded'
        and current_date >= r.assigned_at::date + 56
        and lo.week_start >= date_trunc('week', r.assigned_at::timestamp)::date + 49
        then 'continuing'
      else null
    end as final_outcome
  from randomized r
  left join latest_outcome lo on lo.student_id = r.student_id
)
select
  c.student_code,
  c.arm,
  c.consent_state,
  c.assigned_at,
  c.assignment_date_source,
  c.follow_up_due,
  c.final_outcome as outcome,
  c.final_outcome is not null as follow_up_complete,
  case when c.final_outcome is not null then c.latest_effective_date else null end as effective_date,
  case when c.final_outcome is not null then c.latest_week_start else null end as week_start,
  case when c.final_outcome is not null then c.latest_confirmer_role else null end as confirmer_role,
  case when c.final_outcome is not null then c.latest_definition_version else null end as definition_version,
  case when c.final_outcome is not null then c.latest_recorded_at else null end as recorded_at
from classified c
where (select public.jwt_role()) in ('researcher', 'admin');

grant select on public.v_research_confirmed_outcomes to authenticated;

create or replace function public.save_research_analysis_snapshot(
  p_analysis_version text,
  p_config jsonb,
  p_results jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_id uuid;
begin
  if auth.uid() is null or public.jwt_role() not in ('researcher', 'admin') then
    raise exception 'Không đủ quyền lưu snapshot phân tích.';
  end if;
  if nullif(trim(p_analysis_version), '') is null or p_config is null or p_results is null then
    raise exception 'Cần có phiên bản, cấu hình và kết quả phân tích.';
  end if;

  insert into public.research_analysis_snapshots (analysis_version, config, results, created_by)
  values (trim(p_analysis_version), p_config, p_results, auth.uid())
  returning id into snapshot_id;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (
    auth.uid(), public.jwt_role(), 'save_research_analysis_snapshot', 'research_analysis_snapshots:' || snapshot_id::text,
    jsonb_build_object('analysisVersion', p_analysis_version)
  );

  return snapshot_id;
end;
$$;

revoke all on function public.save_research_analysis_snapshot(text, jsonb, jsonb) from public;
grant execute on function public.save_research_analysis_snapshot(text, jsonb, jsonb) to authenticated;

commit;
