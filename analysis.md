# Phân tích EduPulse AI — Rà soát & Kế hoạch cải tiến

## Tổng quan codebase

### Kiến trúc
- **Frontend**: React + TypeScript + Vite + TailwindCSS v4
- **Routing**: Hash-based routing (SPA)
- **Backend**: Supabase (Postgres + Auth + Edge Functions)
- **Animation**: motion/react (Framer Motion)

---

## Đánh giá theo role

### 1. STUDENT (~/StudentDashboard.tsx — 2013 dòng)

**Đã có (hoàn chỉnh):**
- ✅ Tab Tổng quan: DrillCard, DualLineChart, DonutStatus
- ✅ Tab Kế hoạch: Plan versioning, modal tạo mục tiêu & điều chỉnh
- ✅ Tab Nhật ký: Form 45s đầy đủ trường, "Không muốn trả lời", lịch sử
- ✅ Tab Báo nghỉ: Danh sách tạm nghỉ
- ✅ Tab Cuối tuần: Xác nhận trạng thái
- ✅ Tab Hỗ trợ AI: Lời mời, "Vì sao gợi ý này?" modal
- ✅ Tab Thầy cô & khảo sát: Gửi yêu cầu, lịch sử, khảo sát trải nghiệm
- ✅ Tab Bạn đồng hành: Mời/chấp nhận/từ chối buddy
- ✅ Tab Khảo sát ban đầu: Phụ lục A
- ✅ Tab Nhắc lịch: Cấu hình thời gian + kênh
- ✅ Tab Cam kết & Dữ liệu: Đồng ý, danh bạ, tải xuống, xóa, rút lui

**Cần cải thiện:**
- ⚠️ Tab Tổng quan: Thiếu insight tóm tắt xu hướng động lực & độ khó
- ⚠️ Tab Nhật ký: Cột bên phải (lịch sử) chỉ show tóm tắt, thiếu mini chart
- ⚠️ Tab Kế hoạch: Thiếu calendar/timeline trực quan
- ⚠️ Tab Hỗ trợ AI: Thiếu thanh timeline / lịch sử lời mời đã phản hồi
- ⚠️ Không có tab **Tiến trình tổng kết** — tổng số buổi, streak, thành tích
- ⚠️ Form ghi nhật ký: Thiếu validation, không hiện goal info
- ⚠️ Không có trạng thái "Không thể ghi nhật ký khi chưa có goal"

### 2. MENTOR (~/MentorDashboard.tsx — 789 dòng)

**Đã có:**
- ✅ Tab Học sinh phụ trách: Danh sách, DualPlanBars, modal xác nhận
- ✅ Tab Yêu cầu hỗ trợ: Pipeline, cập nhật trạng thái
- ✅ Tab Phản hồi tiến bộ: Chọn template, gửi
- ✅ Tab Bạn đồng hành: Duyệt buddy pairs
- ✅ GVHD: Tab Duyệt phân nhóm, Tab Đồng ý tham gia

**Cần cải thiện:**
- ⚠️ Tab Học sinh: Chỉ hiện 1 tuần gần nhất, cần xem detail nhiều tuần
- ⚠️ Thiếu bộ lọc/tìm kiếm học sinh
- ⚠️ Tab Phản hồi: Modal xem chi tiết học sinh khi click
- ⚠️ Thiếu biểu đồ tổng hợp tất cả học sinh (group chart)

### 3. RESEARCHER (~/ResearcherDashboard.tsx — 992 dòng)

**Đã có:**
- ✅ Tab Báo cáo hiệu quả: X, Y, Z, T, cấu hình tham số
- ✅ Tab Định nghĩa vận hành: Khóa/mở khóa
- ✅ Tab Đặc trưng & thiếu: Missing analysis
- ✅ Tab Mô hình & test set: Đăng ký, khóa, mở test set
- ✅ Tab Phân nhóm 1:1: Pseudo-random với seed
- ✅ Tab Xuất dữ liệu: CSV export
- ✅ Tab Mô phỏng: Simulation environment

**Cần cải thiện:**
- ⚠️ Thanh cấu hình tham số không khóa được (thiếu lock mechanism)
- ⚠️ Thiếu 3 cách tính mẫu số (a, b, c) như yêu cầu 3.2
- ⚠️ Biểu đồ precision-recall curve còn thiếu
- ⚠️ Thiếu khoảng tin cậy hiển thị trực quan

### 4. ADMIN (~/AdminDashboard.tsx — 1533 dòng)

**Đã có:**
- ✅ Tab Quản lý role: Danh sách, tìm kiếm, bộ lọc, đổi role
- ✅ Tab Nguồn tham chiếu: Xác minh, thêm mới
- ✅ Tab Nội dung hỗ trợ: Thư viện, duyệt, thêm mới
- ✅ Tab Phân công mentor: Assign mentor/student
- ✅ Tab Danh bạ liên hệ: Với audit log
- ✅ Tab Đồng ý tham gia: Quản lý consents
- ✅ Tab Chất lượng dữ liệu: Outliers, duplicates
- ✅ Tab Cấu hình hệ thống: App settings
- ✅ Tab Audit Log: Lịch sử truy cập

**Cần cải thiện:**
- ⚠️ Thiếu tab **Deployment** (bật/tắt mô hình, kill switch)
- ⚠️ Thiếu tab **Backup** và **Retention**
- ⚠️ Thiếu chạy thủ công weekly predict/summary
- ⚠️ Cấu hình thông báo chưa đủ chi tiết

---

## Kế hoạch cải tiến ưu tiên cao

### Phase 1: Student Dashboard Enhancement
1. Thêm Overview stats: streak, tổng buổi, xu hướng động lực
2. Thêm mini charts trong Log history sidebar
3. Cải thiện form nhật ký: hiện rõ goal info trên đầu
4. Thêm calendar view cho kế hoạch
5. Thêm Progress/Achievement section

### Phase 2: UI/UX Global
1. Nâng cấp thẻ thống kê (số lớn + biểu đồ mini sparkline)
2. Thêm skeleton loading states
3. Cải thiện empty states
4. Tăng tính nhất quán màu sắc và spacing

### Phase 3: Mentor Enhancement
1. Bộ lọc/tìm kiếm học sinh
2. Multi-week trend chart per student
3. Group progress chart

### Phase 4: Admin Enhancement
1. Tab Deployment với kill switch
2. Tab Retention scheduler
3. Manual trigger buttons

### Phase 5: Charts & Visualization
1. Thêm sparkline trong thẻ thống kê
2. Precision-recall curve cho researcher
3. Confidence interval visualization
