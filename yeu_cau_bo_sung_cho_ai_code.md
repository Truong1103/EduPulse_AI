# Yêu cầu bổ sung cho AI lập trình

**Cách dùng:** đọc cùng với `chuc_nang_theo_role.md`. File này **chỉ mô tả chức năng cần làm thêm bằng lời**, không kèm code. AI tự thiết kế bảng dữ liệu, giao diện và code sao cho nhất quán với kiến trúc đã có (Next.js, Supabase, 4 role, đăng nhập Google).

**Điểm ghi đè file cũ:** cột "cơ sở/nguồn tham khảo" của nội dung hỗ trợ (mục 4.4 file cũ) được thay bằng chức năng quản lý nguồn ở mục 3.4 của file này. Màn hình kết quả của nhà nghiên cứu (mục 4.3 file cũ) phải đáp ứng thêm mục 3.1 đến 3.3.

---

## 1. Khách muốn gì

Khách mô tả ý tưởng như sau (các chữ X, Y, Z, T chỉ là **ví dụ minh họa**, không phải biến cần đặt tên trong code):

- Có một số học sinh dùng web để kiểm soát kế hoạch học tập. Học sinh đưa kế hoạch lên, rồi ghi nhật ký, để web đưa ra nhận định.
- Trong số đó, web phát hiện một số em có nguy cơ bỏ cuộc, và đề xuất giải pháp cải thiện.
- Sau một khoảng thời gian theo dõi, web cho biết **bao nhiêu phần trăm học sinh giữ được kế hoạch**.
- Khách muốn web chứng minh được hiệu quả này.
- Các giải pháp cải thiện phải **dựa trên cơ sở hoặc nghiên cứu có nguồn**.

**Cách hiểu cho AI:** web cần có (1) chức năng **báo cáo hiệu quả** tính từ dữ liệu thật, và (2) chức năng **quản lý nguồn** cho các giải pháp. Chi tiết ở mục 3.

---

## 2. Quy tắc bắt buộc

Đây là nghiên cứu có đề cương. Đề cương cấm đặt trước kết quả để ép số liệu, và cấm trình bày số liệu minh họa như kết quả thật. Vì vậy:

1. **Mọi số liệu trên báo cáo hiệu quả phải được tính từ dữ liệu thật** trong cơ sở dữ liệu. Không viết sẵn con số nào trong code, giao diện hay dữ liệu khởi tạo của môi trường thật.
2. **Chỉ tiêu của khách và kết quả đo là hai thứ tách biệt.** Giao diện chỉ so sánh kết quả với chỉ tiêu, không có chức năng sửa kết quả, làm tròn lên hay "điều chỉnh cho đạt".
3. **Định nghĩa và chỉ tiêu được khóa** trước khi bắt đầu phân nhóm. Sau khi khóa, muốn mở phải có lý do và được ghi vào nhật ký truy cập.
4. **Không xóa hoặc sửa nhật ký của học sinh để cải thiện số liệu.** Mọi chỉnh sửa dữ liệu gốc phải qua chức năng có ghi nhật ký truy cập.
5. **Dữ liệu mô phỏng tách riêng hẳn**, không lẫn vào báo cáo thật. Màn hình nào hiển thị dữ liệu mô phỏng phải có dải chữ "DỮ LIỆU MÔ PHỎNG" ở đầu trang và không tắt được.
6. **Chỉ gửi nội dung hỗ trợ cho học sinh khi nó có nguồn đã được người xác minh.**
7. **Không tự bịa trích dẫn.** AI không được thêm nguồn ngoài danh sách ở mục 5. Nguồn mới chỉ do quản trị thêm qua giao diện.
8. **Không dùng lời hứa hiệu quả** trong nội dung gửi học sinh (ví dụ "chắc chắn giúp bạn hoàn thành"). Dùng ngôn ngữ gợi ý và luôn cho phép từ chối.
9. **Nhóm đối chứng không nhận lời mời hỗ trợ từ AI.** Hệ thống vẫn dự đoán và lưu kết quả cho nhóm này để đánh giá mô hình.

---

## 3. Chức năng cần làm thêm

### 3.1. Báo cáo hiệu quả (Nhà nghiên cứu xem đầy đủ, GVHD xem tóm tắt)

Màn hình tổng hợp các số liệu sau, **tách theo nhóm** (nhóm can thiệp, nhóm đối chứng):

| Số liệu | Ý nghĩa |
| --- | --- |
| Số học sinh dùng web | Học sinh có đồng ý hợp lệ (chưa rút), đã có mục tiêu, và đã có ít nhất một nhật ký |
| Số học sinh bị gắn cờ có nguy cơ | Số học sinh **khác nhau** từng bị gắn cờ ít nhất một lần trong thời gian theo dõi. Không tính các lần "chưa đủ dữ liệu" |
| Chất lượng cảnh báo | Trong số được gắn cờ, bao nhiêu em thực sự bỏ cuộc (độ chính xác), và trong số em thực sự bỏ cuộc, bao nhiêu em đã được gắn cờ trước đó (độ phủ). Chỉ tính được khi đã có định nghĩa "bỏ cuộc" |
| Tỷ lệ học sinh giữ được kế hoạch | Sau thời gian theo dõi, bao nhiêu phần trăm học sinh có mức hoàn thành kế hoạch đạt ngưỡng đã chọn (mục 3.2) |
| Chênh lệch giữa hai nhóm | Chênh lệch tỷ lệ giữ được kế hoạch giữa nhóm can thiệp và đối chứng, kèm khoảng tin cậy 95% và kiểm định thống kê phù hợp cho hai tỷ lệ |

Yêu cầu hiển thị:
- Mỗi số liệu hiển thị kèm **số học sinh làm mẫu số**, thời điểm dữ liệu cập nhật lần cuối, và phiên bản định nghĩa đang dùng.
- Lọc được theo tuần, theo nhóm hoạt động.
- Thời gian theo dõi tính từ ngày phân nhóm được duyệt của từng học sinh. Ghi rõ thời gian theo dõi trên mọi báo cáo.
- Xuất được báo cáo ra file (ưu tiên P2).
- Dùng phương pháp thống kê chuẩn, cài ở phía server bằng thư viện đáng tin cậy. **Viết kiểm thử đối chiếu với kết quả tính tay** trên vài bộ số nhỏ, vì sai công thức sẽ dẫn đến sai kết luận.

### 3.2. Định nghĩa "giữ được kế hoạch" (cấu hình được, không cố định trong code)

- **Mức hoàn thành của một học sinh** = tổng số buổi đã làm chia tổng số buổi trong kế hoạch, cộng qua các tuần trong thời gian theo dõi. Tuần nghỉ có lý do không tính là buổi thất bại.
- Học sinh **giữ được kế hoạch** khi mức hoàn thành đạt hoặc vượt **ngưỡng** do nhà nghiên cứu cấu hình.
- **Báo cả hai loại kế hoạch:** kế hoạch ban đầu và kế hoạch hiện tại (sau khi học sinh đã chỉnh). Không dùng riêng kế hoạch đã hạ thấp để làm số liệu đẹp lên.
- **Báo cả ba cách chọn mẫu số**, gắn nhãn rõ trên giao diện:
  - (a) Tất cả học sinh đã phân nhóm. Học sinh rút lui hoặc thiếu dữ liệu tính là không giữ được kế hoạch. Đây là kịch bản bất lợi nhất.
  - (b) Chỉ học sinh còn được theo dõi.
  - (c) Chỉ học sinh hoàn tất đủ thời gian theo dõi.
- Nhà nghiên cứu chọn một cách làm **mẫu số chính** và khóa trước. Giao diện luôn hiển thị cả ba, đánh dấu mẫu số chính.

### 3.3. Tham số cấu hình và chỉ tiêu

Nhà nghiên cứu cấu hình các tham số sau trong giao diện, có khóa và nhật ký mở khóa:

| Tham số | Giá trị khởi tạo |
| --- | --- |
| Thời gian theo dõi | 8 tuần (theo đề cương) |
| Cửa sổ dự báo | 14 ngày (theo đề cương) |
| Ngưỡng "giữ được kế hoạch" | **Để trống**, nhóm sẽ quyết cùng khách |
| Định nghĩa "bỏ cuộc" | **Để trống**, theo đề cương mục 3, nhóm sẽ quyết |
| Mẫu số chính | **Để trống** |

Nếu một tham số cần thiết còn trống, báo cáo hiển thị **"Chưa cấu hình định nghĩa"** thay vì tính ra số sai hoặc số 0 gây hiểu nhầm.

**Chỉ tiêu (mục tiêu của khách):** cho phép nhà nghiên cứu nhập chỉ tiêu cho một số chỉ số (ví dụ tỷ lệ giữ được kế hoạch, độ chính xác, độ phủ), kèm **cỡ mẫu tối thiểu** để được kết luận. Sau khi nhập thì khóa. Báo cáo hiển thị cạnh mỗi chỉ số một trạng thái duy nhất trong ba loại:
- **Chưa đủ dữ liệu:** chưa đủ cỡ mẫu, hoặc định nghĩa còn trống.
- **Đạt:** đủ cỡ mẫu và thỏa chỉ tiêu.
- **Chưa đạt:** đủ cỡ mẫu nhưng không thỏa chỉ tiêu.

Không có nút nào ẩn dòng "Chưa đạt" hay đổi trạng thái. Cách so sánh với chỉ tiêu có hai kiểu: điểm ước tính đạt hoặc vượt chỉ tiêu, hoặc cận dưới khoảng tin cậy vượt chỉ tiêu.

### 3.4. Quản lý nguồn cho giải pháp (Quản trị)

Mỗi nội dung hỗ trợ (giải pháp gửi cho học sinh) phải gắn với ít nhất một nguồn.

**Quản trị cần có các chức năng:**
- Thêm, sửa nguồn: trích dẫn đầy đủ, mã DOI, đường dẫn, năm, loại nguồn (tổng hợp nghiên cứu, thí nghiệm, lý thuyết, khảo sát tổng quan, khác), đối tượng của nghiên cứu gốc, phát hiện chính (viết lại bằng lời của nhóm, không chép nguyên văn), và giới hạn khi áp dụng cho học sinh THPT.
- Nút **"Đã xác minh"**: chỉ bấm được khi đã nhập đủ thông tin và tick xác nhận "tôi đã đọc nguồn gốc". Hệ thống ghi người xác minh và thời điểm. **Người xác minh phải là người thật, không phải AI hay tài khoản khởi tạo.**
- Gắn nguồn vào nội dung hỗ trợ, kèm nhãn **mức bằng chứng**: "nghiên cứu ở đối tượng khác", "nguyên tắc thiết kế" hoặc "nghiên cứu trực tiếp trên cùng đối tượng".
- Trong danh sách nội dung, cảnh báo các nội dung nháp chưa có nguồn đã xác minh.

**Quy tắc hệ thống:**
- Nội dung chưa có nguồn đã xác minh **không thể chuyển sang trạng thái đã duyệt**.
- Lời mời hỗ trợ chỉ được gửi kèm nội dung **đã duyệt**.
- Các ràng buộc này phải được bảo vệ ở **tầng cơ sở dữ liệu**, không chỉ ở giao diện, để không có đường vòng.

**Phía học sinh:** trong mỗi lời mời hỗ trợ có nút **"Vì sao gợi ý này?"**, hiển thị tên nguồn, năm, và nhãn mức bằng chứng bằng ngôn ngữ trung thực (ví dụ: "Nghiên cứu ở nhóm đối tượng khác, chưa được kiểm chứng trên học sinh THPT").

### 3.5. Cách chọn giải pháp khi gửi lời mời

- Khi học sinh nhóm can thiệp bị gắn cờ, hệ thống xác định **khó khăn chính** (lấy từ nhật ký gần nhất hoặc để học sinh tự chọn), rồi chọn nội dung hỗ trợ **đã duyệt** đúng loại khó khăn đó.
- Luôn lưu nội dung nào đã được gửi, để sau này phân tích giải pháp nào được chấp nhận và hữu ích.
- Nếu khó khăn đó chưa có nội dung đã duyệt, lời mời chỉ chứa lựa chọn **"Gặp giáo viên hướng dẫn"**, không đưa lời khuyên tự giúp.
- Giữ nguyên các giới hạn đã có: tối đa 2 lời mời mỗi tuần, học sinh có thể hoãn hoặc từ chối.

### 3.6. Môi trường thử và dữ liệu mô phỏng

- Có kho dữ liệu mô phỏng tách riêng để chạy thử toàn bộ quy trình và kiểm tra báo cáo trước khi tuyển học sinh thật.
- Dữ liệu mô phỏng không bao giờ xuất hiện trong báo cáo hiệu quả thật.
- Sau khi thử xong, có chức năng xóa sạch dữ liệu mô phỏng.

---

## 4. Ánh xạ khó khăn → giải pháp → nguồn

Sáu loại khó khăn (theo bảng 7.2 của đề cương): thiếu thời gian, nhiệm vụ quá khó, không thấy tiến bộ, thiếu người đồng hành, mệt hoặc quá tải, muốn đổi mục tiêu.

| Khó khăn | Giải pháp (ý chính) | Nguồn (mục 5) | Mức bằng chứng |
| --- | --- | --- | --- |
| Thiếu thời gian | Chọn trước khi nào, ở đâu sẽ luyện theo dạng "nếu... thì..." | S1 | Nghiên cứu ở đối tượng khác |
| Nhiệm vụ quá khó | Chia thành mục tiêu con gần, vừa sức | S2, S3 | Nghiên cứu ở đối tượng khác |
| Không thấy tiến bộ | Cho thấy tiến bộ và phản hồi theo mốc nhỏ | S2, S3 | Nghiên cứu ở đối tượng khác. Người xác minh cần đọc kỹ phần phản hồi trong S3 |
| Thiếu người đồng hành | Gợi ý bạn đồng hành hoặc người hướng dẫn, học sinh tự chọn | S5 | Nghiên cứu ở đối tượng khác, bằng chứng còn tranh luận |
| Mệt hoặc quá tải | Nghỉ có lý do, giảm tải tạm thời | **Chưa có nguồn đã xác minh** | Giữ nháp, chưa gửi |
| Muốn đổi mục tiêu | Điều chỉnh hoặc đổi mục tiêu | **Chưa có nguồn đã xác minh** | Giữ nháp, chưa gửi |

**Nguyên tắc thiết kế chung** (không phải nội dung can thiệp): thời điểm, tần suất và tính thích ứng của hỗ trợ dựa trên S4. Quyền chọn và từ chối của học sinh dựa trên S7.

AI có thể soạn nháp lời văn cho từng nội dung hỗ trợ, nhưng **mọi nội dung đều ở trạng thái nháp** cho đến khi người thật duyệt và nguồn được xác minh.

---

## 5. Danh sách nguồn ban đầu

Khi khởi tạo, AI nhập các nguồn này vào hệ thống ở trạng thái **chưa xác minh**. Người thật phải đọc nguồn gốc rồi bấm "Đã xác minh" thì nguồn mới dùng được để duyệt nội dung. Thông tin xuất bản dưới đây lấy từ tra cứu, **không thay thế việc đọc bài gốc**. Chỗ ghi "cần kiểm tra" là chỗ chưa chắc.

| ID | Trích dẫn | Phát hiện chính (diễn giải) | Giới hạn khi áp dụng |
| --- | --- | --- | --- |
| S1 | Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. *Advances in Experimental Social Psychology*, 38, 69–119. DOI: 10.1016/S0065-2601(06)38002-1 | Kế hoạch dạng "nếu gặp tình huống X thì làm Y" giúp đạt mục tiêu tốt hơn ở mức trung bình đến lớn trong tổng hợp 94 thử nghiệm. Hiệu quả phụ thuộc mục tiêu đủ mạnh | Đối tượng đa dạng, không riêng học sinh THPT luyện tập dài hạn |
| S2 | Bandura, A., & Schunk, D. H. (1981). Cultivating competence, self-efficacy, and intrinsic interest through proximal self-motivation. *Journal of Personality and Social Psychology*, 41(3), 586–598. DOI: 10.1037/0022-3514.41.3.586 | Trẻ làm việc với mục tiêu con gần tiến bộ nhanh hơn và hình thành cảm giác hiệu quả bản thân tốt hơn | Mẫu trẻ em, nhiệm vụ học phép tính, thời gian ngắn |
| S3 | Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation: A 35-year odyssey. *American Psychologist*, 57(9), 705–717. DOI: 10.1037/0003-066X.57.9.705 | Tổng hợp 35 năm nghiên cứu: mục tiêu cụ thể và có thử thách thường gắn với thành tích cao hơn mục tiêu mơ hồ | Chủ yếu bối cảnh công việc và nhiệm vụ phòng thí nghiệm. Vai trò của phản hồi: cần kiểm tra trực tiếp trong bài |
| S4 | Nahum-Shani, I., Smith, S. N., Spring, B. J., Collins, L. M., Witkiewitz, K., Tewari, A., & Murphy, S. A. (2018). Just-in-time adaptive interventions (JITAIs) in mobile health: Key components and design principles for ongoing health behavior support. *Annals of Behavioral Medicine*, 52(6), 446–462. DOI: 10.1007/s12160-016-9830-8 (cần kiểm tra DOI) | Khung thiết kế hỗ trợ đúng loại, đúng lượng, đúng thời điểm và thích ứng theo trạng thái người dùng | Là khung thiết kế, không chứng minh hiệu quả của một nội dung cụ thể |
| S5 | Carron, A. V., Hausenblas, H. A., & Mack, D. (1996). Social influence and exercise: A meta-analysis. *Journal of Sport & Exercise Psychology*, 18(1), 1–16. DOI: 10.1123/jsep.18.1.1 (cần kiểm tra số trang và DOI) | Tổng hợp ảnh hưởng xã hội (người hướng dẫn, bạn bè, gia đình) lên hành vi tập luyện | Bối cảnh tập thể dục. Bằng chứng về can thiệp nhóm so với cá nhân còn tranh luận. Cần đọc để lấy số liệu cụ thể |
| S6 | Prenkaj, B., Velardi, P., Stilo, G., Distante, D., & Faralli, S. (2020). A survey of machine learning approaches for student dropout prediction in online courses. *ACM Computing Surveys*, 53(3). DOI: 10.1145/3388792 (cần kiểm tra số bài) | Khảo sát các phương pháp học máy dự đoán bỏ học trong khóa học trực tuyến | Bối cảnh MOOC, khác với luyện tập ngoài đời. Dùng để tham chiếu phương pháp và đặc trưng, không để biện minh nội dung can thiệp |
| S7 | Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist*, 55(1), 68–78. DOI: 10.1037/0003-066X.55.1.68 (lấy từ đề cương mục [1], cần đối chiếu) | Lý thuyết nền về tự chủ, năng lực, gắn kết | Lý thuyết nền, không phải bằng chứng can thiệp cụ thể |

Phần "phát hiện chính" khi nhập vào hệ thống: giữ nguyên diễn giải ở trên, không chép thêm câu nguyên văn từ bài báo.

---

## 6. Tiêu chí nghiệm thu

AI viết kiểm thử tự động cho các mục sau, chạy trong môi trường test với dữ liệu giả.

1. Tìm trong toàn bộ mã nguồn và dữ liệu khởi tạo thật: không có con số nào của báo cáo hiệu quả được viết sẵn.
2. Thay đổi dữ liệu nhật ký trong môi trường test: các số liệu trên báo cáo thay đổi tương ứng và khớp kết quả tính tay.
3. Khi ngưỡng, thời gian theo dõi hoặc định nghĩa "bỏ cuộc" còn trống: báo cáo hiển thị "Chưa cấu hình định nghĩa", không hiện số.
4. Sửa định nghĩa hoặc chỉ tiêu đã khóa: bị chặn. Mở khóa phải có lý do và để lại dòng trong nhật ký truy cập.
5. Dữ liệu mô phỏng không xuất hiện trong báo cáo thật. Màn hình mô phỏng luôn có dải cảnh báo.
6. Duyệt nội dung chưa có nguồn đã xác minh: bị chặn.
7. Gửi lời mời với nội dung chưa duyệt: bị chặn.
8. Học sinh nhóm đối chứng bị gắn cờ: có kết quả dự đoán được lưu, nhưng không có lời mời hỗ trợ nào được gửi.
9. Học sinh bấm "Vì sao gợi ý này?": thấy đúng nguồn và đúng nhãn mức bằng chứng.
10. Khó khăn chưa có nội dung đã duyệt (mệt hoặc quá tải, muốn đổi mục tiêu): lời mời chỉ có lựa chọn "Gặp giáo viên".
11. Tỷ lệ giữ được kế hoạch tính với ba cách chọn mẫu số và hai loại kế hoạch: khớp kết quả tính tay trên bộ dữ liệu giả có đáp án biết trước.

---

## 7. Điều AI phải hỏi lại, không tự quyết

1. Ngưỡng "giữ được kế hoạch".
2. Định nghĩa "bỏ cuộc".
3. Mẫu số chính của tỷ lệ giữ được kế hoạch.
4. Giá trị chỉ tiêu và cỡ mẫu tối thiểu cho từng chỉ số.
5. Kênh gửi lời mời hỗ trợ và nhắc lịch.
6. Việc thêm nguồn mới hoặc đổi nội dung can thiệp: chỉ quản trị làm qua giao diện, AI không tự thêm.
