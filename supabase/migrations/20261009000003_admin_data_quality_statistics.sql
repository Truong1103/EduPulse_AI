create or replace function public.get_admin_data_quality_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được xem thống kê chất lượng dữ liệu.';
  end if;

  with log_aggregate as (
    select
      count(*)::integer as total_logs,
      count(*) filter (where sl.session_date >= date_trunc('week', current_date::timestamp)::date)::integer as logs_this_week,
      count(*) filter (where sl.status = 'done')::integer as done_logs,
      count(*) filter (where sl.status = 'partial')::integer as partial_logs,
      count(*) filter (where sl.status = 'missed')::integer as missed_logs,
      count(*) filter (where sl.duration_min is not null and (sl.duration_min < 0 or sl.duration_min > 240))::integer as duration_outliers,
      count(*) filter (where sl.duration_min is null or 'duration' = any(coalesce(sl.skipped_fields, array[]::text[])))::integer as duration_missing,
      count(*) filter (where sl.motivation is null or 'motivation' = any(coalesce(sl.skipped_fields, array[]::text[])))::integer as motivation_missing,
      count(*) filter (where sl.difficulty is null or 'difficulty' = any(coalesce(sl.skipped_fields, array[]::text[])))::integer as difficulty_missing,
      count(*) filter (where sl.intent_continue is null or 'intent' = any(coalesce(sl.skipped_fields, array[]::text[])))::integer as intent_missing,
      count(*) filter (where nullif(trim(sl.barrier), '') is null or 'barrier' = any(coalesce(sl.skipped_fields, array[]::text[])))::integer as barrier_missing,
      count(*) filter (where coalesce(cardinality(sl.skipped_fields), 0) > 0)::integer as logs_with_skipped_fields
    from public.session_logs sl
  ), status_distribution as (
    select sl.status as label, count(*)::integer as count
    from public.session_logs sl
    group by sl.status
  ), student_funnel as (
    select
      count(*) filter (where p.status = 'active')::integer as active_students,
      count(*) filter (where p.status = 'active' and exists (
        select 1 from public.consents c
        where c.student_id = p.id and c.withdrawn_at is null
      ))::integer as active_consented_students,
      count(*) filter (where exists (
        select 1 from public.study_arms sa where sa.student_id = p.id
      ))::integer as randomized_students,
      count(*) filter (where p.status = 'active' and not exists (
        select 1 from public.session_logs sl where sl.student_id = p.id
      ))::integer as active_students_without_logs
    from public.profiles p
    where p.role = 'student'
  ), duplicate_aggregate as (
    select
      count(*)::integer as duplicate_keys,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'student_code', duplicate_rows.student_code,
          'session_date', duplicate_rows.session_date,
          'duplicate_count', duplicate_rows.duplicate_count
        ) order by duplicate_rows.duplicate_count desc, duplicate_rows.session_date desc)
        from (
          select
            p.student_code,
            sl.session_date,
            count(*)::integer as duplicate_count
          from public.session_logs sl
          join public.profiles p on p.id = sl.student_id
          group by sl.student_id, sl.goal_id, sl.session_date, p.student_code
          having count(*) > 1
          order by count(*) desc, sl.session_date desc
          limit 30
        ) duplicate_rows
      ), '[]'::jsonb) as duplicate_rows
    from (
      select sl.student_id, sl.goal_id, sl.session_date
      from public.session_logs sl
      group by sl.student_id, sl.goal_id, sl.session_date
      having count(*) > 1
    ) duplicates
  )
  select jsonb_build_object(
    'total_logs', la.total_logs,
    'logs_this_week', la.logs_this_week,
    'done_logs', la.done_logs,
    'partial_logs', la.partial_logs,
    'missed_logs', la.missed_logs,
    'duration_outliers', la.duration_outliers,
    'logs_with_skipped_fields', la.logs_with_skipped_fields,
    'status_distribution', coalesce((
      select jsonb_agg(jsonb_build_object('label', label, 'count', count) order by label)
      from status_distribution
    ), '[]'::jsonb),
    'missingness', jsonb_build_array(
      jsonb_build_object('field', 'Thời lượng', 'missing', la.duration_missing, 'denominator', la.total_logs),
      jsonb_build_object('field', 'Động lực', 'missing', la.motivation_missing, 'denominator', la.total_logs),
      jsonb_build_object('field', 'Độ khó', 'missing', la.difficulty_missing, 'denominator', la.total_logs),
      jsonb_build_object('field', 'Ý định tiếp tục', 'missing', la.intent_missing, 'denominator', la.total_logs),
      jsonb_build_object('field', 'Rào cản', 'missing', la.barrier_missing, 'denominator', la.total_logs)
    ),
    'active_students', sf.active_students,
    'active_consented_students', sf.active_consented_students,
    'randomized_students', sf.randomized_students,
    'active_students_without_logs', sf.active_students_without_logs,
    'duplicate_keys', da.duplicate_keys,
    'duplicate_rows', da.duplicate_rows,
    'outlier_rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', anomaly.id,
        'student_code', anomaly.student_code,
        'session_date', anomaly.session_date,
        'duration_min', anomaly.duration_min
      ) order by anomaly.duration_min desc)
      from (
        select sl.id, p.student_code, sl.session_date, sl.duration_min
        from public.session_logs sl
        join public.profiles p on p.id = sl.student_id
        where sl.duration_min is not null and (sl.duration_min < 0 or sl.duration_min > 240)
        order by sl.duration_min desc
        limit 30
      ) anomaly
    ), '[]'::jsonb)
  ) into result
  from log_aggregate la
  cross join student_funnel sf
  cross join duplicate_aggregate da;

  return result;
end;
$$;

revoke all on function public.get_admin_data_quality_summary() from public;
grant execute on function public.get_admin_data_quality_summary() to authenticated;
