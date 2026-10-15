begin;

drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and public.is_assigned_mentor(student_id)
      and exists (
        select 1 from public.consents c
        where c.student_id = goals.student_id and c.withdrawn_at is null
      )
    )
  );

drop policy if exists plan_versions_select on public.plan_versions;
create policy plan_versions_select on public.plan_versions
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and public.is_assigned_mentor(student_id)
      and exists (
        select 1 from public.consents c
        where c.student_id = plan_versions.student_id and c.withdrawn_at is null
      )
    )
  );

drop policy if exists plan_tasks_select_own on public.plan_tasks;
create policy plan_tasks_select_own on public.plan_tasks
  for select to authenticated
  using (
    (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student')
    or (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and public.is_assigned_mentor(student_id)
      and exists (
        select 1 from public.consents c
        where c.student_id = plan_tasks.student_id and c.withdrawn_at is null
      )
    )
  );

drop policy if exists rest_periods_select on public.rest_periods;
create policy rest_periods_select on public.rest_periods
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and public.is_assigned_mentor(student_id)
      and exists (
        select 1 from public.consents c
        where c.student_id = rest_periods.student_id and c.withdrawn_at is null
      )
    )
  );

drop policy if exists support_invites_select on public.support_invites;
create policy support_invites_select on public.support_invites
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and public.is_assigned_mentor(student_id)
      and exists (
        select 1 from public.consents c
        where c.student_id = support_invites.student_id and c.withdrawn_at is null
      )
    )
  );

drop policy if exists support_invites_mentor_insert on public.support_invites;
create policy support_invites_mentor_insert on public.support_invites
  for insert to authenticated
  with check (
    (select public.jwt_role()) = 'mentor'
    and public.is_assigned_mentor(student_id)
    and exists (
      select 1 from public.consents c
      where c.student_id = support_invites.student_id and c.withdrawn_at is null
    )
    and exists (
      select 1 from public.support_content sc
      where sc.id = support_invites.content_id and sc.status = 'approved'
    )
  );

create or replace function public.get_research_survey_summary()
returns table (
  survey_type text,
  response_count integer,
  helpful_n integer,
  helpful_mean numeric,
  ease_n integer,
  ease_mean numeric,
  annoyance_n integer,
  annoyance_mean numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() not in ('researcher', 'admin') then
    raise exception 'Chỉ Nhà nghiên cứu hoặc Admin được xem tổng hợp khảo sát.';
  end if;

  return query
  with eligible_surveys as (
    select s.survey_type, s.ratings
    from public.surveys s
    where exists (
      select 1 from public.consents c
      where c.student_id = s.student_id and c.withdrawn_at is null
    )
  ), survey_values as (
    select
      es.survey_type,
      case when jsonb_typeof(es.ratings -> 'helpful') = 'number' and (es.ratings ->> 'helpful')::numeric between 1 and 5 then (es.ratings ->> 'helpful')::numeric end as helpful,
      case when jsonb_typeof(es.ratings -> 'ease') = 'number' and (es.ratings ->> 'ease')::numeric between 1 and 5 then (es.ratings ->> 'ease')::numeric end as ease,
      case when jsonb_typeof(es.ratings -> 'annoyance') = 'number' and (es.ratings ->> 'annoyance')::numeric between 1 and 5 then (es.ratings ->> 'annoyance')::numeric end as annoyance
    from eligible_surveys es
  )
  select
    sv.survey_type,
    case when count(*) >= 5 then count(*)::integer end,
    case when count(sv.helpful) >= 5 then count(sv.helpful)::integer end,
    case when count(sv.helpful) >= 5 then round(avg(sv.helpful), 2) end,
    case when count(sv.ease) >= 5 then count(sv.ease)::integer end,
    case when count(sv.ease) >= 5 then round(avg(sv.ease), 2) end,
    case when count(sv.annoyance) >= 5 then count(sv.annoyance)::integer end,
    case when count(sv.annoyance) >= 5 then round(avg(sv.annoyance), 2) end
  from survey_values sv
  group by sv.survey_type;
end;
$$;

revoke all on function public.get_research_survey_summary() from public;
grant execute on function public.get_research_survey_summary() to authenticated;

create or replace function public.get_mentor_student_journal(p_student_id uuid)
returns table (
  session_date date,
  goal_title text,
  activity_group text,
  status text,
  duration_min integer,
  motivation integer,
  difficulty integer,
  barrier text,
  intent_continue integer,
  skipped_fields text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or public.jwt_role() <> 'mentor'
     or not public.is_assigned_mentor(p_student_id)
     or not exists (
       select 1 from public.consents c
       where c.student_id = p_student_id and c.withdrawn_at is null
     ) then
    raise exception 'Không có quyền xem nhật ký của học sinh này.';
  end if;

  return query
  select
    sl.session_date,
    coalesce(g.plan_title, g.success_criteria, ''),
    coalesce(g.activity_group, ''),
    sl.status,
    sl.duration_min,
    sl.motivation,
    sl.difficulty,
    sl.barrier,
    sl.intent_continue,
    coalesce(sl.skipped_fields, '{}'::text[])
  from public.session_logs sl
  join public.goals g on g.id = sl.goal_id and g.student_id = sl.student_id
  where sl.student_id = p_student_id
  order by sl.session_date desc, sl.created_at desc;
end;
$$;

revoke all on function public.get_mentor_student_journal(uuid) from public;
grant execute on function public.get_mentor_student_journal(uuid) to authenticated;

commit;