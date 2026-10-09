create or replace function public.get_mentor_cohort_statistics(
  p_weeks integer default 8,
  p_activity_group text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or public.jwt_role() <> 'mentor' then
    raise exception 'Chỉ tài khoản Giáo viên mới được xem thống kê cohort được phân công.';
  end if;

  if p_weeks is null or p_weeks not in (0, 4, 8) then
    raise exception 'Khoảng thời gian không hợp lệ.';
  end if;

  with bounds as (
    select
      case
        when p_weeks = 0 then null::date
        else date_trunc('week', current_date::timestamp)::date - ((p_weeks - 1) * 7)
      end as from_date,
      current_date as to_date
  ),
  cohort as (
    select
      p.id as student_id,
      g.activity_group
    from public.mentor_assignments ma
    join public.profiles p on p.id = ma.student_id and p.role = 'student' and p.status = 'active'
    left join lateral (
      select goal.activity_group
      from public.goals goal
      where goal.student_id = p.id and goal.status = 'active'
      order by goal.created_at desc
      limit 1
    ) g on true
    where ma.mentor_id = auth.uid()
      and exists (
        select 1
        from public.consents c
        where c.student_id = p.id and c.withdrawn_at is null
      )
      and (nullif(trim(p_activity_group), '') is null or g.activity_group = p_activity_group)
  ),
  summary_rows as (
    select
      c.student_id,
      ws.week_start,
      ws.planned_original,
      ws.planned_current,
      ws.done,
      ws.pct_original,
      ws.pct_current,
      st.status as weekly_status
    from cohort c
    join public.weekly_summary ws on ws.student_id = c.student_id
    left join public.weekly_status st
      on st.student_id = ws.student_id and st.week_start = ws.week_start
    cross join bounds b
    where (b.from_date is null or ws.week_start >= b.from_date)
      and ws.week_start <= b.to_date
  ),
  valid_weeks as (
    select sr.*
    from summary_rows sr
    where sr.planned_current > 0
      and coalesce(sr.weekly_status, 'training') <> 'resting'
      and exists (
        select 1
        from public.plan_versions pv
        where pv.student_id = sr.student_id
          and pv.effective_from <= sr.week_start + 6
      )
      and not exists (
        select 1
        from public.rest_periods rp
        where rp.student_id = sr.student_id
          and rp.date_from <= sr.week_start + 6
          and rp.date_to >= sr.week_start
      )
  ),
  student_period as (
    select
      student_id,
      sum(done)::integer as completed_sessions,
      sum(planned_current)::integer as planned_sessions,
      round((sum(done)::numeric / nullif(sum(planned_current), 0)) * 100, 2) as completion_pct
    from valid_weeks
    group by student_id
  ),
  session_rows as (
    select sl.*
    from cohort c
    join public.session_logs sl on sl.student_id = c.student_id
    cross join bounds b
    where sl.session_date <= b.to_date
      and (b.from_date is null or sl.session_date >= b.from_date)
  ),
  activity_counts as (
    select activity_group as label, count(*)::integer as n
    from cohort
    where nullif(trim(activity_group), '') is not null
    group by activity_group
  ),
  barrier_counts as (
    select trim(barrier) as label, count(*)::integer as n
    from session_rows
    where nullif(trim(barrier), '') is not null
      and not ('barrier' = any(coalesce(skipped_fields, array[]::text[])))
    group by trim(barrier)
  ),
  motivation_counts as (
    select motivation as value, count(*)::integer as n
    from session_rows
    where motivation between 1 and 5
      and not ('motivation' = any(coalesce(skipped_fields, array[]::text[])))
    group by motivation
  ),
  difficulty_counts as (
    select difficulty as value, count(*)::integer as n
    from session_rows
    where difficulty between 1 and 5
      and not ('difficulty' = any(coalesce(skipped_fields, array[]::text[])))
    group by difficulty
  ),
  intent_counts as (
    select intent_continue as value, count(*)::integer as n
    from session_rows
    where intent_continue between 1 and 5
      and not ('intent' = any(coalesce(skipped_fields, array[]::text[])))
    group by intent_continue
  ),
  session_count_distribution as (
    select completed_sessions as value, count(*)::integer as n
    from student_period
    group by completed_sessions
  ),
  weekly_trend as (
    select
      week_start,
      count(distinct student_id)::integer as n,
      round(avg(pct_original)::numeric, 1) as pct_original,
      round(avg(pct_current)::numeric, 1) as pct_current,
      sum(done)::integer as done,
      sum(planned_current)::integer as planned
    from valid_weeks
    group by week_start
  ),
  summary_metrics as (
    select
      (select count(*)::integer from cohort) as cohort_size,
      (select count(distinct student_id)::integer from summary_rows) as students_with_weekly_data,
      (select count(distinct student_id)::integer from student_period) as students_with_valid_plan,
      (select count(*) filter (where completed_sessions > 0)::integer from student_period) as active_students,
      (select count(*)::integer from session_rows) as log_count,
      (select count(*) filter (
        where motivation between 1 and 5
          and not ('motivation' = any(coalesce(skipped_fields, array[]::text[])))
      )::integer from session_rows) as motivation_n,
      (select count(*) filter (
        where motivation is null or 'motivation' = any(coalesce(skipped_fields, array[]::text[]))
      )::integer from session_rows) as motivation_missing_n,
      (select count(*) filter (
        where difficulty between 1 and 5
          and not ('difficulty' = any(coalesce(skipped_fields, array[]::text[])))
      )::integer from session_rows) as difficulty_n,
      (select count(*) filter (
        where difficulty is null or 'difficulty' = any(coalesce(skipped_fields, array[]::text[]))
      )::integer from session_rows) as difficulty_missing_n,
      (select count(*) filter (
        where intent_continue between 1 and 5
          and not ('intent' = any(coalesce(skipped_fields, array[]::text[])))
      )::integer from session_rows) as intent_n,
      (select count(*) filter (
        where intent_continue is null or 'intent' = any(coalesce(skipped_fields, array[]::text[]))
      )::integer from session_rows) as intent_missing_n,
      (select count(*) filter (
        where nullif(trim(barrier), '') is not null
          and not ('barrier' = any(coalesce(skipped_fields, array[]::text[])))
      )::integer from session_rows) as barrier_n,
      (select count(*) filter (
        where nullif(trim(barrier), '') is null
          or 'barrier' = any(coalesce(skipped_fields, array[]::text[]))
      )::integer from session_rows) as barrier_missing_n,
      (select round(avg(completed_sessions)::numeric, 2) from student_period) as mean_completed_sessions,
      (select round(percentile_cont(0.5) within group (order by completed_sessions)::numeric, 2) from student_period) as median_completed_sessions,
      (select round(avg(completion_pct)::numeric, 1) from student_period) as mean_completion_pct,
      (select round(percentile_cont(0.5) within group (order by completion_pct)::numeric, 1) from student_period) as median_completion_pct,
      (select round(avg(motivation)::numeric, 2) from session_rows
        where motivation between 1 and 5
          and not ('motivation' = any(coalesce(skipped_fields, array[]::text[])))) as motivation_mean,
      (select round(percentile_cont(0.5) within group (order by motivation)::numeric, 2) from session_rows
        where motivation between 1 and 5
          and not ('motivation' = any(coalesce(skipped_fields, array[]::text[])))) as motivation_median,
      (select round(avg(difficulty)::numeric, 2) from session_rows
        where difficulty between 1 and 5
          and not ('difficulty' = any(coalesce(skipped_fields, array[]::text[])))) as difficulty_mean,
      (select round(percentile_cont(0.5) within group (order by difficulty)::numeric, 2) from session_rows
        where difficulty between 1 and 5
          and not ('difficulty' = any(coalesce(skipped_fields, array[]::text[])))) as difficulty_median,
      (select round(avg(intent_continue)::numeric, 2) from session_rows
        where intent_continue between 1 and 5
          and not ('intent' = any(coalesce(skipped_fields, array[]::text[])))) as intent_mean,
      (select round(percentile_cont(0.5) within group (order by intent_continue)::numeric, 2) from session_rows
        where intent_continue between 1 and 5
          and not ('intent' = any(coalesce(skipped_fields, array[]::text[])))) as intent_median,
      (select coalesce(round(
        count(*) filter (where completed_sessions > 0)::numeric * 100
        / nullif(count(*), 0), 1
      ), null) from student_period) as participation_rate
  )
  select jsonb_build_object(
    'cohort_size', sm.cohort_size,
    'students_with_weekly_data', sm.students_with_weekly_data,
    'students_missing_weekly_data', greatest(sm.cohort_size - sm.students_with_weekly_data, 0),
    'students_with_valid_plan', sm.students_with_valid_plan,
    'active_students', sm.active_students,
    'inactive_students', greatest(sm.students_with_valid_plan - sm.active_students, 0),
    'participation_rate', sm.participation_rate,
    'log_count', sm.log_count,
    'activity_missing_n', greatest(sm.cohort_size - coalesce((select sum(n) from activity_counts), 0), 0),
    'activity_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label)
      from activity_counts
    ), '[]'::jsonb),
    'barrier_n', sm.barrier_n,
    'barrier_missing_n', sm.barrier_missing_n,
    'barrier_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc, label)
      from barrier_counts
    ), '[]'::jsonb),
    'mean_completed_sessions', sm.mean_completed_sessions,
    'median_completed_sessions', sm.median_completed_sessions,
    'session_count_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from session_count_distribution
    ), '[]'::jsonb),
    'mean_completion_pct', sm.mean_completion_pct,
    'median_completion_pct', sm.median_completion_pct,
    'motivation_n', sm.motivation_n,
    'motivation_missing_n', sm.motivation_missing_n,
    'motivation_mean', sm.motivation_mean,
    'motivation_median', sm.motivation_median,
    'motivation_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from motivation_counts
    ), '[]'::jsonb),
    'difficulty_n', sm.difficulty_n,
    'difficulty_missing_n', sm.difficulty_missing_n,
    'difficulty_mean', sm.difficulty_mean,
    'difficulty_median', sm.difficulty_median,
    'difficulty_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from difficulty_counts
    ), '[]'::jsonb),
    'intent_n', sm.intent_n,
    'intent_missing_n', sm.intent_missing_n,
    'intent_mean', sm.intent_mean,
    'intent_median', sm.intent_median,
    'intent_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from intent_counts
    ), '[]'::jsonb),
    'weekly_trend', coalesce((
      select jsonb_agg(jsonb_build_object(
        'week_start', week_start,
        'n', n,
        'pct_original', pct_original,
        'pct_current', pct_current,
        'done', done,
        'planned', planned
      ) order by week_start)
      from weekly_trend
    ), '[]'::jsonb)
  )
  into result
  from summary_metrics sm;

  return result;
end;
$$;

revoke all on function public.get_mentor_cohort_statistics(integer, text) from public;
grant execute on function public.get_mentor_cohort_statistics(integer, text) to authenticated;
