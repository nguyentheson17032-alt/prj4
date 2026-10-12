# PlayZone - Nền Tảng Thuê Player & Idol Duo Game

Hệ thống kết nối người chơi game (Player/Idol Duo) và khách hàng thuê dịch vụ trò chuyện, leo rank trực tuyến.

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Java 17** / **Spring Boot 3.2.3**
- **Spring Security** + **JWT Authentication** (Hỗ trợ Blacklist Token & phân quyền USER, PLAYER, ADMIN)
- **Spring Data JPA** / **PostgreSQL**
- **WebSocket & REST APIs** cho tin nhắn, quản lý đơn thuê (Order) và quản trị hệ thống

### Frontend
- **React 19** + **Vite**
- **React Router v7**
- **Axios** (kết nối REST API, quản lý token tự động)
- **Lucide React** (Bộ biểu tượng hiện đại)
- **Canvas Confetti** (Hiệu ứng tương tác UI)

---

## 🚀 Các Tính Năng Chính

1. **Hệ Thống Đặt Thuê (Order Management)**:
   - Thuê Idol leo rank, trò chuyện theo giờ.
   - Luồng trạng thái đơn hoàn chỉnh: `PENDING` ➔ `CONFIRMED` ➔ `COMPLETED` / `CANCELED` / `REJECTED`.
   - Phân quyền thao tác giữa Người thuê (Renter), Idol (Player) và Quản trị viên (Admin).
   - Tự động cộng tiền ví, tạo bản ghi giao dịch (Payment).

2. **Hệ Thống Tin Nhắn Trực Tiếp (Real-time & Polling Chat)**:
   - Danh sách cuộc trò chuyện tự động cập nhật, hiển thị avatar, tin nhắn cuối và số tin chưa đọc.
   - Hỗ trợ chuyển hướng trò chuyện trực tiếp từ Card Player, Trang Chi Tiết Player, hoặc Đơn Hàng.
   - Tự động đánh dấu đã đọc (`markAllMessagesAsRead`).

3. **Đăng Ký & Xét Duyệt Hồ Sơ Idol (Player Registration Flow)**:
   - Form đăng ký từng bước trực quan (Chọn game, thông tin cá nhân, hình ảnh, bio).
   - Validation dữ liệu chặt chẽ ở cả Frontend và Backend.
   - Quản trị viên duyệt / từ chối hồ sơ kèm lý do tại trang Quản trị (`AdminPage`).

4. **Quản Lý Game & Khuyến Mãi (Admin Portal)**:
   - Quản trị viên thêm game mới (MOBA, FPS, RPG,...), quản lý danh sách Game Player và Voucher.

---

## ⚙️ Cài Đặt & Chạy Thử

### Backend
```bash
cd Backend
mvn clean spring-boot:run
```
Backend chạy mặc định tại: `http://localhost:8080`

### Frontend
```bash
cd FrontendWeb
npm install
npm run dev
```
Frontend chạy mặc định tại: `http://localhost:5173`
