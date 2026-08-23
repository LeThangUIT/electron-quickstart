# 📌 NHẬT KÝ TIẾN ĐỘ HỌC ELECTRON.JS (LEARNING PROGRESS)

> **Cập nhật lần cuối**: Ngày 20/08/2026  
> **Dự án**: `electron-quickstart`  
> **Lộ trình gốc**: `electron_learning_roadmap.md`

---

## 🏁 Trạng Thái Hiện Tại: ĐÃ HOÀN THÀNH TOÀN BỘ GIAI ĐOẠN 3 (100%) 🎉

### ✅ Những Kiến Thức & Bài Tập Đã Hoàn Thành
- [x] **Giai đoạn 1: Nền Tảng & IPC Bảo mật** (Đa tiến trình, Preload, contextBridge, 3 luồng IPC).
- [x] **Giai đoạn 2 - Bài 1**: Menu Bar (`Menu`), Chuột phải (`context-menu`), Phím tắt toàn cục (`globalShortcut`).
- [x] **Giai đoạn 2 - Bài 2**: Khay hệ thống (`Tray`), Minimize to Tray, Chạy ngầm (`isQuitting`).
- [x] **Giai đoạn 2 - Bài 3**: Hộp thoại Native (`dialog`), Đọc/Ghi file vật lý với `fs.promises`.
- [x] **Giai đoạn 2 - Bài 4**: Native Notification, Module `shell` (`showItemInFolder`, `openExternal`, `beep`).
- [x] **Giai đoạn 3 - Bài 1**:
  - [x] Quản lý Đa Cửa Sổ (**Multi-Window & Modal Window**): Thuộc tính `parent`, `modal: true`.
  - [x] Kỹ thuật chống nháy trắng **`ready-to-show`** (`show: false`).
  - [x] Giao tiếp thời gian thực 2 chiều giữa 2 cửa sổ (**Window-to-Window IPC** qua Main Process).
- [x] **Giai đoạn 3 - Bài 2**:
  - [x] **Lưu trữ dữ liệu bền vững (Persistent Data Storage)**: Hiểu rõ lý do vì sao không lưu vào `__dirname` (Read-only asar) mà phải dùng `app.getPath('userData')` (`AppData/Roaming/...`).
  - [x] **Ghi nhớ kích thước & vị trí cửa sổ (Window Bounds State Restoration)**: Tự động lưu và khôi phục khi tắt/mở ứng dụng.
  - [x] Xây dựng module `Store` quản lý cấu hình JSON tự động.
- [x] **Giai đoạn 3 - Bài 3**:
  - [x] **Cửa sổ không viền (Frameless Window) & Custom Titlebar**:
    - Cấu hình `frame: false` trong `BrowserWindow`.
    - Tự dựng thanh Titlebar tùy biến bằng HTML/CSS.
    - Xử lý vùng kéo thả cửa sổ với `-webkit-app-region: drag` và các nút tương tác với `-webkit-app-region: no-drag`.
    - Điều khiển cửa sổ (Thu nhỏ, Phóng to cực đại / Khôi phục, Đóng) qua IPC 2 chiều.
    - Lắng nghe sự kiện `maximize` / `unmaximize` để tự động đổi icon `▢` $\leftrightarrow$ `❐`.
- [x] **Giai đoạn 3 - Bài 4**:
  - [x] **Đóng gói & Tạo file cài đặt (.exe) với `electron-builder`**:
    - Hiểu cơ chế nén `app.asar` (Read-Only) và binary bundling.
    - Cấu hình chuẩn `package.json` (`appId`, `productName`, `directories`, `files`, `nsis`).
    - Phân biệt `dependencies` vs `devDependencies` để tối ưu dung lượng bộ cài.
    - Xuất bản thành công file cài đặt chuyên nghiệp: `dist/Electron Masterclass Setup 1.0.0.exe`.

---

## 🗺️ LỘ TRÌNH CÁC GIAI ĐOẠN TIẾP THEO (UPCOMING ROADMAP)

### 📑 Giai Đoạn 4: Quản Lý Đa Tab (Multi-Tab Như Chrome) & IPC Broadcast (100% Hoàn Thành 🎉)
- [x] **Bài 1**: **Kiến trúc Quản lý Đa Tab (Multi-Tab Architecture như Chrome / VS Code)**:
  - [x] Sử dụng **`WebContentsView`** (chuẩn hiện đại của Electron 30+) để nhúng nhiều Tab độc lập trong cùng một cửa sổ chính.
  - [x] Tự code thanh **Tab Bar & Address Bar** bằng HTML/CSS: Thêm tab mới (`+`), chuyển đổi qua lại giữa các tab (Active Tab), đóng tab (`✕`), điều hướng URL (`loadURL`, `goBack`, `goForward`, `reload`).
  - [x] Quản lý kích thước và vị trí (Bounds) của từng Tab View tự động co giãn (`updateActiveTabBounds`) theo cửa sổ.
- [x] **Bài 2**: **Cơ chế IPC Broadcast & Trao đổi dữ liệu thời gian thực giữa các Tab**:
  - [x] Cơ chế **IPC Broadcast**: Main Process phát tán sự kiện/thông điệp đồng loạt đến **TẤT CẢ các tab đang mở**.
  - [x] Giao tiếp giữa các Tab (**Tab-to-Tab IPC**): Khi một Tab gửi tin nhắn, tất cả các Tab khác lập tức nhận được và hiển thị realtime trên Broadcast Feed.
  - [x] Đồng bộ Theme & Cài đặt tự động qua IPC Broadcast trên toàn bộ các Tab nội bộ (`notes.html`).
  - [x] Ghi nhớ và khôi phục danh sách các Tab đang mở (**Persistent Tab Session**) khi khởi động lại ứng dụng.

### 🚀 Giai Đoạn 5: Tích Hợp Frontend Framework Hiện Đại (React + Vite + TypeScript) (100% Hoàn Thành 🎉)
- [x] **Bài 1**: Thiết lập **Electron + Vite + React 18/19 + TypeScript** với tính năng **Hot Module Replacement (HMR)** (cập nhật UI tức thì khi code JSX/CSS).
- [x] **Bài 2**: Tích hợp **TypeScript** toàn diện với file `src/preload.d.ts` $\rightarrow$ **Type-Safe IPC** (gợi ý IntelliSense và kiểm tra kiểu dữ liệu 100% cho `window.electronAPI`).
- [x] **Bài 3**: *(Bỏ qua theo yêu cầu - Đã nắm vững React Components)*

### 🔄 Giai Đoạn 6: Tự Động Cập Nhật (Auto-Update) & CI/CD Pipeline (100% Hoàn Thành 🎉)
- [x] **Bài 1**: Tích hợp **`electron-updater`** kết nối với **GitHub Releases** (`LeThangUIT/electron-quickstart`).
- [x] **Bài 2**: Kiểm tra phiên bản mới, tải bản cập nhật ngầm và hiển thị popup yêu cầu khởi động lại để cập nhật (`UpdateCard.tsx`).
- [x] **Bài 3**: Tự động hóa quy trình đóng gói đa nền tảng (**Windows `.exe`, macOS `.dmg`, Linux `.deb`**) qua **GitHub Actions CI/CD** (`.github/workflows/build-and-release.yml`).

### ⚡ Giai Đoạn 7: Xử Lý Tác Vụ Nặng, Tối Ưu Hiệu Năng & Native Addons
- [ ] **Bài 1**: Xử lý đa luồng với **Worker Threads (`worker_threads`)** & **Utility Process** (tránh làm đơ giao diện khi xử lý tác vụ nặng).
- [ ] **Bài 2**: Tối ưu bộ nhớ, phòng chống Memory Leak và tăng tốc thời gian khởi động ứng dụng (Cold Start).
- [ ] **Bài 3**: **Native Addons & Nhúng mã nguồn C++ / Rust qua Node-API (N-API / napi-rs)**:
  - Hiểu bản chất file nhị phân `.node` (biên dịch từ C++/Rust để chạy trực tiếp trên CPU).
  - Tối ưu các thuật toán mã hóa, nén dữ liệu hoặc xử lý hình ảnh/video tốc độ cao.

### 🛡️ Giai Đoạn 8: Bảo Mật Ứng Dụng Chuyên Sâu
- [ ] **Bài 1**: Mã hóa token/mật khẩu với module **`safeStorage`** (tích hợp Windows DPAPI / macOS Keychain).
- [ ] **Bài 2**: Bảo vệ mã nguồn: Chống Reverse Engineering, làm rối code (**Code Obfuscation**), bảo vệ file `app.asar`.
- [ ] **Bài 3**: Cấu hình Content Security Policy (CSP) nâng cao & phòng chống tấn công XSS/RCE.

### 💼 Giai Đoạn 9: Dự Án Thực Chiến Toàn Diện (Capstone Projects)
- [ ] **Dự án 1**: Chat & Voice Desktop App (tương tự Discord/Slack thu nhỏ với WebSocket + WebRTC).
- [ ] **Dự án 2**: Markdown Knowledge Base (tương tự Notion/Obsidian thu nhỏ với SQLite local + Full-text search).
- [ ] **Dự án 3**: System Performance Monitor (giám sát CPU/RAM/GPU thời gian thực và dọn dẹp hệ thống).



