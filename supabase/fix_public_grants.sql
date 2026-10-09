-- ============================================================================
-- Vá 403: permission denied for schema public
-- Chạy file này trên SQL Editor (role postgres) của project Supabase.
-- Nguyên nhân: Postgres/Supabase mới không cấp USAGE schema public cho anon/authenticated.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema public to anon;

do $$
begin
  execute 'revoke execute on function public.hook_require_invite(jsonb) from public, anon, authenticated';
exception when undefined_function then null;
end $$;
do $$
begin
  execute 'revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated';
exception when undefined_function then null;
end $$;

grant execute on function public.jwt_role() to anon, authenticated;
grant execute on function public.ensure_own_profile() to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on functions to authenticated;

-- Cho phép user đọc lời mời của chính email mình (để gán role lần đầu)
drop policy if exists invited_users_self_read on public.invited_users;
create policy invited_users_self_read on public.invited_users
  for select to authenticated
  using (email_norm = lower(trim(coalesce(auth.jwt() ->> 'email', ''))));

-- Cấp admin cho tài khoản đang bị kẹt (sửa email nếu cần)
update public.profiles
set role = 'admin', updated_at = now()
where lower(coalesce(email, gmail, '')) = 'gymptw1@gmail.com';
