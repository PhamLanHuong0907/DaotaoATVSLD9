# HƯỚNG DẪN CHỨC NĂNG & QUY TRÌNH HỆ THỐNG (ATVSLD)

Tài liệu này mô tả chi tiết các quyền hạn, quy trình nghiệp vụ và các điều kiện ràng buộc (Modify Logic) trong hệ thống Quản lý An toàn vệ sinh lao động.

---

## 1. Hệ thống Phân quyền (Roles & Permissions)

Hệ thống được thiết kế với 4 vai trò chính:

| Vai trò | Mô tả | Quyền hạn chính |
| :--- | :--- | :--- |
| **Admin** | Quản trị hệ thống | Toàn quyền (Quản lý User, Danh mục, Cấu hình, và mọi dữ liệu khác). |
| **Training Officer** | Cán bộ đào tạo | Quản lý Ngân hàng câu hỏi, Khóa học, Đề thi và Kỳ thi. |
| **Manager** | Quản lý/Lãnh đạo | Xem báo cáo, thống kê, giám sát tiến độ học tập và tuân thủ. |
| **Worker** | Người lao động | Tham gia học tập, làm bài thi, xem kết quả và chứng chỉ cá nhân. |

---

## 2. Quy trình Thêm dữ liệu (Data Setup Workflow)

Để tổ chức một kỳ thi chính thức, quản trị viên thực hiện theo trình tự sau:

1.  **Bước 1: Danh mục (Catalogs)**: Cập nhật Ngành nghề, Bậc kỹ năng và Loại chứng chỉ.
2.  **Bước 2: Ngân hàng câu hỏi**: Thêm câu hỏi và Gửi duyệt. Câu hỏi phải ở trạng thái **Đã duyệt** mới có thể dùng để tạo đề.
3.  **Bước 3: Mẫu đề thi (Templates)**: Thiết lập ma trận đề (số lượng câu theo độ khó/chủ đề). Gửi duyệt mẫu đề.
4.  **Bước 4: Kỳ thi (Periods)**: Tạo Kỳ thi tổng thể (ví dụ: "Thi sát hạch ATLD Quý 1/2024"), thiết lập thời gian bắt đầu/kết thúc.
5.  **Bước 5: Đề thi (Exams)**: Tạo Đề thi từ Mẫu đề đã duyệt, gán vào Kỳ thi đã tạo.
6.  **Bước 6: Phòng thi (Rooms)**: Tạo các Phòng thi thuộc Kỳ thi, gán Đề thi và danh sách Thí sinh (Candidates).
7.  **Bước 7: Phê duyệt**: Gửi duyệt Kỳ thi và Phòng thi để chuyển sang trạng thái **Chính thức**.

---

## 3. Quy trình & Điều kiện Chỉnh sửa (Workflow & Constraints)

### A. Ngân hàng câu hỏi (Question Bank)
*   **Quy trình**: Nhập từ Excel/Thêm mới -> **Nháp (Draft)** -> **Chờ duyệt (Pending)** -> **Đã duyệt (Approved)**.
*   **Điều kiện Modify**:
    *   **Thêm mới**: Mọi lúc (mặc định vào trạng thái Nháp).
    *   **Sửa/Xóa**: Chỉ được phép khi câu hỏi ở trạng thái **Nháp** hoặc **Bị từ chối**.
    *   **Đã duyệt**: Bị khóa chỉnh sửa nội dung. Muốn sửa phải chuyển về trạng thái Nháp (yêu cầu quyền Admin).

### B. Quản lý Khóa học (Course Management)
*   **Quy trình**: Tạo (AI/Thủ công) -> **Nháp** -> **Chờ duyệt** -> **Đã duyệt** -> **Gán cho phòng ban**.
*   **Điều kiện Modify**:
    *   **Sửa**: Được phép ở trạng thái **Nháp** hoặc **Bị từ chối**.
    *   **Xóa**: Chỉ được xóa khi ở trạng thái **Nháp**.
    *   **Đã duyệt**: Khóa nội dung bài học để đảm bảo tính thống nhất cho học viên đang học. Chỉ được phép thay đổi việc gán phòng ban.

### C. Đề thi (Exams)
*   **Quy trình**: Tạo từ Ma trận/Thủ công -> **Nháp** -> **Chờ duyệt** -> **Đã duyệt**.
*   **Điều kiện Modify**:
    *   **Sửa/Xóa**: Chỉ được phép khi ở trạng thái **Nháp**.
    *   **Khóa cứng**: Khi đề thi đã được đưa vào một **Kỳ thi (Exam Period)** đang diễn ra hoặc đã kết thúc, đề thi đó tuyệt đối không được sửa/xóa để bảo toàn dữ liệu kết quả thi.

### D. Kỳ thi (Exam Periods)
*   **Quy trình**: Lên lịch -> **Sắp diễn ra** -> **Đang diễn ra** -> **Kết thúc**.
*   **Điều kiện Modify**:
    *   **Sửa lịch/Phòng thi**: Chỉ được phép khi kỳ thi **Chưa bắt đầu**.
    *   **Hủy**: Có thể hủy nếu chưa có ai làm bài nộp.
    *   **Đã kết thúc**: Khóa toàn bộ dữ liệu, chỉ được phép xem báo cáo và xuất chứng chỉ.

---

## 3. Quy trình học & Thi (Worker Workflow)

1.  **Học tập**: 
    *   Worker vào mục "Học tập" để thấy các khóa học được gán.
    *   Hệ thống ghi nhận tiến độ (%) theo từng bài học.
    *   Hoàn thành 100% khóa học mới đủ điều kiện tham gia kỳ thi chính thức (tùy cấu hình).
2.  **Thi cử**:
    *   Vào mục "Kỳ thi" để thấy các kỳ thi đang mở.
    *   Làm bài trong thời gian quy định. Hệ thống tự động nộp bài khi hết giờ.
3.  **Chứng chỉ**:
    *   Đạt điểm chuẩn sẽ được hệ thống tự động cấp chứng chỉ điện tử.

---

## 4. Các nút chức năng (UI Logic)

Để tránh sai sót dữ liệu, hệ thống áp dụng logic hiển thị nút như sau:
*   **Nút màu xám (Disabled)**: Xuất hiện khi bản ghi ở trạng thái không cho phép thao tác (Ví dụ: Nút Xóa bị xám khi Đề thi đã Duyệt).
*   **Tooltip thông báo**: Khi di chuột vào nút bị xám, hệ thống sẽ hiển thị lý do (Ví dụ: "Không thể xóa đề thi đã duyệt").
*   **Chuột dạng cấm (Not-allowed)**: Trạng thái chuột khi trỏ vào các vùng bị khóa.

---
*Tài liệu này được cập nhật tự động bởi hệ thống hỗ trợ kỹ thuật.*
