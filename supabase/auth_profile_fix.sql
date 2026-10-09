-- ============================================================================
-- EduPulse — vá tạo hồ sơ khi đăng nhập / đăng ký
-- Chạy file này trên SQL Editor của Supabase (một lần) nếu đã chạy full_setup.sql.
-- Lỗi cũ: insert study_arms thiếu cột seed → cả khối handle_new_user bị rollback
-- nên auth.users có user nhưng bảng profiles/contacts trống.
-- ============================================================================

create sequence if not exists public.seq_student_code start 1001;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invited_users%rowtype;
  v_role app_role := 'student';
  v_code text := null;
  v_lead boolean := false;
  v_name text;
  v_avatar text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, ''), '@', 1),
    'Người dùng'
  );
  v_avatar := coalesce(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture',
    ''
  );

  select * into inv
  from public.invited_users
  where email_norm = lower(trim(coalesce(new.email, ''))) and used_at is null
  limit 1;

  if found then
    v_role := inv.role;
    v_code := inv.student_code;
    v_lead := coalesce(inv.is_lead_mentor, false);
    update public.invited_users
      set used_at = now(), used_by = new.id
      where id = inv.id;
  end if;

  if v_role = 'student' and (v_code is null or v_code = '') then
    v_code := 'HS-' || lpad(nextval('public.seq_student_code')::text, 4, '0');
  end if;

  insert into public.profiles (
    id, email, gmail, full_name, ten, avatar_url, role, student_code, is_lead_mentor, status, updated_at
  ) values (
    new.id, new.email, new.email, v_name, v_name, v_avatar, v_role, v_code, v_lead, 'active', now()
  )
  on conflict (id) do update set
    email = excluded.email,
    gmail = excluded.gmail,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    ten = coalesce(public.profiles.ten, excluded.ten),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    updated_at = now();

  insert into public.contacts (student_id, full_name, email, updated_at)
  values (new.id, v_name, new.email, now())
  on conflict (student_id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  -- Không tự phân nhóm / không tự ký consent: nhà nghiên cứu đề xuất, học sinh tự đồng ý.
  return new;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Client gọi sau mỗi lần đăng nhập để bảo đảm hồ sơ luôn có trong CSDL
create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u_email text;
  u_meta jsonb;
  rec public.profiles;
  inv public.invited_users%rowtype;
  v_role app_role := 'student';
  v_code text := null;
  v_lead boolean := false;
  v_name text;
  v_avatar text;
begin
  if uid is null then
    raise exception 'Chưa đăng nhập';
  end if;

  select email, raw_user_meta_data into u_email, u_meta
  from auth.users where id = uid;

  select * into rec from public.profiles where id = uid;
  if found then
    update public.profiles set
      email = coalesce(email, u_email),
      gmail = coalesce(gmail, u_email),
      full_name = coalesce(full_name, u_meta->>'full_name', u_meta->>'name', split_part(coalesce(u_email, ''), '@', 1)),
      ten = coalesce(ten, u_meta->>'full_name', u_meta->>'name', split_part(coalesce(u_email, ''), '@', 1)),
      updated_at = now()
    where id = uid
    returning * into rec;
    return rec;
  end if;

  v_name := coalesce(u_meta->>'full_name', u_meta->>'name', split_part(coalesce(u_email, ''), '@', 1), 'Người dùng');
  v_avatar := coalesce(u_meta->>'avatar_url', u_meta->>'picture', '');

  select * into inv
  from public.invited_users
  where email_norm = lower(trim(coalesce(u_email, ''))) and used_at is null
  limit 1;

  if found then
    v_role := inv.role;
    v_code := inv.student_code;
    v_lead := coalesce(inv.is_lead_mentor, false);
    update public.invited_users set used_at = now(), used_by = uid where id = inv.id;
  end if;

  if v_role = 'student' and (v_code is null or v_code = '') then
    v_code := 'HS-' || lpad(nextval('public.seq_student_code')::text, 4, '0');
  end if;

  insert into public.profiles (
    id, email, gmail, full_name, ten, avatar_url, role, student_code, is_lead_mentor, status, updated_at
  ) values (
    uid, u_email, u_email, v_name, v_name, v_avatar, v_role, v_code, v_lead, 'active', now()
  )
  on conflict (id) do update set
    email = excluded.email,
    gmail = excluded.gmail,
    updated_at = now()
  returning * into rec;

  insert into public.contacts (student_id, full_name, email, updated_at)
  values (uid, v_name, u_email, now())
  on conflict (student_id) do nothing;

  return rec;
end;
$$;

grant execute on function public.ensure_own_profile() to authenticated;

-- Backfill user đã đăng ký trước đó nhưng chưa có hàng profiles
insert into public.profiles (
  id, email, gmail, full_name, ten, avatar_url, role, student_code, is_lead_mentor, status, updated_at
)
select
  u.id,
  u.email,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', ''),
  'student'::app_role,
  'HS-' || lpad(nextval('public.seq_student_code')::text, 4, '0'),
  false,
  'active',
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

insert into public.contacts (student_id, full_name, email, updated_at)
select p.id, coalesce(p.full_name, p.ten, p.email), p.email, now()
from public.profiles p
left join public.contacts c on c.student_id = p.id
where c.student_id is null
on conflict (student_id) do nothing;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to authenticated;
grant execute on function public.jwt_role() to anon, authenticated;
grant execute on function public.ensure_own_profile() to authenticated;
