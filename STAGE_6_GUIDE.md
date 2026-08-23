# 📚 Hướng Dẫn Chi Tiết: Giai Đoạn 6
# 🔄 Tự Động Cập Nhật (Auto-Update với electron-updater) & CI/CD Pipeline

Chào mừng bạn đến với **Giai đoạn 6**!

Trong giai đoạn này, bạn sẽ học cách biến ứng dụng Desktop của mình thành một sản phẩm thương mại thực thụ: **Tự động kiểm tra bản cập nhật mới, tải bản vá ngầm và tự nâng cấp phiên bản khi người dùng khởi động lại** (giống hệt cơ chế của VS Code, Discord, Slack, Telegram).

---

## 1. Lý Thuyết Cốt Lõi Về Cơ Chế Auto-Update

### A. Auto-Update Hoạt Động Như Thế Nào Dưới Nền?

Khi bạn xuất bản một phiên bản mới (ví dụ từ `v1.0.0` lên `v1.1.0`), công cụ `electron-builder` sẽ tạo ra 2 file quan trọng:
1. File cài đặt mới: `Electron-Masterclass-Setup-1.1.0.exe`
2. File metadata chỉ mục: **`latest.yml`** (chứa version `1.1.0`, mã SHA-512 kiểm tra tính toàn vẹn và dung lượng file).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MÁY CHỦ PHÁT HÀNH (GITHUB RELEASES / S3)           │
│  - latest.yml (Khai báo: Version mới nhất là 1.1.0, mã SHA-512)            │
│  - Electron-Masterclass-Setup-1.1.0.exe                                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ (1) Kiểm tra định kỳ latest.yml
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ỨNG DỤNG TRÊN MÁY NGƯỜI DÙNG (Đang chạy v1.0.0)          │
│                                                                             │
│  1. [checking-for-update] ──▶ Đọc latest.yml, thấy 1.1.0 > 1.0.0            │
│  2. [update-available]    ──▶ Báo cho UI: "Đã có bản cập nhật mới!"         │
│  3. [download-progress]   ──▶ Tự động tải ngầm file exe về thư mục tạm       │
│  4. [update-downloaded]   ──▶ Tải xong! Hiển thị nút "Khởi động lại ngay"   │
│  5. autoUpdater.quitAndInstall() ──▶ Tắt app v1.0.0, nâng cấp lên v1.1.0!   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### B. Vòng Đời Sự Kiện Của `electron-updater` (Lifecycle Events)

Thư viện `electron-updater` cung cấp một đối tượng `autoUpdater` với 6 sự kiện chính:

| Sự kiện | Ý nghĩa |
| :--- | :--- |
| **`checking-for-update`** | Đang gửi HTTP request lên máy chủ để đọc file `latest.yml`. |
| **`update-available`** | Phát hiện có phiên bản mới hơn phiên bản hiện tại. |
| **`update-not-available`** | Ứng dụng đã ở phiên bản mới nhất (không cần cập nhật). |
| **`download-progress`** | Bắn thông số tiến độ tải: `% hoàn thành`, `tốc độ (KB/s)`, `dung lượng đã tải`. |
| **`update-downloaded`** | Tải xong bản vá vào bộ nhớ tạm. Sẵn sàng cài đặt. |
| **`error`** | Xảy ra lỗi (mất mạng, URL không tồn tại, sai chữ ký SHA-512). |

---

## 2. Các Bước Cài Đặt & Cấu Hình

### A. Cài đặt thư viện:
```bash
npm install electron-updater
```

### B. Cấu hình `"publish"` trong `package.json`:
```json
"build": {
  "appId": "com.learning.electronmasterclass",
  "productName": "Electron Masterclass",
  "publish": {
    "provider": "github",
    "owner": "ten-tai-khoan-github-cua-ban",
    "repo": "electron-quickstart"
  }
}
```

### C. Tích hợp trong `src/main.js`:
```javascript
const { autoUpdater } = require('electron-updater');

// Cấu hình logging
autoUpdater.logger = console;
autoUpdater.autoDownload = true; // Tự động tải ngầm khi phát hiện bản mới

// Đăng ký các kênh IPC để Renderer có thể chủ động bấm "Kiểm tra cập nhật"
ipcMain.handle('updater:check', async () => {
  return await autoUpdater.checkForUpdates();
});

ipcMain.handle('updater:quit-and-install', () => {
  autoUpdater.quitAndInstall();
});
```

---

## 3. Tự Động Hóa CI/CD Với GitHub Actions

Mỗi khi bạn `git tag v1.1.0` và `git push origin main`, GitHub Actions sẽ:
1. Tự động bật máy ảo Windows, macOS, Ubuntu trên Cloud.
2. Chạy `npm run build`.
3. Chạy `electron-builder --publish always` để đóng gói và tự động upload file `.exe`, `.dmg`, `.deb` lên mục **GitHub Releases**!
