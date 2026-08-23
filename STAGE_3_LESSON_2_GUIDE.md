# 📚 Hướng Dẫn Chi Tiết: Giai Đoạn 3 - Bài 2: Lưu Trữ Dữ Liệu Local & Ghi Nhớ Trạng Thái

Chào mừng bạn đến với **Giai đoạn 3 - Bài 2** trong lộ trình làm chủ Electron.js!

Trong bài học này, bạn sẽ học cách lưu trữ dữ liệu bền vững (Persistent Storage), quản lý cấu hình người dùng, và tự động khôi phục vị trí/kích thước cửa sổ (**Window State Restoration**) khi tắt/mở ứng dụng.

---

## 1. Lý Thuyết Cốt Lõi

### A. Tại sao KHÔNG ĐƯỢC lưu file dữ liệu vào thư mục mã nguồn (`__dirname`)?

Nhiều người mới học thường dùng `path.join(__dirname, 'config.json')` để lưu dữ liệu. **Đây là lỗi nghiêm trọng khi đưa ứng dụng vào thực tế!**

1. **Khi đóng gói thành file cài đặt (`.exe` / `.dmg`)**: Toàn bộ mã nguồn thư mục app sẽ bị nén thành 1 file duy nhất gọi là **`app.asar`**. File này là file lưu trữ **CHỈ ĐỌC (Read-only)**, Node.js `fs.writeFile` sẽ báo lỗi `EROFS: read-only file system`.
2. **Quyền ghi (Permission)**: Thư mục `C:\Program Files\<App>` trên Windows yêu cầu quyền Administrator mới được ghi file, ứng dụng bình thường sẽ bị từ chối truy cập.

---

### B. Vị Trí Lưu Trữ Chuẩn Của Hệ Điều Hành (`app.getPath('userData')`)

Electron cung cấp API `app.getPath('userData')` để lấy đường dẫn thư mục lưu trữ an toàn do hệ điều hành cấp phát riêng cho từng ứng dụng:

* 🪟 **Windows**: `C:\Users\<TênUser>\AppData\Roaming\<TênApp>\`
* 🍎 **macOS**: `~/Library/Application Support/<TênApp>/`
* 🐧 **Linux**: `~/.config/<TênApp>/`

> Dữ liệu được lưu trong `userData` sẽ **không bao giờ bị mất** khi bạn cập nhật phiên bản mới của ứng dụng!

---

### C. Cơ Chế Ghi Nhớ Kích Thước & Vị Trí Cửa Sổ (Window Bounds Persistence)

Một ứng dụng Desktop chuyên nghiệp phải luôn ghi nhớ:
- Người dùng đã kéo cửa sổ to/nhỏ bao nhiêu?
- Người dùng đặt cửa sổ ở góc nào trên màn hình?

#### 1. Lắng nghe khi người dùng thay đổi kích thước/vị trí:
```javascript
const saveBounds = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // mainWindow.getBounds() trả về: { x: 100, y: 150, width: 1200, height: 800 }
    store.set('windowBounds', mainWindow.getBounds());
  }
};

mainWindow.on('resize', saveBounds);
mainWindow.on('move', saveBounds);
```

#### 2. Khôi phục khi khởi động ứng dụng:
```javascript
function createWindow() {
  const savedBounds = store.get('windowBounds') || { width: 1000, height: 720 };

  mainWindow = new BrowserWindow({
    x: savedBounds.x,
    y: savedBounds.y,
    width: savedBounds.width,
    height: savedBounds.height,
    // ...
  });
}
```

---

## 2. Kiến Trúc Lớp `Store` Trong Dự Án ([src/store.js](file:///c:/Users/Admin/Documents/Learning/electron-quickstart/src/store.js))

Chúng ta đã đóng gói toàn bộ logic đọc/ghi file JSON vào class `Store`:

```javascript
const Store = require('./store');

// Khởi tạo Store với giá trị mặc định
const store = new Store({
  configName: 'app-settings',
  defaults: {
    username: 'Electron Explorer',
    theme: 'theme-default',
    fontSize: 'font-md',
    windowBounds: { width: 1000, height: 720 }
  }
});

// Đọc dữ liệu
const currentTheme = store.get('theme');

// Ghi dữ liệu xuống ổ đĩa ngay lập tức
store.set('theme', 'theme-cyberpunk');
```

---

## 3. Các Bước Thực Hành Trải Nghiệm

Khởi động ứng dụng bằng lệnh:
```bash
npm start
```

### 🧪 Thí nghiệm 1: Kiểm tra ghi nhớ vị trí và kích thước cửa sổ
1. Kéo dãn cửa sổ `MainWindow` to ra toàn màn hình hoặc kéo sang góc phải màn hình.
2. Tắt ứng dụng hoàn toàn (Chuột phải vào Tray $\rightarrow$ chọn **Thoát hoàn toàn** hoặc bấm `Ctrl+Q`).
3. Chạy lại `npm start` $\rightarrow$ **Quan sát**: Cửa sổ tự động mở đúng vị trí và kích thước bạn đã kéo lần trước!

---

### 🧪 Thí nghiệm 2: Kiểm tra lưu trữ cấu hình người dùng
1. Bấm nút **⚙️ Cài Đặt** $\rightarrow$ Đổi tên thành tên của bạn $\rightarrow$ Chọn Theme **Emerald Forest** hoặc **Sunset** $\rightarrow$ Bấm **💾 Áp Dụng & Đồng Bộ**.
2. Tắt ứng dụng hoàn toàn (`Ctrl+Q`).
3. Chạy lại `npm start` $\rightarrow$ **Quan sát**: Ứng dụng tự động tải Theme và Tên người dùng của bạn ngay từ giây đầu tiên mà không bị reset về mặc định!

---

### 🧪 Thí nghiệm 3: Xem file JSON vật lý trên máy tính
1. Tại Section 6 trên Cửa sổ chính, bấm nút **📁 Mở File Config Trên Ổ Đĩa (JSON Store)**.
2. File Explorer sẽ mở ra thư mục `AppData\Roaming\com.electron.roadmap\` và bôi đen file `app-settings.json`.
3. Mở file `app-settings.json` bằng Notepad để xem toàn bộ dữ liệu cấu hình đã được lưu trữ bền vững!
