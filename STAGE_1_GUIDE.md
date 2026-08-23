# Hướng Dẫn Chi Tiết: Giai Đoạn 1 - Nền Tảng & IPC Bảo Mật

Chào mừng bạn đến với **Giai đoạn 1** trong lộ trình làm chủ Electron.js!

---

## 1. Kiến Trúc Đa Tiến Trình (Multi-Process Architecture)

Electron chia ứng dụng thành 2 môi trường tách biệt:

```
┌─────────────────────────────────────────────────────────────┐
│                 MAIN PROCESS (Node.js)                      │
│  - File: src/main.js                                        │
│  - Có toàn quyền truy cập OS (File System, RAM, CPU, v.v.)  │
│  - Quản lý vòng đời app (app) & cửa sổ (BrowserWindow)     │
│  - Lắng nghe yêu cầu qua: ipcMain.handle / ipcMain.on      │
└──────────────────────────────┬──────────────────────────────┘
                               │
               CẦU NỐI AN TOÀN (Preload Script)
               - File: src/preload.js
               - contextBridge.exposeInMainWorld('electronAPI', ...)
                               │
┌──────────────────────────────┴──────────────────────────────┐
│               RENDERER PROCESS (Chromium UI)                │
│  - Files: src/renderer/index.html, style.css, renderer.js   │
│  - Chỉ chạy JavaScript trình duyệt thuần                    │
│  - BỊ CÁCH LY hoàn toàn với Node.js để bảo mật              │
│  - Giao tiếp với Main qua: window.electronAPI               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Các Tiêu Chuẩn Bảo Mật Bắt Buộc (Electron Security)

Trong `src/main.js`, khi tạo `BrowserWindow`:
```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,  // BẮT BUỘC: Cô lập môi trường Renderer và Preload
  nodeIntegration: false,   // BẮT BUỘC: Không cho phép Renderer gọi trực tiếp require('fs')
  sandbox: true            // Bật sandbox Chromium
}
```

> **Tại sao không bật `nodeIntegration: true`?**
> Nếu bật `nodeIntegration: true`, bất kỳ mã độc hại (XSS) hoặc link web độc nào chạy trong Renderer cũng có thể gọi `require('child_process').exec('rm -rf /')` hoặc đọc trộm file trên máy tính người dùng.

---

## 3. Ba Kiểu Giao Tiếp IPC Bạn Cần Nhớ

### A. IPC 2 Chiều (Request $\leftrightarrow$ Response) - Dùng nhiều nhất
* **Renderer gửi & đợi kết quả**: `const data = await window.electronAPI.getSystemInfo()`
* **Preload bridge**: `getSystemInfo: () => ipcRenderer.invoke('system:get-info')`
* **Main xử lý & trả về**:
  ```javascript
  ipcMain.handle('system:get-info', async (event) => {
    return { platform: process.platform, ... };
  });
  ```

### B. IPC 1 Chiều (Renderer $\rightarrow$ Main: Fire-and-Forget)
* **Renderer gửi**: `window.electronAPI.pingMain('Hello!')`
* **Preload bridge**: `pingMain: (msg) => ipcRenderer.send('renderer:ping-main', msg)`
* **Main lắng nghe**:
  ```javascript
  ipcMain.on('renderer:ping-main', (event, msg) => {
    console.log('Nhận tin nhắn:', msg);
  });
  ```

### C. IPC 1 Chiều (Main $\rightarrow$ Renderer: Server-Push Event)
* **Main đẩy xuống**: `mainWindow.webContents.send('heartbeat-tick', { uptime: 10 })`
* **Preload bridge**: `onHeartbeat: (cb) => ipcRenderer.on('heartbeat-tick', (_e, val) => cb(val))`
* **Renderer đăng ký**:
  ```javascript
  window.electronAPI.onHeartbeat((data) => {
    console.log('Heartbeat từ Main:', data);
  });
  ```

---

## 4. Cách Khởi Chạy Ứng Dụng

Mở terminal tại thư mục này và chạy lệnh:
```bash
npm start
```
