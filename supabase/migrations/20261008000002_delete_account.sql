-- Migration: Xóa tài khoản Admin
-- Chỉ chạy một lần. File migration này không sửa các file SQL cũ.

create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.jwt_role();
begin
  if v_role <> 'admin' then
    raise exception 'Chỉ Admin mới có quyền xóa tài khoản.' using errcode = 'admin_required';
  end if;

  if p_user_id = (select auth.uid()) then
    raise exception 'Admin không được xóa chính mình.' using errcode = 'self_delete_forbidden';
  end if;

  delete from public.profiles where id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.delete_account(uuid) to authenticated;
