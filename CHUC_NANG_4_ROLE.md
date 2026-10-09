# Chức năng EduPulse theo 4 vai trò

## Xác thực, điều hướng và trang công khai

### Đăng nhập và tạo tài khoản
- **Khuyến nghị của dự án:** với nghiên cứu dài hạn nên ưu tiên đăng nhập Google cho nhanh và thống nhất danh tính.
- **Source hiện tại:** có cả Google OAuth và email/mật khẩu; trang login cho chuyển giữa chế độ đăng nhập và tạo tài khoản bằng email/mật khẩu.
- Google OAuth khôi phục session sau callback, nạp profile từ Supabase và chuyển người dùng tới dashboard theo role.
- Email đăng ký có thể cần xác nhận từ hộp thư; nếu Supabase chưa cấp session, UI hướng dẫn xác nhận email rồi đăng nhập lại.
- Profile/role lấy từ allowlist nếu email được mời; người dùng chưa có invite mặc định là Student. Profile/contact được đồng bộ qua `ensure_own_profile`.

### Điều hướng và bảo vệ route
- Navbar có Trang chủ, Tính năng, Cách hoạt động, Về dự án; hiển thị nút đăng nhập khi chưa có session.
- Sau đăng nhập, navbar hiển thị tài khoản/role, nút vào bàn làm việc và đăng xuất; Admin có lối tắt về bảng quản trị; menu có phiên bản mobile.
- `RoleGate` chặn dashboard nếu chưa đăng nhập hoặc role hiện tại không được phép; có nút tới trang đăng nhập/bàn làm việc đúng role.
- Session được Supabase lưu và tự refresh; logout kết thúc session, xóa profile cache ở client.
- Toast và nút cuộn lên đầu dùng chung cho toàn ứng dụng.

### Đăng ký mục tiêu (onboarding)
- Route `register` là wizard 3 bước riêng: chọn 1 trong 5 lĩnh vực (học thuật, ngoại ngữ, thể thao, nghệ thuật, kỹ năng), đặt tên mục tiêu, chọn 1–5 buổi/tuần và thời lượng 20/30/45/60 phút, xem tóm tắt rồi hoàn tất.
- Wizard có nút quay lại/tiếp tục và đường dẫn sang đăng nhập nếu đã có tài khoản.
- **Giới hạn hiện tại:** callback hoàn tất trong `App.tsx` chỉ hiển thị toast và chuyển sang Student; mục tiêu từ wizard chưa được ghi vào Supabase. Tạo mục tiêu thật hiện thực hiện ở tab Student → Kế hoạch.
- Chưa thấy form quên mật khẩu hoặc nút gửi lại email xác nhận trong source hiện tại.

### Trang công khai
- **Trang chủ:** landing gồm giới thiệu, lĩnh vực mục tiêu, hành trình học sinh, phát hiện sớm, tình huống hỗ trợ, cách hoạt động, quyền riêng tư và CTA.
- **Tính năng:** giới thiệu các nhóm tính năng của EduPulse.
- **Cách hoạt động:** trình bày quy trình từ mục tiêu, lịch, nhật ký, theo dõi tới hỗ trợ.
- **Về dự án:** vấn đề, ý tưởng và cam kết đạo đức AI.

## 1. Student — Không gian rèn luyện

### 1.1 Tổng quan
- Lộ trình tham gia, trạng thái các bước: đồng ý, mục tiêu, nhật ký, xác nhận cuối tuần và khảo sát ban đầu.
- Gợi ý bước tiếp theo; bấm CTA để mở đúng tab cần làm.
- KPI: buổi hoàn thành/tổng buổi, kế hoạch hiện tại, tỷ lệ duy trì, động lực trung bình, số đợt nghỉ và lời mời hỗ trợ.
- Chuỗi ngày rèn luyện, insight ngắn, sparkline động lực gần đây.
- Thành tích 90 ngày: số buổi, retention, động lực; so sánh thanh kế hoạch gốc và hiện tại.
- Xu hướng weekly summary và phân bố trạng thái nhật ký; bấm biểu đồ/thẻ để mở nhật ký hoặc chi tiết tuần.
- Khối đồng bộ vai trò: mentor phụ trách, buddy đã kết nối, số buổi của kế hoạch gốc/hiện tại.

### 1.2 Khảo sát ban đầu
- Trả lời các câu hỏi tự xây dựng về mục tiêu/khó khăn trước nhật ký chính thức.
- Gửi khảo sát với `survey_type = baseline`; xem lịch sử khảo sát đã lưu.
- Đây không phải công cụ chẩn đoán tâm lý.

### 1.3 Phân tích sâu
- Chỉ vẽ xu hướng khi có tối thiểu 3 nhật ký.
- Lịch hoạt động 12 tuần; thời lượng, động lực, độ khó trung bình; buổi có ý định tiếp tục thấp.
- Xu hướng động lực/độ khó 8 buổi gần nhất.
- Phân bố rào cản khi nhật ký có ghi barrier.
- Xu hướng hoàn thành weekly summary; bấm điểm để xem nhật ký theo tuần.
- Trường được bỏ qua không bị điền 0 vào các thống kê.

### 1.4 Kế hoạch
- Tạo mục tiêu theo nhóm hoạt động, số buổi/tuần, ngày đích, thứ/giờ, tiêu chí thành công và người hỗ trợ.
- Điều chỉnh kế hoạch bằng cách tạo phiên bản mới: ngày hiệu lực, tần suất/lịch và lý do bắt buộc.
- Xem danh sách phiên bản, phiên bản đang áp dụng, ngày hiệu lực, lịch từng buổi và lý do thay đổi; không sửa ngược phiên bản cũ.
- Có CTA tạo mục tiêu nếu chưa có kế hoạch.

### 1.5 Nhật ký
- Ghi ngày và trạng thái: hoàn thành, một phần hoặc bỏ lỡ.
- Ghi thời lượng, động lực, độ khó, rào cản, ý định tiếp tục và ghi chú.
- Từng trường cho phép chọn “không muốn trả lời”; có kiểm tra form trước khi lưu.
- Lưu/upsert theo học sinh, mục tiêu và ngày; xem lịch sử, lọc tất cả/hoàn thành/một phần/bỏ lỡ và mở chi tiết bản ghi.
- Hiển thị streak và xu hướng động lực gần đây.

### 1.6 Báo nghỉ
- Tạo đợt nghỉ có ngày bắt đầu/kết thúc, lý do ốm/thi cử/khác và ghi chú.
- Xem danh sách các đợt nghỉ đã lưu.

### 1.7 Cuối tuần
- Chọn tuần bắt đầu từ thứ Hai.
- Xác nhận một trong bốn trạng thái: đang rèn luyện, nghỉ hợp lệ, đã đạt mục tiêu, đã dừng; kèm ghi chú tùy chọn.
- Xem lịch sử trạng thái do học sinh hoặc mentor xác nhận.

### 1.8 Hỗ trợ AI
- Xem lời mời, nội dung gợi ý, ngày gửi, tình trạng phản hồi và cơ sở tham khảo.
- Với lời mời đang chờ: áp dụng, hoãn 3 ngày hoặc từ chối.
- Mở chi tiết “Vì sao gợi ý này?” gồm trích dẫn, năm, đối tượng, phát hiện, giới hạn và cấp độ bằng chứng.
- Có empty state hướng về luồng mục tiêu → kế hoạch → nhật ký khi chưa có lời mời.

### 1.9 Thầy cô & khảo sát
- Gửi lời nhắn/yêu cầu hỗ trợ đến mentor; xem người nhận nếu đã được phân công.
- Xem lịch sử yêu cầu, trạng thái mới nhận/đang xử lý/đã xong và phản hồi mentor.
- Gửi khảo sát trải nghiệm: hữu ích, dễ dùng, mức phiền (thang 1–5); lưu vào `surveys`.

### 1.10 Bạn đồng hành
- Gửi lời mời bằng mã HS; không nhập hay công khai điểm nguy cơ.
- Với lời mời đến: chấp nhận hoặc từ chối; với lời mời đi đang chờ: thu hồi.
- Xem trạng thái kết nối và xác nhận của mentor.

### 1.11 Nhắc lịch
- Bật/tắt nhắc; chọn giờ và kênh web/email; lưu tùy chọn trong `reminder_prefs`.
- Đây là cấu hình nhận nhắc trong ứng dụng; việc có dịch vụ gửi notification/email bên ngoài hay không phụ thuộc triển khai runtime.

### 1.12 Cam kết & dữ liệu
- Ghi consent theo phiên bản biểu mẫu và xác nhận phụ huynh nếu cần; xem thời điểm/trạng thái consent.
- Cập nhật danh bạ cá nhân tách khỏi dữ liệu huấn luyện: tên, lớp, điện thoại, email, liên hệ phụ huynh.
- Tải JSON dữ liệu cá nhân.
- Gửi yêu cầu xóa dữ liệu để Admin xử lý; rút consent khỏi nghiên cứu qua RPC.

## 2. Mentor — Bàn làm việc cố vấn

### 2.1 Học sinh phụ trách
- Chỉ liệt kê học sinh đã consent và được gán cho Mentor.
- Tìm theo mã HS/nhóm hoạt động; lọc nhóm hoạt động và xem số kết quả.
- Thẻ học sinh hiển thị tiến độ tuần, kế hoạch gốc/hiện tại, phần trăm hoàn thành, trạng thái tuần và tình trạng phụ huynh xác nhận.
- Bấm thẻ mở chi tiết: thông tin nhóm, biểu đồ tuần và các yêu cầu hỗ trợ liên quan.
- Mở form xác nhận trạng thái cho trường hợp mất liên lạc: tuần, trạng thái, ghi chú xác minh qua kênh cam kết.
- Không hiển thị điểm nguy cơ hoặc bảng xếp hạng nguy cơ.

### 2.2 Yêu cầu hỗ trợ
- Bảng theo ba cột: mới nhận → đang xử lý → đã xong; badge đếm yêu cầu chưa hoàn tất.
- Đọc lời nhắn theo mã HS, nhập phản hồi, tiếp nhận yêu cầu hoặc đánh dấu xong.
- Trạng thái và phản hồi đồng bộ ngược về tab Thầy cô của Student.

### 2.3 Bạn đồng hành
- Xem hai mã HS, trạng thái lời mời và cờ đã được Mentor ghi nhận.
- Ghi nhận cặp sau khi học sinh chấp nhận; chỉ xem cặp có liên quan đến học sinh mình được phân công.

### 2.4 Phản hồi tiến bộ
- Nhập mã HS, chọn một trong tối đa 4 mẫu khích lệ đang hiển thị và gửi.
- Tạo lời mời hỗ trợ tới học sinh và ghi audit.

### 2.5 Duyệt phân nhóm — chỉ Lead Mentor
- Báo cáo hiệu quả can thiệp/đối chứng, cỡ mẫu, chênh lệch và trạng thái mục tiêu nếu cấu hình/dữ liệu đủ.
- Giám sát số lời mời, profile kích hoạt, consent, rút lui và số lượng hai nhóm.
- Phê duyệt phân nhóm ngẫu nhiên đã được Researcher đề xuất; trạng thái được đọc lại từ DB sau refresh.
- Phê duyệt mở tập kiểm tra khi có yêu cầu; chỉ mở một lần, trạng thái chờ/đã mở lấy từ DB.

### 2.6 Đồng ý tham gia — chỉ Lead Mentor
- Xem mã HS, phiên bản form, ngày đồng ý và trạng thái còn hiệu lực/đã rút.
- Không hiển thị tên hoặc thông tin liên hệ.

## 3. Researcher — Phân tích & đo lường

### 3.1 Báo cáo hiệu quả
- Cấu hình mẫu số `N_obs`, `N_all` hoặc `N_comp`; ngưỡng retention, target, cỡ mẫu tối thiểu và chênh lệch tối thiểu.
- Cấu hình được lưu ở `research_report_config` và nạp lại sau refresh.
- KPI X/Y/Z/T: học sinh đang quan sát, cờ nguy cơ, chênh lệch retention và thời gian theo dõi; nhấp X mở danh sách mã HS.
- Bảng so sánh intervention/control theo N_all, N_obs, cờ AI, retention kế hoạch gốc/hiện tại.
- Hiển thị precision/recall chỉ khi nguồn có số liệu; hiện tại không tự suy ra nhãn bỏ cuộc.
- Khoảng tin cậy Wilson cho từng nhóm và Newcombe cho chênh lệch; trạng thái đạt/chưa đạt/chưa kết luận căn cứ khoảng tin cậy và cấu hình.
- Biểu đồ retention gốc/hiện tại, trung bình tuần đã khử định danh, line chart và grouped bars.
- P‑R curve được để trống kèm lý do cho tới khi DB có điểm dự đoán cùng nhãn kết quả thật theo từng mẫu.

### 3.2 Định nghĩa vận hành
- Xem định nghĩa bỏ cuộc, hoàn thành, tạm nghỉ; trạng thái khóa, version, tiêu chí.
- Khóa định nghĩa; mở khóa yêu cầu nhập lý do và ghi audit.

### 3.3 Đặc trưng & dữ liệu thiếu
- Thống kê số dòng nhật ký, missed, trung vị động lực đã trả lời và số nhật ký có trường skip.
- Bảng `v_missing`: mã HS, arm, số buổi missed, nhật ký bỏ qua câu, số đợt nghỉ.
- Bấm dòng mở nhật ký khử định danh dạng mẫu để kiểm tra dữ liệu.

### 3.4 Mô hình & test set
- Xem phiên bản model, thuật toán, feature, ngưỡng, hệ số, trạng thái khóa.
- Khóa phiên bản trước khi phân nhóm; sau khi khóa không sửa các tham số.
- Gửi yêu cầu mở test set cho Lead Mentor; sau refresh vẫn giữ trạng thái yêu cầu.

### 3.5 Phân nhóm 1:1
- Chọn seed nguyên không âm và đề xuất danh sách học sinh đủ điều kiện: đang hoạt động, consent chưa rút.
- DB phân tầng theo nhóm hoạt động, tạo allocation cân bằng/tái lập theo seed, audit và từ chối nhóm đã được duyệt.
- Bảng xem mã HS, nhóm hoạt động, intervention/control, consent và trạng thái.

### 3.6 Xuất dữ liệu
- Xuất CSV danh sách học sinh khử định danh hoặc toàn bộ nhật ký nghiên cứu khử định danh.
- Dataset được đọc theo trang, escape CSV đúng chuẩn và ghi audit.

### 3.7 Mô phỏng
- Hiển thị cảnh báo dữ liệu mô phỏng, hướng dẫn tách schema `sim` khỏi báo cáo production.
- Nạp/xóa bộ mô phỏng hiện được hướng dẫn chạy script SQL riêng; không trộn vào số liệu báo cáo thật.

## 4. Admin — Quản trị vận hành

### 4.1 Tài khoản & lời mời
- Tìm theo email/tên/mã HS; lọc theo Student, Mentor, Researcher, Admin; xem tổng số từng role.
- Cấp role cho tài khoản Google; đặt cờ Lead Mentor hoặc mã HS khi cấp Student.
- Thêm email allowlist thủ công hoặc nhập CSV `email,role,student_code,lead`; xem danh sách và thu hồi lời mời.
- Xóa tài khoản mở modal xác nhận; nút xóa chỉ bật khi nhập chính xác email. RPC xóa account và audit cùng transaction.

### 4.2 Nguồn khoa học
- Xem mã nguồn, citation, loại, năm, đối tượng, phát hiện, giới hạn và trạng thái xác minh.
- Mở link nguồn; thêm nguồn mới (mã, citation, DOI/URL, năm, loại, đối tượng, phát hiện, giới hạn).
- Xác minh yêu cầu tick xác nhận đã đọc nguồn gốc; nguồn đã xác minh mới đủ điều kiện duyệt nội dung can thiệp.

### 4.3 Thư viện can thiệp
- Tạo nội dung theo rào cản: quá tải, thiếu thời gian, nhiệm vụ khó, thiếu tiến bộ, thiếu buddy, muốn đổi mục tiêu.
- Chọn nguồn, nhập title/body; nguồn chưa xác minh thì nội dung được lưu draft.
- Duyệt draft; trigger DB chặn trạng thái approved nếu nguồn chưa verified.
- Xem nội dung, barrier, nguồn và trạng thái.

### 4.4 Phân công GVHD
- Chọn Mentor/Lead Mentor và Student; tạo cặp phân công.
- Xem danh sách gồm người hướng dẫn, học sinh, mã HS, ngày phân công.
- Sửa cặp bằng nút edit rồi lưu/hủy; xóa có confirm. RPC kiểm tra role, ghi assignment và audit transactionally.

### 4.5 Danh bạ
- Danh sách contacts hiển thị tên/điện thoại đã che mặc định.
- Bấm “Xem” để ghi audit trước khi mở dữ liệu; có thể ẩn lại từng hàng.
- Lỗi ghi audit sẽ không mở dữ liệu liên hệ.

### 4.6 Đồng ý & dữ liệu
- Xem consent theo mã HS, phiên bản, thời điểm và trạng thái hiệu lực/rút.
- Xem yêu cầu export/deletion cùng trạng thái; đánh dấu yêu cầu pending là completed.

### 4.7 Chất lượng dữ liệu
- Tổng nhật ký và nhật ký tuần hiện tại.
- Đếm thời lượng ngoài khoảng hợp lệ và khóa trùng `student|goal|date`.
- Xem mẫu các dòng bất thường/khóa trùng; tab này không sửa bản ghi gốc.

### 4.8 Cấu hình
- Kill switch bật/tắt lời mời can thiệp tự động.
- Xem deployment readiness, contact retention, giới hạn lời mời.
- Sửa ngày giữ danh bạ và số lời mời/tuần; chạy tổng kết weekly summary.

### 4.9 Nhật ký
- Xem các audit gần nhất gồm role người thao tác, action, target và thời điểm.
- Các hành động quan trọng như xem contact, cấp role, mở khóa, export và job tuần được lưu audit.

### 4.10 Job vận hành
- Nút header chạy tổng kết tuần và dự đoán tuần; các RPC chỉ cho Admin và ghi audit cùng transaction.

## 5. Liên kết dữ liệu giữa các role

- Student tạo consent, mục tiêu, kế hoạch, nhật ký, nghỉ, trạng thái tuần, khảo sát, support request, buddy invitation và reminder preferences.
- Mentor xem học sinh đã consent/được phân công, xử lý yêu cầu, ghi trạng thái tuần, gửi khích lệ và (nếu là Lead) duyệt nhóm/test set.
- Researcher phân tích dữ liệu qua view giả danh/aggregate, đề xuất phân nhóm và export CSV khử định danh.
- Admin cấp quyền, quản lý allowlist, nguồn/nội dung, phân công, data requests, contacts, cấu hình và jobs.
- Các dashboard có loading/error state và retry; truy vấn lỗi không được trình bày như danh sách rỗng.

## 6. Giới hạn và yêu cầu triển khai

- Model được mô tả là huấn luyện offline; dashboard hiện xem/khóa version và yêu cầu mở test set, không huấn luyện model trực tiếp.
- P‑R curve chưa tính được nếu không có prediction scores và ground-truth labels theo từng mẫu.
- Mô phỏng nằm ngoài production; thao tác với schema `sim` hiện cần script SQL riêng.
- Wizard onboarding ở route `register` chưa persist goal; chưa có quên mật khẩu/resend email confirmation. Đăng nhập email/mật khẩu vẫn có trong source dù Google là lựa chọn phù hợp hơn cho nghiên cứu dài hạn.
- Các policy/RPC/view mới nằm trong [migration `20261008000003_role_data_rls.sql`](supabase/migrations/20261008000003_role_data_rls.sql). Cần áp dụng migration lên Supabase để các kiểm soát/RPC mới có hiệu lực ở DB thật.
