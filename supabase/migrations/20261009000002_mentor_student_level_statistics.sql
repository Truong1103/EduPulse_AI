create or replace function public.get_mentor_student_level_likert(
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
    select p.id as student_id
    from public.mentor_assignments ma
    join public.profiles p on p.id = ma.student_id
      and p.role = 'student'
      and p.status = 'active'
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
  session_rows as (
    select sl.*
    from cohort c
    join public.session_logs sl on sl.student_id = c.student_id
    cross join bounds b
    where sl.session_date <= b.to_date
      and (b.from_date is null or sl.session_date >= b.from_date)
  ),
  motivation_by_student as (
    select student_id,
      percentile_cont(0.5) within group (order by motivation)::numeric as value
    from session_rows
    where motivation between 1 and 5
      and not ('motivation' = any(coalesce(skipped_fields, array[]::text[])))
    group by student_id
  ),
  difficulty_by_student as (
    select student_id,
      percentile_cont(0.5) within group (order by difficulty)::numeric as value
    from session_rows
    where difficulty between 1 and 5
      and not ('difficulty' = any(coalesce(skipped_fields, array[]::text[])))
    group by student_id
  ),
  intent_by_student as (
    select student_id,
      percentile_cont(0.5) within group (order by intent_continue)::numeric as value
    from session_rows
    where intent_continue between 1 and 5
      and not ('intent' = any(coalesce(skipped_fields, array[]::text[])))
    group by student_id
  ),
  motivation_distribution as (
    select value, count(*)::integer as n
    from motivation_by_student
    group by value
  ),
  difficulty_distribution as (
    select value, count(*)::integer as n
    from difficulty_by_student
    group by value
  ),
  intent_distribution as (
    select value, count(*)::integer as n
    from intent_by_student
    group by value
  )
  select jsonb_build_object(
    'cohort_size', (select count(*)::integer from cohort),
    'motivation_n', (select count(*)::integer from motivation_by_student),
    'motivation_missing_n', greatest((select count(*) from cohort) - (select count(*) from motivation_by_student), 0),
    'motivation_mean', (select round(avg(value), 2) from motivation_by_student),
    'motivation_median', (select round(percentile_cont(0.5) within group (order by value)::numeric, 2) from motivation_by_student),
    'motivation_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from motivation_distribution
    ), '[]'::jsonb),
    'difficulty_n', (select count(*)::integer from difficulty_by_student),
    'difficulty_missing_n', greatest((select count(*) from cohort) - (select count(*) from difficulty_by_student), 0),
    'difficulty_mean', (select round(avg(value), 2) from difficulty_by_student),
    'difficulty_median', (select round(percentile_cont(0.5) within group (order by value)::numeric, 2) from difficulty_by_student),
    'difficulty_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from difficulty_distribution
    ), '[]'::jsonb),
    'intent_n', (select count(*)::integer from intent_by_student),
    'intent_missing_n', greatest((select count(*) from cohort) - (select count(*) from intent_by_student), 0),
    'intent_mean', (select round(avg(value), 2) from intent_by_student),
    'intent_median', (select round(percentile_cont(0.5) within group (order by value)::numeric, 2) from intent_by_student),
    'intent_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('value', value, 'count', n) order by value)
      from intent_distribution
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_mentor_student_level_likert(integer, text) from public;
grant execute on function public.get_mentor_student_level_likert(integer, text) to authenticated;
