-- Chạy trên SQL Editor sau full_setup: RLS buddy_links + cột kép kế hoạch trên view mentor.
-- DROP trước vì CREATE OR REPLACE không được đổi tên/thứ tự cột đã có.

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
left join public.weekly_status st on st.student_id = ws.student_id and st.week_start = ws.week_start;

grant select on public.v_mentor_student_summary to authenticated;

drop policy if exists buddy_links_select on public.buddy_links;
create policy buddy_links_select on public.buddy_links
  for select to authenticated
  using (
    student_a = (select auth.uid())
    or student_b = (select auth.uid())
    or (select public.jwt_role()) in ('mentor', 'admin')
  );

drop policy if exists buddy_links_insert on public.buddy_links;
create policy buddy_links_insert on public.buddy_links
  for insert to authenticated
  with check (student_a = (select auth.uid()) and (select public.jwt_role()) = 'student');

drop policy if exists buddy_links_update on public.buddy_links;
create policy buddy_links_update on public.buddy_links
  for update to authenticated
  using (
    student_a = (select auth.uid())
    or student_b = (select auth.uid())
    or (select public.jwt_role()) in ('mentor', 'admin')
  );

grant select, insert, update on public.buddy_links to authenticated;
