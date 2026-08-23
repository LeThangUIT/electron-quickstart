# 📚 Hướng Dẫn Chi Tiết: Giai Đoạn 4 - Bài 2
# 📡 Cơ Chế IPC Broadcast, Tab-to-Tab Messaging & Khôi Phục Session Tab

Chào mừng bạn đến với **Giai đoạn 4 - Bài 2**!

Trong bài học này, bạn sẽ làm chủ 3 kỹ thuật cốt lõi trong các ứng dụng đa tab chuyên nghiệp (như Chrome, Slack, VS Code, Discord):
1. **Cơ chế IPC Broadcast (Phát sóng đồng loạt)**: Main Process gửi thông điệp tới **tất cả** các tab/cửa sổ đang mở cùng lúc.
2. **Giao tiếp liên tab (Tab-to-Tab IPC)**: Các tab có thể nhắn tin hoặc truyền dữ liệu qua lại thời gian thực (Realtime Event Hub).
3. **Đồng bộ Theme & Cài đặt Realtime trên toàn bộ các Tab**.
4. **Khôi phục phiên làm việc (Tab Session Persistence)**: Tự động ghi nhớ các tab đang mở và khôi phục khi mở lại app.

---

## 1. Lý Thuyết Cốt Lõi

### A. IPC Broadcast là gì?

Trong các bài trước:
* IPC 1-chiều (`send` $\rightarrow$ `on`): Chỉ gửi từ 1 Renderer lên Main.
* IPC 2-chiều (`invoke` $\rightarrow$ `handle`): Renderer hỏi $\rightarrow$ Main trả lời trực tiếp cho riêng Renderer đó.
* Main $\rightarrow$ 1 Renderer (`mainWindow.webContents.send`): Chỉ gửi tới cửa sổ chính.

> ❓ **Vấn đề đặt ra:** Khi người dùng đổi Theme trong Cửa sổ Cài Đặt hoặc một Tab cập nhật dữ liệu, làm sao để **Tab Ghi Chú, Tab Dashboard và các Tab khác** đều nhận được thông báo để đổi màu giao diện đồng bộ?

✅ **Giải pháp chuẩn:** **IPC Broadcast**
Main Process sẽ duyệt qua tất cả các `webContents` đang mở trong ứng dụng và phát tán dữ liệu:

```
                          ┌────────────────────────┐
                          │ MAIN PROCESS (main.js) │
                          │   (Trung Tâm Phát Sóng)│
                          └───────────┬────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │ wc.send('broadcast:msg')    │ wc.send('broadcast:msg')    │ wc.send('broadcast:msg')
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ 🏠 Dashboard  │             │ 📝 Tab Notes  │             │ ⚙️ Settings   │
│ (Host Window) │             │ (WebContents) │             │ (Modal Window)│
└───────────────┘             └───────────────┘             └───────────────┘
```

---

### B. Hai Cách Duyệt Tất Cả WebContents Trong Electron

#### Cách 1: Dùng API có sẵn của Electron `webContents.getAllWebContents()`
```javascript
const { webContents } = require('electron');

function broadcastToAll(channel, payload) {
  const allContents = webContents.getAllWebContents();
  allContents.forEach((wc) => {
    if (!wc.isDestroyed()) {
      wc.send(channel, payload);
    }
  });
}
```

#### Cách 2: Duyệt qua danh sách Tab Map do ta tự quản lý
```javascript
function broadcastToTabs(channel, payload) {
  // Gửi tới MainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
  // Gửi tới từng WebContentsView trong Map tabs
  tabs.forEach((tab) => {
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send(channel, payload);
    }
  });
}
```

---

### C. Khôi Phục Phiên Tab (Tab Session Restoration)

Khi người dùng mở 3 tab (ví dụ: Dashboard, Notes, GitHub) rồi tắt ứng dụng:
1. Trước khi thoát (`app.on('before-quit')` hoặc mỗi khi thêm/đóng tab), ta trích xuất danh sách các Tab (loại trừ các tab tạm) và lưu vào `store` (`app-settings.json` trong `userData`).
2. Khi khởi động ứng dụng (`createWindow`), Main Process đọc danh sách `savedTabs` từ store và tự động mở lại chính xác các tab đó!

---

## 2. Bản Thiết Kế Chi Tiết & Hướng Dẫn Code Từng File

### 📁 File 1: `src/preload.js`
Bổ sung các API Broadcast:
```javascript
// Giao tiếp liên Tab & Broadcast (Giai đoạn 4 - Bài 2)
broadcastMessage: (message) => ipcRenderer.invoke('tab:broadcast-message', message),
onBroadcastMessage: (callback) => {
  const subscription = (_event, data) => callback(data);
  ipcRenderer.on('tab:broadcast-received', subscription);
  return () => ipcRenderer.removeListener('tab:broadcast-received', subscription);
},
```

---

### 📁 File 2: `src/main.js`
1. **Hàm phát tán `broadcastToAllTabs(channel, payload)`**:
   ```javascript
   function broadcastToAllTabs(channel, payload) {
     if (mainWindow && !mainWindow.isDestroyed()) {
       mainWindow.webContents.send(channel, payload);
     }
     if (settingsWindow && !settingsWindow.isDestroyed()) {
       settingsWindow.webContents.send(channel, payload);
     }
     tabs.forEach((tab) => {
       if (tab.view && !tab.view.webContents.isDestroyed()) {
         tab.view.webContents.send(channel, payload);
       }
     });
   }
   ```

2. **Cập nhật kênh `settings:save`**: Khi cấu hình đổi, dùng `broadcastToAllTabs('settings:updated', updatedSettings)` để tất cả các tab (cả `notes.html`) đều đổi theme!

3. **IPC kênh Tab-to-Tab messaging**:
   ```javascript
   ipcMain.handle('tab:broadcast-message', (event, message) => {
     const senderTab = Array.from(tabs.values()).find(t => t.view && t.view.webContents.id === event.sender.id);
     const senderName = senderTab ? senderTab.title : 'Dashboard';
     
     const payload = {
       sender: senderName,
       text: message,
       timestamp: new Date().toLocaleTimeString('vi-VN')
     };
     
     broadcastToAllTabs('tab:broadcast-received', payload);
     return { success: true };
   });
   ```

4. **Lưu & Khôi phục Session Tab**:
   * Khi thêm / đóng tab $\rightarrow$ gọi `saveTabSession()`.
   * Khi `createWindow()` $\rightarrow$ gọi `restoreTabSession()`.

---

### 📁 File 3: `src/renderer/notes.html`
Thêm tính năng Chat / Broadcast Inter-Tab trực tiếp trong Tab Ghi Chú và tự động đồng bộ theme khi người dùng đổi cài đặt!
