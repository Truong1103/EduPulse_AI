begin;

create or replace function public.calculate_weekly_summary(p_week_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row record;
  planned_original integer;
  planned_current integer;
  completed_sessions integer;
  pct_original numeric;
  pct_current numeric;
begin
  if p_week_start is null
     or p_week_start <> date_trunc('week', p_week_start::timestamp)::date then
    raise exception 'Ngày bắt đầu tuần phải là thứ Hai.';
  end if;

  for student_row in
    select p.id as student_id
    from public.profiles p
    where p.role = 'student' and p.status = 'active'
  loop
    planned_original := null;
    planned_current := null;
    completed_sessions := 0;
    pct_original := null;
    pct_current := null;

    select pv.sessions_per_week into planned_original
    from public.plan_versions pv
    where pv.student_id = student_row.student_id
    order by pv.effective_from asc, pv.created_at asc
    limit 1;

    select pv.sessions_per_week into planned_current
    from public.plan_versions pv
    where pv.student_id = student_row.student_id
      and pv.effective_from <= p_week_start + 6
    order by pv.effective_from desc, pv.created_at desc
    limit 1;

    select count(*) into completed_sessions
    from public.session_logs sl
    where sl.student_id = student_row.student_id
      and sl.session_date between p_week_start and p_week_start + 6
      and sl.status in ('done', 'partial');

    if planned_original > 0 then
      pct_original := round(completed_sessions::numeric / planned_original * 100, 2);
    end if;
    if planned_current > 0 then
      pct_current := round(completed_sessions::numeric / planned_current * 100, 2);
    end if;

    insert into public.weekly_summary (
      student_id, week_start, planned_original, planned_current, done,
      pct_original, pct_current, calculated_at
    ) values (
      student_row.student_id, p_week_start,
      coalesce(planned_original, 0), coalesce(planned_current, 0), completed_sessions,
      pct_original, pct_current, now()
    )
    on conflict (student_id, week_start) do update set
      planned_original = excluded.planned_original,
      planned_current = excluded.planned_current,
      done = excluded.done,
      pct_original = excluded.pct_original,
      pct_current = excluded.pct_current,
      calculated_at = excluded.calculated_at;
  end loop;
end;
$$;

create or replace function public.run_weekly_prediction(p_week_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  student_row record;
  active_model record;
  pct_7d numeric;
  pct_14d numeric;
  missed_sessions integer;
  plan_changes integer;
  summary_weeks integer;
  logs_14d integer;
  z_score numeric;
  probability numeric;
  flagged boolean;
  insufficient boolean;
  support_active boolean;
  content_id uuid;
  prediction_id uuid;
  prediction_method text;
begin
  if p_week_start is null
     or p_week_start <> date_trunc('week', p_week_start::timestamp)::date then
    raise exception 'Ngày bắt đầu tuần phải là thứ Hai.';
  end if;

  perform pg_advisory_xact_lock(hashtext('weekly-prediction'), hashtext(p_week_start::text));

  select coalesce((
    select (setting.value)::boolean
    from public.app_settings setting
    where setting.key = 'support_enabled'
  ), true) into support_active;

  select * into active_model
  from public.model_versions
  where active = true
  limit 1;
  prediction_method := case when active_model.id is null then 'rule' else 'model' end;

  for student_row in (
    select p.id as student_id, study_arm.arm
    from public.profiles p
    join public.consents consent
      on consent.student_id = p.id and consent.withdrawn_at is null
    left join public.study_arms study_arm on study_arm.student_id = p.id
    where p.role = 'student' and p.status = 'active'
  ) loop
    pct_7d := null;
    pct_14d := null;
    missed_sessions := 0;
    plan_changes := 0;
    summary_weeks := 0;
    logs_14d := 0;
    probability := null;
    flagged := false;
    insufficient := false;
    prediction_id := null;

    select
      max(summary.pct_current) filter (where summary.week_start = p_week_start),
      avg(summary.pct_current) filter (where summary.week_start in (p_week_start, p_week_start - 7)),
      count(*) filter (
        where summary.week_start in (p_week_start, p_week_start - 7)
          and summary.planned_current > 0
          and summary.pct_current is not null
      )::integer
    into pct_7d, pct_14d, summary_weeks
    from public.weekly_summary summary
    where summary.student_id = student_row.student_id;

    select count(*) into logs_14d
    from public.session_logs sl
    where sl.student_id = student_row.student_id
      and sl.session_date between p_week_start - 7 and p_week_start + 6;

    select count(*) into missed_sessions
    from (
      select sl.status
      from public.session_logs sl
      where sl.student_id = student_row.student_id
        and sl.session_date <= p_week_start + 6
      order by sl.session_date desc
      limit 5
    ) recent_sessions
    where recent_sessions.status = 'missed';

    select count(*) into plan_changes
    from public.plan_versions pv
    where pv.student_id = student_row.student_id;

    insufficient := summary_weeks < 2
      or logs_14d < 3
      or pct_7d is null
      or pct_14d is null;

    if insufficient then
      insert into public.predictions (
        student_id, model_version_id, week_start, method, risk_score,
        flagged, insufficient_data, features
      ) values (
        student_row.student_id,
        active_model.id,
        p_week_start,
        prediction_method,
        null,
        false,
        true,
        jsonb_build_object(
          'summaryWeeks', summary_weeks,
          'sessionLogs14d', logs_14d,
          'requiredSummaryWeeks', 2,
          'requiredSessionLogs14d', 3
        )
      )
      on conflict (student_id, week_start) do update set
        model_version_id = excluded.model_version_id,
        method = excluded.method,
        risk_score = null,
        flagged = false,
        insufficient_data = true,
        features = excluded.features
      returning id into prediction_id;

      continue;
    end if;

    if active_model.id is not null then
      z_score := active_model.intercept
        + coalesce((active_model.coefficients ->> 'pct_7d')::numeric, -0.015) * (pct_7d / 100.0)
        + coalesce((active_model.coefficients ->> 'pct_14d')::numeric, -0.02) * (pct_14d / 100.0)
        + coalesce((active_model.coefficients ->> 'consecutive_missed')::numeric, 0.5) * missed_sessions
        + coalesce((active_model.coefficients ->> 'plan_changes')::numeric, 0.2) * plan_changes;
      probability := 1.0 / (1.0 + exp(-z_score));
      flagged := coalesce(probability >= active_model.threshold, false);
    else
      flagged := pct_7d < 50 and pct_14d < 50;
      probability := case when flagged then 0.75 else 0.20 end;
    end if;

    insert into public.predictions (
      student_id, model_version_id, week_start, method, risk_score,
      flagged, insufficient_data, features
    ) values (
      student_row.student_id,
      active_model.id,
      p_week_start,
      prediction_method,
      round(probability, 4),
      flagged,
      false,
      jsonb_build_object(
        'pct_7d', pct_7d,
        'pct_14d', pct_14d,
        'missed', missed_sessions,
        'plan_changes', plan_changes,
        'summaryWeeks', summary_weeks,
        'sessionLogs14d', logs_14d
      )
    )
    on conflict (student_id, week_start) do update set
      model_version_id = excluded.model_version_id,
      method = excluded.method,
      risk_score = excluded.risk_score,
      flagged = excluded.flagged,
      insufficient_data = false,
      features = excluded.features
    returning id into prediction_id;

    if support_active
       and flagged
       and student_row.arm = 'intervention'
       and not exists (
         select 1 from public.support_invites invite
         where invite.prediction_id = prediction_id
       ) then
      content_id := null;
      select content.id into content_id
      from public.support_content content
      where content.status = 'approved'
      order by random()
      limit 1;

      if content_id is not null then
        begin
          insert into public.support_invites (student_id, prediction_id, content_id, status)
          values (student_row.student_id, prediction_id, content_id, 'sent');
        exception when others then
          null;
        end;
      end if;
    end if;
  end loop;
end;
$$;

create or replace function public.admin_run_weekly_pipeline(p_week_start date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  flagged_students integer;
  insufficient_students integer;
  sent_invites integer;
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được chạy xử lý tuần.';
  end if;
  if p_week_start is null
     or p_week_start <> date_trunc('week', p_week_start::timestamp)::date then
    raise exception 'Ngày bắt đầu tuần phải là thứ Hai.';
  end if;

  perform public.calculate_weekly_summary(p_week_start - 7);
  perform public.calculate_weekly_summary(p_week_start);
  perform public.run_weekly_prediction(p_week_start);

  select
    count(*) filter (where prediction.flagged and not prediction.insufficient_data)::integer,
    count(*) filter (where prediction.insufficient_data)::integer
  into flagged_students, insufficient_students
  from public.predictions prediction
  where prediction.week_start = p_week_start;

  select count(*)::integer into sent_invites
  from public.support_invites invite
  join public.predictions prediction on prediction.id = invite.prediction_id
  where prediction.week_start = p_week_start;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (
    auth.uid(),
    'admin',
    'run_weekly_support_pipeline',
    'predictions',
    jsonb_build_object('weekStart', p_week_start, 'summaryWeeksRecalculated', 2)
  );

  return jsonb_build_object(
    'weekStart', p_week_start,
    'summaryWeeksRecalculated', 2,
    'flaggedStudents', coalesce(flagged_students, 0),
    'insufficientDataStudents', coalesce(insufficient_students, 0),
    'supportInvites', coalesce(sent_invites, 0),
    'status', 'completed'
  );
end;
$$;

revoke all on function public.admin_run_weekly_pipeline(date) from public, anon, authenticated;
grant execute on function public.admin_run_weekly_pipeline(date) to authenticated;

commit;