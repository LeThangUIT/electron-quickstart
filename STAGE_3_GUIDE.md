# 📚 Hướng Dẫn Chi Tiết: Giai Đoạn 3 - Bài 1: Đa Cửa Sổ & Giao Tiếp Realtime

Chào mừng bạn đến với **Giai đoạn 3: Quản Lý Cửa Sổ Phức Tạp, Cấu Hình & Đóng Gói Ứng Dụng**!

Trong bài học này, bạn sẽ học cách quản lý nhiều `BrowserWindow`, thiết lập cửa sổ con dạng **Modal**, kỹ thuật hiển thị chống nháy trắng **`ready-to-show`**, và cách truyền dữ liệu thời gian thực giữa hai cửa sổ riêng biệt (**Window-to-Window IPC**).

---

## 1. Lý Thuyết Cốt Lõi

### A. Tại sao cần Multi-Window trong Electron?
Trong hầu hết ứng dụng Desktop chuyên nghiệp (như VS Code, Slack, Spotify, Discord), bạn luôn có:
- **Cửa sổ chính (MainWindow)**: Nơi chứa không gian làm việc chính.
- **Cửa sổ Cài đặt (Settings / Preferences Window)**: Chỉnh sửa cấu hình người dùng.
- **Cửa sổ Giới thiệu (About Window)**: Xem thông tin phiên bản.
- **Cửa sổ Xem trước (Preview / Quick Look Window)**: Mở nhanh tài liệu/ảnh.

---

### B. Cửa Sổ Con (Child Window) & Cửa Sổ Modal (`parent` & `modal`)

Khi tạo cửa sổ mới trong `main.js`:
```javascript
const settingsWindow = new BrowserWindow({
  width: 500,
  height: 580,
  parent: mainWindow,  // 1. Chỉ định MainWindow là cửa sổ cha
  modal: true,         // 2. Khóa không cho người dùng click vào cửa sổ cha khi con đang mở
  show: false          // 3. Không hiện ngay để tránh nháy trắng
});
```

* **`parent: mainWindow`**: Khi thu nhỏ (minimize) hoặc di chuyển cửa sổ cha, cửa sổ con sẽ đi theo và luôn nằm trên cửa sổ cha.
* **`modal: true`**: Đóng vai trò như một hộp thoại bắt buộc người dùng tương tác xong hoặc bấm Đóng trước khi quay lại cửa sổ chính.

---

### C. Kỹ Thuật Chống Nháy Trắng (`ready-to-show`)

> ⚠️ **Vấn đề thường gặp:** Nếu bạn khởi tạo cửa sổ với `show: true` (mặc định), người dùng sẽ thấy một khung hình chữ nhật màu trắng lóe lên trong vài mili-giây trước khi file HTML/CSS được load xong. Điều này khiến ứng dụng trông rất thiếu chuyên nghiệp!

✅ **Giải pháp chuẩn:**
```javascript
const win = new BrowserWindow({
  show: false, // 1. Giấu cửa sổ đi khi đang tải tài nguyên
  backgroundColor: '#090d16'
});

// 2. Lắng nghe sự kiện 'ready-to-show' (khi trang đã vẽ xong khung hình đầu tiên)
win.once('ready-to-show', () => {
  win.show(); // 3. Lúc này mới hiển thị mượt mà
});
```

---

### D. Kiến Trúc Giao Tiếp Giữa 2 Cửa Sổ (Window-to-Window IPC)

Mỗi cửa sổ trong Electron là một **Renderer Process độc lập** chạy trong Sandbox riêng biệt. Chúng **không thể** truy cập DOM hoặc biến JavaScript của nhau.

Để truyền dữ liệu từ Cửa sổ Cài đặt sang Cửa sổ Chính, chúng ta sử dụng **Main Process làm trung tâm điều phối (Event Hub)**:

```
┌────────────────────────────────┐
│   CỬA SỔ CÀI ĐẶT (Settings)    │
│  - Người dùng chọn Theme mới   │
│  - window.electronAPI.save()   │
└───────────────┬────────────────┘
                │  (1) ipcRenderer.invoke('settings:save', data)
                ▼
┌────────────────────────────────┐
│     MAIN PROCESS (main.js)     │
│  - Lưu dữ liệu cấu hình        │
│  - mainWindow.webContents.send │
└───────────────┬────────────────┘
                │  (2) ipcMain phát tán 'settings:updated'
                ▼
┌────────────────────────────────┐
│     CỬA SỔ CHÍNH (MainWindow)  │
│  - window.electronAPI.onConfig │
│  - Đổi ngay màu nền CSS        │
└────────────────────────────────┘
```

---

## 2. Các File Đã Được Xây Dựng

1. **[src/renderer/settings.html](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/settings.html)**: Giao diện Modal Cài đặt (Chọn theme Slate, Cyberpunk, Emerald, Sunset; Đổi tên; Đổi cỡ chữ).
2. **[src/renderer/settings.css](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/settings.css)**: Thiết kế Glassmorphism và hiệu ứng chọn Theme.
3. **[src/renderer/settings.js](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/settings.js)**: Lấy cấu hình ban đầu & gửi dữ liệu cấu hình mới về Main.
4. **[src/preload.js](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/preload.js)**: Cầu nối an toàn cho `openSettings`, `saveSettings`, `onSettingsChanged`.
5. **[src/main.js](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/main.js)**: Quản lý vòng đời `settingsWindow`, hàm `createSettingsWindow()` và luồng phát tán dữ liệu.
6. **[src/renderer/renderer.js](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/renderer.js)**: Xử lý đổi theme và cập nhật Profile trên Cửa sổ Chính realtime.

---

## 3. Các Bước Thực Hành Trải Nghiệm

Mở terminal tại thư mục dự án và chạy:
```bash
npm start
```

### 🧪 Bài Thực Hành 1: Mở Modal Cài Đặt
1. Bạn có thể mở Cài đặt bằng 3 cách:
   - Cách 1: Bấm nút **⚙️ Cài Đặt** ở góc trên thanh Header.
   - Cách 2: Bấm nút **⚙️ Mở Cửa Sổ Cài Đặt** tại Card Mục 6 ở giữa màn hình.
   - Cách 3: Dùng phím tắt hệ thống `Ctrl+,` (hoặc vào menu `Tệp` $\rightarrow$ `Cài đặt ứng dụng...`).
2. Quan sát: Cửa sổ Cài đặt mở lên ở giữa màn hình, hoàn toàn không bị nháy trắng nhờ `ready-to-show`.

### 🧪 Bài Thực Hành 2: Kiểm Tra Cơ Chế Modal
1. Khi Cửa sổ Cài đặt đang mở, hãy thử click chuột vào Cửa sổ Chính phía sau.
2. Bạn sẽ thấy Windows phát âm thanh cảnh báo hoặc không cho click vào Cửa sổ Chính cho tới khi đóng Modal Cài đặt $\rightarrow$ Đây chính là tác dụng của `modal: true` & `parent: mainWindow`.

### 🧪 Bài Thực Hành 3: Đồng Bộ Theme Thời Gian Thực (Live Sync)
1. Trong cửa sổ Cài đặt:
   - Đổi tên hiển thị thành tên của bạn (Ví dụ: `Antigravity Master`).
   - Chọn Theme **Cyberpunk Neon** (Màu tím hồng) hoặc **Emerald Forest** (Xanh lục ngọc).
   - Chọn Cỡ chữ **Lớn (16px)**.
2. Bấm nút **💾 Áp Dụng & Đồng Bộ**.
3. **Quan sát Cửa sổ Chính phía sau**:
   - Toàn bộ màu nền, màu viền các Card và màu gradient của Cửa sổ Chính chuyển sang Theme mới **ngay lập tức**!
   - Tên người dùng trên thanh Header và ô Thông tin cập nhật tức thì.
   - Hộp nhật ký (Terminal Box) ghi nhận thông báo `[Window-to-Window IPC] Nhận cấu hình mới từ Settings Modal`.

---

## 💡 Thử Thách Mở Rộng (Code Challenge)

Hãy thử sức với bài tập nâng cao sau để hiểu sâu hơn:

> **Thử thách**: Thêm một Theme mới tên là **"Matrix Hacker"** (với màu nền đen tuyền `#000000` và màu chữ xanh lá dạ quang `#22c55e`).
> 
> **Gợi ý các bước**:
> 1. Mở [settings.html](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/settings.html), thêm 1 radio button với `value="theme-matrix"`.
> 2. Mở [settings.css](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/settings.css), thêm CSS cho preview dot của theme Matrix.
> 3. Mở [style.css](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/style.css), thêm `body.theme-matrix { --bg-color: #000; --accent-cyan: #22c55e; ... }`.
> 4. Mở [renderer.js](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/renderer/renderer.js), thêm nhãn hiển thị cho `theme-matrix` trong `themeLabels`.
