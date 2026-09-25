# EduShare Platform - Hệ Thống Quản Lý & Chia Sẻ Tài Liệu Học Tập Số

**EduShare** (Academic Hub) là một hệ thống quản lý và chia sẻ tài liệu học tập số toàn diện dành cho môi trường Đại học / Viện đào tạo. Hệ thống kết nối chặt chẽ giữa **Sinh viên (Student)**, **Giảng viên (Teacher)** và **Quản trị viên (Administrator)** nhằm tối ưu hóa quy trình đề xuất giáo trình, đăng tải bài giảng, kiểm duyệt nội dung, tạo bài kiểm tra trắc nghiệm và phân tích dữ liệu học tập theo thời gian thực.

---

## Cấu Trúc Phân Cấp Học Thuật (System Hierarchy)

Hệ thống EduShare được xây dựng trên cấu trúc phân cấp chuẩn hóa giúp quản lý chương trình đào tạo mạch lạc:

$$\text{Faculty (Khoa)} \longrightarrow \text{Major (Ngành)} \longrightarrow \text{Subject / Category (Môn học)} \longrightarrow \text{Lesson (Bài học)} \longrightarrow \begin{cases} \text{Materials (Tài liệu đính kèm)} \\ \text{Quizzes (Bài kiểm tra trắc nghiệm)} \end{cases}$$

---

## Các Tính Năng Chính Theo Vai Trò (Core Features)

### 1.Vai Trò Sinh Viên (Student)
* **Tra cứu Chương trình Đào tạo:** Xem danh mục Ngành, Môn học, Danh sách Bài học chuẩn hóa.
* **Xem & Tải Tài liệu Học tập:** Xem trực tiếp trên trình duyệt (PDF, Video, Bài giảng Presentation, Bài tập) hoặc tải về máy.
* **Thảo luận & Bình luận:** Đặt câu hỏi, thảo luận dưới từng tài liệu học tập.
* **Báo cáo Vi phạm:** Gửi báo cáo đối với các bình luận vi phạm tiêu chuẩn cộng đồng.
* **Làm Bài Kiểm Tra Trắc Nghiệm:** Tham gia làm bài quiz đính kèm bài học, xem kết quả và điểm số tức thì.
* **Truy cập Toàn trường (Read-Only):** Khám phá tài liệu và thảo luận ở các Khoa / Ngành khác trong trường.

---

### 2.Vai Trò Giảng Viên (Teacher / Instructor)
* **Teacher Dashboard (`Dashboard.jsx`):** 
  * Quản lý các Ngành học được phân công chuyên môn.
  * Theo dõi tiến độ phê duyệt tài liệu/bài học gần đây (Approved, Pending, Rejected).
  * Xem danh mục tài liệu toàn trường ở chế độ Read-Only để tham khảo peer-review.
* **Chương Trình Đào Tạo Theo Ngành (`MajorCurriculum.jsx`):**
  * Quản lý các môn học được giao quyền chỉnh sửa (Full Access) và xem các môn học khác.
* **Đề Xuất Bài Học Mới (`CreateDynamicLesson.jsx`):**
  * Đề xuất chủ đề bài học mới đính kèm gói tài liệu ban đầu lên Admin kiểm duyệt.
* **Đăng Tải & Quản Lý Tài Liệu (`UploadMaterial.jsx`):**
  * Tải tài liệu lên cho các bài học đã được Admin phê duyệt.
  * Hỗ trợ đa dạng định dạng: Document (PDF/Word), Slides (PowerPoint/PPTX), Exercise (Bài tập/Code), Video bài giảng.
  * **Xử lý tài liệu nâng cao:** Rút đơn đăng ký (Withdraw), nộp lại bài bị từ chối, khóa chỉnh sửa khi Admin đang khóa review.
* **Biên Soạn Bài Kiểm Tra Trắc Nghiệm (`QuizBuilder.jsx`):**
  * Biên soạn câu hỏi trắc nghiệm đính kèm theo từng bài học đã duyệt.
  * Thiết lập ngưỡng điểm đạt (Pass Percentage %), lịch mở đề (`Opens at`) và đóng đề (`Closes at`).
  * Quản lý câu hỏi, đáp án đúng/sai, lời giải thích chi tiết (Explanation) và lưu lại theo **Phiên bản (Versioning)**.

---

### 3.Vai Trò Quản Trị Viên (Administrator)
* **Thống Kê Tổng Quan Hệ Thống (`Dashboard.jsx`):**
  * Phân tích số liệu tài khoản (Student / Teacher / Admin).
  * Thống kê dung lượng lưu trữ trên đám mây AWS S3 (MB/GB, tổng tệp).
  * Theo dõi hàng chờ kiểm duyệt, báo cáo vi phạm, phân bổ loại tài liệu và chỉ số hoàn thành bài test.
* **Quản Lý Tài Khoản Người Dùng (`UserManagement.jsx`):**
  * Tìm kiếm, lọc tài khoản theo Vai trò, Trạng thái (Active / Deactivated) và Tiêu chí sắp xếp.
  * Tạo tài khoản mới, Khóa/Mở lại tài khoản, Đặt lại mật khẩu (Reset Password).
* **Kiểm Duyệt Nội Dung & Bài Đăng (`MaterialModeration.jsx`):**
  * **Khóa Review (Review Lock):** Ngăn chặn xung đột chỉnh sửa trong lúc Admin đang xem xét bài nộp.
  * **Trình xem trước đa tệp:** Xem trực tiếp PDF, xem Video, hoặc duyệt các slide trình chiếu đính kèm.
  * Phê duyệt (Approve & Publish) hoặc Từ chối (Reject) có kèm lý do phản hồi cho Giảng viên.
* **Quản Lý Bình Luận Bị Báo Cáo (`ReportManagement.jsx`):**
  * Xem bình luận bị cờ báo xấu từ sinh viên.
  * Bỏ qua báo cáo sai (Dismiss) hoặc Xóa mềm bình luận vi phạm (Soft-Delete) kèm nhật ký lý do.
* **Quản Lý Cấu Trúc & Phân Quyền Giảng Viên (`CurriculumManagement.jsx`):**
  * **Single Builder:** Tạo từng Khoa (Faculty), Ngành (Major), Môn học (Subject), Bài học (Lesson).
  * **Bulk Generator:** Tạo hàng loạt bài học/môn học bằng cách dán danh sách văn bản (One per line).
  * **Teacher Assignments:** Tìm kiếm giảng viên theo email và phân quyền quản lý môn học chuyên trách.

---

## Công Nghệ Sử Dụng (Tech Stack)

### Frontend
* **Core:** React.js (Single Page Application - SPA)
* **Routing:** React Router DOM (Cascading Routing & Protected Routes according to User Roles)
* **Styling:** Tailwind CSS (Responsive Design, Custom Gradients, Glassmorphism UI)
* **Icons:** Lucide React

### Backend 
* **Framework:** Django / Django REST Framework (DRF)
* **Task Queue / Async Processing:** Celery + Redis (Xử lý bất đồng bộ các tệp PPTX/Slides lớn tránh timeout Nginx 504)
* **Database:** PostgreSQL / MySQL
* **File Storage:** Amazon S3 (AWS Simple Storage Service)

---

## Cấu Trúc Thư Mục Frontend (Project Directory)

```text
src/
├── assets/                  # Hình ảnh, logo, tài nguyên tĩnh
├── components/              # Các UI Components tái sử dụng (Navbar, Sidebar, Modals, Cards)
├── pages/
│   ├── student/             # Trang dành cho Sinh viên
│   │   ├── Dashboard.jsx
│   │   ├── MajorDetailView.jsx
│   │   └── MaterialDetail.jsx
│   ├── teacher/             # Trang dành cho Giảng viên
│   │   ├── Dashboard_2.jsx
│   │   ├── MajorCurriculum.jsx
│   │   ├── CreateDynamicLesson.jsx
│   │   ├── UploadMaterial.jsx
│   │   └── QuizBuilder.jsx
│   └── admin/               # Trang dành cho Quản trị viên
│       ├── Dashboard_3.jsx
│       ├── UserManagement.jsx
│       ├── MaterialModeration.jsx
│       ├── ReportManagement.jsx
│       └── CurriculumManagement.jsx
├── services/                # Tầng gọi API (Axios Services)
│   ├── adminService.js
│   ├── curriculumService.js
│   ├── materialService.js
│   ├── moderationService.js
│   └── quizService.js
├── App.jsx                  # Khai báo Routes & Phân quyền truy cập
└── main.jsx                 # Entry point ứng dụng

```

---

## Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Setup)

### Yêu cầu tiên quyết (Prerequisites)

* **Node.js**: `>= 18.x`
* **npm** hoặc **yarn**

### Bước 1: Clone dự án và cài đặt Dependencies

```bash
# Clone repository
git clone [https://github.com/your-username/edushare-frontend.git](https://github.com/your-username/edushare-frontend.git)
cd edushare-frontend

# Cài đặt các gói thư viện
npm install

```

### Bước 2: Cấu hình Biến môi trường (`.env`)

Tạo tệp `.env` tại thư mục gốc của dự án:

```env
VITE_API_BASE_URL=http://localhost:8000/api

```

### Bước 3: Khởi chạy ứng dụng ở môi trường Development

```bash
npm run dev

```

Ứng dụng sẽ chạy tại địa chỉ mặc định: `http://localhost:5173`

---

## ⚡ Các Luồng Xử Lý Đặc Bật (Highlighted Workflows)

### 1. Quy trình Kiểm duyệt & Khóa Bài Nộp (Submission Moderation & Lock)

1. Giảng viên gửi bài học mới hoặc gói tài liệu qua `CreateDynamicLesson.jsx` / `UploadMaterial.jsx`.
2. Trạng thái bài nộp chuyển thành `pending`.
3. Khi Admin bấm **Inspect & Review** trong `MaterialModeration.jsx`, API sẽ kích hoạt khóa (`lockMaterial`). Các Admin khác hoặc Giảng viên sẽ bị khóa nút thao tác/chỉnh sửa để tránh xung đột dữ liệu.
4. Admin sau khi duyệt (`Approve`) sẽ xuất bản tài liệu công khai lên hệ thống. Nút khóa tự động được giải phóng.

### 2. Quy trình Xử lý Bất đồng bộ File Bài Giảng (Async PPTX Processing)

1. Khi Giảng viên tải lên tệp đính kèm chuẩn `.pptx`, hệ thống gửi tệp đến Celery Worker qua API `uploadPPTXDocument`.
2. Frontend thực hiện Poll trạng thái (`getPPTXDocumentStatus`) mỗi 2 giây để cập nhật tiến độ chuyển đổi slide cho người dùng mà không gây hiện tượng Nginx 504 Gateway Timeout.
3. Khi Celery báo `completed`, gói tài liệu hoàn tất được lưu vào hệ thống.

---

## Giấy Phép (License)

Được phát triển phục vụ cho **Dự án Hệ thống Quản lý Tài liệu Học tập Số EduShare Platform**.
All rights reserved © 2026 **Firefly Academic Hub**.
