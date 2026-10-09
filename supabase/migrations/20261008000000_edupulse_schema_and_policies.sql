-- ============================================================================
-- EduPulse AI - PostgreSQL Schema & Migration for Supabase
-- Ràng buộc: Quyền riêng tư, tối đa 2 lời mời/tuần, không xếp hạng nguy cơ,
-- tập kiểm tra chỉ mở 1 lần, kết quả X, Y, Z, T đo lường khách quan.
-- ============================================================================

-- Bật các tiện ích mở rộng cần thiết
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Tạo schema riêng cho môi trường mô phỏng (tách biệt hoàn toàn dữ liệu thật)
create schema if not exists sim;

-- ----------------------------------------------------------------------------
-- 1. TYPE & BẢNG NGƯỜI DÙNG & PHÂN QUYỀN
-- ----------------------------------------------------------------------------

-- Kiểu Role trong hệ thống
do $$ begin
  create type app_role as enum ('student', 'mentor', 'researcher', 'admin');
exception
  when duplicate_object then null;
end $$;

-- Bảng danh sách mời (Allowlist) - Chỉ quản trị viên quản lý
create table if not exists public.invited_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  email_norm      text not null unique,        -- Lưu lower(trim(email))
  role            app_role not null,
  student_code    text,                        -- Định dạng HS-0001 (chỉ role student)
  is_lead_mentor  boolean not null default false, -- Giáo viên hướng dẫn (GVHD)
  expires_at      timestamptz,
  used_at         timestamptz,
  used_by         uuid,
  created_at      timestamptz not null default now()
);

-- Bảng hồ sơ người dùng (Profiles liên kết auth.users)
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            app_role not null,
  student_code    text unique,                 -- Mã định danh ẩn danh của học sinh
  is_lead_mentor  boolean not null default false,
  status          text not null default 'active'
                    check (status in ('active', 'withdrawn', 'disabled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Bảng danh sách liên hệ học sinh (LƯU TÁCH BIỆT - Không cho mentor / researcher xem)
create table if not exists public.contacts (
  student_id        uuid primary key references public.profiles(id) on delete cascade,
  full_name         text not null,
  class_name        text,
  phone             text,
  email             text,
  guardian_contact  text,
  updated_at        timestamptz not null default now()
);

-- Phân công Mentor cho Học sinh
create table if not exists public.mentor_assignments (
  mentor_id   uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (mentor_id, student_id)
);

-- ----------------------------------------------------------------------------
-- 2. ĐỒNG Ý THAM GIA & YÊU CẦU DỮ LIỆU
-- ----------------------------------------------------------------------------

create table if not exists public.consents (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.profiles(id) on delete cascade,
  form_version        text not null,
  consented_at        timestamptz not null default now(),
  guardian_confirmed  boolean not null default false,
  withdrawn_at        timestamptz,
  withdraw_reason     text
);

create table if not exists public.data_requests (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  type           text not null check (type in ('export', 'deletion')),
  status         text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at   timestamptz not null default now(),
  completed_at   timestamptz,
  notes          text
);

-- ----------------------------------------------------------------------------
-- 3. MỤC TIÊU & KẾ HOẠCH LUYỆN TẬP
-- ----------------------------------------------------------------------------

create table if not exists public.goals (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  activity_group    text not null,             -- Học tập, Ngoại ngữ, Thể thao, Nghệ thuật, Kỹ năng
  target_date       date not null,
  success_criteria  text not null,
  min_task          text,
  support_person    text,
  status            text not null default 'active' check (status in ('active', 'paused', 'achieved', 'stopped')),
  created_at        timestamptz not null default now()
);

-- Phiên bản kế hoạch: Chỉ thêm mới, không sửa ngược quá khứ
create table if not exists public.plan_versions (
  id                uuid primary key default gen_random_uuid(),
  goal_id           uuid not null references public.goals(id) on delete cascade,
  student_id        uuid not null references public.profiles(id) on delete cascade,
  effective_from    date not null,
  sessions_per_week int not null check (sessions_per_week between 1 and 14),
  schedule          jsonb not null,            -- Mảng các buổi trong tuần [{"day": 1, "time": "19:00", "task": "..."}]
  reason            text,                      -- Lý do điều chỉnh kế hoạch
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. NHẬT KÝ LUYỆN TẬP & TRẠNG THÁI TUẦN
-- ----------------------------------------------------------------------------

create table if not exists public.session_logs (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  goal_id          uuid not null references public.goals(id) on delete cascade,
  session_date     date not null,
  status           text not null check (status in ('done', 'partial', 'missed')),
  duration_min     int,
  motivation       int check (motivation between 1 and 5),
  difficulty       int check (difficulty between 1 and 5),
  barrier          text,
  intent_continue  int check (intent_continue between 1 and 5),
  skipped_fields   text[] not null default '{}', -- Các trường HS chọn "không muốn trả lời"
  notes            text,
  created_at       timestamptz not null default now(),
  unique (student_id, goal_id, session_date)
);

create table if not exists public.rest_periods (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  date_from   date not null,
  date_to     date not null,
  reason      text not null check (reason in ('sick', 'exam', 'other')),
  note        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.weekly_status (
  student_id    uuid not null references public.profiles(id) on delete cascade,
  week_start    date not null,
  status        text not null check (status in ('training', 'resting', 'achieved', 'stopped')),
  confirmed_by  text not null check (confirmed_by in ('student', 'mentor')),
  note          text,
  updated_at    timestamptz not null default now(),
  primary key (student_id, week_start)
);

create table if not exists public.weekly_summary (
  student_id         uuid not null references public.profiles(id) on delete cascade,
  week_start         date not null,
  planned_original   int not null default 0,
  planned_current    int not null default 0,
  done               int not null default 0,
  pct_original       numeric,
  pct_current        numeric,
  calculated_at      timestamptz not null default now(),
  primary key (student_id, week_start)
);

-- ----------------------------------------------------------------------------
-- 5. NGHIÊN CỨU & MÔ HÌNH DỰ ĐOÁN (AI)
-- ----------------------------------------------------------------------------

create table if not exists public.definitions (
  key         text primary key,                -- 'dropout', 'completion', 'pause'
  value       jsonb not null,
  locked      boolean not null default false,
  version     int not null default 1,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now(),
  lock_reason text
);

create table if not exists public.study_arms (
  student_id   uuid primary key references public.profiles(id) on delete cascade,
  arm          text not null check (arm in ('control', 'intervention')),
  strata       jsonb,
  seed         bigint not null,
  proposed_by  uuid references public.profiles(id),
  approved_by  uuid references public.profiles(id),
  approved_at  timestamptz
);

create table if not exists public.model_versions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  algorithm     text not null default 'logistic_regression',
  features      jsonb not null,                -- Thứ tự các đặc trưng: ["pct_7d", "pct_14d", ...]
  coefficients  jsonb not null,                -- Trọng số tương ứng: {"pct_7d": -1.45, ...}
  intercept     numeric not null,
  threshold     numeric not null,
  seed          bigint,
  locked_at     timestamptz,                   -- Sau khi khóa không được sửa
  locked_by     uuid references public.profiles(id),
  active        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Tập kiểm tra chỉ được mở 1 lần duy nhất cho mỗi mô hình sau khi GVHD duyệt
create table if not exists public.test_set_access (
  model_version_id  uuid primary key references public.model_versions(id) on delete cascade,
  requested_by      uuid not null references public.profiles(id),
  approved_by       uuid references public.profiles(id),
  opened_at         timestamptz,
  notes             text
);

create table if not exists public.predictions (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.profiles(id) on delete cascade,
  model_version_id   uuid references public.model_versions(id),
  week_start         date not null,
  method             text not null check (method in ('model', 'rule')),
  risk_score         numeric,
  flagged            boolean not null default false,
  insufficient_data  boolean not null default false,
  features           jsonb,
  created_at         timestamptz not null default now(),
  unique (student_id, week_start)
);

-- ----------------------------------------------------------------------------
-- 6. HỖ TRỢ & CAN THIỆP SỚM
-- ----------------------------------------------------------------------------

create table if not exists public.support_content (
  id            uuid primary key default gen_random_uuid(),
  barrier       text not null,                 -- Nhóm khó khăn: 'overload', 'motivation', 'time', 'skill', 'health'
  title         text not null,
  body          text not null,
  evidence_ref  text,                          -- Cơ sở/nguồn tham khảo khoa học
  status        text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  version       int not null default 1,
  created_at    timestamptz not null default now()
);

create table if not exists public.support_invites (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  prediction_id uuid references public.predictions(id),
  content_id    uuid references public.support_content(id),
  sent_at       timestamptz not null default now(),
  status        text not null default 'sent'
                  check (status in ('sent', 'accepted', 'snoozed', 'declined')),
  responded_at  timestamptz,
  helpful       int check (helpful between 1 and 5)
);

create table if not exists public.support_requests (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  mentor_id      uuid references public.profiles(id),
  note           text,
  status         text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at     timestamptz not null default now(),
  response_note  text,
  resolved_at    timestamptz
);

create table if not exists public.surveys (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  survey_type  text not null,
  ratings      jsonb not null,                 -- { helpful: 4, usability: 5, annoyance: 1 }
  feedback     text,
  created_at   timestamptz not null default now()
);

create table if not exists public.buddy_links (
  id               uuid primary key default gen_random_uuid(),
  student_a        uuid not null references public.profiles(id) on delete cascade,
  student_b        uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  mentor_approved  boolean default false,
  created_at       timestamptz not null default now(),
  unique(student_a, student_b)
);

-- ----------------------------------------------------------------------------
-- 7. CẤU HÌNH HỆ THỐNG, NHẮC LỊCH & AUDIT LOG
-- ----------------------------------------------------------------------------

create table if not exists public.app_settings (
  key    text primary key,
  value  jsonb not null
);

create table if not exists public.reminder_prefs (
  student_id     uuid primary key references public.profiles(id) on delete cascade,
  enabled        boolean not null default true,
  reminder_time  time not null default '19:30:00',
  channel        text not null default 'web' check (channel in ('web', 'email')),
  updated_at     timestamptz not null default now()
);

-- Nhật ký kiểm toán: Bất biến, chỉ thêm, không sửa, không xóa
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text,
  action      text not null,                   -- 'view_contact', 'export_dataset', 'unlock_definition', ...
  target      text,
  meta        jsonb
);

-- ----------------------------------------------------------------------------
-- 8. CÁC HÀM XỬ LÝ & TRIGGER RÀNG BUỘC (CONSTRAINTS & TRIGGERS)
-- ----------------------------------------------------------------------------

-- Hàm lấy Role từ JWT Claim
create or replace function public.jwt_role() returns text
language sql stable as $$
  select auth.jwt() ->> 'user_role';
$$;

-- RÀNG BUỘC 1: Tối đa 2 lời mời hỗ trợ mỗi tuần (theo giờ Việt Nam UTC+7)
create or replace function public.enforce_invite_limit() returns trigger
language plpgsql as $$
declare
  wk_start timestamptz :=
    date_trunc('week', new.sent_at at time zone 'Asia/Ho_Chi_Minh')
      at time zone 'Asia/Ho_Chi_Minh';
  max_inv int := 2;
  current_count int;
begin
  select coalesce((value)::int, 2) into max_inv from public.app_settings where key = 'max_invites_per_week';
  select count(*) into current_count from public.support_invites
    where student_id = new.student_id and sent_at >= wk_start;

  if current_count >= max_inv then
    raise exception 'Đã đạt giới hạn tối đa % lời mời hỗ trợ trong tuần cho học sinh này', max_inv;
  end if;
  return new;
end $$;

drop trigger if exists trg_invite_limit on public.support_invites;
create trigger trg_invite_limit
before insert on public.support_invites
for each row execute function public.enforce_invite_limit();

-- RÀNG BUỘC 2: Mô hình đã khóa thì TUYỆT ĐỐI KHÔNG ĐƯỢC SỬA hệ số, đặc trưng, ngưỡng
create or replace function public.block_locked_model_update() returns trigger
language plpgsql as $$
begin
  if old.locked_at is not null and (
    new.features is distinct from old.features or
    new.coefficients is distinct from old.coefficients or
    new.intercept is distinct from old.intercept or
    new.threshold is distinct from old.threshold
  ) then
    raise exception 'Mô hình đã được khóa (locked_at: %), không được phép chỉnh sửa thông số!', old.locked_at;
  end if;
  return new;
end $$;

drop trigger if exists trg_model_lock on public.model_versions;
create trigger trg_model_lock
before update on public.model_versions
for each row execute function public.block_locked_model_update();

-- AUTH HOOK 1: Before User Created - Chặn người không nằm trong danh sách mời
create or replace function public.hook_require_invite(event jsonb) returns jsonb
language plpgsql stable as $$
declare
  e text := lower(trim(event->'user'->>'email'));
begin
  if exists (
    select 1 from public.invited_users
    where email_norm = e and used_at is null
      and (expires_at is null or expires_at > now())
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'Tài khoản chưa được mời vào hệ thống EduPulse. Vui lòng liên hệ giáo viên quản trị.',
      'http_code', 403
    )
  );
end $$;

-- TRIGGER: Tự động khởi tạo profile từ danh sách mời khi user mới đăng ký
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invited_users%rowtype;
begin
  select * into inv from public.invited_users
  where email_norm = lower(trim(new.email)) and used_at is null;

  if not found then
    raise exception 'Người dùng % không có trong danh sách mời', new.email;
  end if;

  insert into public.profiles (id, role, student_code, is_lead_mentor, status)
  values (new.id, inv.role, inv.student_code, inv.is_lead_mentor, 'active')
  on conflict (id) do update set
    role = excluded.role,
    student_code = excluded.student_code,
    is_lead_mentor = excluded.is_lead_mentor;

  update public.invited_users
  set used_at = now(), used_by = new.id
  where id = inv.id;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- AUTH HOOK 2: Custom Access Token Hook - Bổ sung claim user_role & is_lead vào JWT
create or replace function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable as $$
declare
  claims jsonb := event->'claims';
  r app_role;
  st text;
  lead boolean;
begin
  select role, status, is_lead_mentor into r, st, lead
  from public.profiles where id = (event->>'user_id')::uuid;

  if r is not null and st = 'active' then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(r::text));
    claims := jsonb_set(claims, '{is_lead}', to_jsonb(coalesce(lead, false)));
  else
    claims := jsonb_set(claims, '{user_role}', 'null');
    claims := jsonb_set(claims, '{is_lead}', 'false');
  end if;

  return jsonb_set(event, '{claims}', claims);
end $$;

-- ----------------------------------------------------------------------------
-- 9. HÀM TÍNH TOÁN TIẾN ĐỘ & DỰ ĐOÁN HẰNG TUẦN (WEEKLY JOBS)
-- ----------------------------------------------------------------------------

-- Hàm tính tổng kết tuần cho mọi học sinh
create or replace function public.calculate_weekly_summary(p_week_start date)
returns void language plpgsql security definer as $$
declare
  r record;
  v_planned_orig int;
  v_planned_curr int;
  v_done int;
begin
  for r in (select id as student_id from public.profiles where role = 'student' and status = 'active') loop
    -- Lấy số buổi kế hoạch ban đầu (phiên bản đầu tiên)
    select coalesce(pv.sessions_per_week, 3) into v_planned_orig
    from public.plan_versions pv
    where pv.student_id = r.student_id
    order by pv.effective_from asc, pv.created_at asc limit 1;

    -- Lấy số buổi kế hoạch hiện tại (hiệu lực tại tuần p_week_start)
    select coalesce(pv.sessions_per_week, 3) into v_planned_curr
    from public.plan_versions pv
    where pv.student_id = r.student_id and pv.effective_from <= p_week_start + 6
    order by pv.effective_from desc, pv.created_at desc limit 1;

    -- Đếm số buổi hoàn thành trong tuần (status in ('done', 'partial'))
    select count(*) into v_done
    from public.session_logs
    where student_id = r.student_id
      and session_date >= p_week_start
      and session_date <= p_week_start + 6
      and status in ('done', 'partial');

    insert into public.weekly_summary (
      student_id, week_start, planned_original, planned_current, done,
      pct_original, pct_current, calculated_at
    )
    values (
      r.student_id, p_week_start,
      coalesce(v_planned_orig, 1),
      coalesce(v_planned_curr, 1),
      v_done,
      round((v_done::numeric / nullif(v_planned_orig, 0) * 100), 2),
      round((v_done::numeric / nullif(v_planned_curr, 0) * 100), 2),
      now()
    )
    on conflict (student_id, week_start) do update set
      planned_original = excluded.planned_original,
      planned_current = excluded.planned_current,
      done = excluded.done,
      pct_original = excluded.pct_original,
      pct_current = excluded.pct_current,
      calculated_at = now();
  end loop;
end $$;

-- Hàm chạy dự báo nguy cơ và tạo lời mời hỗ trợ tuần
create or replace function public.run_weekly_prediction(p_week_start date)
returns void language plpgsql security definer as $$
declare
  r record;
  m record;
  v_pct_7d numeric;
  v_pct_14d numeric;
  v_missed int;
  v_mot_slope numeric;
  v_missing_rate numeric;
  v_plan_changes int;
  v_z numeric;
  v_prob numeric;
  v_flagged boolean;
  v_arm text;
  v_content_id uuid;
  v_pred_id uuid;
  v_support_active boolean;
begin
  -- Kiểm tra trạng thái hệ thống can thiệp
  select coalesce((value)::boolean, true) into v_support_active
  from public.app_settings where key = 'support_enabled';

  -- Lấy mô hình đang kích hoạt
  select * into m from public.model_versions where active = true limit 1;

  for r in (
    select p.id as student_id, sa.arm
    from public.profiles p
    join public.consents c on c.student_id = p.id and c.withdrawn_at is null
    left join public.study_arms sa on sa.student_id = p.id
    where p.role = 'student' and p.status = 'active'
  ) loop
    -- Tính đặc trưng 7 ngày gần nhất
    select coalesce(pct_current, 100) into v_pct_7d
    from public.weekly_summary
    where student_id = r.student_id and week_start = p_week_start;

    -- Tính đặc trưng 14 ngày
    select coalesce(avg(pct_current), 100) into v_pct_14d
    from public.weekly_summary
    where student_id = r.student_id and week_start in (p_week_start, p_week_start - 7);

    -- Đếm số buổi nghỉ liên tiếp
    select count(*) into v_missed
    from (
      select status from public.session_logs
      where student_id = r.student_id and session_date <= p_week_start + 6
      order by session_date desc limit 5
    ) s where s.status = 'missed';

    -- Đếm số lần thay đổi kế hoạch
    select count(*) into v_plan_changes
    from public.plan_versions where student_id = r.student_id;

    if m.id is not null then
      -- Tính điểm qua hàm sigmoid hồi quy Logistic
      -- z = intercept + w1*pct_7d + w2*pct_14d + w3*missed + ...
      v_z := m.intercept
        + coalesce((m.coefficients->>'pct_7d')::numeric, -0.015) * (v_pct_7d / 100.0)
        + coalesce((m.coefficients->>'pct_14d')::numeric, -0.02) * (v_pct_14d / 100.0)
        + coalesce((m.coefficients->>'consecutive_missed')::numeric, 0.5) * v_missed
        + coalesce((m.coefficients->>'plan_changes')::numeric, 0.2) * v_plan_changes;

      v_prob := 1.0 / (1.0 + exp(-v_z));
      v_flagged := (v_prob >= m.threshold);

      insert into public.predictions (
        student_id, model_version_id, week_start, method, risk_score, flagged, insufficient_data, features
      ) values (
        r.student_id, m.id, p_week_start, 'model', round(v_prob, 4), v_flagged, false,
        jsonb_build_object('pct_7d', v_pct_7d, 'pct_14d', v_pct_14d, 'missed', v_missed, 'plan_changes', v_plan_changes)
      )
      on conflict (student_id, week_start) do update set
        risk_score = excluded.risk_score,
        flagged = excluded.flagged,
        features = excluded.features
      returning id into v_pred_id;
    else
      -- Quy tắc dự phòng: Dưới 50% trong 2 tuần liên tiếp
      v_flagged := (v_pct_7d < 50 and v_pct_14d < 50);
      insert into public.predictions (
        student_id, week_start, method, risk_score, flagged, insufficient_data
      ) values (
        r.student_id, p_week_start, 'rule', case when v_flagged then 0.75 else 0.20 end, v_flagged, false
      )
      on conflict (student_id, week_start) do update set
        flagged = excluded.flagged
      returning id into v_pred_id;
    end if;

    -- TẠO LỜI MỜI HỖ TRỢ: CHỈ DÀNH CHO NHÓM CAN THIỆP (intervention)
    -- Nhóm đối chứng (control) vẫn dự đoán và lưu để đánh giá nhưng KHÔNG NHẬN LỜI MỜI
    if v_support_active and v_flagged and r.arm = 'intervention' then
      -- Chọn nội dung hỗ trợ phù hợp
      select id into v_content_id from public.support_content
      where status = 'approved' order by random() limit 1;

      if v_content_id is not null then
        begin
          insert into public.support_invites (student_id, prediction_id, content_id, status)
          values (r.student_id, v_pred_id, v_content_id, 'sent');
        exception when others then
          -- Bỏ qua nếu chạm giới hạn 2 lời mời/tuần theo trigger
          null;
        end;
      end if;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 10. CÁC VIEW BẢO VỆ DỮ LIỆU TỐI THIỂU CHO MENTOR VÀ RESEARCHER
-- ----------------------------------------------------------------------------

-- View danh sách học sinh cho Mentor (chỉ thấy HS đã đồng ý tham gia)
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
left join public.goals g on g.student_id = p.id and g.status = 'active';

-- View theo dõi tiến độ tối thiểu cho Mentor (TUYỆT ĐỐI KHÔNG HIỆN ĐIỂM NGUY CƠ HAY XẾP HẠNG)
create or replace view public.v_mentor_student_summary as
select
  ma.mentor_id,
  p.student_code,
  ws.week_start,
  ws.planned_current,
  ws.done,
  ws.pct_current,
  st.status as weekly_status,
  st.confirmed_by
from public.mentor_assignments ma
join public.profiles p on p.id = ma.student_id
join public.consents c on c.student_id = ma.student_id and c.withdrawn_at is null
join public.weekly_summary ws on ws.student_id = ma.student_id
left join public.weekly_status st on st.student_id = ws.student_id and st.week_start = ws.week_start;

-- View giám sát luồng tuyển mẫu cho GVHD (Lead Mentor)
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
left join public.study_arms sa on sa.student_id = p.id;

-- View dành cho Nhà nghiên cứu (CHỈ XEM QUA MÃ HS student_code, KHÔNG CÓ THÔNG TIN CÁ NHÂN)
create or replace view public.v_research_students as
select
  p.student_code,
  sa.arm,
  sa.strata,
  g.activity_group,
  c.consented_at,
  p.status as student_status
from public.profiles p
left join public.study_arms sa on sa.student_id = p.id
left join public.goals g on g.student_id = p.id
left join public.consents c on c.student_id = p.id
where p.role = 'student';

-- View nhật ký đã mã hóa định danh cho nghiên cứu
create or replace view public.v_research_logs as
select
  p.student_code,
  sl.session_date,
  sl.status,
  sl.duration_min,
  sl.motivation,
  sl.difficulty,
  sl.barrier,
  sl.skipped_fields
from public.session_logs sl
join public.profiles p on p.id = sl.student_id;

-- View Bảng kết quả X, Y, Z, T chuẩn đề cương
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

-- View dữ liệu thiếu (Missing logs)
create or replace view public.v_missing as
select
  p.student_code,
  sa.arm,
  count(*) filter (where sl.status = 'missed') as missed_sessions,
  count(*) filter (where sl.skipped_fields <> '{}') as logs_with_skipped_fields,
  count(distinct rp.id) as rest_periods_count
from public.profiles p
left join public.study_arms sa on sa.student_id = p.id
left join public.session_logs sl on sl.student_id = p.id
left join public.rest_periods rp on rp.student_id = p.id
where p.role = 'student'
group by p.student_code, sa.arm;

-- ----------------------------------------------------------------------------
-- 11. BẢO MẬT & PHÂN QUYỀN (ROW LEVEL SECURITY - RLS)
-- ----------------------------------------------------------------------------

alter table public.invited_users enable row level security;
alter table public.profiles enable row level security;
alter table public.contacts enable row level security;
alter table public.mentor_assignments enable row level security;
alter table public.consents enable row level security;
alter table public.data_requests enable row level security;
alter table public.goals enable row level security;
alter table public.plan_versions enable row level security;
alter table public.session_logs enable row level security;
alter table public.rest_periods enable row level security;
alter table public.weekly_status enable row level security;
alter table public.weekly_summary enable row level security;
alter table public.definitions enable row level security;
alter table public.study_arms enable row level security;
alter table public.model_versions enable row level security;
alter table public.test_set_access enable row level security;
alter table public.predictions enable row level security;
alter table public.support_content enable row level security;
alter table public.support_invites enable row level security;
alter table public.support_requests enable row level security;
alter table public.surveys enable row level security;
alter table public.buddy_links enable row level security;
alter table public.app_settings enable row level security;
alter table public.reminder_prefs enable row level security;
alter table public.audit_log enable row level security;

-- POLICIES CHO PROFILES
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid()) or
    (select public.jwt_role()) = 'admin' or
    ((select public.jwt_role()) = 'mentor' and id in (select student_id from public.mentor_assignments where mentor_id = (select auth.uid())))
  );

-- POLICIES CHO CONTACTS (Danh bạ tuyệt đối Bí mật)
drop policy if exists contacts_admin on public.contacts;
create policy contacts_admin on public.contacts
  for all to authenticated
  using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

drop policy if exists contacts_student_self on public.contacts;
create policy contacts_student_self on public.contacts
  for select to authenticated
  using (student_id = (select auth.uid()));

-- POLICIES CHO GOALS & PLAN VERSIONS
drop policy if exists student_goals on public.goals;
create policy student_goals on public.goals
  for all to authenticated
  using (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin')
  with check (student_id = (select auth.uid()) or (select public.jwt_role()) = 'admin');

drop policy if exists student_plans on public.plan_versions;
create policy student_plans on public.plan_versions
  for select to authenticated
  using (student_id = (select auth.uid()) or (select public.jwt_role()) in ('admin', 'mentor', 'researcher'));

drop policy if exists student_create_plan on public.plan_versions;
create policy student_create_plan on public.plan_versions
  for insert to authenticated
  with check (student_id = (select auth.uid()));

-- Thu hồi quyền sửa/xóa plan_versions (chỉ thêm)
revoke update, delete on public.plan_versions from authenticated;

-- POLICIES CHO SESSION LOGS
drop policy if exists student_own_logs on public.session_logs;
create policy student_own_logs on public.session_logs
  for all to authenticated
  using (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student')
  with check (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student');

drop policy if exists researcher_read_logs on public.session_logs;
create policy researcher_read_logs on public.session_logs
  for select to authenticated
  using ((select public.jwt_role()) = 'researcher');

-- POLICIES CHO PREDICTIONS & STUDY ARMS (Học sinh KHÔNG ĐỌC)
drop policy if exists predictions_research on public.predictions;
create policy predictions_research on public.predictions
  for select to authenticated
  using ((select public.jwt_role()) in ('researcher', 'admin'));

drop policy if exists study_arms_research on public.study_arms;
create policy study_arms_research on public.study_arms
  for select to authenticated
  using ((select public.jwt_role()) in ('researcher', 'admin'));

-- POLICIES CHO SUPPORT INVITES (Học sinh chỉ thấy lời mời của mình)
drop policy if exists student_invites on public.support_invites;
create policy student_invites on public.support_invites
  for select to authenticated
  using (student_id = (select auth.uid()));

drop policy if exists student_respond_invite on public.support_invites;
create policy student_respond_invite on public.support_invites
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

-- POLICIES CHO AUDIT LOG (Bất biến)
drop policy if exists audit_admin on public.audit_log;
create policy audit_admin on public.audit_log
  for select to authenticated
  using ((select public.jwt_role()) = 'admin');

drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert to authenticated
  with check (true);

revoke update, delete on public.audit_log from authenticated;

-- Cấp quyền cho các view
grant select on public.v_mentor_students to authenticated;
grant select on public.v_mentor_student_summary to authenticated;
grant select on public.v_recruitment_flow to authenticated;
grant select on public.v_research_students to authenticated;
grant select on public.v_research_logs to authenticated;
grant select on public.v_outcomes to authenticated;
grant select on public.v_missing to authenticated;
