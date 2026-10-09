-- ============================================================================
-- EduPulse AI - Migration: Evidence Sources Management & Efficacy Report
-- Tuân thủ chặt chẽ đề cương nghiên cứu khoa học THPT Phan Châu Trinh
-- ============================================================================

-- 1. BẢNG QUẢN LÝ NGUỒN CHO CÁC GIẢI PHÁP CAN THIỆP (EVIDENCE SOURCES)
create table if not exists public.evidence_sources (
  id                text primary key,            -- 'S1', 'S2', ...
  citation          text not null,               -- Trích dẫn chuẩn khoa học APA
  doi               text,                        -- Mã DOI
  url               text,                        -- Đường dẫn tài liệu
  year              int,                         -- Năm xuất bản
  source_type       text not null check (source_type in ('meta_analysis', 'experiment', 'theory', 'survey', 'other')),
  target_population text not null,               -- Đối tượng nghiên cứu gốc
  key_findings      text not null,               -- Phát hiện chính (viết lại bằng lời nhóm)
  limitations       text not null,               -- Giới hạn khi áp dụng cho học sinh THPT
  is_verified       boolean not null default false, -- Chỉ người thật bấm sau khi đọc bài gốc
  verified_by       uuid references public.profiles(id),
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.evidence_sources enable row level security;

-- Ai cũng có thể đọc nguồn khoa học
create policy "Anyone can read evidence sources"
  on public.evidence_sources for select
  to authenticated, anon
  using (true);

-- Chỉ admin mới có quyền thêm/sửa/xác minh nguồn
create policy "Admin can manage evidence sources"
  on public.evidence_sources for all
  to authenticated
  using ((select public.jwt_role()) = 'admin')
  with check ((select public.jwt_role()) = 'admin');

-- 2. CẬP NHẬT BẢNG NỘI DUNG HỖ TRỢ (SUPPORT_CONTENT) LIÊN KẾT VỚI NGUỒN
alter table public.support_content
  add column if not exists source_id text references public.evidence_sources(id),
  add column if not exists evidence_level text check (evidence_level in ('other_population', 'design_principle', 'direct_population'));

-- Ràng buộc tầng CSDL: Nội dung CHỈ ĐƯỢC DUYỆT (approved) khi nguồn đã được xác minh (is_verified = true)
create or replace function public.check_support_content_verification()
returns trigger as $$
declare
  v_is_verified boolean;
begin
  if new.status = 'approved' then
    if new.source_id is null then
      raise exception 'Không thể duyệt nội dung can thiệp khi chưa gắn nguồn tham chiếu khoa học.';
    end if;

    select is_verified into v_is_verified
    from public.evidence_sources
    where id = new.source_id;

    if v_is_verified is not true then
      raise exception 'Không thể duyệt nội dung can thiệp khi nguồn % chưa được người thật xác minh.', new.source_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_support_content_verification on public.support_content;
create trigger trg_support_content_verification
  before insert or update on public.support_content
  for each row execute function public.check_support_content_verification();

-- 3. NẠP 7 NGUỒN KHOA HỌC BAN ĐẦU THEO MỤC 5 CỦA TÀI LIỆU (TẤT CẢ CHƯA XÁC MINH)
insert into public.evidence_sources (
  id, citation, doi, url, year, source_type, target_population, key_findings, limitations, is_verified
) values
(
  'S1',
  'Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69–119.',
  '10.1016/S0065-2601(06)38002-1',
  'https://doi.org/10.1016/S0065-2601(06)38002-1',
  2006,
  'meta_analysis',
  'Đối tượng đa dạng trong 94 thử nghiệm độc lập',
  'Kế hoạch dạng "nếu gặp tình huống X thì làm Y" giúp đạt mục tiêu tốt hơn ở mức trung bình đến lớn trong tổng hợp 94 thử nghiệm. Hiệu quả phụ thuộc mục tiêu đủ mạnh.',
  'Đối tượng đa dạng, không riêng học sinh THPT luyện tập dài hạn.',
  false
),
(
  'S2',
  'Bandura, A., & Schunk, D. H. (1981). Cultivating competence, self-efficacy, and intrinsic interest through proximal self-motivation. Journal of Personality and Social Psychology, 41(3), 586–598.',
  '10.1037/0022-3514.41.3.586',
  'https://doi.org/10.1037/0022-3514.41.3.586',
  1981,
  'experiment',
  'Mẫu trẻ em, nhiệm vụ học phép tính số học, thời gian ngắn',
  'Trẻ làm việc với mục tiêu con gần tiến bộ nhanh hơn và hình thành cảm giác hiệu quả bản thân tốt hơn.',
  'Mẫu trẻ em, nhiệm vụ học phép tính, thời gian ngắn.',
  false
),
(
  'S3',
  'Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation: A 35-year odyssey. American Psychologist, 57(9), 705–717.',
  '10.1037/0003-066X.57.9.705',
  'https://doi.org/10.1037/0003-066X.57.9.705',
  2002,
  'theory',
  'Chủ yếu bối cảnh công việc và nhiệm vụ phòng thí nghiệm',
  'Tổng hợp 35 năm nghiên cứu: mục tiêu cụ thể và có thử thách thường gắn với thành tích cao hơn mục tiêu mơ hồ.',
  'Chủ yếu bối cảnh công việc và nhiệm vụ phòng thí nghiệm. Vai trò của phản hồi: cần kiểm tra trực tiếp trong bài.',
  false
),
(
  'S4',
  'Nahum-Shani, I., Smith, S. N., Spring, B. J., Collins, L. M., Witkiewitz, K., Tewari, A., & Murphy, S. A. (2018). Just-in-time adaptive interventions (JITAIs) in mobile health: Key components and design principles for ongoing health behavior support. Annals of Behavioral Medicine, 52(6), 446–462.',
  '10.1007/s12160-016-9830-8',
  'https://doi.org/10.1007/s12160-016-9830-8',
  2018,
  'theory',
  'Người tham gia các can thiệp sức khỏe số',
  'Khung thiết kế hỗ trợ đúng loại, đúng lượng, đúng thời điểm và thích ứng theo trạng thái người dùng.',
  'Là khung thiết kế, không chứng minh hiệu quả của một nội dung can thiệp cụ thể.',
  false
),
(
  'S5',
  'Carron, A. V., Hausenblas, H. A., & Mack, D. (1996). Social influence and exercise: A meta-analysis. Journal of Sport & Exercise Psychology, 18(1), 1–16.',
  '10.1123/jsep.18.1.1',
  'https://doi.org/10.1123/jsep.18.1.1',
  1996,
  'meta_analysis',
  'Người tham gia rèn luyện thể dục thể thao',
  'Tổng hợp ảnh hưởng xã hội (người hướng dẫn, bạn bè, gia đình) lên hành vi tập luyện.',
  'Bối cảnh tập thể dục. Bằng chứng về can thiệp nhóm so với cá nhân còn tranh luận. Cần đọc để lấy số liệu cụ thể.',
  false
),
(
  'S6',
  'Prenkaj, B., Velardi, P., Stilo, G., Distante, D., & Faralli, S. (2020). A survey of machine learning approaches for student dropout prediction in online courses. ACM Computing Surveys, 53(3).',
  '10.1145/3388792',
  'https://doi.org/10.1145/3388792',
  2020,
  'survey',
  'Học viên các khóa học trực tuyến đại trà (MOOC)',
  'Khảo sát các phương pháp học máy dự đoán bỏ học trong khóa học trực tuyến.',
  'Bối cảnh MOOC, khác với luyện tập ngoài đời. Dùng để tham chiếu phương pháp và đặc trưng, không để biện minh nội dung can thiệp.',
  false
),
(
  'S7',
  'Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. American Psychologist, 55(1), 68–78.',
  '10.1037/0003-066X.55.1.68',
  'https://doi.org/10.1037/0003-066X.55.1.68',
  2000,
  'theory',
  'Tâm lý học hành vi con người',
  'Lý thuyết nền về tự chủ, năng lực, gắn kết.',
  'Lý thuyết nền, không phải bằng chứng can thiệp cụ thể.',
  false
)
on conflict (id) do nothing;
