# Kế hoạch đẩy mạnh lĩnh vực Thống kê cho EduPulse

## 1. Mục tiêu và định vị

Mục tiêu là chuyển trọng tâm đề tài từ “xây một website có AI” sang **dùng dữ liệu học sinh để mô tả và kiểm định các yếu tố liên quan đến duy trì mục tiêu luyện tập dài hạn**. Website là công cụ thu thập, quản lý, phân tích và trình bày dữ liệu; đóng góp thuộc lĩnh vực Thống kê phải nằm ở câu hỏi nghiên cứu, định nghĩa biến/outcome, phương pháp phân tích và kết luận.

**Định vị đề xuất:** lĩnh vực chính là **Thống kê** nếu nhóm thật sự thực hiện và bảo vệ được thiết kế, phân tích, sai số và giới hạn của kết quả. Công nghệ thông tin là công cụ hỗ trợ; nếu trọng tâm lại là phát triển phần mềm/mô hình AI thì lĩnh vực phù hợp hơn có thể là Công nghệ thông tin hoặc Máy tính. Không thể bảo đảm kết quả xét lĩnh vực hay khả năng qua vòng loại chỉ bằng cách thêm công thức vào web.

### Câu hỏi nghiên cứu đề xuất

> Ở học sinh được phân nhóm, chênh lệch giữa nhóm can thiệp và nhóm đối chứng về tỷ lệ bỏ cuộc đã xác nhận trong 8 tuần là bao nhiêu? Các yếu tố nào trong nhật ký và tiến độ có liên quan đến việc duy trì mục tiêu? Tỷ lệ hoàn thành kế hoạch là kết quả phụ.

Câu hỏi cần được giáo viên hướng dẫn chốt trước khi thu/so sánh dữ liệu. Phải tách mục tiêu dự báo AI khỏi mục tiêu đánh giá hiệu quả gói can thiệp.

### Cụ thể hóa để Thống kê là trọng tâm trong đề cương AI

Đề cương hiện đặt AI ở vị trí nổi bật trong tên đề tài, tóm tắt và câu hỏi nghiên cứu. Nếu đăng ký theo lĩnh vực Thống kê, không cần bỏ sản phẩm AI, nhưng cần trình bày AI là công cụ phụ trợ; đóng góp chính là thiết kế thu thập dữ liệu, mô tả mức độ tham gia, ước lượng kết quả có độ bất định và kiểm định giả thuyết.

- **Kết quả chính duy nhất:** tỷ lệ bỏ cuộc đã xác nhận đến tuần 8; mẫu số là toàn bộ học sinh đã phân nhóm ban đầu (intention-to-treat). Ước lượng chênh lệch tuyệt đối giữa hai nhóm và khoảng tin cậy 95%. Báo cáo riêng trường hợp chưa rõ/mất theo dõi; không tự xếp họ vào nhóm bỏ cuộc hoặc duy trì.
- **Kết quả phụ:** tỷ lệ hoàn thành kế hoạch theo tuần và các chỉ số trải nghiệm. Chỉ diễn giải chênh lệch nhóm như tác động của gói hỗ trợ nếu quy trình phân nhóm được thực hiện đúng; nếu không, chỉ kết luận về mối liên hệ.
- **Câu hỏi phụ:** Những đặc điểm nào liên quan đến duy trì mục tiêu? Mô hình AI có cải thiện dự báo so với tỷ lệ nền và quy tắc đơn giản không? Hai câu hỏi này phải được báo cáo riêng, không dùng kết quả dự báo thay cho kiểm định hiệu quả can thiệp.
- **Đầu ra thống kê cho Giáo viên:** xem aggregate cohort được phân quyền gồm số học sinh đủ điều kiện, được mời, đồng ý, bắt đầu và còn được theo dõi; tách tỷ lệ đồng ý (đồng ý/số đủ điều kiện được mời), tỷ lệ bắt đầu (có ít nhất một buổi hợp lệ/số đã đồng ý) và tỷ lệ hoạt động theo tuần (có ít nhất một buổi hoàn thành/số có lịch hợp lệ và còn trong cửa sổ theo dõi). Báo cáo riêng chưa rõ/mất theo dõi, tiến độ tuần, phân bố số buổi, khó khăn và dữ liệu thiếu. Dùng trung bình/trung vị cho biến số, mốt cho biến phân loại; luôn kèm N và mẫu số. Đây là đầu ra ứng dụng, không thay thế kết quả nghiên cứu.
- **Cỡ mẫu và giới hạn AI:** trước thử nghiệm can thiệp, tính cỡ mẫu từ tỷ lệ nền, mức chênh lệch tối thiểu có ý nghĩa, alpha, power và mất theo dõi; không coi các con số 80–120 là đủ nếu chưa có căn cứ. Với mô hình, đếm số học sinh/sự kiện bỏ cuộc độc lập; nếu số sự kiện ít hoặc tập kiểm tra không ổn định, chỉ trình bày AI như phân tích thăm dò, không tuyên bố mô hình vượt trội.
- **Cách thể hiện trong hồ sơ:** ưu tiên câu hỏi, outcome chính, kế hoạch phân tích và bảng kết quả thống kê trong tóm tắt, mục tiêu và báo cáo; phần kiến trúc web/AI là phương tiện thực hiện. Chỉ đổi tên đề tài sau khi giáo viên hướng dẫn xác nhận phù hợp quy định cuộc thi.

## 2. Hiện trạng và khoảng trống cần lấp

### Đã có trong source

- `session_logs`: trạng thái buổi, thời lượng, động lực, độ khó, rào cản, ý định tiếp tục và các trường được bỏ qua.
- `weekly_summary`: buổi hoàn thành, kế hoạch gốc/hiện tại và tỷ lệ hoàn thành tuần.
- `goals`, `plan_versions`, `rest_periods`, `weekly_status`, `consents`, `study_arms`, `predictions`.
- Researcher đã có báo cáo intervention/control, mẫu số N_all/N_obs/N_comp, retention, Wilson/Newcombe CI và bảng dữ liệu thiếu.
- Mentor có tiến độ từng học sinh được phân công; Lead Mentor có số liệu tuyển mẫu và phê duyệt nghiên cứu.

### Khoảng trống trước khi tuyên bố kết quả thống kê

1. **Outcome bỏ cuộc chưa được lưu thành một nhãn nghiên cứu thống nhất.** `profiles.status = withdrawn` là rút khỏi nghiên cứu, không đồng nghĩa bỏ mục tiêu. `weekly_status = stopped` cũng cần quy tắc xác nhận rõ. Cần phân biệt ít nhất: đang theo dõi, bỏ cuộc đã xác nhận, đạt mục tiêu, nghỉ hợp lệ, rút nghiên cứu và chưa rõ kết quả.
2. **Công thức tỷ lệ hoàn thành cần khớp đề cương.** Đề cương định nghĩa tỷ lệ tuần là số buổi hoàn thành chia số buổi đã lên lịch hợp lệ; tuần không có lịch là “không áp dụng”, không phải 0. Cần xác nhận `partial` có được xem là hoàn thành hay không và xử lý ngày nghỉ/kế hoạch phiên bản.
3. **Cỡ mẫu tuyển thuận tiện chưa đồng nghĩa đủ lực thống kê.** Cần ước lượng cỡ mẫu dựa trên tỷ lệ nền, mức cải thiện cần phát hiện, alpha/power và tỷ lệ mất theo dõi cùng giáo viên/người hỗ trợ thống kê.
4. **Một học sinh có nhiều nhật ký theo thời gian.** Không được coi từng nhật ký là một người độc lập trong kiểm định nhóm.
5. **Biến Likert 1–5 là biến thứ bậc.** Trung bình có thể trình bày phụ trợ, nhưng cần kèm phân bố, trung vị và IQR; không diễn giải như thang đo tâm lý đã chuẩn hóa.
6. **Precision/Recall/PR-AUC chỉ có ý nghĩa khi có nhãn kết quả độc lập và điểm dự đoán theo từng mẫu.** Không suy ra nhãn từ chính cờ AI hoặc nội suy đường cong từ số tổng hợp.
7. **Bản ghi lỗi/thiếu phải khác với dữ liệu thực sự bằng 0.** Luôn hiển thị N, số thiếu, số không áp dụng và trạng thái chưa đủ dữ liệu.

## 3. Yêu cầu P0 — Chuẩn hóa thiết kế và dữ liệu

### 3.1 Đăng ký trước kế hoạch phân tích

Tạo tài liệu được giáo viên hướng dẫn duyệt, tối thiểu gồm:

- Câu hỏi chính và giả thuyết chính; các phân tích phụ được đánh dấu riêng.
- Một kết quả chính duy nhất, estimand, mẫu số intention-to-treat và cách xử lý outcome chưa rõ; completion và các phân tích khác được ghi rõ là kết quả phụ/thăm dò.
- Quần thể đủ điều kiện, thời điểm bắt đầu/kết thúc, cửa sổ dự báo 14 ngày và giai đoạn can thiệp 8 tuần.
- Định nghĩa outcome, trường hợp nghỉ có phép, mất theo dõi, rút nghiên cứu và hoàn thành mục tiêu.
- Mẫu số chính cho phân tích can thiệp là số đã phân nhóm ban đầu (intention-to-treat), trừ khi đề cương được duyệt quy định khác.
- Mức ý nghĩa, khoảng tin cậy, cách xử lý nhiều phép so sánh, dữ liệu thiếu và phân tầng.
- Ngưỡng/cỡ mẫu không được chọn lại sau khi nhìn kết quả nhằm làm kết luận thuận lợi.

### 3.2 Từ điển dữ liệu

| Biến | Kiểu | Định nghĩa cần khóa | Thống kê phù hợp |
|---|---|---|---|
| Mã HS | Mã giả danh | Một mã ổn định cho một người trong nghiên cứu | Đếm người duy nhất, không dùng tên/email |
| Nhóm hoạt động | Danh mục | Học thuật, ngoại ngữ, thể thao, nghệ thuật, kỹ năng | Tần số, tỷ lệ, mốt |
| Arm | Danh mục | Intervention/control theo phân nhóm ban đầu | Cỡ mẫu và tỷ lệ theo nhóm |
| Trạng thái outcome | Danh mục | Theo định nghĩa đã khóa; tách rút consent | Tần số, tỷ lệ, khoảng tin cậy |
| `session_logs.status` | Danh mục | Done/partial/missed; xác định `partial` có tính hoàn thành không | Tần số, tỷ lệ |
| Motivation/difficulty/intent | Thứ bậc 1–5 | Điểm tự báo cáo; có thể bỏ qua | Tần số từng mức, median, IQR; mean/SD phụ trợ |
| Duration | Số phút | Buổi thực tế; giới hạn hợp lệ cần duyệt | Mean, SD, median, IQR, min/max |
| Barrier | Danh mục nhiều loại | Mã rào cản chuẩn, cho phép chưa trả lời | Tần số, tỷ lệ, mốt; giữ riêng giá trị thiếu |
| Planned/done | Số đếm | Kế hoạch hiệu lực trong tuần và buổi đạt tiêu chí tối thiểu | Tổng, trung bình/trung vị, tỷ lệ |
| Week | Thời gian | Tuần bắt đầu thứ Hai; lưu ngày nhất quán | Chuỗi thời gian theo học sinh/nhóm |
| Consent status | Danh mục | Đồng ý còn hiệu lực/rút; không dùng thay outcome | Báo cáo luồng tuyển mẫu |

### 3.3 Bảng dữ liệu/outcome cần bổ sung hoặc xác nhận

- Thiết kế một nơi lưu **outcome nghiên cứu đã xác nhận**, riêng với consent và profile status. Gợi ý entity `study_outcomes`/`followup_outcomes`: mã học sinh, mục tiêu/đợt theo dõi, outcome, ngày outcome, người xác nhận, thời điểm xác nhận, ghi chú và version định nghĩa.
- Có lịch sử chuyển trạng thái; không ghi đè sự kiện cũ khi outcome được cập nhật.
- Một bản ghi học sinh/đợt theo dõi chỉ có một outcome chính tại thời điểm khóa phân tích; mọi trường hợp chưa rõ được báo cáo riêng.
- Chuẩn hóa kế hoạch hiệu lực theo ngày để tính số buổi **đã lên lịch hợp lệ**, không lấy tổng số nhật ký làm mẫu số.
- Ghi `definition_version`, `analysis_version`, thời điểm chạy và seed phân nhóm để tái lập báo cáo.
- Tách PII trong `contacts` khỏi tập phân tích; dữ liệu thống kê/Researcher chỉ dùng mã giả danh.

## 4. Yêu cầu P1 — Mô-đun thống kê cho Giáo viên

Nên bổ sung mục **Thống kê học sinh** trong Mentor. Mentor thường chỉ thấy thống kê tổng hợp của học sinh được phân công; Lead Mentor có thể xem aggregate toàn mẫu nếu quyền nghiên cứu cho phép. Không mặc định cấp quyền đọc PII hoặc toàn bộ dữ liệu cá nhân cho giáo viên.

### 4.1 Bộ chọn phạm vi

- Khoảng thời gian: tuần/tháng/giai đoạn 8 tuần.
- Nhóm hoạt động, khối/lớp nếu đã được duyệt thu thập, arm nghiên cứu và trạng thái tham gia.
- Chọn biến và cách gom dữ liệu: theo học sinh, theo tuần hoặc theo buổi; mặc định phân tích chính phải là cấp học sinh.
- Hiển thị thời điểm cập nhật, số học sinh N, số bản ghi và số bị loại/thiếu.
- Không cho lọc cá nhân ngoài danh sách Mentor được phân công; Lead chỉ xem aggregate, trừ trường hợp được cấp quyền rõ ràng.

### 4.2 Thống kê mô tả

- **Biến danh mục:** bảng số lượng/tỷ lệ và mốt; nếu đồng hạng, liệt kê tất cả mốt. Ví dụ nhóm hoạt động, barrier, trạng thái outcome.
- **Likert 1–5:** số người ở từng mức, median, Q1–Q3/IQR; mean/SD chỉ là thống kê phụ và ghi chú giả định.
- **Biến số:** N, mean, SD, median, IQR, min/max và histogram/boxplot. Với phân bố lệch, nhấn mạnh median/IQR.
- **Tỷ lệ:** numerator/denominator, phần trăm và Wilson CI; không chỉ hiện một con số phần trăm.
- Hiển thị “chưa đủ dữ liệu” thay vì 0 khi không có mẫu; trường skip/null không tự đổi thành 0.

#### Công thức thống kê mẫu số liệu

Các thống kê được tính trên các quan sát hợp lệ sau khi áp dụng bộ lọc; luôn hiển thị `n` và số giá trị thiếu. Không gộp nhật ký lặp thành nhiều học sinh khi thống kê ở cấp học sinh.

- **Trung bình cộng:** `x̄ = (x₁ + x₂ + ... + xₙ) / n`.
- **Trung vị:** sắp xếp dữ liệu tăng dần; nếu `n` lẻ, lấy giá trị ở vị trí `(n + 1) / 2`; nếu `n` chẵn, lấy trung bình của hai giá trị ở vị trí `n / 2` và `n / 2 + 1`.
- **Mốt:** giá trị hoặc nhóm có tần số xuất hiện cao nhất; nếu nhiều giá trị đồng hạng cao nhất thì hiển thị tất cả, nếu mọi giá trị xuất hiện như nhau thì ghi “không có mốt”.
- **Mức độ tham gia học sinh:** báo cáo số học sinh duy nhất đủ điều kiện trong cohort, số đã tham gia trong khoảng thời gian chọn, số chưa có hoạt động, số đang theo dõi và số có outcome đã xác nhận. Tỷ lệ tham gia = số học sinh đã tham gia / số học sinh đủ điều kiện trong cohort; nêu rõ định nghĩa “đã tham gia” và mẫu số.

### 4.3 Thống kê theo thời gian

- Xu hướng tuần của completion rate theo kế hoạch gốc và kế hoạch hiện tại.
- Xu hướng motivation/difficulty/intention theo học sinh và aggregate nhóm.
- Số ngày tới outcome, số tuần theo dõi, số lần nghỉ hợp lệ và số lần thay đổi kế hoạch.
- So sánh trước/sau chỉ trên cùng học sinh khi dữ liệu ghép cặp đầy đủ; ghi rõ N ghép cặp.
- Có thể xem từng cá nhân trong cohort được phân công; biểu đồ tổng hợp không được cộng nhật ký lặp như người độc lập.

### 4.4 So sánh nhóm và suy luận

- Tỷ lệ bỏ cuộc/outcome: chênh lệch tuyệt đối giữa nhóm, CI 95%; Fisher exact khi ô nhỏ, chi-square khi điều kiện phù hợp.
- Điểm ordinal giữa hai nhóm độc lập: Mann–Whitney; trước/sau cùng người: Wilcoxon signed-rank. Dùng t-test chỉ khi giả định/phân bố và thiết kế phù hợp.
- Dữ liệu theo nhiều tuần: phương pháp lặp theo học sinh/mixed model chỉ triển khai sau khi có chuyên gia thống kê duyệt; MVP có thể tổng hợp theo học sinh trước.
- Luôn báo effect size, CI, N mỗi nhóm, p-value và giả định; p-value không thay cho ý nghĩa thực tế.
- Phân tầng theo nhóm hoạt động chỉ khi mẫu đủ; nếu không đủ, gộp/ẩn ô nhỏ và ghi “không đủ cỡ mẫu”.
- Không tuyên bố AI gây ra thay đổi nếu thiết kế chỉ là quan sát hoặc nếu hai nhóm không được phân ngẫu nhiên đúng quy trình.

## 5. Yêu cầu P2 — Tóm tắt và báo cáo tái lập

- Lưu cấu hình phân tích: biến, cohort, khoảng thời gian, định nghĩa outcome, mẫu số, loại kiểm định và version code.
- Nút chạy lại phân tích chỉ tạo snapshot/report mới; không sửa dữ liệu thô.
- Báo cáo có bảng mô tả mẫu, sơ đồ tuyển mẫu, missingness, kết quả chính/phụ, effect size và CI.
- Xuất CSV bảng aggregate và báo cáo PDF/CSV; log người xuất, thời gian và bộ lọc.
- Cho phép so sánh báo cáo phiên bản trước/sau khi thay đổi định nghĩa; không trộn kết quả từ hai định nghĩa.

## 6. Phân quyền và bảo vệ người tham gia

- Student chỉ xem bản thân; Mentor xem chi tiết người được gán và consent/cho phép cần thiết; Lead/Researcher xem dữ liệu giả danh hoặc aggregate theo RLS.
- Admin được mở contacts theo quy trình lý do và audit; không dùng PII trong mô hình thống kê.
- Ẩn ô nhóm có N nhỏ (đề xuất ngưỡng tối thiểu do giáo viên/hội đồng duyệt, ví dụ N < 5); không xuất tổ hợp có thể nhận diện cá nhân.
- Rút consent tách khỏi outcome bỏ cuộc; withdrawal không tự ghi thành dropout.
- Không tạo cảnh báo/xếp hạng nguy cơ cho Giáo viên nếu đề cương và consent không cho phép.

## 7. Tiêu chí nghiệm thu

1. Với bộ fixture biết trước, mode/mean/median/Q1/Q3/tỷ lệ/CI khớp kết quả tính tay.
2. Đổi filter làm thay đổi N và số liệu; report nêu rõ filter, ngày chạy và N.
3. Bản ghi skip/null không bị tính là 0; tuần không có lịch là N/A, không phải 0%.
4. Một học sinh có nhiều nhật ký vẫn chỉ là một đơn vị trong phân tích giữa người.
5. Nghỉ hợp lệ, rút consent, bỏ cuộc và chưa rõ kết quả cho ra các nhóm riêng.
6. Khi N không đủ, giao diện ẩn kiểm định/kết luận hoặc hiện cảnh báo; không trả số giả.
7. Mentor không truy cập cohort ngoài phạm vi; dữ liệu export không chứa tên, email, điện thoại hoặc UUID trực tiếp.
8. Tổng số và tỷ lệ trên UI khớp query aggregate/export từ cùng snapshot.
9. Seed/định nghĩa/cấu hình cho phép tái lập cùng một phân tích.
10. Test quyền RLS: Student khác, Mentor không được gán, Researcher, Lead Mentor và Admin đều có kết quả đúng quyền.

## 8. Thứ tự triển khai đề xuất

### Giai đoạn 0 — Chốt phương pháp
- Giáo viên hướng dẫn duyệt câu hỏi, outcome, denominator, bộ biến và kế hoạch kiểm định.
- Đối chiếu `weekly_summary` với công thức kế hoạch hợp lệ; quyết định cách xử lý `partial`, ngày nghỉ và tuần không có lịch.
- Tính lại cỡ mẫu sau khảo sát/thí điểm; nếu thiếu lực thống kê, gọi đây là nghiên cứu khả thi.

### Giai đoạn 1 — Thống kê mô tả cho Giáo viên
- Tạo tab thống kê với bộ lọc cohort/thời gian.
- Thêm tần số/tỷ lệ/mốt cho biến phân loại; median/IQR và phân bố cho Likert; mean/SD phụ trợ.
- Thêm N, missingness, trạng thái outcome và cảnh báo ô nhỏ.

### Giai đoạn 2 — So sánh nhóm/tiến trình
- Thêm completion theo tuần, before/after cùng người, nhóm can thiệp/đối chứng.
- Thêm CI, effect size và kiểm định phù hợp sau khi phương pháp được duyệt.
- Đối chiếu kết quả UI với SQL/query và bộ test dữ liệu giả lập.

### Giai đoạn 3 — Báo cáo và kiểm toán
- Lưu version cấu hình, snapshot kết quả và export.
- Kiểm thử quyền RLS, chống lộ PII, missing data và khả năng tái lập.
- Chỉ chốt đăng ký lĩnh vực Thống kê sau khi có câu hỏi nghiên cứu, dữ liệu, phương pháp và báo cáo thực nghiệm đủ sức bảo vệ.
