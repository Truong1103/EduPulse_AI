
## 1. Mentor (giáo viên) – phần thống kê đã triển khai
- Xem danh sách học sinh phụ trách theo nhóm hoạt động và tiến độ từng người.
- Có tab “Cần xem lại” dựa trên yêu cầu hỗ trợ chưa xử lý hoặc xu hướng giảm tiến độ trong 3 tuần liên tiếp.
- Theo dõi trạng thái tuần, hỗ trợ học sinh xử lý khó khăn và gửi mẫu động viên phù hợp.
- Không hiển thị dữ liệu nhạy cảm hoặc điểm số nguy cơ như chẩn đoán, chỉ hiển thị dữ liệu phù hợp với vai trò giáo viên.

### 1.1. Công thức thống kê mẫu dùng cho giáo viên
- Mean (trung bình): trung bình số buổi hoàn thành, mức động lực hoặc mức độ tham gia của học sinh trong khoảng thời gian nhất định.
- Median (trung vị): điểm chia nửa nhóm học sinh ở trên và nửa nhóm ở dưới, giúp nhận diện xu hướng chung khi dữ liệu có sự chênh lệch lớn.
- Mode (mốt): giá trị xuất hiện nhiều nhất, ví dụ mức động lực hoặc độ khó phổ biến nhất trong nhóm.
- Q1, Q3 và IQR: đo mức độ phân tán dữ liệu; IQR rộng cho thấy sự chênh lệch lớn giữa học sinh tiến bộ và học sinh chậm.
- Histogram: biểu diễn phân bố tiến độ, thời lượng, động lực, độ khó theo từng khoảng giá trị.
- Missingness: tỷ lệ dữ liệu thiếu, cho biết dữ liệu có đủ đáng tin cậy để phân tích hay không.

### 1.2. Cách giáo viên đọc số liệu để đánh giá học sinh tham gia
- Nếu mean của số buổi hoàn thành thấp, giáo viên nhận thấy cả lớp đang có tiến độ chậm.
- Nếu median thấp nhưng mean cao, có thể có vài học sinh rất xuất sắc và nhiều học sinh đang tụt hậu, cần phân nhóm can thiệp.
- Nếu mode của mức động lực là 4/5, phần lớn học sinh đang duy trì động lực tốt.
- Nếu IQR của tiến độ lớn, giáo viên nên chia học sinh thành nhóm cần hỗ trợ và nhóm đang tiến bộ ổn định.
- Nếu missingness cao ở cột thời lượng hoặc cảm xúc, giáo viên nên kiểm tra dữ liệu trước khi kết luận về mức độ tham gia thực sự.

### 1.3. Ý nghĩa cho vai trò giáo viên
- Giúp giáo viên đánh giá học sinh tham gia thực tế, không chỉ nhìn cảm tính.
- Hỗ trợ xác định học sinh cần ưu tiên hỗ trợ sớm.
- Tạo nền tảng để theo dõi hiệu quả can thiệp theo thời gian.
- Sử dụng dữ liệu thật, có công thức rõ, dễ giải thích và dễ trình bày trong báo cáo.

## 2. Student
- Theo dõi tiến độ cá nhân theo tuần: hoàn thành kế hoạch, trạng thái buổi, động lực, độ khó, ý định tiếp tục.
- Hiển thị xu hướng theo thời gian bằng biểu đồ và summary card rõ ràng.
- Tính toán hoàn thành dựa trên dữ liệu thật, không dùng giá trị giả hoặc partial làm thành công.
- Phân biệt rõ dữ liệu quan sát và dữ liệu chốt thực tế để học sinh hiểu rõ tình hình của mình.

## 3. Researcher
- Theo dõi hiệu quả hỗ trợ và outcome theo chuẩn nghiên cứu, có phân tách outcome thật và mô hình dự đoán.
- Có báo cáo aggregate về support invite, phản đáp hữu ích và biến động completion trước/sau hỗ trợ.
- Theo dõi model score vận hành và phân bố xác suất, nhưng ghi rõ đây là score AI, không phải outcome thật.
- Hiển thị dữ liệu nghiên cứu theo cách có kiểm soát quyền truy cập và không lộ dữ liệu nhạy cảm.

## 4. Admin
- Giám sát chất lượng dữ liệu toàn hệ thống: tổng log, missingness, phân bố trạng thái, dữ liệu thiếu, outlier thời lượng.
- Kiểm tra trạng thái học sinh, consent, phân nhóm và dữ liệu đầu vào theo các tiêu chí chất lượng.
- Bảo vệ quyền truy cập và giảm rủi ro dữ liệu sai/không đồng nhất trên toàn hệ thống.

## 5. Tính năng thống kê chung
- Có KPI, chart, histogram, bảng dữ liệu và drill-down theo role.
- Dùng dữ liệu thực tế từ hệ thống để theo dõi xu hướng, thay đổi và hiệu quả can thiệp.
- Phân biệt rõ giữa dữ liệu quan sát, score dự đoán AI và outcome đã xác nhận.
- Không bịa dữ liệu minh họa, và nếu thiếu dữ liệu thì hiện trạng thái chưa đủ dữ liệu thay vì suy đoán.



