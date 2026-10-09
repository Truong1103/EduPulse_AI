begin;

do $$
declare
  mentor_stats_definition text;
  student_level_stats_definition text;
  admin_quality_definition text;
  research_support_definition text;
  student_status_definition text;
  mentor_status_definition text;
  outcomes_view_definition text;
begin
  if has_table_privilege('authenticated', 'public.study_outcome_events', 'select') then
    raise exception 'Authenticated must not read raw study_outcome_events.';
  end if;
  if has_table_privilege('anon', 'public.study_outcome_events', 'select') then
    raise exception 'Anonymous users must not read raw study_outcome_events.';
  end if;
  if has_table_privilege('authenticated', 'public.research_analysis_snapshots', 'insert') then
    raise exception 'Snapshots must only be inserted through the audited RPC.';
  end if;
  if not has_table_privilege('authenticated', 'public.research_analysis_snapshots', 'select') then
    raise exception 'Researchers need read access to RLS-protected snapshots.';
  end if;
  if has_table_privilege('anon', 'public.research_analysis_snapshots', 'select') then
    raise exception 'Anonymous users must not read research snapshots.';
  end if;

  if not has_function_privilege('authenticated', 'public.get_mentor_cohort_statistics(integer,text)', 'execute') then
    raise exception 'Authenticated must be able to call the guarded mentor aggregate RPC.';
  end if;
  if has_function_privilege('anon', 'public.get_mentor_cohort_statistics(integer,text)', 'execute') then
    raise exception 'Anonymous users must not call mentor statistics.';
  end if;
  if not has_function_privilege('authenticated', 'public.get_mentor_student_level_likert(integer,text)', 'execute') then
    raise exception 'Authenticated must be able to call the guarded student-level Likert RPC.';
  end if;
  if has_function_privilege('anon', 'public.get_mentor_student_level_likert(integer,text)', 'execute') then
    raise exception 'Anonymous users must not call student-level Likert statistics.';
  end if;
  if not has_function_privilege('authenticated', 'public.get_admin_data_quality_summary()', 'execute') then
    raise exception 'Authenticated must be able to call the guarded Admin quality RPC.';
  end if;
  if has_function_privilege('anon', 'public.get_admin_data_quality_summary()', 'execute') then
    raise exception 'Anonymous users must not call Admin quality statistics.';
  end if;
  if not has_function_privilege('authenticated', 'public.get_research_support_and_prediction_summary()', 'execute') then
    raise exception 'Authenticated must be able to call the guarded Researcher support summary.';
  end if;
  if has_function_privilege('anon', 'public.get_research_support_and_prediction_summary()', 'execute') then
    raise exception 'Anonymous users must not call Researcher support statistics.';
  end if;
  if has_function_privilege('anon', 'public.confirm_mentor_weekly_status(uuid,date,text,text)', 'execute') then
    raise exception 'Anonymous users must not confirm outcomes.';
  end if;
  if not has_function_privilege('authenticated', 'public.confirm_student_weekly_status(date,text,text)', 'execute') then
    raise exception 'Authenticated students must be able to call the guarded self-confirmation RPC.';
  end if;
  if has_function_privilege('anon', 'public.confirm_student_weekly_status(date,text,text)', 'execute') then
    raise exception 'Anonymous users must not confirm student outcomes.';
  end if;
  if has_table_privilege('authenticated', 'public.weekly_status', 'insert')
     or has_table_privilege('authenticated', 'public.weekly_status', 'update') then
    raise exception 'Weekly status writes must go through the outcome-history RPCs.';
  end if;
  if has_function_privilege('anon', 'public.save_research_analysis_snapshot(text,jsonb,jsonb)', 'execute') then
    raise exception 'Anonymous users must not save analysis snapshots.';
  end if;
  if not has_function_privilege('authenticated', 'public.confirm_mentor_weekly_status(uuid,date,text,text)', 'execute') then
    raise exception 'Mentor status confirmation RPC is not granted to authenticated.';
  end if;
  if not has_function_privilege('authenticated', 'public.save_research_analysis_snapshot(text,jsonb,jsonb)', 'execute') then
    raise exception 'Research snapshot RPC is not granted to authenticated.';
  end if;

  select pg_get_functiondef('public.get_mentor_cohort_statistics(integer,text)'::regprocedure)
    into mentor_stats_definition;
  if position('ma.mentor_id = auth.uid()' in lower(mentor_stats_definition)) = 0
     or position('c.withdrawn_at is null' in lower(mentor_stats_definition)) = 0 then
    raise exception 'Mentor aggregate RPC lost its assignment or active-consent scope.';
  end if;

  select pg_get_functiondef('public.get_mentor_student_level_likert(integer,text)'::regprocedure)
    into student_level_stats_definition;
  if position('ma.mentor_id = auth.uid()' in lower(student_level_stats_definition)) = 0
     or position('c.withdrawn_at is null' in lower(student_level_stats_definition)) = 0
     or position('group by student_id' in lower(student_level_stats_definition)) = 0 then
    raise exception 'Student-level Likert RPC lost its assignment, consent, or per-student aggregation.';
  end if;

  select pg_get_functiondef('public.get_admin_data_quality_summary()'::regprocedure)
    into admin_quality_definition;
  if position('jwt_role() <> ''admin''' in lower(admin_quality_definition)) = 0 then
    raise exception 'Admin data-quality RPC lost its role gate.';
  end if;

  select pg_get_functiondef('public.get_research_support_and_prediction_summary()'::regprocedure)
    into research_support_definition;
  if position('public.jwt_role() not in (''researcher'', ''admin'')' in lower(research_support_definition)) = 0
     or position('mv.locked_at is not null' in lower(research_support_definition)) = 0
     or position('c.withdrawn_at is null' in lower(research_support_definition)) = 0 then
    raise exception 'Research support/prediction RPC lost its role, locked-model, or consent guard.';
  end if;
  if position('join followup_week after on after.student_id = before.student_id' in lower(research_support_definition)) = 0 then
    raise exception 'Support before/after report must use paired student observations.';
  end if;
  if position('sl.status = ''done''' in lower(research_support_definition)) = 0
     or position('sl.status = ''partial''' in lower(research_support_definition)) > 0 then
    raise exception 'Paired support completion must use strict done status and exclude partial sessions.';
  end if;

  select pg_get_functiondef('public.confirm_mentor_weekly_status(uuid,date,text,text)'::regprocedure)
    into mentor_status_definition;
  if position('is_assigned_mentor(p_student_id)' in lower(mentor_status_definition)) = 0
     or position('c.withdrawn_at is null' in lower(mentor_status_definition)) = 0 then
    raise exception 'Outcome confirmation RPC lost its assignment or active-consent guard.';
  end if;

  select pg_get_functiondef('public.confirm_student_weekly_status(date,text,text)'::regprocedure)
    into student_status_definition;
  if position('public.jwt_role() <> ''student''' in lower(student_status_definition)) = 0
     or position('student_id uuid := auth.uid()' in lower(student_status_definition)) = 0
     or position('p.id = student_id' in lower(student_status_definition)) = 0
     or position('insert into public.study_outcome_events' in lower(student_status_definition)) = 0
     or position('c.withdrawn_at is null' in lower(student_status_definition)) = 0 then
    raise exception 'Student self-confirmation RPC lost its role/consent guard or outcome history write.';
  end if;

  select pg_get_viewdef('public.v_research_confirmed_outcomes'::regclass, true)
    into outcomes_view_definition;
  if position('jwt_role' in lower(outcomes_view_definition)) = 0
     or position('researcher' in lower(outcomes_view_definition)) = 0 then
    raise exception 'Confirmed-outcome view lost its researcher/admin role gate.';
  end if;
  if exists (
    select 1
    from pg_attribute a
    where a.attrelid = 'public.v_research_confirmed_outcomes'::regclass
      and a.attnum > 0
      and not a.attisdropped
      and a.attname in ('student_id', 'confirmed_by', 'note')
  ) then
    raise exception 'Researcher outcome view must not expose UUIDs or free-text notes.';
  end if;
end;
$$;

rollback;
