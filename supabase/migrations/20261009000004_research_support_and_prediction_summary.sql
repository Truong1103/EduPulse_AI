create or replace function public.get_research_support_and_prediction_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or public.jwt_role() not in ('researcher', 'admin') then
    raise exception 'Chỉ Researcher/Admin mới được xem aggregate hỗ trợ và dự đoán.';
  end if;

  with eligible_support_invites as (
    select si.*
    from public.support_invites si
    join public.profiles p on p.id = si.student_id and p.role = 'student' and p.status = 'active'
    where exists (
      select 1
      from public.consents c
      where c.student_id = si.student_id and c.withdrawn_at is null
    )
  ), support_metrics as (
    select
      count(*)::integer as total_invites,
      count(distinct student_id)::integer as supported_students,
      count(*) filter (where status = 'accepted')::integer as accepted_invites,
      count(*) filter (where status = 'declined')::integer as declined_invites,
      count(*) filter (where status = 'snoozed')::integer as snoozed_invites,
      count(*) filter (where helpful is not null)::integer as helpful_responses,
      round(avg(helpful)::numeric, 2) as mean_helpful_rating
    from eligible_support_invites
  ), first_invite as (
    select student_id, min(sent_at)::date as first_sent_date
    from eligible_support_invites
    group by student_id
  ), valid_weekly_completion as (
    select
      ws.student_id,
      ws.week_start,
      ws.planned_current,
      round((count(sl.id) filter (where sl.status = 'done'))::numeric / nullif(ws.planned_current, 0) * 100, 2) as strict_pct_current
    from public.weekly_summary ws
    left join public.session_logs sl
      on sl.student_id = ws.student_id
      and sl.session_date >= ws.week_start
      and sl.session_date <= ws.week_start + 6
    left join public.weekly_status status
      on status.student_id = ws.student_id and status.week_start = ws.week_start
    where ws.planned_current > 0
      and coalesce(status.status, 'training') <> 'resting'
      and exists (
        select 1 from public.plan_versions pv
        where pv.student_id = ws.student_id
          and pv.effective_from <= ws.week_start + 6
      )
      and not exists (
        select 1 from public.rest_periods rp
        where rp.student_id = ws.student_id
          and rp.date_from <= ws.week_start + 6
          and rp.date_to >= ws.week_start
      )
    group by ws.student_id, ws.week_start, ws.planned_current
  ), baseline_week as (
    select distinct on (fi.student_id)
      fi.student_id,
      completion.week_start,
      completion.strict_pct_current
    from first_invite fi
    join valid_weekly_completion completion on completion.student_id = fi.student_id
    where completion.week_start < date_trunc('week', fi.first_sent_date::timestamp)::date
    order by fi.student_id, completion.week_start desc
  ), followup_week as (
    select distinct on (fi.student_id)
      fi.student_id,
      completion.week_start,
      completion.strict_pct_current
    from first_invite fi
    join valid_weekly_completion completion on completion.student_id = fi.student_id
    where completion.week_start >= date_trunc('week', fi.first_sent_date::timestamp)::date + 7
      and completion.week_start < date_trunc('week', fi.first_sent_date::timestamp)::date + 21
    order by fi.student_id, completion.week_start asc
  ), paired_completion as (
    select
      before.student_id,
      before.strict_pct_current as before_pct,
      after.strict_pct_current as after_pct,
      after.strict_pct_current - before.strict_pct_current as delta_pct
    from baseline_week before
    join followup_week after on after.student_id = before.student_id
    where before.strict_pct_current is not null and after.strict_pct_current is not null
  ), eligible_model_predictions as (
    select pred.student_id, pred.risk_score, pred.flagged
    from public.predictions pred
    join public.model_versions mv
      on mv.id = pred.model_version_id and mv.locked_at is not null
    join public.test_set_access access
      on access.model_version_id = mv.id and access.opened_at is not null
    join public.profiles p on p.id = pred.student_id and p.role = 'student' and p.status = 'active'
    where pred.method = 'model'
      and pred.insufficient_data = false
      and pred.risk_score between 0 and 1
      and exists (
        select 1 from public.consents c
        where c.student_id = pred.student_id and c.withdrawn_at is null
      )
  ), probability_bands as (
    select
      case
        when risk_score < 0.2 then '0–19%'
        when risk_score < 0.4 then '20–39%'
        when risk_score < 0.6 then '40–59%'
        when risk_score < 0.8 then '60–79%'
        else '80–100%'
      end as label,
      count(*)::integer as n,
      min(case
        when risk_score < 0.2 then 1
        when risk_score < 0.4 then 2
        when risk_score < 0.6 then 3
        when risk_score < 0.8 then 4
        else 5
      end) as band_order
    from eligible_model_predictions
    group by 1
  ), prediction_metrics as (
    select
      count(*)::integer as prediction_rows,
      count(distinct student_id)::integer as students_with_test_predictions,
      count(*) filter (where flagged)::integer as flagged_prediction_rows,
      round(avg(risk_score)::numeric, 4) as mean_predicted_probability
    from eligible_model_predictions
  )
  select jsonb_build_object(
    'support', jsonb_build_object(
      'total_invites', sm.total_invites,
      'supported_students', sm.supported_students,
      'accepted_invites', sm.accepted_invites,
      'declined_invites', sm.declined_invites,
      'snoozed_invites', sm.snoozed_invites,
      'helpful_responses', sm.helpful_responses,
      'mean_helpful_rating', sm.mean_helpful_rating
    ),
    'paired_completion', jsonb_build_object(
      'n', (select count(*)::integer from paired_completion),
      'mean_before_pct', (select round(avg(before_pct)::numeric, 1) from paired_completion),
      'mean_after_pct', (select round(avg(after_pct)::numeric, 1) from paired_completion),
      'mean_change_pp', (select round(avg(delta_pct)::numeric, 1) from paired_completion),
      'median_change_pp', (select round(percentile_cont(0.5) within group (order by delta_pct)::numeric, 1) from paired_completion),
      'improved_n', (select count(*) filter (where delta_pct > 0)::integer from paired_completion),
      'unchanged_n', (select count(*) filter (where delta_pct = 0)::integer from paired_completion),
      'declined_n', (select count(*) filter (where delta_pct < 0)::integer from paired_completion)
    ),
    'model_predictions', jsonb_build_object(
      'prediction_rows', pm.prediction_rows,
      'students', pm.students_with_test_predictions,
      'flagged_rows', pm.flagged_prediction_rows,
      'mean_predicted_probability', pm.mean_predicted_probability,
      'evaluation_status', 'operational_scores_not_independent_test_evaluation',
      'probability_bands', coalesce((
        select jsonb_agg(jsonb_build_object('label', label, 'count', n) order by band_order)
        from probability_bands
      ), '[]'::jsonb)
    )
  ) into result
  from support_metrics sm
  cross join prediction_metrics pm;

  return result;
end;
$$;

revoke all on function public.get_research_support_and_prediction_summary() from public;
grant execute on function public.get_research_support_and_prediction_summary() to authenticated;
