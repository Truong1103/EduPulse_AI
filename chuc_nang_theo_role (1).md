# Chức năng web theo role (bản triển khai Next.js + Supabase)

Hệ thống AI dự đoán và can thiệp sớm nhằm giảm nguy cơ bỏ cuộc trong luyện tập dài hạn của học sinh (THPT Phan Châu Trinh, Đà Nẵng).

Tài liệu bám các ràng buộc trong đề cương: quyền riêng tư, tối đa 2 lời mời hỗ trợ mỗi tuần, không xếp hạng nguy cơ, tập kiểm tra chỉ mở một lần, X, Y, Z, T là kết quả đo được chứ không cấy.

**Cột ưu tiên:** **P1** bắt buộc để chạy thực nghiệm, **P2** nên có, **P3** mở rộng.

---

## 1. Quyết định kỹ thuật chính

| Hạng mục | Lựa chọn | Lý do |
| --- | --- | --- |
| Frontend và backend web | Next.js (App Router), TypeScript | Server Components, Server Actions và Route Handlers chạy trên server, giữ khóa bí mật ngoài trình duyệt |
| CSDL, xác thực | Supabase (Postgres + Auth) | Có sẵn RLS, đủ cho phân quyền theo role |
| Đăng nhập | **Google OAuth** qua Supabase Auth, chỉ cho email nằm trong danh sách mời | Google chỉ xác nhận danh tính (email), role do hệ thống gán |
| Phân quyền | Role nằm trong JWT (claim `user_role`) + RLS | Quyền kiểm tra ngay tại CSDL, không chỉ ở giao diện |
| Dự đoán hằng tuần | Supabase Edge Function, lịch bằng `pg_cron` + `pg_net` | Tự chạy cuối tuần, không cần server riêng |
| Mô hình ở P1 | **Hồi quy logistic**: huấn luyện ngoại tuyến bằng Python (scikit-learn), lưu hệ số vào bảng `model_versions`, chấm điểm bằng TypeScript | Tránh phải dựng thêm dịch vụ Python. Nếu sau này dùng mô hình phức tạp hơn thì cần dịch vụ riêng (P3) |
| Giao diện | Tailwind + shadcn/ui, react-hook-form + zod, Recharts | Gợi ý phổ biến, có thể thay |
| Quản lý CSDL | Supabase CLI: migration trong thư mục `supabase/migrations`, 2 project (dev, prod) | Có lịch sử thay đổi, tái lập được |

**Lưu ý kỹ thuật theo tài liệu Supabase hiện hành** (nên đọc lại khi cài):
- Dùng gói `@supabase/ssr`. Cần hai client: một cho trình duyệt, một cho server (Server Components, Server Actions, Route Handlers).
- Trong code server luôn dùng `supabase.auth.getClaims()` để bảo vệ trang và dữ liệu. **Không** dùng `getSession()` ở server. Tài liệu giải thích: `getClaims()` kiểm tra chữ ký JWT mỗi lần gọi.
- Cần một file proxy để làm mới phiên đăng nhập. Từ Next.js 16 file này tên là `proxy.ts`. Với Next.js 15 trở xuống thì file này không được gọi, phiên sẽ không làm mới và người dùng bị đăng xuất.
- Trang cần đăng nhập nên đặt `export const dynamic = 'force-dynamic'` để tránh bị cache chung.
- Khóa `service_role` chỉ dùng ở server, không bao giờ đưa lên trình duyệt (không dùng tiền tố `NEXT_PUBLIC_`).

Nguồn: https://supabase.com/docs/guides/auth/server-side/nextjs

---

## 2. Role và xác thực

### 2.1. Bốn role, mỗi tài khoản chỉ có một role

| Role (`user_role`) | Ghi chú |
| --- | --- |
| `student` | Học sinh |
| `mentor` | Người hướng dẫn (giáo viên, người hỗ trợ). Cột `is_lead_mentor = true` là **giáo viên hướng dẫn (GVHD)** có quyền thêm |
| `researcher` | Nhà nghiên cứu, chỉ đọc dữ liệu đã mã hóa định danh |
| `admin` | Quản trị |

Một người kiêm nhiều việc thì tạo **tài khoản riêng cho từng role**, để nhật ký truy cập phản ánh đúng việc đang làm. Vì đăng nhập bằng Google và mỗi email chỉ có một role, người đó cần **hai email Google khác nhau**.

### 2.2. Đưa role vào JWT

Dùng **Custom Access Token Auth Hook** của Supabase: hook chạy trước khi cấp token và thêm claim `user_role` (đọc từ bảng `profiles`). RLS đọc claim này qua `auth.jwt()`.

Hai điều cần nhớ:
- Hook chỉ sửa access token, không sửa phản hồi đăng nhập. Muốn đọc role ở phía ứng dụng thì giải mã từ access token, hoặc đọc từ `getClaims()` ở server.
- Cần cấp quyền cho role `supabase_auth_admin` đọc bảng `profiles` (nếu `profiles` bật RLS thì thêm policy cho role này).

Nguồn: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac và https://supabase.com/docs/guides/auth/auth-hooks

### 2.3. Đăng nhập bằng Google và cách hệ thống nhận diện role

**Nguyên tắc:** Google chỉ cho biết *người đăng nhập là ai* (email đã xác thực), không cho biết họ là học sinh hay giáo viên. Role do hệ thống gán sẵn qua **danh sách mời (allowlist)** mà quản trị nhập trước, khớp theo email Google. Người ngoài danh sách không tạo được tài khoản.

**Luồng hoạt động**

| Bước | Điều xảy ra | Thành phần |
| --- | --- | --- |
| 1 | Quản trị nạp email được mời kèm role, mã HS (`HS-0001`), cờ GVHD | Bảng `invited_users` |
| 2 | Người dùng bấm "Đăng nhập bằng Google" | `signInWithOAuth({ provider: 'google' })` |
| 3 | Google xác thực, trả `code` về `/auth/callback`, server đổi lấy phiên | `exchangeCodeForSession` |
| 4 | **Lần đầu:** hook *Before User Created* tra email trong `invited_users`. Không có, đã dùng hoặc hết hạn thì từ chối, user không được tạo | Auth Hook (Postgres function) |
| 5 | Nếu hợp lệ, trigger trên `auth.users` tạo `profiles` (role, mã HS, GVHD) và đánh dấu lời mời đã dùng | Trigger `handle_new_user` |
| 6 | Mỗi lần cấp token, hook *Custom Access Token* đọc `profiles` và thêm claim `user_role`, `is_lead` | Auth Hook |
| 7 | Next.js gọi `getClaims()`, chuyển hướng theo role: `student` → `/student`, `mentor` → `/mentor`, `researcher` → `/researcher`, `admin` → `/admin`. Không có role thì sang `/no-access` | `app/auth/callback/route.ts` |
| 8 | RLS đọc cùng claim, nên gõ thẳng URL hay gọi API vẫn bị chặn ở CSDL | Policy |

Các lần đăng nhập sau nhận ra người dùng bằng `auth.uid()` trong `profiles`, không so email nữa.

**SQL**

```sql
create table invited_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  email_norm      text not null unique,     -- Server Action lưu lower(trim(email))
  role            app_role not null,
  student_code    text,
  is_lead_mentor  boolean not null default false,
  expires_at      timestamptz,
  used_at         timestamptz,
  used_by         uuid
);
alter table invited_users enable row level security;
create policy admin_invites on invited_users for all to authenticated
  using      ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

-- Hook 1 (Auth > Hooks > Before User Created): chặn người chưa được mời
create function public.hook_require_invite(event jsonb) returns jsonb
language plpgsql stable as $$
declare e text := lower(trim(event->'user'->>'email'));
begin
  if exists (select 1 from public.invited_users
             where email_norm = e and used_at is null
               and (expires_at is null or expires_at > now())) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'message', 'Tài khoản chưa được mời. Hãy liên hệ giáo viên phụ trách.',
    'http_code', 403));
end $$;

-- Trigger: tạo profile từ lời mời
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare inv public.invited_users%rowtype;
begin
  select * into inv from public.invited_users
   where email_norm = lower(trim(new.email)) and used_at is null;
  if not found then raise exception 'Chưa được mời'; end if;  -- lưới an toàn thứ hai
  insert into public.profiles (id, role, student_code, is_lead_mentor)
  values (new.id, inv.role, inv.student_code, inv.is_lead_mentor);
  update public.invited_users set used_at = now(), used_by = new.id where id = inv.id;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Hook 2 (Auth > Hooks > Custom Access Token): đưa role vào JWT
create function public.custom_access_token_hook(event jsonb) returns jsonb
language plpgsql stable as $$
declare claims jsonb := event->'claims'; r app_role; st text; lead boolean;
begin
  select role, status, is_lead_mentor into r, st, lead
    from public.profiles where id = (event->>'user_id')::uuid;
  if r is not null and st = 'active' then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(r::text));
    claims := jsonb_set(claims, '{is_lead}', to_jsonb(coalesce(lead, false)));
  else
    claims := jsonb_set(claims, '{user_role}', 'null');
  end if;
  return jsonb_set(event, '{claims}', claims);
end $$;

grant execute on function public.hook_require_invite, public.custom_access_token_hook
  to supabase_auth_admin;
revoke execute on function public.hook_require_invite, public.custom_access_token_hook
  from authenticated, anon, public;
grant select on public.invited_users, public.profiles to supabase_auth_admin;
create policy auth_admin_read_profiles on public.profiles
  for select to supabase_auth_admin using (true);
```

Chưa chạy thử trên project thật. Trước khi bật hook, đối chiếu lại cú pháp trả lỗi và chữ ký hàm với tài liệu hook.

**Next.js**

```ts
// app/login/actions.ts
'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${process.env.SITE_URL}/auth/callback` },
  })
  if (data.url) redirect(data.url)   // với SSR/PKCE phải chuyển hướng từ phía server
}
```

```ts
// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HOME: Record<string, string> = {
  student: '/student', mentor: '/mentor', researcher: '/researcher', admin: '/admin',
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data } = await supabase.auth.getClaims()
      const role = data?.claims?.user_role as string | undefined
      return NextResponse.redirect(`${origin}${role ? HOME[role] : '/no-access'}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=not_invited`)
}
```

**Cài đặt phía Google và Supabase**
1. Trong Google Cloud Console, tạo OAuth client loại Web.
2. Ở mục Authorized redirect URI, thêm URL callback của project Supabase (dạng `https://<ref>.supabase.co/auth/v1/callback`).
3. Trong Supabase (Auth, Providers, Google), bật Google và dán Client ID, Secret.
4. Khai báo Site URL và URL `/auth/callback` của Next.js trong danh sách redirect được phép.
5. Chỉ xin scope cơ bản (email, hồ sơ). Không xin quyền nào khác.
6. Tắt đăng nhập bằng email/mật khẩu, bật hai hook ở trên.

Nguồn: https://supabase.com/docs/guides/auth/social-login/auth-google và https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook

**Lưu ý quan trọng**
- **Không đặt role trong `user_metadata`**, vì người dùng có thể tự sửa trường này. Role chỉ nằm trong `profiles` do quản trị đặt.
- **Chuẩn hóa email** khi nạp danh sách: tối thiểu `lower(trim())`. Với Gmail, Google coi dấu chấm là như nhau nên danh sách nhập tay có thể lệch với email Google trả về. Thử với vài tài khoản thật trước khi nạp cả danh sách.
- **Đổi role hoặc khóa tài khoản không có hiệu lực ngay**, vì claim chỉ cập nhật khi token được cấp lại. Hook đã kiểm tra thêm `status = 'active'`. Khi cần khóa gấp thì buộc người dùng đăng nhập lại.
- **Tài khoản Google của trường** có thể bị quản trị trường chặn đăng nhập ứng dụng ngoài. Cần thử trước với vài em. Nếu bị chặn thì dùng Gmail cá nhân.

### 2.4. Vòng đời tài khoản

| Trạng thái | Cách đạt được | Ghi chú |
| --- | --- | --- |
| Đã mời | Quản trị thêm email vào `invited_users` | Có thể đặt `expires_at` |
| Đã kích hoạt | Người dùng đăng nhập Google lần đầu thành công | Lời mời được đánh dấu `used_at` |
| Hoạt động | `profiles.status = 'active'` | Nhận claim `user_role` |
| Rút lui hoặc khóa | `status = 'withdrawn'` hoặc `'disabled'` | Hook cấp `user_role = null`, vào `/no-access` |
| Thu hồi lời mời | Xóa dòng `invited_users` chưa dùng | Chặn người chưa kích hoạt |

---

## 3. Cấu trúc thư mục Next.js

```
app/
  login/              nút "Đăng nhập bằng Google" (Server Action signInWithGoogle)
  auth/callback/      route.ts đổi code lấy phiên, chuyển hướng theo role
  no-access/          trang cho người chưa có role hoặc đã bị khóa
  student/            layout.tsx kiểm tra role = student
    page.tsx          bảng tiến độ
    consent/ goals/ plan/ log/ rest/ week-review/ support/ settings/ survey/
  mentor/             layout.tsx kiểm tra role = mentor
    students/[code]/ requests/ lead/ (chỉ is_lead_mentor)
  researcher/         layout.tsx kiểm tra role = researcher
    definitions/ features/ models/ assignment/ results/ missing/ exports/ simulation/
  admin/              layout.tsx kiểm tra role = admin
    users/ contacts/ consents/ content/ notifications/ deployment/ audit/ backup/ data-quality/ retention/
  api/export/         Route Handler xuất CSV (ghi audit)
lib/supabase/         client.ts, server.ts, admin.ts (service_role, chỉ server)
lib/auth/             requireRole(), requireLead()
lib/audit/            logAudit()
lib/model/            score.ts (chấm điểm hồi quy logistic), rules.ts (quy tắc dự phòng)
proxy.ts              làm mới phiên (Next.js 16)
supabase/
  migrations/ functions/weekly-predict, send-reminders/ seed.sql
```

Mỗi `layout.tsx` theo role gọi `requireRole('...')`: lấy `getClaims()`, so với `user_role`, sai thì chuyển hướng. Đây chỉ là lớp tiện lợi. **Lớp bảo vệ thật là RLS** (mục 7).

---

## 4. Chức năng theo role

### 4.1. Học sinh (`/student`)

| Chức năng | Route / Server Action | Bảng chính | Ưu tiên |
| --- | --- | --- | --- |
| Đồng ý tham gia: đọc nội dung, xác nhận điện tử, lưu phiên bản và thời điểm, xác nhận phụ huynh nếu trường yêu cầu | `/student/consent` · `submitConsent` | `consents` | P1 |
| Rút lui bất kỳ lúc nào. Rút lui không tự tính là bỏ mục tiêu luyện tập | `/student/settings` · `withdrawConsent` | `consents`, `profiles.status` | P1 |
| Đăng ký mục tiêu (mẫu B): nhóm hoạt động, ngày đích, tiêu chí đạt, số buổi mỗi tuần, nhiệm vụ tối thiểu, thời điểm, người hỗ trợ | `/student/goals/new` · `createGoal` | `goals`, `plan_versions` | P1 |
| Lập và sửa lịch: mỗi lần sửa tạo phiên bản mới có ngày hiệu lực và lý do, không sửa ngược buổi đã qua | `/student/plan` · `appendPlanVersion` | `plan_versions` (chỉ thêm) | P1 |
| Ghi nhật ký nhanh: hoàn thành / một phần / chưa làm, thời lượng, động lực 1–5, độ khó 1–5, khó khăn, ý định tiếp tục (tùy chọn). Mọi câu có "không muốn trả lời" | `/student/log` · `submitLog` | `session_logs` | P1 |
| Báo nghỉ có lý do (ốm, thi, khác). Lịch tạm nghỉ không tạo buổi thất bại | `/student/rest` · `createRestPeriod` | `rest_periods` | P1 |
| Xác nhận trạng thái cuối tuần: đang tập / nghỉ / đạt mục tiêu / đã dừng | `/student/week-review` · `confirmWeekStatus` | `weekly_status` | P1 |
| Xem tiến độ: biểu đồ % hoàn thành theo tuần, so với kế hoạch ban đầu và kế hoạch hiện tại. Hiện "chưa đủ dữ liệu" khi chưa đủ lịch sử | `/student` | `weekly_summary` | P1 |
| Nhắc lịch: chọn giờ nhắc, tắt hoặc hoãn | `/student/settings` · `updateReminder` | `reminder_prefs` | P1 |
| Nhận hỗ trợ (chỉ nhóm can thiệp): chọn khó khăn chính, chọn giải pháp, chấp nhận / hoãn / từ chối. Không ghi "bạn sẽ bỏ cuộc" | `/student/support` · `respondInvite` | `support_invites`, `support_content` | P1 |
| Phản hồi hỗ trợ và khảo sát trải nghiệm (hữu ích, dễ dùng, mức gây phiền) | `/student/survey` · `submitSurvey` | `surveys` | P1 |
| Yêu cầu gặp giáo viên (HS chủ động) | `/student/request-mentor` · `createSupportRequest` | `support_requests` | P2 |
| Xem, tải xuống, yêu cầu xóa dữ liệu của mình | `/student/settings` · `requestExport`, `requestDeletion` | `data_requests` | P2 |
| Mời bạn cùng tập, chỉ kết nối khi bên kia đồng ý | `/student/buddy` | `buddy_links` | P3 |

Học sinh không có quyền đọc `study_arms` và `predictions`. Giao diện chỉ cần biết "có bật hỗ trợ hay không", việc này do server quyết định (bằng khóa `service_role` hoặc hàm RPC) và trả về một cờ đúng/sai. Như vậy nhóm đối chứng không thấy mình thuộc nhóm nào qua giao diện.

### 4.2. Người hướng dẫn (`/mentor`)

| Chức năng | Route / Server Action | Bảng / View | Ưu tiên |
| --- | --- | --- | --- |
| Danh sách HS được gán, chỉ HS đã đồng ý | `/mentor` | `v_mentor_students` | P1 |
| Bảng theo dõi tối thiểu: tiến độ tổng quan, trạng thái tuần. **Không có bảng xếp hạng nguy cơ**, không hiện điểm nguy cơ | `/mentor/students/[code]` | `v_mentor_student_summary` | P1 |
| Nhận và xử lý yêu cầu hỗ trợ do HS chủ động gửi (đã nhận, đang xử lý, xong, ghi chú) | `/mentor/requests` · `updateRequest` | `support_requests` | P1 |
| Xác nhận trạng thái HS mất liên lạc qua kênh đã đồng ý, ghi lại kết quả | `/mentor/students/[code]` · `confirmStatusByMentor` | `weekly_status` | P1 |
| Gửi phản hồi tiến bộ dùng mẫu có sẵn | `/mentor/encourage` | `support_content` | P2 |
| Duyệt kết nối bạn đồng hành, chỉ khi HS đồng ý | `/mentor/buddy` | `buddy_links` | P3 |

**Quyền riêng của GVHD** (`is_lead_mentor = true`, chung layout `/mentor/lead`):

| Chức năng | Route / Server Action | Bảng | Ưu tiên |
| --- | --- | --- | --- |
| Duyệt danh sách phân nhóm theo mã HS (không tên), xem seed, bấm phê duyệt trước khi áp dụng | `/mentor/lead/assignments` · `approveAssignment` | `study_arms` | P1 |
| Giám sát tuyển mẫu: số mời, đủ điều kiện, đồng ý, rút lui, hoàn tất | `/mentor/lead/recruitment` | `v_recruitment_flow` | P1 |
| Xem trạng thái đồng ý của từng HS | `/mentor/lead/consents` | `consents` | P1 |
| Phê duyệt mở tập kiểm tra (một lần cho mỗi mô hình) | `/mentor/lead/test-set` · `approveTestSetAccess` | `test_set_access` | P1 |

### 4.3. Nhà nghiên cứu (`/researcher`)

Mọi dữ liệu nhà nghiên cứu thấy đều đi qua **mã HS** (`student_code`), không có tên hay thông tin liên hệ.

| Chức năng | Route / Server Action | Bảng / View | Ưu tiên |
| --- | --- | --- | --- |
| Xem dữ liệu theo mã, chỉ đọc | `/researcher` | `v_research_*` | P1 |
| Quản lý định nghĩa vận hành (bỏ cuộc, hoàn thành, gián đoạn). Khóa sau thí điểm, mở khóa phải có lý do và ghi nhật ký | `/researcher/definitions` · `lockDefinition`, `unlockDefinition` | `definitions` | P1 |
| Tạo đặc trưng: hoàn thành 7 và 14 ngày, số buổi liên tiếp chưa làm, xu hướng động lực, tỷ lệ thiếu nhật ký, số lần đổi kế hoạch | `/researcher/features` | SQL function `compute_features` | P1 |
| Xuất dữ liệu để huấn luyện ngoại tuyến bằng Python | `/api/export/training` | `v_research_*` | P1 |
| Nhập mô hình đã huấn luyện (hệ số, đặc trưng, ngưỡng, seed), rồi khóa mô hình và ngưỡng trước khi phân nhóm | `/researcher/models` · `registerModel`, `lockModel` | `model_versions` | P1 |
| Yêu cầu mở tập kiểm tra, chỉ được sau khi GVHD phê duyệt, chỉ một lần cho mỗi mô hình | `/researcher/models/[id]` · `requestTestSet` | `test_set_access` | P1 |
| Báo cáo chất lượng dự báo: precision, recall, F1, PR-AUC, ma trận nhầm lẫn, Brier, hiệu chỉnh, khoảng tin cậy lấy mẫu theo HS, theo nhóm hoạt động | `/researcher/models/[id]` | `predictions`, `v_outcomes` | P1 |
| Tạo phân nhóm ngẫu nhiên 1:1, phân tầng theo nhóm hoạt động và mức duy trì ban đầu, lưu seed, gửi GVHD duyệt | `/researcher/assignment` · `proposeAssignment` | `study_arms` | P1 |
| Bảng kết quả can thiệp **X, Y, Z, T**: X số HS dùng web, Y số HS bị gắn cờ cùng precision và recall, Z tỷ lệ giữ kế hoạch theo hai nhóm, T thời gian theo dõi. Có chênh lệch tuyệt đối, khoảng tin cậy, kiểm định Fisher | `/researcher/results` | `v_outcomes`, `weekly_summary` | P1 |
| Báo cáo kế hoạch ban đầu và kế hoạch điều chỉnh để không nhầm giảm yêu cầu với cải thiện duy trì | `/researcher/results` | `weekly_summary` | P1 |
| Phân tích dữ liệu thiếu: hai kịch bản bất lợi, tỷ lệ thiếu theo nhóm, lý do rút lui | `/researcher/missing` | `v_missing` | P2 |
| Xuất dữ liệu đã mã hóa định danh kèm từ điển dữ liệu và phiên bản bộ dữ liệu | `/api/export/dataset` | `v_research_*` | P2 |
| Kho dữ liệu mô phỏng gắn nhãn "mô phỏng", tách khỏi dữ liệu thật | `/researcher/simulation` | schema `sim` | P2 |

### 4.4. Quản trị (`/admin`)

| Chức năng | Route / Server Action | Bảng | Ưu tiên |
| --- | --- | --- | --- |
| Quản lý lời mời và tài khoản: nạp danh sách email được mời (nhập tay hoặc CSV) kèm role và mã HS, thu hồi lời mời, khóa tài khoản, đổi role, liên kết HS với người hướng dẫn | `/admin/users` · `importInvites`, `revokeInvite`, `setRole`, `setStatus`, `assignMentor` | `invited_users`, `profiles`, `mentor_assignments` | P1 |
| Danh sách liên hệ lưu tách riêng. Mọi lần xem đều ghi audit | `/admin/contacts` · `viewContact` | `contacts` | P1 |
| Quản lý đồng ý: phiên bản biểu mẫu, trạng thái từng HS, xử lý rút lui, xóa dữ liệu theo yêu cầu | `/admin/consents` | `consents`, `data_requests` | P1 |
| Thư viện nội dung hỗ trợ theo từng khó khăn (bảng 7.2), có trường **cơ sở/nguồn tham khảo**, phiên bản, trạng thái duyệt | `/admin/content` | `support_content` | P1 |
| Cấu hình thông báo: giới hạn 2 lời mời mỗi tuần, kênh nhắc lịch, giờ yên tĩnh | `/admin/notifications` | `app_settings` | P1 |
| Triển khai mô hình đã khóa, bật/tắt can thiệp theo nhóm, nút tắt khẩn | `/admin/deployment` · `activateModel`, `killSwitch` | `model_versions`, `app_settings` | P1 |
| Nhật ký truy cập (audit log): ai xem, sửa, xuất gì, khi nào. Không xóa được | `/admin/audit` | `audit_log` | P1 |
| Sao lưu và khôi phục, thử khôi phục định kỳ, biểu mẫu dự phòng khi hệ thống lỗi | `/admin/backup` | (Supabase) | P1 |
| Lịch xóa dữ liệu: xóa danh sách liên hệ trong 30 ngày sau kết thúc, mã hóa định danh tối đa 12 tháng (đề xuất, chờ nhà trường) | `/admin/retention` | `contacts`, `profiles` | P2 |
| Hàng đợi xác nhận trạng thái: HS thiếu nhật ký cần hỏi | `/admin/data-quality` | `v_missing_logs` | P2 |
| Kiểm tra chất lượng dữ liệu: bản ghi trùng, thời lượng bất thường, đổi kế hoạch bất thường | `/admin/data-quality` | `session_logs` | P2 |
| Giám sát hệ thống: lỗi, cảnh báo truy cập bất thường | `/admin/health` | `audit_log` | P3 |

---

## 5. Phần hệ thống tự chạy

| Job | Lịch | Việc làm | Ưu tiên |
| --- | --- | --- | --- |
| `weekly-summary` | Cuối tuần (SQL function) | Tính `weekly_summary`: số buổi kế hoạch, số buổi làm, % hoàn thành theo kế hoạch ban đầu và hiện tại | P1 |
| `weekly-predict` | Chủ nhật 20:00 giờ VN (13:00 UTC) | Với mọi HS còn theo dõi và có đồng ý hợp lệ: tính đặc trưng, chấm điểm bằng mô hình đã khóa, lưu vào `predictions`. Chưa đủ lịch sử thì ghi `insufficient_data = true`. Chưa có mô hình hoặc mô hình chưa đạt thì dùng quy tắc dự phòng "dưới 50% trong 2 tuần liên tiếp" | P1 |
| `send-invites` | Ngay sau `weekly-predict` | Với HS **nhóm can thiệp** bị gắn cờ: kiểm tra giới hạn 2 lời mời mỗi tuần, tạo `support_invites`, gửi thông báo. **Nhóm đối chứng vẫn được dự đoán và lưu** (để đánh giá mô hình) nhưng **không nhận lời mời** | P1 |
| `send-reminders` | Hằng ngày | Gửi nhắc lịch theo cấu hình từng HS (email hoặc Web Push, cần chốt kênh) | P1 |
| `cleanup-retention` | Hằng ngày | Xóa dữ liệu quá hạn theo lịch xóa | P2 |

**Cách lập lịch:** bật `pg_cron` và `pg_net`, lưu URL project và khóa vào Supabase Vault, rồi dùng `cron.schedule` gọi Edge Function bằng `net.http_post`. Gọi function bằng một **bí mật riêng lưu trong Vault** và kiểm tra bí mật đó trong function, đừng chỉ dựa vào khóa công khai.

Ví dụ lịch (giờ UTC, tương đương 20:00 chủ nhật giờ Việt Nam):

```sql
select cron.schedule(
  'weekly-predict',
  '0 13 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/weekly-predict',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('time', now())
  );
  $$
);
```

**Rủi ro vận hành:** nếu project bị tạm dừng hoặc gặp sự cố thì mọi lịch `pg_cron` dừng theo mà không báo. Trong 8 tuần thực nghiệm cần kiểm tra gói đang dùng, đặt cảnh báo khi không có dòng `predictions` mới sau chủ nhật, và giữ phương án chạy tay (nút "chạy dự đoán" cho quản trị).

Nguồn: https://supabase.com/docs/guides/functions/schedule-functions

---

## 6. Cơ sở dữ liệu (Postgres trên Supabase)

### 6.1. Danh sách bảng

| Nhóm | Bảng | Ghi chú |
| --- | --- | --- |
| Người dùng | `invited_users`, `profiles`, `contacts`, `mentor_assignments` | `invited_users` và `contacts` tách riêng, chỉ admin đọc |
| Đồng ý | `consents` | Phiên bản biểu mẫu, thời điểm, rút lui |
| Kế hoạch | `goals`, `plan_versions`, `rest_periods` | `plan_versions` chỉ thêm, không sửa |
| Nhật ký | `session_logs`, `weekly_status`, `weekly_summary` | `weekly_summary` do job tính |
| Nghiên cứu | `definitions`, `study_arms`, `model_versions`, `predictions`, `test_set_access` | Học sinh không đọc |
| Hỗ trợ | `support_content`, `support_invites`, `support_requests`, `surveys`, `buddy_links` | |
| Hệ thống | `app_settings`, `reminder_prefs`, `data_requests`, `audit_log` | `audit_log` chỉ thêm |
| Mô phỏng | schema `sim` (bản sao cấu trúc) | Tách hẳn khỏi dữ liệu thật |

### 6.2. Lược đồ cốt lõi (P1)

```sql
create type app_role as enum ('student', 'mentor', 'researcher', 'admin');

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            app_role not null,
  student_code    text unique,                    -- HS-0001, chỉ role student
  is_lead_mentor  boolean not null default false, -- GVHD
  status          text not null default 'active'
                    check (status in ('active', 'withdrawn', 'disabled')),
  created_at      timestamptz not null default now()
);

create table contacts (
  student_id        uuid primary key references profiles(id) on delete cascade,
  full_name         text not null,
  class_name        text,
  phone             text,
  email             text,
  guardian_contact  text,
  updated_at        timestamptz not null default now()
);

create table consents (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references profiles(id),
  form_version        text not null,
  consented_at        timestamptz not null default now(),
  guardian_confirmed  boolean not null default false,
  withdrawn_at        timestamptz
);

create table mentor_assignments (
  mentor_id   uuid not null references profiles(id),
  student_id  uuid not null references profiles(id),
  primary key (mentor_id, student_id)
);

create table goals (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references profiles(id),
  activity_group    text not null,        -- theo nhóm hoạt động trong đề cương mục 3
  target_date       date not null,
  success_criteria  text not null,
  min_task          text,
  support_person    text,
  status            text not null default 'active',
  created_at        timestamptz not null default now()
);

-- Chỉ thêm, không sửa, không xóa
create table plan_versions (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references goals(id),
  student_id       uuid not null references profiles(id),
  effective_from   date not null,
  sessions_per_week int not null check (sessions_per_week between 1 and 14),
  schedule         jsonb not null,        -- các buổi cố định theo thứ, giờ
  reason           text,
  created_at       timestamptz not null default now()
);

create table session_logs (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references profiles(id),
  goal_id          uuid not null references goals(id),
  session_date     date not null,
  status           text not null check (status in ('done', 'partial', 'missed')),
  duration_min     int,
  motivation       int check (motivation between 1 and 5),
  difficulty       int check (difficulty between 1 and 5),
  barrier          text,
  intent_continue  int check (intent_continue between 1 and 5),
  skipped_fields   text[] not null default '{}',   -- các câu HS chọn "không muốn trả lời"
  created_at       timestamptz not null default now(),
  unique (student_id, goal_id, session_date)
);

create table rest_periods (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id),
  date_from   date not null,
  date_to     date not null,
  reason      text not null check (reason in ('sick', 'exam', 'other'))
);

create table weekly_status (
  student_id    uuid not null references profiles(id),
  week_start    date not null,
  status        text not null check (status in ('training', 'resting', 'achieved', 'stopped')),
  confirmed_by  text not null check (confirmed_by in ('student', 'mentor')),
  primary key (student_id, week_start)
);

create table weekly_summary (
  student_id         uuid not null references profiles(id),
  week_start         date not null,
  planned_original   int not null,
  planned_current    int not null,
  done               int not null,
  pct_original       numeric,
  pct_current        numeric,
  primary key (student_id, week_start)
);

-- Nghiên cứu
create table definitions (
  key         text primary key,
  value       jsonb not null,
  locked      boolean not null default false,
  version     int not null default 1,
  updated_by  uuid references profiles(id),
  updated_at  timestamptz not null default now()
);

create table study_arms (
  student_id   uuid primary key references profiles(id),
  arm          text not null check (arm in ('control', 'intervention')),
  strata       jsonb,
  seed         bigint not null,
  proposed_by  uuid references profiles(id),
  approved_by  uuid references profiles(id),
  approved_at  timestamptz
);

create table model_versions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  algorithm     text not null default 'logistic_regression',
  features      jsonb not null,            -- danh sách đặc trưng theo thứ tự
  coefficients  jsonb not null,
  intercept     numeric not null,
  threshold     numeric not null,
  seed          bigint,
  locked_at     timestamptz,               -- sau khi khóa không sửa
  locked_by     uuid references profiles(id),
  active        boolean not null default false
);

create table test_set_access (
  model_version_id  uuid primary key references model_versions(id), -- khóa chính: chỉ một lần
  requested_by      uuid not null references profiles(id),
  approved_by       uuid references profiles(id),
  opened_at         timestamptz
);

create table predictions (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references profiles(id),
  model_version_id   uuid references model_versions(id),  -- null nếu dùng quy tắc dự phòng
  week_start         date not null,
  method             text not null check (method in ('model', 'rule')),
  risk_score         numeric,
  flagged            boolean not null default false,
  insufficient_data  boolean not null default false,
  features           jsonb,
  created_at         timestamptz not null default now(),
  unique (student_id, week_start)
);

-- Hỗ trợ
create table support_content (
  id            uuid primary key default gen_random_uuid(),
  barrier       text not null,             -- loại khó khăn (bảng 7.2)
  title         text not null,
  body          text not null,
  evidence_ref  text,                      -- cơ sở/nguồn tham khảo; null = thiết kế của nhóm, cần kiểm chứng
  status        text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  version       int not null default 1
);

create table support_invites (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id),
  prediction_id uuid references predictions(id),
  content_id    uuid references support_content(id),
  sent_at       timestamptz not null default now(),
  status        text not null default 'sent'
                  check (status in ('sent', 'accepted', 'snoozed', 'declined')),
  responded_at  timestamptz,
  helpful       int check (helpful between 1 and 5)
);

create table support_requests (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references profiles(id),
  mentor_id   uuid references profiles(id),
  note        text,
  status      text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  created_at  timestamptz not null default now()
);

-- Hệ thống
create table app_settings (
  key    text primary key,
  value  jsonb not null
);
insert into app_settings values ('max_invites_per_week', '2'), ('support_enabled', 'true');

create table audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text,
  action      text not null,       -- 'view_contact', 'export_dataset', 'unlock_definition', ...
  target      text,
  meta        jsonb
);
```

### 6.3. Ràng buộc quan trọng ở mức CSDL

```sql
-- Giới hạn 2 lời mời mỗi tuần (tuần tính theo giờ Việt Nam)
create function enforce_invite_limit() returns trigger
language plpgsql as $$
declare
  wk_start timestamptz :=
    date_trunc('week', new.sent_at at time zone 'Asia/Ho_Chi_Minh')
      at time zone 'Asia/Ho_Chi_Minh';
  max_inv int := (select (value)::int from app_settings where key = 'max_invites_per_week');
begin
  if (select count(*) from support_invites
        where student_id = new.student_id and sent_at >= wk_start) >= max_inv then
    raise exception 'Đã đủ số lời mời hỗ trợ trong tuần';
  end if;
  return new;
end $$;

create trigger trg_invite_limit before insert on support_invites
for each row execute function enforce_invite_limit();

-- Mô hình đã khóa thì không sửa
create function block_locked_model_update() returns trigger
language plpgsql as $$
begin
  if old.locked_at is not null
     and (new.features, new.coefficients, new.intercept, new.threshold)
         is distinct from (old.features, old.coefficients, old.intercept, old.threshold) then
    raise exception 'Mô hình đã khóa, không được sửa';
  end if;
  return new;
end $$;

create trigger trg_model_lock before update on model_versions
for each row execute function block_locked_model_update();
```

Tương tự, `plan_versions` và `audit_log` **không có policy UPDATE hoặc DELETE** cho role `authenticated`, và thu hồi quyền đó (`revoke update, delete on ... from authenticated`).

---

## 7. Phân quyền: RLS và ma trận

### 7.1. Hàm hỗ trợ

```sql
create function public.jwt_role() returns text
language sql stable as $$ select auth.jwt() ->> 'user_role' $$;
```

Mọi bảng đều `enable row level security`. Trong policy, dùng dạng `(select auth.uid())` và `(select public.jwt_role())` để Postgres chỉ tính một lần cho cả truy vấn.

### 7.2. Ví dụ policy

```sql
-- Học sinh chỉ thấy và ghi nhật ký của mình
create policy student_own_logs on session_logs
  for all to authenticated
  using      (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student')
  with check (student_id = (select auth.uid()) and (select public.jwt_role()) = 'student');

-- Nhà nghiên cứu chỉ đọc nhật ký, không sửa
create policy researcher_read_logs on session_logs
  for select to authenticated
  using ((select public.jwt_role()) = 'researcher');

-- Danh sách liên hệ: chỉ quản trị
create policy admin_contacts on contacts
  for all to authenticated
  using      ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');
-- Học sinh xem và sửa liên hệ của mình
create policy student_own_contact on contacts
  for select to authenticated
  using (student_id = (select auth.uid()));
```

### 7.3. View cho người hướng dẫn (chỉ thông tin tối thiểu)

Người hướng dẫn **không được có policy đọc thẳng** `session_logs` hay `predictions`. Họ chỉ đọc qua view giới hạn cột và điều kiện:

```sql
create view v_mentor_student_summary as
select ma.mentor_id, p.student_code, ws.week_start, ws.pct_current, st.status
from mentor_assignments ma
join profiles p        on p.id = ma.student_id
join weekly_summary ws on ws.student_id = ma.student_id
left join weekly_status st on st.student_id = ws.student_id and st.week_start = ws.week_start
where ma.mentor_id = (select auth.uid())
  and exists (select 1 from consents c
              where c.student_id = ma.student_id and c.withdrawn_at is null);

revoke all on v_mentor_student_summary from anon;
grant select on v_mentor_student_summary to authenticated;
```

**Cạm bẫy:** view trong Postgres mặc định chạy bằng quyền chủ sở hữu và bỏ qua RLS của bảng gốc, nên điều kiện `where` trong view là hàng rào duy nhất. Phải thử kỹ, và thu hồi quyền của `anon`. Nếu dùng `security_invoker`, cần có policy đọc tương ứng trên bảng gốc.

Làm tương tự cho các view `v_research_*` (chỉ có `student_code`, nhóm hoạt động, nhóm nghiên cứu, số liệu nhật ký; **không có** `id` đăng nhập, không có cột liên hệ) và `v_outcomes`.

### 7.4. Ma trận quyền

R = xem, C = tạo, U = sửa, X = xuất, "—" = không có quyền. Mọi lần truy cập nhạy cảm của quản trị và nhà nghiên cứu đều ghi `audit_log`.

| Dữ liệu | Học sinh | Người hướng dẫn | GVHD (thêm) | Nhà nghiên cứu | Quản trị |
| --- | --- | --- | --- | --- | --- |
| Danh sách liên hệ | R, U (của mình) | — | — | — | R, U (log) |
| Hồ sơ theo mã HS | R (của mình) | R tối thiểu, qua view | — | R (qua view) | R (log) |
| Kế hoạch và lịch | C, R, U-thêm phiên bản (của mình) | R tóm tắt | — | R (mã hóa) | R (log) |
| Nhật ký luyện tập | C, R (của mình) | R tóm tắt qua view | — | R (mã hóa) | R (log) |
| Điểm nguy cơ và dự đoán | — (chỉ thấy lời mời) | — | — | R | R vận hành (log) |
| Lời mời và phản hồi hỗ trợ | R, trả lời | R yêu cầu HS chủ động gửi | — | R | Cấu hình |
| Đồng ý tham gia | C, R, rút | — | R trạng thái | — | R, U (xử lý rút lui) |
| Phân nhóm (`study_arms`) | — | — | R, phê duyệt | C, R | Áp dụng sau khi duyệt |
| Tập kiểm tra mô hình | — | — | Phê duyệt | Mở 1 lần (log) | — |
| Xuất dữ liệu | Tải dữ liệu của mình | — | — | X (mã hóa) | Chỉ sao lưu |
| Thư viện nội dung hỗ trợ | R phần được gửi | R | R, duyệt | R | C, U |
| Nhật ký truy cập | — | — | R tóm tắt | — | R |

### 7.5. Ghi nhật ký truy cập: giới hạn cần biết

Postgres **không có trigger cho câu lệnh SELECT**, nên không thể tự động ghi log mỗi lần đọc. Vì vậy mọi truy cập nhạy cảm của quản trị (xem liên hệ) và nhà nghiên cứu (xuất dữ liệu) phải đi qua **Server Action hoặc hàm RPC có ghi `audit_log` trước khi trả dữ liệu**, và các bảng đó không cho đọc trực tiếp bằng client. Đây là quy ước cần giữ khi code.

---

## 8. Kiểm thử phân quyền (bắt buộc trước khi tuyển HS)

| Kịch bản kiểm thử | Kết quả mong đợi |
| --- | --- |
| HS A đọc nhật ký, kế hoạch của HS B | Không thấy dòng nào |
| HS đọc `study_arms`, `predictions` | Không thấy dòng nào |
| Người hướng dẫn đọc trực tiếp `session_logs`, `predictions`, `contacts` | Bị chặn |
| Người hướng dẫn xem HS chưa đồng ý hoặc đã rút lui | Không thấy |
| Nhà nghiên cứu đọc `contacts`, `auth.users`, `profiles` gốc | Bị chặn |
| Nhà nghiên cứu mở tập kiểm tra lần thứ hai | Bị chặn bởi khóa chính của `test_set_access` |
| Nhà nghiên cứu mở tập kiểm tra khi GVHD chưa phê duyệt | Bị chặn |
| Sửa mô hình đã khóa | Báo lỗi từ trigger |
| Tạo lời mời hỗ trợ thứ 3 trong tuần | Báo lỗi từ trigger |
| Sửa hoặc xóa `plan_versions`, `audit_log` | Bị chặn |
| Người dùng chưa đăng nhập (`anon`) đọc bất kỳ bảng nào | Bị chặn |
| Đăng nhập Google bằng email **không** có trong `invited_users` | Bị hook từ chối, không có dòng mới trong `auth.users` |
| Dùng lại lời mời đã kích hoạt cho email khác | Bị từ chối |
| Tài khoản bị khóa (`status` khác `active`) đăng nhập | Nhận `user_role = null`, vào `/no-access`, không đọc được dữ liệu |
| Người dùng tự sửa `user_metadata` để đổi role | Không có tác dụng, role chỉ đọc từ `profiles` |
| HS nhóm đối chứng nhận lời mời hỗ trợ | Không có |

Cách làm: viết script kiểm thử đăng nhập bằng 5 tài khoản mẫu (mỗi role một tài khoản, hai HS) rồi chạy các truy vấn trên qua client Supabase thật (không dùng `service_role`). Chạy lại mỗi khi sửa policy. Có thể tự động hóa bằng Playwright hoặc pgTAP.

**Danh sách bảo mật tối thiểu (P1):**
- Khóa `service_role` chỉ trong biến môi trường server, không commit lên git.
- Chỉ cho đăng nhập Google, tắt email/mật khẩu. Hook Before User Created chặn email chưa được mời.
- Bật HTTPS (mặc định trên Vercel và Supabase).
- Validate mọi đầu vào Server Action bằng zod.
- Rate limit cho đăng nhập và đặt lại mật khẩu.
- Không gửi dữ liệu nhạy cảm vào công cụ phân tích bên thứ ba.
- Sao lưu định kỳ và thử khôi phục.

---

## 9. Thứ tự làm đề xuất

| Bước | Nội dung | Kết quả kiểm chứng được |
| --- | --- | --- |
| 1 | Khởi tạo dự án, Supabase, `@supabase/ssr`, `proxy.ts`, đăng nhập Google, bảng `invited_users` và `profiles`, hai Auth Hook (chặn người chưa mời, gán `user_role`) | Đăng nhập Google với 4 email mẫu, mỗi role vào đúng khu vực, email lạ bị chặn |
| 2 | Bảng lõi, RLS, view cho mentor và researcher, bộ kiểm thử phân quyền (mục 8) | Toàn bộ kịch bản kiểm thử đạt |
| 3 | Học sinh: đồng ý, mục tiêu, lịch (có phiên bản), nhật ký nhanh, nghỉ, tiến độ | HS dùng được hằng ngày trên điện thoại |
| 4 | `weekly_summary`, quy tắc dự phòng, `weekly-predict`, lịch `pg_cron` | Cuối tuần tự có dòng trong `predictions` |
| 5 | Admin: tài khoản, liên hệ (có audit), thư viện nội dung, cấu hình, audit log | Quản trị vận hành không cần vào SQL |
| 6 | Hỗ trợ: lời mời, giới hạn 2 mỗi tuần, nhóm đối chứng không nhận, phản hồi | Lời mời chỉ đến đúng nhóm |
| 7 | Nghiên cứu: định nghĩa, xuất dữ liệu, nhập và khóa mô hình, phân nhóm, quy trình mở tập kiểm tra, bảng X, Y, Z, T | Có số liệu tính được trên dữ liệu **mô phỏng gắn nhãn** |
| 8 | Mentor và GVHD: bảng tối thiểu, yêu cầu hỗ trợ, duyệt phân nhóm | Toàn quy trình chạy thử trọn vẹn |
| 9 | P2 và P3 nếu còn thời gian | |

Trước khi tuyển HS thật, chạy thử toàn bộ quy trình bằng dữ liệu mô phỏng ở schema `sim` và xóa sạch sau khi thử.

---

## 10. Những điểm cần chốt

1. **Kênh nhắc lịch và gửi lời mời:** email, Web Push hay kênh nhà trường cho phép. Chưa có trong đề cương.
2. **GVHD giữ khóa tập kiểm tra:** thiết kế này giả định GVHD phê duyệt, nhà nghiên cứu mở. Đề cương chưa quy định.
3. **Lịch xóa dữ liệu** (30 ngày, 12 tháng): đang là đề xuất, cần nhà trường thống nhất.
4. **Gói Supabase đang dùng:** ảnh hưởng đến việc project có bị tạm dừng (làm cron dừng theo) và dung lượng sao lưu.
5. **Email Google dùng để đăng nhập:** email trường hay Gmail cá nhân, và nhà trường có chặn ứng dụng ngoài không. Email này là dữ liệu nhận dạng nên cần ghi trong nội dung đồng ý.
6. **Người kiêm nhiều role** cần nhiều email Google. Nếu muốn một tài khoản đổi qua lại giữa các role thì phải thiết kế thêm, và nhật ký truy cập sẽ khó đọc hơn.
7. **Mô hình sau P1:** nếu muốn dùng mô hình phức tạp hơn hồi quy logistic, cần thêm dịch vụ Python riêng.
