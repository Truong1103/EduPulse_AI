begin;

alter table public.profiles
  add column if not exists email text,
  add column if not exists gmail text,
  add column if not exists full_name text,
  add column if not exists ten text,
  add column if not exists avatar_url text;

create table if not exists public.research_report_config (
  id boolean primary key default true check (id),
  retention_threshold_pct smallint check (retention_threshold_pct between 1 and 100),
  primary_denominator_type text check (primary_denominator_type in ('all_randomized', 'under_observation', 'completed_followup')),
  retention_target_pct smallint check (retention_target_pct between 1 and 100),
  min_sample_size smallint check (min_sample_size between 1 and 10000),
  min_retention_diff smallint not null default 15 check (min_retention_diff between 1 and 100),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create sequence if not exists public.seq_student_code start 1001;

create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text;
  user_meta jsonb;
  profile_row public.profiles;
  invite_row public.invited_users%rowtype;
  assigned_role app_role := 'student';
  assigned_code text;
  is_lead boolean := false;
  display_name text;
  avatar text;
begin
  if uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  select email, raw_user_meta_data
    into user_email, user_meta
    from auth.users
    where id = uid;

  select * into profile_row from public.profiles where id = uid;
  display_name := coalesce(
    user_meta->>'full_name',
    user_meta->>'name',
    split_part(coalesce(user_email, ''), '@', 1),
    'Người dùng'
  );
  avatar := coalesce(user_meta->>'avatar_url', user_meta->>'picture', '');

  if found then
    update public.profiles
      set email = coalesce(email, user_email),
          gmail = coalesce(gmail, user_email),
          full_name = coalesce(full_name, display_name),
          ten = coalesce(ten, display_name),
          avatar_url = coalesce(avatar_url, avatar),
          updated_at = now()
      where id = uid
      returning * into profile_row;
    insert into public.contacts (student_id, full_name, email, updated_at)
    values (uid, display_name, user_email, now())
    on conflict (student_id) do nothing;
    return profile_row;
  end if;

  select * into invite_row
    from public.invited_users
    where email_norm = lower(trim(coalesce(user_email, '')))
      and used_at is null
      and (expires_at is null or expires_at > now())
    order by created_at
    limit 1
    for update;

  if found then
    assigned_role := invite_row.role;
    assigned_code := invite_row.student_code;
    is_lead := coalesce(invite_row.is_lead_mentor, false);
  end if;

  if assigned_role = 'student' and nullif(assigned_code, '') is null then
    assigned_code := 'HS-' || lpad(nextval('public.seq_student_code')::text, 4, '0');
  end if;

  insert into public.profiles (
    id, email, gmail, full_name, ten, avatar_url, role, student_code, is_lead_mentor, status, updated_at
  ) values (
    uid, user_email, user_email, display_name, display_name, avatar,
    assigned_role, assigned_code, is_lead, 'active', now()
  )
  on conflict (id) do update
    set email = excluded.email, gmail = excluded.gmail, updated_at = now()
  returning * into profile_row;

  insert into public.contacts (student_id, full_name, email, updated_at)
  values (uid, display_name, user_email, now())
  on conflict (student_id) do nothing;

  if invite_row.id is not null then
    update public.invited_users set used_at = now(), used_by = uid where id = invite_row.id;
  end if;

  return profile_row;
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;

create or replace function public.withdraw_own_consent(p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() <> 'student' then
    raise exception 'Chỉ học sinh mới được gửi yêu cầu rút đồng ý.';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'Cần ghi lý do rút đồng ý.';
  end if;

  update public.consents
    set withdrawn_at = now(), withdraw_reason = trim(p_reason)
    where student_id = auth.uid() and withdrawn_at is null;
  if not found then
    raise exception 'Không tìm thấy đồng ý còn hiệu lực để rút.';
  end if;

  perform set_config('edupulse.allow_withdraw', 'on', true);
  update public.profiles set status = 'withdrawn', updated_at = now() where id = auth.uid();

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), 'student', 'withdraw_consent', 'consents', jsonb_build_object('reason', trim(p_reason)));
end;
$$;

revoke all on function public.withdraw_own_consent(text) from public;
grant execute on function public.withdraw_own_consent(text) to authenticated;

create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới có quyền xóa tài khoản.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Admin không được xóa chính mình.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'Không tìm thấy tài khoản cần xóa.';
  end if;

  delete from auth.users where id = p_user_id;
  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), 'admin', 'delete_user_account', 'profiles:' || p_user_id::text, jsonb_build_object('deletedAt', now()));
end;
$$;

revoke all on function public.delete_account(uuid) from public;
grant execute on function public.delete_account(uuid) to authenticated;

create or replace function public.admin_assign_mentor(p_mentor_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được phân công người hướng dẫn.';
  end if;
  if not exists (select 1 from public.profiles where id = p_mentor_id and role = 'mentor') then
    raise exception 'Tài khoản được chọn không phải Mentor.';
  end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'Tài khoản được chọn không phải học sinh.';
  end if;

  insert into public.mentor_assignments (mentor_id, student_id)
  values (p_mentor_id, p_student_id)
  on conflict (mentor_id, student_id) do nothing;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), 'admin', 'assign_mentor', 'mentor_assignments', jsonb_build_object('mentorId', p_mentor_id, 'studentId', p_student_id));
end;
$$;

create or replace function public.admin_update_mentor_assignment(
  p_old_mentor_id uuid,
  p_old_student_id uuid,
  p_mentor_id uuid,
  p_student_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được chỉnh phân công.';
  end if;
  if not exists (select 1 from public.profiles where id = p_mentor_id and role = 'mentor')
     or not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'Phân công mới không hợp lệ.';
  end if;
  if p_old_mentor_id = p_mentor_id and p_old_student_id = p_student_id then
    return;
  end if;

  insert into public.mentor_assignments (mentor_id, student_id)
  values (p_mentor_id, p_student_id)
  on conflict (mentor_id, student_id) do nothing;

  delete from public.mentor_assignments
  where mentor_id = p_old_mentor_id and student_id = p_old_student_id;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (
    auth.uid(), 'admin', 'update_mentor_assignment', 'mentor_assignments',
    jsonb_build_object('oldMentorId', p_old_mentor_id, 'oldStudentId', p_old_student_id, 'mentorId', p_mentor_id, 'studentId', p_student_id)
  );
end;
$$;

create or replace function public.admin_delete_mentor_assignment(p_mentor_id uuid, p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_rows integer;
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được xóa phân công.';
  end if;

  delete from public.mentor_assignments
  where mentor_id = p_mentor_id and student_id = p_student_id;
  get diagnostics affected_rows = row_count;
  if affected_rows = 0 then
    raise exception 'Không tìm thấy phân công cần xóa.';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), 'admin', 'delete_mentor_assignment', 'mentor_assignments', jsonb_build_object('mentorId', p_mentor_id, 'studentId', p_student_id));
end;
$$;

revoke all on function public.admin_assign_mentor(uuid, uuid) from public;
revoke all on function public.admin_update_mentor_assignment(uuid, uuid, uuid, uuid) from public;
revoke all on function public.admin_delete_mentor_assignment(uuid, uuid) from public;
grant execute on function public.admin_assign_mentor(uuid, uuid) to authenticated;
grant execute on function public.admin_update_mentor_assignment(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.admin_delete_mentor_assignment(uuid, uuid) to authenticated;

revoke all on function public.calculate_weekly_summary(date) from public, anon, authenticated;
revoke all on function public.run_weekly_prediction(date) from public, anon, authenticated;

create or replace function public.admin_calculate_weekly_summary(p_week_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được tổng hợp dữ liệu tuần.';
  end if;

  perform public.calculate_weekly_summary(p_week_start);
  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), 'admin', 'trigger_weekly_summary', 'weekly_summary', jsonb_build_object('weekStart', p_week_start));
end;
$$;

create or replace function public.admin_run_weekly_prediction(p_week_start date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.jwt_role() <> 'admin' then
    raise exception 'Chỉ Admin mới được chạy dự đoán tuần.';
  end if;

  perform public.run_weekly_prediction(p_week_start);
  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), 'admin', 'trigger_weekly_predict', 'predictions', jsonb_build_object('weekStart', p_week_start));
end;
$$;

revoke all on function public.admin_calculate_weekly_summary(date) from public;
revoke all on function public.admin_run_weekly_prediction(date) from public;
grant execute on function public.admin_calculate_weekly_summary(date) to authenticated;
grant execute on function public.admin_run_weekly_prediction(date) to authenticated;

create or replace function public.is_assigned_mentor(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mentor_assignments ma
    where ma.mentor_id = (select auth.uid())
      and ma.student_id = p_student_id
  );
$$;

revoke all on function public.is_assigned_mentor(uuid) from public;
grant execute on function public.is_assigned_mentor(uuid) to authenticated;

drop function if exists public.propose_study_arm_assignment(jsonb);
create or replace function public.propose_study_arm_assignment(p_student_codes text[], p_seed integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_codes text[];
  assignment_count integer := 0;
begin
  if auth.uid() is null or public.jwt_role() <> 'researcher' then
    raise exception 'Chỉ Nhà nghiên cứu mới được đề xuất phân nhóm.';
  end if;

  if p_seed is null or p_seed < 0 then
    raise exception 'Seed phải là số nguyên không âm.';
  end if;
  if coalesce(cardinality(p_student_codes), 0) = 0 then
    raise exception 'Danh sách phân nhóm không được để trống.';
  end if;

  select array_agg(distinct upper(trim(code))) into normalized_codes
  from unnest(p_student_codes) as requested(code)
  where nullif(trim(code), '') is not null;

  if coalesce(cardinality(normalized_codes), 0) = 0 then
    raise exception 'Danh sách phân nhóm không có mã học sinh hợp lệ.';
  end if;
  if cardinality(normalized_codes) <> cardinality(p_student_codes) then
    raise exception 'Danh sách có mã học sinh trùng lặp.';
  end if;

  if exists (
    select 1
    from unnest(normalized_codes) as requested(code)
    left join public.profiles p on p.student_code = requested.code and p.role = 'student' and p.status = 'active'
    left join public.consents c on c.student_id = p.id and c.withdrawn_at is null
    where p.id is null or c.id is null
  ) then
    raise exception 'Mọi mã phải thuộc học sinh đang hoạt động và có consent còn hiệu lực.';
  end if;

  if exists (
    select 1
    from public.study_arms sa
    join public.profiles p on p.id = sa.student_id
    where p.student_code = any(normalized_codes)
      and sa.approved_at is not null
  ) then
    raise exception 'Danh sách có học sinh đã được duyệt phân nhóm và không thể thay đổi.';
  end if;

  with eligible as (
    select
      p.id as student_id,
      p.student_code,
      coalesce(goal.activity_group, 'Khác') as activity_group
    from public.profiles p
    left join lateral (
      select g.activity_group
      from public.goals g
      where g.student_id = p.id and g.status = 'active'
      order by g.created_at desc
      limit 1
    ) goal on true
    where p.student_code = any(normalized_codes)
      and p.role = 'student'
      and p.status = 'active'
      and exists (
        select 1 from public.consents c
        where c.student_id = p.id and c.withdrawn_at is null
      )
  ), randomized as (
    select
      eligible.*,
      row_number() over (
        partition by activity_group
        order by hashtextextended(student_code, p_seed::bigint), student_code
      ) as stratum_position
    from eligible
  )
  insert into public.study_arms (
    student_id, arm, strata, seed, proposed_by, approved_by, approved_at
  )
  select
    student_id,
    case when stratum_position % 2 = 1 then 'intervention' else 'control' end,
    jsonb_build_object('activityGroup', activity_group),
    p_seed,
    auth.uid(),
    null,
    null
  from randomized
  on conflict (student_id) do update set
    arm = excluded.arm,
    strata = excluded.strata,
    seed = excluded.seed,
    proposed_by = excluded.proposed_by,
    approved_by = null,
    approved_at = null
  where public.study_arms.approved_at is null;

  get diagnostics assignment_count = row_count;
  if assignment_count <> coalesce(cardinality(normalized_codes), 0) then
    raise exception 'Không tạo đủ phân nhóm cho danh sách đã gửi.';
  end if;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (
    auth.uid(),
    'researcher',
    'propose_assignment',
    'study_arms',
    jsonb_build_object('count', assignment_count, 'seed', p_seed)
  );

  return assignment_count;
end;
$$;

revoke all on function public.propose_study_arm_assignment(text[], integer) from public;
grant execute on function public.propose_study_arm_assignment(text[], integer) to authenticated;

create or replace function public.save_research_report_config(p_config jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  threshold_pct smallint := nullif(p_config->>'retention_threshold_pct', '')::smallint;
  target_pct smallint := nullif(p_config->>'retention_target_pct', '')::smallint;
  sample_size smallint := nullif(p_config->>'min_sample_size', '')::smallint;
  min_diff smallint := coalesce(nullif(p_config->>'min_retention_diff', '')::smallint, 15);
  denominator_type text := nullif(p_config->>'primary_denominator_type', '');
begin
  if auth.uid() is null or public.jwt_role() not in ('researcher', 'admin') then
    raise exception 'Không đủ quyền cập nhật tham số báo cáo.';
  end if;

  insert into public.research_report_config (
    id, retention_threshold_pct, primary_denominator_type,
    retention_target_pct, min_sample_size, min_retention_diff,
    updated_by, updated_at
  ) values (
    true, threshold_pct, denominator_type,
    target_pct, sample_size, min_diff,
    auth.uid(), now()
  )
  on conflict (id) do update set
    retention_threshold_pct = excluded.retention_threshold_pct,
    primary_denominator_type = excluded.primary_denominator_type,
    retention_target_pct = excluded.retention_target_pct,
    min_sample_size = excluded.min_sample_size,
    min_retention_diff = excluded.min_retention_diff,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.audit_log (actor_id, actor_role, action, target, meta)
  values (auth.uid(), public.jwt_role(), 'update_research_report_config', 'research_report_config', p_config);
end;
$$;

revoke all on function public.save_research_report_config(jsonb) from public;
grant execute on function public.save_research_report_config(jsonb) to authenticated;

create or replace view public.v_research_efficacy_rows as
with latest_goals as (
  select distinct on (g.student_id) g.student_id
  from public.goals g
  where g.status = 'active'
  order by g.student_id, g.created_at desc
),
weekly_counts as (
  select ws.student_id, count(distinct ws.week_start)::integer as tracked_weeks
  from public.weekly_summary ws
  group by ws.student_id
),
latest_weekly_summary as (
  select distinct on (ws.student_id)
    ws.student_id, ws.pct_original, ws.pct_current
  from public.weekly_summary ws
  order by ws.student_id, ws.week_start desc
),
prediction_flags as (
  select p.student_id, bool_or(p.flagged) as was_flagged
  from public.predictions p
  group by p.student_id
)
select
  p.student_code,
  sa.arm,
  (
    p.status = 'active'
    and exists (
      select 1 from public.consents c
      where c.student_id = p.id and c.withdrawn_at is null
    )
    and lg.student_id is not null
    and lws.student_id is not null
  ) as under_observation,
  coalesce(wc.tracked_weeks, 0) as tracked_weeks,
  lws.pct_original as latest_pct_original,
  lws.pct_current as latest_pct_current,
  coalesce(pf.was_flagged, false) as was_flagged
from public.study_arms sa
join public.profiles p on p.id = sa.student_id and p.role = 'student'
left join latest_goals lg on lg.student_id = p.id
left join weekly_counts wc on wc.student_id = p.id
left join latest_weekly_summary lws on lws.student_id = p.id
left join prediction_flags pf on pf.student_id = p.id
where (select public.jwt_role()) in ('researcher', 'admin');

create or replace view public.v_research_weekly_bars as
select
  week_start,
  count(*)::integer as n,
  round(avg(pct_original))::integer as pct_original,
  round(avg(pct_current))::integer as pct_current,
  sum(done)::integer as done
from public.weekly_summary
where (select public.jwt_role()) in ('researcher', 'admin')
group by week_start;

create or replace view public.v_mentor_support_requests as
select
  sr.id,
  sr.student_id,
  p.student_code,
  sr.note,
  sr.status,
  sr.created_at,
  sr.response_note,
  sr.resolved_at
from public.support_requests sr
join public.mentor_assignments ma on ma.student_id = sr.student_id
join public.profiles p on p.id = sr.student_id
where ma.mentor_id = (select auth.uid())
  and (select public.jwt_role()) = 'mentor';

create or replace view public.v_mentor_buddy_links as
select
  bl.id,
  pa.student_code as code_a,
  pb.student_code as code_b,
  bl.status,
  bl.mentor_approved,
  bl.created_at
from public.buddy_links bl
join public.profiles pa on pa.id = bl.student_a
join public.profiles pb on pb.id = bl.student_b
where (select public.jwt_role()) = 'mentor'
  and (public.is_assigned_mentor(bl.student_a) or public.is_assigned_mentor(bl.student_b));

create or replace view public.v_lead_consents as
select c.id, p.student_code, c.form_version, c.consented_at, c.withdrawn_at
from public.consents c
join public.profiles p on p.id = c.student_id
where exists (
  select 1 from public.profiles viewer
  where viewer.id = (select auth.uid())
    and (viewer.role = 'admin' or (viewer.role = 'mentor' and viewer.is_lead_mentor))
);

create or replace view public.v_student_assigned_mentor as
select ma.mentor_id, p.full_name, p.ten, p.email, p.is_lead_mentor
from public.mentor_assignments ma
join public.profiles p on p.id = ma.mentor_id
where ma.student_id = (select auth.uid())
  and (select public.jwt_role()) = 'student';

create or replace function public.create_buddy_link_by_code(p_student_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  self_id uuid := auth.uid();
  resolved_id uuid;
begin
  if self_id is null or public.jwt_role() <> 'student' then
    raise exception 'Chỉ học sinh đã đăng nhập mới được mời bạn đồng hành.';
  end if;

  select p.id into resolved_id
  from public.profiles p
  where p.student_code = upper(trim(p_student_code))
    and p.role = 'student'
    and p.status = 'active';
  if resolved_id is null then
    raise exception 'Không tìm thấy học sinh đang hoạt động với mã này.';
  end if;
  if resolved_id = self_id then
    raise exception 'Không thể kết nối với chính mình.';
  end if;

  insert into public.buddy_links (student_a, student_b, status)
  values (self_id, resolved_id, 'pending');
end;
$$;

drop function if exists public.resolve_buddy_student_id(text);
revoke all on function public.create_buddy_link_by_code(text) from public;
grant execute on function public.create_buddy_link_by_code(text) to authenticated;
grant select on public.v_mentor_support_requests to authenticated;
grant select on public.v_mentor_buddy_links to authenticated;
grant select on public.v_lead_consents to authenticated;
grant select on public.v_student_assigned_mentor to authenticated;

create or replace view public.v_mentor_students as
select
  ma.mentor_id,
  p.id as student_id,
  p.student_code,
  g.id as goal_id,
  g.activity_group,
  g.target_date,
  coalesce(c.guardian_confirmed, false) as guardian_confirmed,
  c.consented_at
from public.mentor_assignments ma
join public.profiles p on p.id = ma.student_id
join public.consents c on c.student_id = p.id and c.withdrawn_at is null
left join public.goals g on g.student_id = p.id and g.status = 'active'
where ma.mentor_id = (select auth.uid())
  and (select public.jwt_role()) = 'mentor';

drop view if exists public.v_mentor_student_summary;
create view public.v_mentor_student_summary as
select
  ma.mentor_id,
  p.student_code,
  ws.week_start,
  ws.planned_original,
  ws.planned_current,
  ws.done,
  ws.pct_original,
  ws.pct_current,
  st.status as weekly_status,
  st.confirmed_by
from public.mentor_assignments ma
join public.profiles p on p.id = ma.student_id
join public.consents c on c.student_id = ma.student_id and c.withdrawn_at is null
join public.weekly_summary ws on ws.student_id = ma.student_id
left join public.weekly_status st on st.student_id = ws.student_id and st.week_start = ws.week_start
where ma.mentor_id = (select auth.uid())
  and (select public.jwt_role()) = 'mentor';

grant select on public.v_mentor_student_summary to authenticated;

create or replace view public.v_research_students as
with latest_goals as (
  select distinct on (g.student_id) g.student_id, g.activity_group
  from public.goals g
  where g.status = 'active'
  order by g.student_id, g.created_at desc
),
latest_consents as (
  select distinct on (c.student_id) c.student_id, c.consented_at
  from public.consents c
  where c.withdrawn_at is null
  order by c.student_id, c.consented_at desc
)
select
  p.student_code,
  sa.arm,
  sa.strata,
  g.activity_group,
  c.consented_at,
  p.status as student_status
from public.profiles p
left join public.study_arms sa on sa.student_id = p.id
left join latest_goals g on g.student_id = p.id
left join latest_consents c on c.student_id = p.id
where p.role = 'student'
  and (select public.jwt_role()) in ('researcher', 'admin');

create or replace view public.v_research_logs as
select
  p.student_code,
  sl.session_date,
  sl.status,
  sl.duration_min,
  sl.motivation,
  sl.difficulty,
  sl.barrier,
  sl.skipped_fields,
  sl.id as log_id
from public.session_logs sl
join public.profiles p on p.id = sl.student_id
where (select public.jwt_role()) in ('researcher', 'admin');

create or replace view public.v_outcomes as
with student_stats as (
  select
    p.student_code,
    sa.arm,
    count(distinct ws.week_start) as tracked_weeks,
    avg(ws.pct_current) as avg_pct_retention,
    bool_or(pred.flagged) as ever_flagged
  from public.profiles p
  join public.study_arms sa on sa.student_id = p.id
  join public.weekly_summary ws on ws.student_id = p.id
  left join public.predictions pred on pred.student_id = p.id and pred.week_start = ws.week_start
  where (select public.jwt_role()) in ('researcher', 'admin')
  group by p.student_code, sa.arm
)
select
  arm,
  count(*) as x_active_students,
  count(*) filter (where ever_flagged = true) as y_flagged_students,
  round(avg(avg_pct_retention), 2) as z_retention_rate,
  round(avg(tracked_weeks), 1) as t_follow_up_weeks
from student_stats
group by arm;

create or replace view public.v_missing as
with log_counts as (
  select
    student_id,
    count(*) filter (where status = 'missed') as missed_sessions,
    count(*) filter (where skipped_fields <> '{}') as logs_with_skipped_fields
  from public.session_logs
  group by student_id
),
rest_counts as (
  select student_id, count(*) as rest_periods_count
  from public.rest_periods
  group by student_id
)
select
  p.student_code,
  sa.arm,
  coalesce(lc.missed_sessions, 0) as missed_sessions,
  coalesce(lc.logs_with_skipped_fields, 0) as logs_with_skipped_fields,
  coalesce(rc.rest_periods_count, 0) as rest_periods_count
from public.profiles p
left join public.study_arms sa on sa.student_id = p.id
left join log_counts lc on lc.student_id = p.id
left join rest_counts rc on rc.student_id = p.id
where p.role = 'student'
  and (select public.jwt_role()) in ('researcher', 'admin');

create or replace view public.v_recruitment_flow as
select
  count(distinct iu.id) as total_invited,
  count(distinct p.id) filter (where p.status = 'active') as active_profiles,
  count(distinct c.id) filter (where c.consented_at is not null and c.withdrawn_at is null) as consented_students,
  count(distinct c.id) filter (where c.withdrawn_at is not null) as withdrawn_students,
  count(distinct sa.student_id) filter (where sa.arm = 'intervention') as intervention_count,
  count(distinct sa.student_id) filter (where sa.arm = 'control') as control_count
from public.invited_users iu
left join public.profiles p on p.id = iu.used_by
left join public.consents c on c.student_id = p.id
left join public.study_arms sa on sa.student_id = p.id
where exists (
  select 1 from public.profiles viewer
  where viewer.id = (select auth.uid())
    and (viewer.role = 'admin' or (viewer.role = 'mentor' and viewer.is_lead_mentor))
);

grant select on public.v_research_efficacy_rows to authenticated;
grant select on public.v_research_weekly_bars to authenticated;

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select auth.uid()) = old.id
     and coalesce(public.jwt_role(), '') <> 'admin'
     and (
       new.role is distinct from old.role
       or new.is_lead_mentor is distinct from old.is_lead_mentor
       or (
         new.status is distinct from old.status
         and current_setting('edupulse.allow_withdraw', true) is distinct from 'on'
       )
       or new.student_code is distinct from old.student_code
     ) then
    raise exception 'Người dùng không thể tự thay đổi vai trò hoặc trạng thái hồ sơ.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_escalation on public.profiles;
create trigger trg_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

create or replace function public.prevent_consent_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(public.jwt_role(), '') <> 'admin'
     and old.student_id = (select auth.uid())
     and (
       new.student_id is distinct from old.student_id
       or new.form_version is distinct from old.form_version
       or new.consented_at is distinct from old.consented_at
       or new.guardian_confirmed is distinct from old.guardian_confirmed
       or old.withdrawn_at is not null
       or new.withdrawn_at is null
       or nullif(trim(new.withdraw_reason), '') is null
     ) then
    raise exception 'Đồng ý tham gia chỉ được cập nhật để ghi nhận yêu cầu rút.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_consent_tampering on public.consents;
create trigger trg_prevent_consent_tampering
  before update on public.consents
  for each row execute function public.prevent_consent_tampering();

create or replace function public.prevent_buddy_pair_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.student_a is distinct from old.student_a
     or new.student_b is distinct from old.student_b then
    raise exception 'Không thể thay đổi thành viên của liên kết bạn đồng hành.';
  end if;

  if new.mentor_approved is distinct from old.mentor_approved
     and coalesce(public.jwt_role(), '') not in ('mentor', 'admin') then
    raise exception 'Chỉ người hướng dẫn mới được xác nhận liên kết bạn đồng hành.';
  end if;

  if coalesce(public.jwt_role(), '') = 'mentor'
     and new.status is distinct from old.status then
    raise exception 'Người hướng dẫn không thể thay đổi trạng thái lời mời bạn đồng hành.';
  end if;

  if coalesce(public.jwt_role(), '') = 'student'
     and new.status is distinct from old.status
     and not (
       old.status = 'pending'
       and (
         (old.student_a = (select auth.uid()) and new.status = 'cancelled')
         or (old.student_b = (select auth.uid()) and new.status in ('accepted', 'rejected'))
       )
     ) then
    raise exception 'Trạng thái liên kết bạn đồng hành không hợp lệ.';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_support_invite_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(public.jwt_role(), '') = 'student'
     and old.student_id = (select auth.uid())
     and (
       new.student_id is distinct from old.student_id
       or new.prediction_id is distinct from old.prediction_id
       or new.content_id is distinct from old.content_id
       or new.sent_at is distinct from old.sent_at
       or old.status <> 'sent'
       or new.status not in ('accepted', 'snoozed', 'declined')
       or new.responded_at is null
     ) then
    raise exception 'Chỉ được phản hồi một lần cho lời mời hỗ trợ của chính mình.';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_support_request_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(public.jwt_role(), '') = 'mentor'
     and (
       new.student_id is distinct from old.student_id
       or new.mentor_id is distinct from old.mentor_id
       or new.note is distinct from old.note
       or new.created_at is distinct from old.created_at
       or new.status not in ('in_progress', 'done')
     ) then
    raise exception 'Người hướng dẫn chỉ được cập nhật trạng thái và phản hồi yêu cầu.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_audit_actor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null
     or new.actor_id is distinct from auth.uid()
     or new.actor_role is distinct from public.jwt_role() then
    raise exception 'Audit log phải ghi đúng danh tính và vai trò từ phiên đăng nhập.';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_lead_mentor_assignment_edits()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(public.jwt_role(), '') = 'mentor'
     and (
       new.student_id is distinct from old.student_id
       or new.arm is distinct from old.arm
       or new.strata is distinct from old.strata
       or new.seed is distinct from old.seed
       or new.proposed_by is distinct from old.proposed_by
       or new.approved_by is distinct from (select auth.uid())
       or new.approved_at is null
     ) then
    raise exception 'GVHD chỉ được ghi nhận phê duyệt phân nhóm.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_buddy_pair_tampering on public.buddy_links;
create trigger trg_prevent_buddy_pair_tampering
  before update on public.buddy_links
  for each row execute function public.prevent_buddy_pair_tampering();

drop trigger if exists trg_prevent_support_invite_tampering on public.support_invites;
create trigger trg_prevent_support_invite_tampering
  before update on public.support_invites
  for each row execute function public.prevent_support_invite_tampering();

drop trigger if exists trg_prevent_support_request_tampering on public.support_requests;
create trigger trg_prevent_support_request_tampering
  before update on public.support_requests
  for each row execute function public.prevent_support_request_tampering();

drop trigger if exists trg_validate_audit_actor on public.audit_log;
create trigger trg_validate_audit_actor
  before insert on public.audit_log
  for each row execute function public.validate_audit_actor();

create or replace function public.prevent_test_set_request_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(public.jwt_role(), '') = 'mentor'
     and (
       old.opened_at is not null
       or new.model_version_id is distinct from old.model_version_id
       or new.requested_by is distinct from old.requested_by
       or new.notes is distinct from old.notes
       or new.approved_by is distinct from (select auth.uid())
       or new.opened_at is null
     ) then
    raise exception 'GVHD chỉ được mở tập kiểm tra đang chờ duyệt đúng một lần.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_test_set_request_tampering on public.test_set_access;
create trigger trg_prevent_test_set_request_tampering
  before update on public.test_set_access
  for each row execute function public.prevent_test_set_request_tampering();

drop trigger if exists trg_prevent_lead_mentor_assignment_edits on public.study_arms;
create trigger trg_prevent_lead_mentor_assignment_edits
  before update on public.study_arms
  for each row execute function public.prevent_lead_mentor_assignment_edits();

alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.consents enable row level security;
alter table public.goals enable row level security;
alter table public.plan_versions enable row level security;
alter table public.session_logs enable row level security;
alter table public.rest_periods enable row level security;
alter table public.weekly_status enable row level security;
alter table public.weekly_summary enable row level security;
alter table public.reminder_prefs enable row level security;
alter table public.predictions enable row level security;
alter table public.study_arms enable row level security;
alter table public.test_set_access enable row level security;
alter table public.support_content enable row level security;
alter table public.support_invites enable row level security;
alter table public.support_requests enable row level security;
alter table public.surveys enable row level security;
alter table public.data_requests enable row level security;
alter table public.definitions enable row level security;
alter table public.model_versions enable row level security;
alter table public.mentor_assignments enable row level security;
alter table public.invited_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;
alter table public.buddy_links enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.research_report_config enable row level security;

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(id))
  );
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.jwt_role()) = 'admin')
  with check (id = (select auth.uid()) or (select public.jwt_role()) = 'admin');

drop policy if exists contacts_admin on public.contacts;
drop policy if exists contacts_student_self on public.contacts;
drop policy if exists contacts_student_manage on public.contacts;
create policy contacts_select on public.contacts
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin');
create policy contacts_self_insert on public.contacts
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy contacts_self_update on public.contacts
  for update to authenticated using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
create policy contacts_admin_manage on public.contacts
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists consents_select on public.consents;
drop policy if exists consents_manage on public.consents;
create policy consents_select on public.consents
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy consents_self_insert on public.consents
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy consents_self_update on public.consents
  for update to authenticated using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
create policy consents_admin_manage on public.consents
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists student_goals on public.goals;
create policy goals_select on public.goals
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy goals_self_insert on public.goals
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy goals_self_update on public.goals
  for update to authenticated using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
create policy goals_admin_manage on public.goals
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists student_plans on public.plan_versions;
drop policy if exists student_create_plan on public.plan_versions;
create policy plan_versions_select on public.plan_versions
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy plan_versions_insert on public.plan_versions
  for insert to authenticated
  with check (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin');
revoke update, delete on public.plan_versions from authenticated;

drop policy if exists student_own_logs on public.session_logs;
drop policy if exists researcher_read_logs on public.session_logs;
drop policy if exists session_logs_select on public.session_logs;
drop policy if exists session_logs_insert on public.session_logs;
drop policy if exists session_logs_update on public.session_logs;
create policy session_logs_select on public.session_logs
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy session_logs_self_insert on public.session_logs
  for insert to authenticated
  with check (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student');
create policy session_logs_self_update on public.session_logs
  for update to authenticated
  using (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student')
  with check (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student');

drop policy if exists rest_periods_all on public.rest_periods;
create policy rest_periods_select on public.rest_periods
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy rest_periods_self_insert on public.rest_periods
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy rest_periods_admin_manage on public.rest_periods
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists weekly_status_select on public.weekly_status;
drop policy if exists weekly_status_manage on public.weekly_status;
create policy weekly_status_select on public.weekly_status
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy weekly_status_self_insert on public.weekly_status
  for insert to authenticated
  with check (student_id = (select auth.uid()) and confirmed_by = 'student');
create policy weekly_status_mentor_insert on public.weekly_status
  for insert to authenticated
  with check (
    (select public.jwt_role()) = 'mentor'
    and public.is_assigned_mentor(student_id)
    and confirmed_by = 'mentor'
  );
create policy weekly_status_self_update on public.weekly_status
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()) and confirmed_by = 'student');
create policy weekly_status_mentor_update on public.weekly_status
  for update to authenticated
  using ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id))
  with check ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id) and confirmed_by = 'mentor');
create policy weekly_status_admin_manage on public.weekly_status
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists weekly_summary_select on public.weekly_summary;
drop policy if exists weekly_summary_manage on public.weekly_summary;
create policy weekly_summary_select on public.weekly_summary
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id))
  );
create policy weekly_summary_admin_manage on public.weekly_summary
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists reminder_prefs_all on public.reminder_prefs;
create policy reminder_prefs_owner_manage on public.reminder_prefs
  for all to authenticated
  using (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin')
  with check (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin');

drop policy if exists predictions_research on public.predictions;
drop policy if exists predictions_select on public.predictions;
drop policy if exists predictions_manage on public.predictions;
create policy predictions_research_select on public.predictions
  for select to authenticated using ((select public.jwt_role()) = 'admin');
create policy predictions_research_manage on public.predictions
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists study_arms_research on public.study_arms;
drop policy if exists study_arms_select on public.study_arms;
drop policy if exists study_arms_manage on public.study_arms;
drop policy if exists study_arms_lead_approve on public.study_arms;
create policy study_arms_research_select on public.study_arms
  for select to authenticated
  using (
    (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_lead_mentor)
    )
  );
create policy study_arms_admin_manage on public.study_arms
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');
create policy study_arms_lead_approve on public.study_arms
  for update to authenticated
  using (
    (select public.jwt_role()) = 'mentor'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_lead_mentor)
  )
  with check (
    (select public.jwt_role()) = 'mentor'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_lead_mentor)
    and approved_by = (select auth.uid())
    and approved_at is not null
  );

drop policy if exists support_content_select on public.support_content;
drop policy if exists support_content_admin on public.support_content;
create policy support_content_read on public.support_content
  for select to authenticated, anon
  using (status = 'approved' or (select public.jwt_role()) in ('admin', 'mentor'));
create policy support_content_admin_manage on public.support_content
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists student_invites on public.support_invites;
drop policy if exists support_invites_select on public.support_invites;
drop policy if exists support_invites_manage on public.support_invites;
create policy support_invites_select on public.support_invites
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id))
  );
create policy support_invites_student_update on public.support_invites
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));
create policy support_invites_mentor_insert on public.support_invites
  for insert to authenticated
  with check ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id));
create policy support_invites_admin_manage on public.support_invites
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists support_requests_all on public.support_requests;
create policy support_requests_select on public.support_requests
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id))
  );
create policy support_requests_self_insert on public.support_requests
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy support_requests_mentor_update on public.support_requests
  for update to authenticated
  using ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id))
  with check ((select public.jwt_role()) = 'mentor' and public.is_assigned_mentor(student_id));
create policy support_requests_admin_manage on public.support_requests
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists surveys_all on public.surveys;
create policy surveys_select on public.surveys
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin');
create policy surveys_self_insert on public.surveys
  for insert to authenticated with check (student_id = (select auth.uid()));

drop policy if exists data_requests_all on public.data_requests;
create policy data_requests_select on public.data_requests
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin');
create policy data_requests_self_insert on public.data_requests
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy data_requests_admin_update on public.data_requests
  for update to authenticated
  using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists definitions_select on public.definitions;
drop policy if exists definitions_manage on public.definitions;
create policy definitions_read on public.definitions
  for select to authenticated, anon using (true);
create policy definitions_admin_research_manage on public.definitions
  for all to authenticated using ((select public.jwt_role()) in ('admin', 'researcher'))
  with check ((select public.jwt_role()) in ('admin', 'researcher'));

drop policy if exists model_versions_select on public.model_versions;
drop policy if exists model_versions_manage on public.model_versions;
create policy model_versions_read on public.model_versions
  for select to authenticated, anon using (true);
create policy model_versions_admin_research_manage on public.model_versions
  for all to authenticated using ((select public.jwt_role()) in ('admin', 'researcher'))
  with check ((select public.jwt_role()) in ('admin', 'researcher'));

drop policy if exists test_set_access_select on public.test_set_access;
drop policy if exists test_set_access_insert on public.test_set_access;
drop policy if exists test_set_access_update on public.test_set_access;
create policy test_set_access_select on public.test_set_access
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
    or (
      (select public.jwt_role()) = 'mentor'
      and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_lead_mentor)
    )
  );
create policy test_set_access_researcher_insert on public.test_set_access
  for insert to authenticated
  with check ((select public.jwt_role()) = 'researcher' and requested_by = (select auth.uid()));
create policy test_set_access_lead_update on public.test_set_access
  for update to authenticated
  using (
    (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_lead_mentor))
  )
  with check (
    (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_lead_mentor))
  );

drop policy if exists mentor_assignments_select on public.mentor_assignments;
drop policy if exists mentor_assignments_admin on public.mentor_assignments;
create policy mentor_assignments_select on public.mentor_assignments
  for select to authenticated
  using (
    mentor_id = (select auth.uid())
    or student_id = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy mentor_assignments_admin_manage on public.mentor_assignments
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists invited_users_select on public.invited_users;
drop policy if exists invited_users_admin on public.invited_users;
drop policy if exists invited_users_self_read on public.invited_users;
create policy invited_users_select on public.invited_users
  for select to authenticated
  using ((select public.jwt_role()) = 'admin' or email_norm = lower(trim(auth.jwt() ->> 'email')));
create policy invited_users_admin_manage on public.invited_users
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_read on public.app_settings
  for select to authenticated, anon using (true);
create policy app_settings_admin_manage on public.app_settings
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists audit_admin on public.audit_log;
drop policy if exists audit_insert on public.audit_log;
create policy audit_admin_read on public.audit_log
  for select to authenticated using ((select public.jwt_role()) = 'admin');
create policy audit_authenticated_insert on public.audit_log
  for insert to authenticated
  with check (actor_id = (select auth.uid()));
revoke update, delete on public.audit_log from authenticated;

drop policy if exists buddy_links_select on public.buddy_links;
drop policy if exists buddy_links_insert on public.buddy_links;
drop policy if exists buddy_links_update on public.buddy_links;
create policy buddy_links_select on public.buddy_links
  for select to authenticated
  using (
    student_a = (select auth.uid())
    or student_b = (select auth.uid())
    or (select public.jwt_role()) = 'admin'
  );
create policy buddy_links_student_insert on public.buddy_links
  for insert to authenticated
  with check (student_a = (select auth.uid()) and (select public.jwt_role()) = 'student');
create policy buddy_links_participant_update on public.buddy_links
  for update to authenticated
  using (student_a = (select auth.uid()) or student_b = (select auth.uid()))
  with check (
    (student_a = (select auth.uid()) and status in ('pending', 'cancelled'))
    or (student_b = (select auth.uid()) and status in ('accepted', 'rejected'))
  );
create policy buddy_links_mentor_approve on public.buddy_links
  for update to authenticated
  using (
    (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and (public.is_assigned_mentor(student_a) or public.is_assigned_mentor(student_b)))
  )
  with check (
    (select public.jwt_role()) = 'admin'
    or ((select public.jwt_role()) = 'mentor' and (public.is_assigned_mentor(student_a) or public.is_assigned_mentor(student_b)))
  );

drop policy if exists "Anyone can read evidence sources" on public.evidence_sources;
drop policy if exists "Admin can manage evidence sources" on public.evidence_sources;
create policy evidence_sources_read on public.evidence_sources
  for select to authenticated, anon using (true);
create policy evidence_sources_admin_manage on public.evidence_sources
  for all to authenticated using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists research_report_config_read on public.research_report_config;
drop policy if exists research_report_config_manage on public.research_report_config;
create policy research_report_config_read on public.research_report_config
  for select to authenticated using ((select public.jwt_role()) in ('researcher', 'admin'));
create policy research_report_config_manage on public.research_report_config
  for all to authenticated using ((select public.jwt_role()) in ('researcher', 'admin'))
  with check ((select public.jwt_role()) in ('researcher', 'admin'));
grant select on public.research_report_config to authenticated;

commit;