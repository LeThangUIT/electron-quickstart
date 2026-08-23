# 📚 Hướng Dẫn Chi Tiết: Giai Đoạn 5 - Bài 1
# 🚀 Thiết Lập Electron + Vite + React + TypeScript & Hot Module Replacement (HMR)

Chào mừng bạn đến với **Giai đoạn 5: Tích Hợp Frontend Framework Hiện Đại (React + Vite + TypeScript)**!

Đây là bước chuyển đổi quan trọng nhất từ lập trình HTML/JS thuần sang kiến trúc chuẩn doanh nghiệp (tương tự Slack, VS Code, Discord, Linear).

---

## 1. Lý Thuyết Cốt Lõi

### A. Vì Sao Chọn Cặp Đôi Electron + Vite + React?

1. **Hot Module Replacement (HMR)**:
   - Khi bạn chỉnh sửa bất kỳ Component React (`.tsx`) hoặc file CSS nào, giao diện trên cửa sổ Electron sẽ **cập nhật tức thì trong vài mili-giây** mà không làm reload lại trang, không làm mất dữ liệu người dùng đang nhập dở trong form!
2. **Quản lý State mạnh mẽ & Component Hóa**:
   - Thay vì thao tác DOM thủ công (`document.getElementById`, `appendChild`), React giúp quản lý state tập trung (`useState`, `useEffect`, `useContext`).
3. **Type-Safe IPC với TypeScript**:
   - Toàn bộ các kênh IPC (`window.electronAPI`) đều có kiểu dữ liệu chặt chẽ (`TypeScript Interfaces`). Gõ nhầm tên hàm hoặc truyền sai tham số sẽ bị báo lỗi đỏ ngay trong code editor.

---

### B. Kiến Trúc Hoạt Động (Dev Server vs Production Build)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. MÔI TRƯỜNG DEV (`npm run dev`)                                           │
│                                                                             │
│   [Vite Dev Server (Port 5173)] ────(HMR: localhost:5173)───▶ [Electron App]│
│   - Biên dịch React + TS tức thì                              (BrowserWindow│
│   - Hot Reload UI sau 5ms                                    nạp Dev URL)   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. MÔI TRƯỜNG PRODUCTION / ĐÓNG GÓI (`npm run build` -> `npm run dist`)     │
│                                                                             │
│   [Vite Build] ────▶ [dist/renderer/index.html] ────▶ [Electron Main]       │
│   - Nén nhỏ, bundle CSS/JS                             (loadFile từ đĩa)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Kế Hoạch Cài Đặt & Cấu Trúc Thư Mục

### A. Danh sách các Package cần cài đặt:

```bash
npm install react react-dom lucide-react
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node concurrently wait-on cross-env
```

### B. Cấu trúc thư mục mới:

```
electron-quickstart/
├── src/
│   ├── main.js                  # Main Process (Hỗ trợ cả URL Dev server và file tĩnh Production)
│   ├── preload.js               # Preload Bridge an toàn
│   ├── preload.d.ts             # Type Definitions cho window.electronAPI (Type-Safe)
│   └── renderer/                # Ứng Dụng React + TypeScript
│       ├── index.html           # HTML gốc của Vite
│       ├── vite.config.ts       # Cấu hình Vite
│       ├── tsconfig.json        # Cấu hình TypeScript
│       └── src/
│           ├── main.tsx         # Entry point React
│           ├── App.tsx          # Component trung tâm ứng dụng
│           ├── index.css        # CSS Glassmorphism hiện đại
│           └── components/      # Các UI Components (Titlebar, Tabs, Dashboard, Notes, Broadcast)
├── package.json
└── LEARNING_PROGRESS.md
```

---

## 3. Kịch Bản Vận Hành Trong `package.json`

Chúng ta sẽ thiết lập 2 lệnh chính:

* **`npm run dev`**: Chạy đồng thời Vite Dev Server trên port 5173, đợi server sẵn sàng (`wait-on`) rồi tự động mở cửa sổ Electron kết nối trực tiếp với Vite HMR!
* **`npm run build`**: Biên dịch React TS thành file tĩnh trong thư mục `dist/renderer`.
