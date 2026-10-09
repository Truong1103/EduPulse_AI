# ĐỀ CƯƠNG DỰ ÁN NGHIÊN CỨU KHOA HỌC KỸ THUẬT

# Hệ thống AI dự đoán và can thiệp sớm nhằm giảm nguy cơ bỏ cuộc trong quá trình luyện tập dài hạn của học sinh

Địa điểm triển khai dự kiến  Trường THPT Phan Châu Trinh, Đà Nẵng

Nhóm thực hiện  ........................................................................

Giáo viên hướng dẫn  ................................................................

Thời gian thực hiện  Dự kiến 24 tuần kể từ khi được phép triển khai

Phiên bản đề cương  Ngày 04 tháng 10 năm 2026

## Mục đích sử dụng

Đề cương dùng để trao đổi với giáo viên hướng dẫn, thống nhất phương pháp và tổ chức thử nghiệm. Tên và phạm vi dự án được giữ nguyên; học sinh có thể lựa chọn luyện tập học thuật, ngoại ngữ, thể thao, nghệ thuật hoặc kỹ năng khác. Mỗi người theo dõi một mục tiêu xuyên suốt nghiên cứu.

Tài liệu trình bày kế hoạch nghiên cứu và sản phẩm dự kiến, chưa phải báo cáo kết quả. Quy mô mẫu, kinh phí và lịch trình là đề xuất để nhà trường và nhóm thực hiện điều chỉnh trước khi bắt đầu. Chưa khẳng định hiệu quả của hệ thống hoặc tính mới trên toàn bộ các nghiên cứu đã công bố.

## Tóm tắt dự án

Dự án xây dựng nguyên mẫu web thu thập nhật ký luyện tập ngắn, tổng hợp tiến độ và sử dụng mô hình học máy để dự báo nguy cơ bỏ cuộc trong 14 ngày tiếp theo. Hệ thống đề xuất hỗ trợ vừa sức theo khó khăn và lựa chọn của học sinh. Nghiên cứu gồm khảo sát, thử quy trình, thu dữ liệu quan sát, phát triển mô hình và thử nghiệm có nhóm đối chứng. Hai mục tiêu được đánh giá riêng: chất lượng dự đoán và hiệu quả của gói hỗ trợ dựa trên dự đoán.

# 1 Lý do chọn đề tài và cơ sở nghiên cứu

## 1.1 Vấn đề nghiên cứu

Việc duy trì một mục tiêu nhiều tuần đòi hỏi học sinh phân bổ thời gian, điều chỉnh mức khó và xử lý các trở ngại. Nhóm nghiên cứu đặt giả định rằng sự thay đổi của tiến độ và tự đánh giá có thể xuất hiện trước khi học sinh dừng luyện tập. Giả định này phải được kiểm tra bằng dữ liệu thực tế tại trường; không mặc định rằng học sinh Phan Châu Trinh có tỷ lệ bỏ cuộc cao.

Nhật ký và nhắc lịch cung cấp thông tin về việc đã làm. Dự án muốn kiểm tra thêm khả năng dự báo rủi ro trong một khoảng thời gian tương lai và lựa chọn hỗ trợ phù hợp. Việc giữ nhiều loại hoạt động giúp phù hợp môi trường trường học, nhưng đòi hỏi chuẩn hóa theo kế hoạch cá nhân và xem xét khác biệt giữa hoạt động.

## 1.2 Cơ sở xây dựng phương pháp

Lý thuyết tự quyết đề cập đến vai trò của tính tự chủ và các dạng động lực trong hoạt động học tập [1]. Dự án dùng cơ sở này để thiết kế hỗ trợ có lựa chọn, phản hồi tiến bộ và kết nối người hỗ trợ; không coi các câu hỏi tự xây dựng là thang đo tâm lý đã được chuẩn hóa.

Tài liệu chính thức scikit-learn mô tả việc tách dữ liệu theo thời gian và phòng tránh rò rỉ dữ liệu [2–3]. Dự án áp dụng nguyên tắc chỉ sử dụng thông tin đã biết ở thời điểm dự đoán, đồng thời kiểm soát việc cùng học sinh xuất hiện trong nhiều tập dữ liệu.

## 1.3 Đóng góp dự kiến

Đóng góp cần kiểm chứng gồm dữ liệu theo dõi tiến độ đa hoạt động được chuẩn hóa theo kế hoạch cá nhân; mô hình dự báo có giải thích; và quy trình hỗ trợ theo nguy cơ có đánh giá đối chứng. Trước khi nộp hồ sơ, nhóm tiếp tục rà soát nghiên cứu và sản phẩm tương tự để xác định điểm khác biệt thực tế. Không dùng tuyên bố “đầu tiên” khi chưa có bằng chứng.

## 1.4 Ý nghĩa dự kiến

Nếu có kết quả thuận lợi, sản phẩm có thể hỗ trợ học sinh nhận ra khó khăn, điều chỉnh kế hoạch và đề nghị giúp đỡ sớm. Giá trị này phụ thuộc vào chất lượng dữ liệu, mức chấp nhận của học sinh và kết quả thử nghiệm; hệ thống không dùng để xếp loại hoặc đánh giá hạnh kiểm.

# 2 Mục tiêu câu hỏi và giả thuyết nghiên cứu

## 2.1 Mục tiêu tổng quát

Xây dựng và đánh giá hệ thống AI dự đoán nguy cơ bỏ cuộc trong luyện tập dài hạn, kết hợp hỗ trợ sớm nhằm giúp học sinh duy trì mục tiêu đã lựa chọn.

## 2.2 Mục tiêu cụ thể

Xác định các khó khăn và nhu cầu hỗ trợ qua khảo sát học sinh tại trường.

Xây dựng bộ dữ liệu dọc với kế hoạch, kết quả luyện tập và tự đánh giá.

Phát triển mô hình dự báo trong 14 ngày tiếp theo và so sánh với phương pháp đơn giản.

Thiết kế gói can thiệp có lựa chọn và giới hạn tần suất thông báo.

Đánh giá tỷ lệ bỏ cuộc, mức hoàn thành kế hoạch, sự chấp nhận và gánh nặng sử dụng.

## 2.3 Câu hỏi nghiên cứu

Câu hỏi 1  Những biến nào trong nhật ký trước thời điểm dự đoán liên quan đến bỏ cuộc trong 14 ngày sau đó?

Câu hỏi 2  Mô hình AI có cải thiện khả năng phát hiện bỏ cuộc so với quy tắc cảnh báo và dự đoán theo tỷ lệ nền không?

Câu hỏi 3  Gói hỗ trợ dựa trên dự đoán có làm giảm tỷ lệ bỏ cuộc trong 8 tuần so với nhật ký và nhắc lịch thông thường không?

Câu hỏi 4  Học sinh có thấy việc ghi nhật ký và nhận hỗ trợ hữu ích, dễ dùng và ít gây phiền không?

## 2.4 Giả thuyết cần kiểm chứng

H1  Xu hướng giảm mức hoàn thành, giảm động lực và tăng khó khăn chứa thông tin dự báo nguy cơ bỏ cuộc. H2  Mô hình học máy đạt chất lượng dự báo tốt hơn các mốc so sánh trên dữ liệu kiểm tra độc lập. H3  Nhóm nhận gói hỗ trợ có tỷ lệ bỏ cuộc thấp hơn nhóm đối chứng. Đây là giả thuyết, không phải kết luận sẵn có.

## 2.5 Tiêu chí đánh giá

Mô hình được đánh giá bằng precision, recall, PR-AUC, ma trận nhầm lẫn và mức hiệu chỉnh xác suất. Thực nghiệm can thiệp lấy tỷ lệ bỏ cuộc trong 8 tuần làm chỉ số chính; tỷ lệ hoàn thành và trải nghiệm sử dụng là chỉ số phụ. Ngưỡng cảnh báo được chọn trên tập xác thực trước khi mở tập kiểm tra.

# 3 Đối tượng phạm vi và định nghĩa vận hành

Đối tượng dự kiến là học sinh lớp 10–12 tại THPT Phan Châu Trinh tự nguyện tham gia. Một học sinh đăng ký một mục tiêu có thể thực hiện ít nhất 2 buổi mỗi tuần trong 8 tuần. Hoạt động được giữ rộng; nghiên cứu không yêu cầu học sinh bắt đầu môn mới hoặc tập vượt khả năng.

| Khái niệm | Quy ước nghiên cứu đề xuất |
| --- | --- |
| Luyện tập dài hạn | Kế hoạch kéo dài ít nhất 8 tuần, có số buổi và nhiệm vụ cụ thể. |
| Một buổi hoàn thành | Hoàn thành nhiệm vụ tối thiểu đã đăng ký trước; ghi thời lượng riêng. |
| Gián đoạn | Không hoàn thành buổi nào trong 7 ngày có lịch tập; là chỉ số phụ. |
| Bỏ cuộc | Xác nhận dừng mục tiêu trước hạn; hoặc không tập trong 14 ngày có lịch và sau đó xác nhận đã dừng. |
| Nghỉ có lý do | Nghỉ được ghi nhận vì ốm, lịch thi hoặc lý do khác; không tự gán là bỏ cuộc. |
| Không rõ kết quả | Mất liên lạc hoặc thiếu nhật ký mà không xác nhận được trạng thái. |
| Hoàn thành mục tiêu | Đạt mục tiêu đã đăng ký và kết thúc hợp lệ; không tính là bỏ cuộc. |

Người đã bỏ cuộc không tiếp tục tạo các bản ghi dự đoán cho cùng đợt theo dõi. Người nghỉ có lý do được ghi trạng thái riêng; lịch tạm nghỉ không tạo buổi thất bại. Học sinh rút khỏi nghiên cứu không tự động được tính là bỏ mục tiêu luyện tập.

## Chuẩn hóa giữa các hoạt động

Tỷ lệ hoàn thành tuần = số buổi hoàn thành / số buổi đã lên lịch hợp lệ. Tuần không có lịch được ghi là không áp dụng, không gán bằng 0. Phân tích bổ sung dùng kế hoạch ban đầu để kiểm tra việc giảm lịch có làm tỷ lệ hoàn thành tăng giả tạo hay không. Mọi thay đổi kế hoạch có ngày hiệu lực, lý do và lịch sử phiên bản; không sửa ngược các buổi đã qua.

Các định nghĩa được thử ở giai đoạn thí điểm rồi khóa trước thu dữ liệu chính thức. Nếu phải đổi sau đó, nhóm ghi lại lý do và phân tích riêng, không đổi nhãn để làm kết quả tốt hơn.

# 4 Thiết kế nghiên cứu và tuyển người tham gia

## 4.1 Các giai đoạn

| Giai đoạn | Quy mô và nhiệm vụ dự kiến |
| --- | --- |
| Khảo sát | 80–150 học sinh; tìm hiểu mục tiêu, khó khăn và nhu cầu. |
| Thí điểm quy trình | 10–15 học sinh trong 2 tuần; sửa biểu mẫu và giao diện. |
| Quan sát để phát triển mô hình | Khoảng 60–100 học sinh trong 8 tuần; chưa bật can thiệp theo AI. |
| Thực nghiệm can thiệp | Hướng tới 80–120 học sinh mới trong 8 tuần; hai nhóm cân bằng. |

Các quy mô là mục tiêu tuyển thuận tiện, chưa phải tính toán cỡ mẫu bảo đảm độ mạnh thống kê. Nhiều dòng nhật ký của một học sinh không thay thế nhiều người độc lập. Sau giai đoạn quan sát, dùng tỷ lệ bỏ cuộc ước tính và mức cải thiện có ý nghĩa để tính lại cỡ mẫu cùng giáo viên hoặc người hỗ trợ thống kê. Nếu không đủ, xác định đây là nghiên cứu khả thi và tránh kết luận hiệu quả chắc chắn.

## 4.2 Điều kiện tham gia và quy trình

Mời tham gia bằng thông tin thống nhất, không gắn với điểm hoặc quyền lợi học tập. Học sinh cần có mục tiêu phù hợp, khả năng ghi nhật ký và sự đồng ý cần thiết. Không loại người vì thành tích thấp. Ghi số được mời, đủ điều kiện, đồng ý, rút lui và hoàn tất; không công bố danh tính.

## 4.3 Phân nhóm thực nghiệm

Chỉ phân nhóm sau khi khóa mô hình. Phân ngẫu nhiên theo tỷ lệ 1:1, có phân tầng theo nhóm hoạt động và mức duy trì ban đầu nếu mẫu cho phép. Dùng mã học sinh và lưu hạt giống ngẫu nhiên. Giáo viên phụ trách kiểm tra danh sách phân nhóm. Nếu buộc phân theo lớp, cần xử lý tương quan trong lớp và giới hạn suy luận; không trình bày như phân ngẫu nhiên cá nhân.

Nhóm đối chứng có nhật ký, xem tiến độ và nhắc lịch thông thường. Nhóm can thiệp có cùng chức năng cộng gói hỗ trợ theo AI. Cả hai vẫn tiếp cận hỗ trợ thông thường của nhà trường. Việc so sánh đánh giá toàn bộ gói AI và hỗ trợ; chưa tách được riêng tác dụng của thuật toán khỏi tác dụng nội dung hỗ trợ.

# 5 Công cụ thu thập và quản lý dữ liệu

## 5.1 Dữ liệu ban đầu

Ghi mã học sinh, khối lớp, nhóm hoạt động, kinh nghiệm luyện tập, mục tiêu, số buổi dự kiến, nhiệm vụ tối thiểu và động lực ban đầu. Không cần họ tên, số điện thoại hoặc địa chỉ trong tập huấn luyện. Nếu phải có thông tin liên hệ, lưu tách khỏi dữ liệu phân tích.

## 5.2 Nhật ký và theo dõi hằng tuần

| Trường dữ liệu | Cách ghi |
| --- | --- |
| Thời điểm và mã | Tự ghi ngày giờ, mã người tham gia và phiên bản kế hoạch. |
| Tiến độ buổi | Hoàn thành / một phần / chưa thực hiện; thời lượng phút. |
| Động lực | 1 rất thấp đến 5 rất cao. |
| Độ khó | 1 rất dễ đến 5 rất khó. |
| Khó khăn | Thời gian, mệt, nội dung khó, thiếu hỗ trợ, khác hoặc không muốn trả lời. |
| Ý định tiếp tục | Tiếp tục / phân vân / muốn dừng; tùy chọn. |
| Trạng thái tuần | Đang tập / nghỉ có lý do / đạt mục tiêu / đã dừng / chưa xác định. |

Câu hỏi tự đánh giá do nhóm xây dựng để theo dõi trong nghiên cứu, không dùng chẩn đoán tâm lý. Ghi sau buổi tập hoặc vào thời điểm đã chọn; khảo sát tuần xác nhận trạng thái. Không bắt buộc viết chi tiết chuyện riêng.

## 5.3 Kiểm soát chất lượng

Phân biệt bỏ tập với quên ghi. Khi thiếu nhật ký, hỏi xác nhận ngắn ở cuối tuần bằng kênh đã đồng ý, không suy diễn bằng 0. Kiểm tra trùng bản ghi, thời lượng bất thường và thay đổi kế hoạch. Giữ dữ liệu gốc; mọi sửa đổi có lý do và nhật ký xử lý. Tách dữ liệu thí điểm khỏi đánh giá chính thức.

## 5.4 Cấu trúc lưu trữ

Các bảng gồm người tham gia, mục tiêu, lịch tập, nhật ký, xác nhận trạng thái, dự đoán và hỗ trợ. Mỗi dự đoán lưu ngày, phiên bản mô hình, đặc trưng đã sử dụng và điểm nguy cơ; mỗi hỗ trợ lưu loại, thời điểm, lựa chọn và phản hồi. Mã liên kết cho phép kiểm toán mà không đưa danh tính vào mô hình.

# 6 Thiết kế mô hình AI và đánh giá dự báo

## 6.1 Bài toán và đặc trưng

Tại cuối mỗi tuần, dùng dữ liệu tối đa 14 ngày vừa qua để ước tính nguy cơ bỏ cuộc trong 14 ngày tới. Chỉ dự đoán với người còn đang theo dõi mục tiêu. Trường hợp chưa đủ lịch sử hiển thị “chưa đủ dữ liệu”, không tạo xác suất tùy ý. Nếu nhãn cần xác nhận sau 14 ngày, dữ liệu chỉ được đưa vào huấn luyện khi đã hoàn tất thời gian xác nhận.

Đặc trưng dự kiến gồm tỷ lệ hoàn thành 7 và 14 ngày, xu hướng thời lượng so với kế hoạch, số buổi liên tiếp chưa thực hiện, xu hướng động lực, mức khó, tỷ lệ thiếu nhật ký và số lần thay đổi kế hoạch. Ý định muốn dừng được phân tích có và không có để biết mô hình bổ sung gì ngoài lời tự báo cáo.

## 6.2 Mô hình và mốc so sánh

Ưu tiên hồi quy logistic có điều chuẩn vì dễ giải thích; thử thêm cây quyết định giới hạn độ sâu hoặc random forest nếu dữ liệu cho phép. Không mặc định cần mạng nơ-ron. So sánh với dự đoán xác suất nền và quy tắc cảnh báo khi hoàn thành dưới 50% trong 2 tuần có lịch liên tiếp. Quy tắc là mốc đề xuất, được khóa sau thí điểm.

## 6.3 Chia dữ liệu và chống rò rỉ

Tách nhóm học sinh phát triển và kiểm tra, không chia ngẫu nhiên từng dòng nhật ký. Trong nhóm phát triển, xác thực theo thời gian; giữ khoảng đệm tối thiểu bằng cửa sổ kết quả 14 ngày để tránh chồng lấn. Các bước bù dữ liệu, chuẩn hóa, chọn đặc trưng và chọn ngưỡng chỉ học từ dữ liệu phát triển. Tập kiểm tra gồm người chưa dùng để điều chỉnh mô hình và được mở một lần. Nhãn tương lai, thông tin xác nhận sau dự đoán và phản hồi can thiệp không được đưa vào đặc trưng quá khứ.

## 6.4 Chỉ số và điều kiện sử dụng

Báo cáo precision, recall, F1, PR-AUC, ma trận nhầm lẫn, tỷ lệ nền và Brier score; ROC-AUC là bổ sung. Ước tính khoảng bất định bằng lấy mẫu lại theo học sinh, không theo dòng. Kiểm tra riêng nhóm hoạt động khi đủ mẫu, nêu rõ nhóm ít dữ liệu.

Ngưỡng chọn trên tập xác thực theo mức báo nhầm và số hỗ trợ có thể xử lý; không dùng các mức 30% hay 70% như xác suất đáng tin khi chưa hiệu chỉnh. Nếu quá ít trường hợp bỏ cuộc hoặc chất lượng kiểm tra không ổn định, mở rộng thu dữ liệu; dùng quy tắc để thử quy trình và gọi đúng là nguyên mẫu, không tuyên bố AI đã được xác thực.

# 7 Hệ thống phần mềm và quy trình can thiệp

## 7.1 Kiến trúc nguyên mẫu

Giao diện web trên điện thoại kết nối dịch vụ xử lý, cơ sở dữ liệu mã hóa định danh, mô-đun tổng hợp đặc trưng, mô hình dự báo và thư viện hỗ trợ đã duyệt. Có thể triển khai giao diện HTML/CSS/JavaScript, dịch vụ Python và SQLite cho thử nghiệm nhỏ; lựa chọn công nghệ cuối cùng theo năng lực nhóm và điều kiện nhà trường.

Luồng sử dụng gồm đăng ký mục tiêu, lập lịch, ghi nhật ký, xem tiến độ, nhận hỗ trợ và phản hồi. Bảng giáo viên chỉ hiển thị người có quyền theo dõi và thông tin tối thiểu đã được đồng ý. Không công khai bảng xếp hạng nguy cơ.

## 7.2 Quy trình hỗ trợ

Khi đạt ngưỡng cảnh báo, hệ thống hỏi học sinh có muốn hỗ trợ không và cho chọn khó khăn chính. Mỗi tuần tối đa 2 lời mời hỗ trợ ngoài nhắc lịch; người dùng có thể tắt hoặc hoãn. Cảnh báo không ghi “bạn sẽ bỏ cuộc”. Nếu học sinh muốn gặp giáo viên, chuyển yêu cầu theo quy trình đồng ý đã thiết lập.

| Khó khăn | Hỗ trợ được phép lựa chọn |
| --- | --- |
| Thiếu thời gian | Chọn lịch phù hợp hơn hoặc giảm thời lượng tương lai. |
| Nhiệm vụ quá khó | Chia nhỏ nhiệm vụ và đề nghị hỏi giáo viên. |
| Không thấy tiến bộ | Xem tiến bộ của chính mình và đặt mốc nhỏ tuần tới. |
| Thiếu người đồng hành | Đề nghị bạn cùng tập hoặc người hỗ trợ nếu đồng ý. |
| Mệt hoặc quá tải | Nghỉ phù hợp và điều chỉnh lịch; không ép bù buổi. |
| Muốn đổi mục tiêu | Trao đổi lý do; lưu thay đổi hoặc kết thúc mục tiêu rõ ràng. |

## 7.3 Vai trò của AI

Học máy thực hiện dự báo; thư viện hỗ trợ theo quy tắc tạo gợi ý ban đầu. Chatbot sinh văn bản chỉ là phần mở rộng tùy chọn, không thay thế mô hình dự đoán hoặc tư vấn sức khỏe. Dự án phiên bản đầu không cần gửi dữ liệu riêng của học sinh đến dịch vụ AI bên ngoài.

# 8 Đánh giá can thiệp và phân tích kết quả

## 8.1 Chỉ số chính và phụ

Chỉ số chính là tỷ lệ học sinh bỏ cuộc trong 8 tuần ở mỗi nhóm. Mẫu số là số đã phân nhóm; trạng thái không xác định phải báo cáo riêng. Phân tích theo nhóm phân ban đầu, kể cả người không dùng đủ gợi ý, để hạn chế chọn người dùng tích cực nhất.

Chỉ số phụ gồm tỷ lệ hoàn thành kế hoạch từng tuần, số ngày đến khi bỏ cuộc, tần suất gián đoạn, mức động lực tự báo cáo, số hỗ trợ được chấp nhận, thời gian ghi nhật ký và mức gây phiền. Báo cáo cả kế hoạch ban đầu lẫn kế hoạch đã điều chỉnh để không nhầm giảm yêu cầu với cải thiện duy trì.

## 8.2 Cách phân tích

Trình bày số người và tỷ lệ, chênh lệch tuyệt đối giữa hai nhóm cùng khoảng tin cậy. Dùng Fisher hoặc kiểm định phù hợp cho tỷ lệ với mẫu nhỏ; nếu có hỗ trợ thống kê, mô hình điều chỉnh các biến nền đã quy định trước. Với dữ liệu theo tuần, dùng phương pháp xử lý đo lặp theo học sinh hoặc tổng hợp ở cấp học sinh; không coi mỗi nhật ký là người độc lập.

Với người không xác định kết quả, không tự gán là đang tiếp tục. Báo cáo phân tích độ nhạy với hai kịch bản bất lợi khác nhau cho dữ liệu thiếu. Ghi lý do rút lui, tỷ lệ thiếu giữa các nhóm và mức lan truyền gợi ý từ nhóm này sang nhóm kia.

## 8.3 Nguyên tắc kết luận

Nếu khoảng tin cậy rộng hoặc kết quả chưa rõ, kết luận chưa đủ bằng chứng thay vì khẳng định không có tác dụng. Nếu chỉ có một nhóm trước và sau do hạn chế thực tế, trình bày là thử nghiệm khả thi, không chứng minh quan hệ nhân quả. Một kết quả tốt của gói can thiệp chưa chứng minh AI tốt hơn hỗ trợ dựa trên quy tắc; câu hỏi đó cần thử nghiệm bổ sung.

## 8.4 Kết quả cần lưu

Bảng đặc điểm mẫu, sơ đồ số người tham gia qua các giai đoạn, bảng chất lượng dự báo, bảng kết quả can thiệp, biểu đồ tiến độ và phản hồi người dùng. Không tạo số liệu minh họa rồi trình bày như kết quả thật. Dữ liệu mô phỏng để kiểm tra phần mềm phải được ghi rõ và tách khỏi nghiên cứu.

# 9 Tổ chức tiến độ kinh phí và quản lý rủi ro

| Tuần | Công việc | Đầu ra |
| --- | --- | --- |
| 1–2 | Thống nhất đề cương, xin phép, khảo sát | Đề cương và công cụ được duyệt |
| 3–4 | Nguyên mẫu và thí điểm | Biểu mẫu, định nghĩa được khóa |
| 5–12 | Thu dữ liệu quan sát | Dữ liệu có xác nhận nhãn |
| 13–14 | Huấn luyện và đánh giá | Mô hình, ngưỡng được khóa |
| 15–22 | Thực nghiệm hai nhóm | Dữ liệu can thiệp |
| 23–24 | Phân tích và hoàn thiện | Báo cáo, demo, poster |

Lịch thực nghiệm chỉ bắt đầu khi có đủ nhãn và mô hình qua bước đánh giá. Có thể cần kéo dài vì số sự kiện thấp, lịch thi hoặc thời gian xin phép. Điều chỉnh theo hạn thi thực tế sau khi kiểm tra thông báo chính thức; đề cương không mặc định hạn nộp.

## 9.1 Phân công đề xuất

Học sinh 1 phụ trách khảo sát, quy trình can thiệp và tổng hợp phản hồi. Học sinh 2 phụ trách phần mềm, xử lý dữ liệu và mô hình. Nếu chỉ có một học sinh, phân theo từng giai đoạn. Cả nhóm cùng quyết định phương pháp, phân tích và thuyết trình. Giáo viên hướng dẫn giám sát tuyển mẫu, đồng ý tham gia, dữ liệu và kết luận. Người hỗ trợ kỹ thuật hướng dẫn và rà soát; học sinh phải hiểu và tự giải thích phần mình thực hiện.

## 9.2 Kinh phí dự kiến

Dự toán tham khảo: tên miền và vận hành 0–1.000.000 đồng; biểu mẫu và tài liệu 200.000–400.000 đồng; poster 300.000–600.000 đồng; dự phòng 200.000–400.000 đồng. Tổng khoảng 700.000–2.400.000 đồng, chưa gồm thiết bị sẵn có. Đây không phải báo giá. Không cần mua gói AI để bắt đầu.

## 9.3 Rủi ro và xử lý

Ít nhãn bỏ cuộc: mở rộng theo dõi và hạn chế kết luận. Thiếu nhật ký: xác nhận trạng thái, ghi dữ liệu thiếu riêng. Thông báo gây phiền: giới hạn tần suất và cho tắt. Hệ thống lỗi: sao lưu và biểu mẫu dự phòng. Khác biệt hoạt động: phân tầng và phân tích thận trọng. Lịch thi: ghi biến bối cảnh và kỳ nghỉ đã định trước.

# 10 Quyền riêng tư sản phẩm và điều kiện hoàn thành

## 10.1 Quyền của người tham gia

Trước khi thu dữ liệu, thống nhất với nhà trường quy trình nghiên cứu có người tham gia và yêu cầu đồng ý của học sinh, phụ huynh hoặc người giám hộ phù hợp. Nội dung đồng ý nêu mục đích, dữ liệu, cách dùng, ai được truy cập, thời gian lưu, quyền không trả lời và quyền rút lui. Không thu dữ liệu trước rồi xin phép sau.

Không dùng hệ thống để chẩn đoán, xếp loại học sinh hoặc quyết định kỷ luật. Không tự động gửi cảnh báo cho phụ huynh hay giáo viên ngoài phạm vi đồng ý. Nếu học sinh cần hỗ trợ ngoài luyện tập, sử dụng kênh hỗ trợ hiện có của trường, không giao cho thuật toán xử lý.

## 10.2 Bảo vệ dữ liệu

Phân quyền học sinh, người hướng dẫn và quản trị; mật khẩu lưu bằng hàm băm phù hợp, không lưu dạng rõ. Truyền dữ liệu qua kết nối bảo mật khi triển khai. Danh sách liên hệ tách riêng, chỉ người phụ trách được truy cập. Sao lưu có kiểm soát; không đưa dữ liệu cá nhân vào kho mã nguồn, poster hoặc buổi demo.

Đề xuất xóa danh sách liên hệ trong vòng 30 ngày sau kết thúc theo dõi và giữ dữ liệu mã hóa định danh tối đa 12 tháng sau khi hoàn tất hồ sơ để kiểm tra kết quả, sau đó xóa hoặc tổng hợp. Thời hạn cuối cùng phải ghi trong nội dung đồng ý và được nhà trường thống nhất. Công bố dữ liệu chỉ khi đã đánh giá nguy cơ nhận diện và có quyền phù hợp.

## 10.3 Sản phẩm cuối

Bộ sản phẩm gồm đề cương và công cụ nghiên cứu; web nguyên mẫu và mã nguồn có hướng dẫn; dữ liệu nghiên cứu đã xử lý riêng tư; mô hình và mô tả huấn luyện; báo cáo dự báo và can thiệp; poster, slide và kịch bản demo. Lưu nhật ký đóng góp của học sinh và nội dung được hỗ trợ bằng công cụ AI.

## 10.4 Mốc nghiệm thu

Nguyên mẫu đạt yêu cầu khi các luồng chính hoạt động, dữ liệu đúng và phân quyền được kiểm tra. Mô hình đạt mức có thể nghiên cứu tiếp khi có dữ liệu kiểm tra độc lập và báo cáo đầy đủ sai số. Hồ sơ hoàn thành khi phương pháp và kết quả có thể truy vết, nêu giới hạn và học sinh giải thích được công việc. Không đặt trước tỷ lệ chính xác 90% hoặc mức giảm bỏ cuộc để ép kết quả.

# Phụ lục Công cụ khởi động và tài liệu tham khảo

## A Nội dung khảo sát ban đầu

1. Bạn đang theo đuổi hoạt động luyện tập nào và đã thực hiện bao lâu?

2. Mục tiêu của bạn trong 8 tuần tới là gì?

3. Bạn dự kiến tập mấy buổi mỗi tuần và nhiệm vụ tối thiểu mỗi buổi là gì?

4. Trong tháng vừa qua, bạn hoàn thành kế hoạch ở mức nào: dưới 25%, 25–49%, 50–74%, từ 75% trở lên hoặc chưa có kế hoạch?

5. Bạn đã từng dừng một mục tiêu trước hạn chưa? Nếu có, lý do chính là gì?

6. Khó khăn hiện tại là thời gian, mức khó, động lực, thiếu hỗ trợ hay yếu tố khác? Có thể bỏ qua.

7. Bạn muốn được hỗ trợ bằng điều chỉnh lịch, chia nhỏ bài, phản hồi tiến bộ, bạn đồng hành hay giáo viên?

8. Bạn sẵn sàng ghi nhật ký ngắn và nhận tối đa 2 lời mời hỗ trợ mỗi tuần không?

## B Mẫu đăng ký mục tiêu

Mã học sinh: …………   Nhóm hoạt động: …………

Mục tiêu đến ngày: …………   Tiêu chí đạt mục tiêu: …………

Số buổi mỗi tuần: …………   Nhiệm vụ tối thiểu: …………

Thời điểm dự kiến: …………   Người hỗ trợ nếu có: …………

## C Việc cần chốt trước triển khai

Điền nhóm thực hiện và giáo viên; xác nhận lịch và hạn thi; thống nhất quy trình đồng ý; kiểm tra định nghĩa và biểu mẫu qua thí điểm; xác định quyền truy cập dữ liệu; khóa kế hoạch phân tích; thống nhất cách xử lý khi thiếu mẫu hoặc mô hình chưa đạt.

## D Tài liệu tham khảo

[1] Ryan, R. M. và Deci, E. L. (2000). Intrinsic and Extrinsic Motivations: Classic Definitions and New Directions. Contemporary Educational Psychology, 25, 54–67. https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_IntExtDefs.pdf

[2] scikit-learn. TimeSeriesSplit, tài liệu chính thức. https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html

[3] scikit-learn. Common pitfalls and recommended practices, mục Data leakage. https://scikit-learn.org/stable/common_pitfalls.html

Tài liệu được tra cứu ngày 04/10/2026. Danh mục là cơ sở ban đầu; tiếp tục bổ sung tổng quan nghiên cứu tương tự trước khi nộp hồ sơ. Đề cương chưa xác định lĩnh vực thi hoặc mẫu hồ sơ bắt buộc; đối chiếu thông báo chính thức của cuộc thi được lựa chọn.
