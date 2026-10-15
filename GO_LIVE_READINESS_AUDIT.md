# Backlog chức năng cần thêm và tối ưu cho EduPulse

## Mục tiêu

Tài liệu này tập trung vào sản phẩm: cần thêm chức năng gì, luồng hiện tại nào nên làm gọn, và làm sao để Student, Mentor, Researcher, Admin biết bước tiếp theo mà thao tác ít và rõ hơn.

Rà soát dựa trên dashboard trong `src/components/pages`, service `src/services/api.ts`, cùng tài liệu [CHUC_NANG_4_ROLE.md](CHUC_NANG_4_ROLE.md). Các đề xuất bên dưới phân biệt phần đã có với phần cần tối ưu, không xem tính năng được mô tả trong tài liệu là đã hoàn tất nếu UI/luồng hiện tại còn thiếu.

### Cách ưu tiên

- **P1 - Nên làm trước:** giảm thao tác chính, tránh sai dữ liệu, giúp hoàn thành công việc hằng ngày.
- **P2 - Làm tiếp:** tăng chiều sâu phân tích, theo dõi và phối hợp giữa các role.
- **P3 - Mở rộng:** tự động hóa nâng cao hoặc tích hợp thêm khi đã có người dùng thật.

## 1. Nhìn nhanh hiện trạng

| Khu vực | Đã có trong source | Hướng nâng cấp chính |
|---|---|---|
| Dùng chung | Landing, đăng nhập, onboarding, điều hướng theo role, toast | Trang việc cần làm, hộp thông báo, trạng thái lưu rõ ràng, giảm bước chuyển tab |
| Student | Kế hoạch/công việc, nhật ký, nghỉ, tiến độ, AI hỗ trợ, mentor, buddy, khảo sát, dữ liệu cá nhân | Ghi nhận nhanh, kế hoạch dễ điều chỉnh, giải thích insight, theo dõi phản hồi và nhắc việc |
| Mentor | Danh sách học sinh, tìm/lọc, hồ sơ, yêu cầu hỗ trợ, phản hồi, xác nhận tuần | Hàng đợi ưu tiên, theo dõi nhiều tuần, lịch sử tương tác và nhắc follow-up |
| Researcher | Báo cáo, thống kê, định nghĩa, phân nhóm, model version, export, mô phỏng | Chọn phân tích có hướng dẫn, xem trước và giải thích kết quả, export đúng dữ liệu |
| Admin | Role/invite, nguồn/nội dung, phân công, danh bạ, consent, chất lượng dữ liệu, cấu hình/job | Luồng xử lý theo hàng đợi, preview thao tác hàng loạt, lịch sử job/audit dễ tra cứu |

## 2. Chức năng dùng chung các role

| Ưu tiên | Đã có / vướng hiện tại | Đề xuất | Tiêu chí hoàn thành |
|---|---|---|---|
| P1 | Dashboard có nhiều tab, người dùng phải tự nhớ tab nào cần xử lý | Thêm khối **Việc cần làm tiếp theo** theo role: việc đến hạn, việc đang chờ, nút mở đúng màn hình và số lượng tồn | Từ trang đầu mỗi role, người dùng biết một hành động tiếp theo; bấm vào đi đúng bản ghi/tab, không phải tự tìm |
| P1 | Toast báo kết quả nhưng trạng thái công việc nằm rải rác ở nhiều tab | Chuẩn hóa trạng thái `Đang xử lý / Thành công / Cần thử lại`; giữ lỗi gần form và giữ nguyên dữ liệu nhập khi lỗi | Lỗi mạng không xóa nội dung form; thành công chỉ hiện sau khi DB xác nhận; refresh vẫn thấy kết quả |
| P1 | Lặp lại thao tác giữa danh sách và chi tiết | Dùng panel chi tiết hoặc sheet cho xem nhanh; giữ nguyên bộ lọc/vị trí danh sách khi đóng | Mở/đóng chi tiết không mất bộ lọc, trang, scroll; các hành động chính làm được từ danh sách |
| P2 | Thông tin cập nhật giữa các role hiện phải tự vào từng tab để kiểm tra | Thêm hộp thông báo theo role: yêu cầu mới, phản hồi mentor, lời mời, phân công, job cần xử lý; có đánh dấu đã đọc | Mỗi thông báo dẫn tới đúng đối tượng; có trạng thái chưa đọc/đã đọc và không tạo thông báo trùng |
| P2 | Tên trạng thái/thuật ngữ nghiên cứu có thể khó hiểu với người dùng phổ thông | Chuẩn hóa từ ngữ, thêm giải thích ngắn cạnh thuật ngữ và tooltip cho trạng thái/model/consent | Học sinh hiểu câu hỏi và trạng thái mà không cần biết thuật ngữ kỹ thuật; không dùng wording mang tính chẩn đoán |
| P2 | Form và bảng dày dữ liệu cần thao tác nhiều trên điện thoại | Rà soát mobile, bàn phím, focus modal, nhãn trường, tương phản và thông báo lỗi | Hoàn thành các luồng chính bằng điện thoại và bàn phím; không mất thao tác quan trọng ở màn hình nhỏ |

## 3. Student - làm việc hằng ngày thuận hơn

| Ưu tiên | Đã có | Cần thêm/tối ưu | Tiêu chí hoàn thành |
|---|---|---|---|
| P1 | Dashboard có KPI, tiến độ và các bước onboarding | Tạo **Tóm tắt hôm nay**: kế hoạch sắp tới, việc còn thiếu, nút ghi nhật ký nhanh và trạng thái tuần; chỉ hiển thị việc phù hợp với dữ liệu hiện có | Một lần mở dashboard là biết hôm nay nên làm gì; không hiện nhắc hoàn thành việc đã xong hoặc tuần đang nghỉ |
| P1 | Nhật ký có trạng thái, thời lượng, động lực, độ khó, rào cản và lịch sử | Thêm chế độ **Ghi nhanh** với ngày/mục tiêu mặc định, lần ghi trước làm gợi ý, lưu nháp khi rời form và sửa bản ghi gần đây | Ghi một buổi thường ngày trong ít thao tác; kiểm tra rõ ngày trùng, ngày tương lai, thời lượng bất thường và cho phép sửa có audit/history phù hợp |
| P1 | Kế hoạch có phiên bản, lịch/công việc và điều chỉnh | Làm rõ khác biệt giữa sửa công việc và tạo phiên bản kế hoạch mới; cảnh báo lịch trùng/phiên bản có hiệu lực; cho sao chép tuần hoặc đổi lịch nhanh | Học sinh biết thay đổi nào ảnh hưởng kế hoạch tương lai; lịch cũ không bị sửa ngược; có thể đổi một buổi mà không tạo lại toàn bộ kế hoạch |
| P1 | Có chỉ số tiến độ/streak và biểu đồ | Bổ sung **Vì sao có con số này?**: thời gian đo, mẫu số, số nhật ký, dữ liệu thiếu và cách tính | Mỗi KPI quan trọng có giải thích ngắn; không quy kết “tụt động lực” từ vài bản ghi hoặc dữ liệu bỏ qua |
| P2 | Có AI support invite, nội dung, lý do và phản hồi áp dụng/hoãn/từ chối | Thêm lịch sử lời mời theo dòng thời gian, lọc trạng thái, nhắc lại phản hồi; cho biết gợi ý dựa trên tín hiệu nào và ai duyệt nội dung | Học sinh phân biệt gợi ý với kết luận chuyên môn; không gửi lặp cùng nội dung; có thể từ chối/ẩn và xem lại lựa chọn |
| P2 | Có thiết lập giờ/kênh nhắc lịch | Thêm màn hình lịch nhắc tuần, múi giờ và **gửi thử**; hiển thị rõ chỉ lưu tùy chọn hay thông báo thực sự đã gửi | Không hiện “đã nhắc” nếu chưa có delivery; tắt nhắc dễ tìm; không gửi ngoài giờ đã chọn |
| P2 | Có buddy, yêu cầu mentor, survey và phần dữ liệu cá nhân ở các khu vực riêng | Tạo mục **Hỗ trợ của tôi** gộp trạng thái yêu cầu mentor, buddy, lời mời hỗ trợ và phản hồi gần nhất | Xem được ai đang xử lý, bước tiếp theo và lần cập nhật cuối mà không cần dò nhiều tab |
| P2 | Có tải dữ liệu và gửi yêu cầu dữ liệu | Thêm trang trạng thái export/xóa với phạm vi dữ liệu, ngày yêu cầu, người xử lý và kết quả; yêu cầu xóa phải có xác nhận rõ hậu quả | Không đánh dấu hoàn tất chỉ vì đã gửi yêu cầu; người dùng biết yêu cầu đang chờ hay đã thực hiện |
| P3 | Onboarding đặt mục tiêu ban đầu | Sau đăng nhập, có checklist thiết lập ngắn: consent, mục tiêu, lịch, thông tin liên hệ tùy chọn; cho bỏ qua bước không bắt buộc | Tiến độ thiết lập được lưu, quay lại không mất dữ liệu, không ép nhập thông tin liên hệ không cần thiết |

## 4. Mentor - giảm thời gian rà từng học sinh

| Ưu tiên | Đã có | Cần thêm/tối ưu | Tiêu chí hoàn thành |
|---|---|---|---|
| P1 | Có danh sách được phân công và bộ lọc/tìm kiếm | Thêm bộ lọc lưu được: cần phản hồi, yêu cầu quá hạn, tuần chưa xác nhận, nhóm hoạt động; sắp xếp theo ưu tiên và lần cập nhật | Có thể tìm đúng nhóm học sinh trong vài thao tác; không gọi là “nguy cơ” nếu chỉ là tín hiệu cần kiểm tra |
| P1 | Có tab/hàng đợi yêu cầu hỗ trợ và cập nhật trạng thái | Cho xử lý ngay tại hàng đợi: nhận việc, phản hồi, hoàn tất, chuyển người phụ trách; có mốc SLA/đã chờ bao lâu | Trạng thái luôn cho biết người chịu trách nhiệm và hành động kế tiếp; học sinh thấy phản hồi sau khi Mentor gửi thành công |
| P1 | Có hồ sơ học sinh và tóm tắt tiến độ | Tạo trang chi tiết theo dòng thời gian 4-12 tuần: kế hoạch, nhật ký, nghỉ, trạng thái tuần, yêu cầu và lần Mentor liên hệ | Mentor có thể xem thay đổi theo thời gian, không chỉ snapshot tuần gần nhất; quyền xem vẫn theo phân công và consent |
| P2 | Có mẫu khích lệ và xác nhận trạng thái tuần | Cho lưu mẫu phản hồi theo tình huống, xem trước tên/ngữ cảnh người nhận và ghi lại lịch sử đã gửi | Không gửi nhầm học sinh; có thể sửa nội dung trước gửi; lịch sử cho biết thời điểm và mẫu đã dùng |
| P2 | Có thông tin buddy và buddy pair | Thêm trạng thái chờ duyệt/quá hạn và nhắc Mentor xử lý; không lộ dữ liệu cá nhân ngoài phạm vi được cấp | Cặp buddy có trạng thái dễ hiểu và lịch sử quyết định; không tạo cặp trùng hoặc thiếu chấp thuận |
| P2 | Lead Mentor có các tab duyệt phân nhóm/test set riêng | Tách rõ **việc cần duyệt** khỏi báo cáo; hiển thị người đề xuất, lý do, dữ liệu liên quan, tác động và nút duyệt/từ chối | Mỗi quyết định có lý do/audit; tránh phải tìm giữa dashboard thống kê để xử lý phê duyệt |
| P3 | Chưa có chức năng điều phối ca/caseload nâng cao | Thêm phân bổ caseload, bàn giao khi Mentor nghỉ và danh sách học sinh chưa có người phụ trách | Admin/Lead nhìn thấy học sinh chưa được gán; bàn giao không mất lịch sử hỗ trợ |

## 5. Researcher - phân tích và xuất dữ liệu dễ kiểm tra

| Ưu tiên | Đã có | Cần thêm/tối ưu | Tiêu chí hoàn thành |
|---|---|---|---|
| P1 | Có cấu hình mẫu số, ngưỡng, cỡ mẫu và báo cáo hiệu quả | Tạo **bộ lọc phân tích** theo cohort, khoảng thời gian, trạng thái consent, nhóm và định nghĩa; lưu preset có tên | Báo cáo luôn hiển thị cohort, mẫu số, thời điểm dữ liệu và phiên bản định nghĩa; preset dùng lại cho lần sau |
| P1 | Có outcome, CI và suppression một số nhóm nhỏ | Thêm phần giải thích diễn giải: sự kiện, mẫu số, dữ liệu chưa đủ, khoảng tin cậy và giới hạn suy luận; cảnh báo khi N nhỏ | Người đọc phân biệt mô tả với kết luận; không hiển thị kết luận chắc chắn nếu outcome thiếu hoặc CI chưa đủ bằng chứng |
| P1 | Có nhiều loại CSV export | Trước tải, hiển thị preview, số dòng/cột, bộ lọc áp dụng, mã giả danh và cảnh báo dữ liệu nhạy cảm; sửa export `primary_summary` hiện chưa trả dữ liệu từ service | File tải về có hàng dữ liệu khớp preview và báo cáo; test N nhỏ, dữ liệu thiếu, nhóm rỗng và ký tự CSV đặc biệt |
| P2 | Có định nghĩa vận hành khóa/mở khóa và version | Thêm luồng tạo phiên bản mới, so sánh thay đổi và xem báo cáo nào sử dụng phiên bản nào | Không sửa lặng lẽ định nghĩa đã dùng; mọi kết quả có thể truy về phiên bản tiêu chí |
| P2 | Có model registry, seed, threshold, coefficients và trạng thái active | Thêm so sánh model version, bảng metrics trên holdout, thời gian đánh giá, ngưỡng chọn và nút rollback/đề xuất kích hoạt | Model không được xem là tốt chỉ vì đã đăng ký; lịch sử version/ai kích hoạt/ảnh hưởng prediction xem được |
| P2 | Có missing-data view và thống kê | Tạo luồng drill-down có giải thích mỗi loại missing, bộ lọc, tải danh sách đã khử định danh và gợi ý xử lý dữ liệu | Bấm một KPI mở đúng tập bản ghi đóng góp vào KPI; không hiện danh tính nếu không cần |
| P2 | Có trang mô phỏng riêng | Thêm nhãn môi trường nổi bật, nút reset dataset và xác nhận trước khi chạy; tách tuyệt đối khỏi báo cáo production | Không thể nhầm số mô phỏng với số thật ở dashboard/export; mỗi bản xuất ghi rõ nguồn dữ liệu |
| P3 | Có thống kê khảo sát và kết quả tổng hợp | Thêm report builder đơn giản: chọn biến, nhóm, thời gian, xuất bảng/biểu đồ và lưu cấu hình | Có thể tái lập báo cáo từ cùng một cấu hình; hiển thị mẫu số và dữ liệu bị loại |

## 6. Admin - vận hành theo hàng đợi, không phải dò từng tab

| Ưu tiên | Đã có | Cần thêm/tối ưu | Tiêu chí hoàn thành |
|---|---|---|---|
| P1 | Có tìm kiếm tài khoản, đổi role, invite và nạp CSV | Nâng cấp import thành preview trước khi áp dụng: dòng hợp lệ/lỗi/trùng, role, mã HS và số lượng tạo; tải report lỗi | Không ghi một phần âm thầm; Admin biết trước thay đổi và có kết quả từng dòng sau khi chạy |
| P1 | Có danh sách phân công mentor/student | Thêm bộ lọc mentor chưa đủ/chưa có học sinh, học sinh chưa được gán, phân công sắp thay đổi; thao tác phân công ngay từ hồ sơ | Tạo/sửa phân công có kiểm tra role, consent phù hợp, xác nhận khi thay đổi và lịch sử ai thay đổi |
| P1 | Có consent và data request | Biến thành hàng đợi xử lý với loại yêu cầu, thời hạn, người nhận việc, ghi chú xử lý, bước thực hiện và bằng chứng hoàn thành | Không thể bấm “hoàn tất” nếu chưa ghi rõ hành động đã thực hiện; yêu cầu export và deletion có quy trình riêng |
| P1 | Có danh bạ bảo mật, audit khi xem số điện thoại | Thêm lọc theo lớp/trạng thái thiếu liên hệ, cảnh báo bản ghi thiếu hoặc cũ; thao tác xem số vẫn phải ghi audit | Admin nhận ra dữ liệu nào chưa hoàn chỉnh; không dùng số giả làm placeholder; có lý do xem nếu chính sách yêu cầu |
| P2 | Có audit log gần nhất | Thêm tìm kiếm, filter theo actor/action/target/ngày, xem chi tiết metadata và liên kết tới bản ghi liên quan | Điều tra một thao tác được trong vài bước; phân biệt lỗi, thay đổi cấu hình, export, xóa và job |
| P2 | Có cấu hình support, giới hạn lời mời và retention | Chia nhóm cấu hình, hiện giá trị hiện tại/đã lưu, validate ngay tại form, nút lưu có trạng thái và giải thích tác động | Không báo “sẵn sàng” chỉ từ vài giá trị setting; Admin biết cấu hình nào đang thực sự được backend sử dụng |
| P2 | Có chạy pipeline tuần thủ công | Thêm trang lịch sử job: tuần xử lý, người chạy, thời điểm, tổng thời gian, số hàng ảnh hưởng, lỗi, chạy lại | Chạy lại không tạo trùng invitation/prediction; có xác nhận trước thao tác tác động nhiều học sinh |
| P2 | Có nội dung can thiệp và nguồn khoa học | Thêm workflow draft → review → approved → archived, preview như góc nhìn học sinh, version nội dung và lịch sử duyệt | Admin biết nội dung nào đang được gửi, nguồn nào hỗ trợ, ai duyệt và có thể quay lại bản trước |
| P3 | Có các màn cấu hình và quản trị riêng | Thêm trang tổng quan sức khỏe vận hành: invite lỗi, request quá hạn, job thất bại, danh bạ thiếu, nội dung chờ duyệt | Mỗi chỉ số có đường dẫn tới danh sách cần xử lý và người phụ trách |

## 7. Các sửa logic cần đưa vào backlog

| Ưu tiên | Logic hiện tại cần xem lại | Cải tiến đề xuất |
|---|---|---|
| P1 | Export `primary_summary` trong `src/services/api.ts` hiện trả object rỗng, trong khi Researcher UI vẫn dựng file theo cấu trúc summary | Đưa summary vào dữ liệu export thực tế và thêm test nội dung CSV; tránh tạo file nhìn như thành công nhưng thiếu số liệu |
| P1 | Dữ liệu rỗng, chưa tải và lỗi tải cần được phân biệt ở mọi tab | Dùng trạng thái riêng `loading / loaded-empty / error / retry`; không hiển thị “không có dữ liệu” khi query thất bại |
| P1 | Nhiều danh sách và form có thể gây thao tác lặp hoặc mất ngữ cảnh | Giữ search/filter khi quay lại; chống submit lặp; cho undo đối với thao tác có thể phục hồi; xác nhận trước thao tác xóa/duyệt hàng loạt |
| P2 | Một số giá trị tổng hợp khó kiểm tra nguồn gốc | KPI và export cần cùng một nguồn tính toán; hiển thị thời gian cập nhật, mẫu số, bộ lọc và dữ liệu loại trừ |
| P2 | Import/export và xử lý nhiều bản ghi dễ gặp dữ liệu một phần | Preview trước ghi; giới hạn batch; báo cáo từng dòng; idempotency và khả năng tải lỗi |
| P2 | Cấu hình thông báo/job có thể chỉ lưu tùy chọn mà chưa thể hiện trạng thái thực hiện | Hiển thị rõ `đã lưu`, `đang gửi`, `đã gửi`, `thất bại`, `chưa tích hợp`; có retry phù hợp |
| P3 | Dashboard lớn khiến thêm chức năng dễ làm rối và khó sửa | Tách component/hook theo nghiệp vụ, thống nhất component table/filter/detail form; giữ API/types rõ ràng |

## 8. Thứ tự triển khai khuyến nghị

### Đợt 1 - Làm thao tác hằng ngày nhẹ hơn

1. Student: Tóm tắt hôm nay + ghi nhật ký nhanh + lưu nháp.
2. Mentor: Hàng đợi yêu cầu hỗ trợ + ưu tiên theo việc tồn + chi tiết tiến độ nhiều tuần.
3. Admin: Preview import + hàng đợi data request + audit có filter.
4. Researcher: Sửa export summary + preview CSV và thông tin bộ lọc.

### Đợt 2 - Theo dõi xuyên role

1. Hộp thông báo theo role, có deep link và đã đọc/chưa đọc.
2. Lịch sử hỗ trợ, lời mời, phản hồi và phân công theo dòng thời gian.
3. Trạng thái rõ cho nhắc lịch, job tuần, yêu cầu export/xóa.
4. Giải thích các KPI và số liệu để người dùng tự kiểm tra.

### Đợt 3 - Nâng chiều sâu và quy mô

1. Bộ lọc/preset báo cáo nghiên cứu và model comparison.
2. Tự động hóa reminder, job và follow-up theo cấu hình đã thống nhất.
3. Tối ưu caseload, bàn giao Mentor và health overview cho Admin.
4. Rà soát mobile/accessibility và kiểm thử E2E các luồng chính.

## 9. Điều kiện coi một chức năng là hoàn tất

- [ ] Người dùng mục tiêu hiểu được chức năng và biết bước tiếp theo mà không cần hướng dẫn miệng.
- [ ] Luồng chính hoàn thành ít bước; form giữ dữ liệu khi lỗi và có xác nhận khi lưu thành công.
- [ ] Có trạng thái empty/loading/error/success và xử lý dữ liệu thiếu, thao tác trùng, mất mạng.
- [ ] Từng role chỉ thấy và thao tác đúng dữ liệu được giao; thao tác nhạy cảm có lịch sử phù hợp.
- [ ] Kiểm tra được trên desktop và điện thoại; các nút/form dùng được bằng bàn phím.
- [ ] Có test cho luồng chính và các trường hợp dễ sai; số liệu trên UI khớp dữ liệu xuất.
