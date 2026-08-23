# 📚 Hướng Dẫn Tự Thực Hành: Giai Đoạn 4 - Bài 1
# 📑 Kiến Trúc Quản Lý Đa Tab (Multi-Tab với WebContentsView)

---

## 1. Lý Thuyết Cốt Lõi: Bản Chất Đa Tab Trong Electron

### A. Sự Tiến Hóa Của Các Giải Pháp Nhúng Web Trong Electron
Khi xây dựng một ứng dụng đa tab (như Google Chrome, Arc, Brave hay VS Code), Electron đã trải qua 3 thế hệ kiến trúc:

| Thế hệ | Công nghệ | Đánh giá | Trạng thái hiện nay |
| :--- | :--- | :--- | :--- |
| **1 (Cũ)** | `<webview>` tag | Dùng như thẻ HTML, nặng nề, bảo mật kém, khó kiểm soát | ❌ **Không khuyến nghị** |
| **2 (Trung gian)** | `BrowserView` | Chạy native, tách biệt renderer, nhưng không linh hoạt theo cây phân cấp View | ⚠️ **Deprecated (Đã ngừng phát triển)** |
| **3 (Chuẩn hiện đại)** | **`WebContentsView`** (Electron 30+) | Kế thừa hệ thống `View` phân cấp của Chromium, cực kỳ mượt mà, tối ưu tài nguyên | ✅ **Chuẩn chính thức tốt nhất** |

---

### B. Mô Hình Phân Lớp Giao Diện (Layout Layering)

Trong kiến trúc `WebContentsView`:
1. **Cửa sổ chính (`mainWindow`)**: Đóng vai trò là **khung bao ngoài (Host Window)**. Nó chứa HTML/CSS của thanh **Custom Titlebar**, thanh **Tab Bar**, và thanh **Address Bar (URL + Navigation)**.
2. **Vùng hiển thị nội dung Tab (`WebContentsView`)**: Là một tầng hiển thị Native được đặt đè lên cửa sổ chính tại một toạ độ chính xác (ngay dưới thanh Address Bar).

```
┌─────────────────────────────────────────────────────────────┐
│ 🪟 MainWindow (Host Window - HTML/CSS của bạn)              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔘 Custom Titlebar & Window Controls ( - ▢ ✕ )          │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 📑 Tab Bar: [ Tab 1 ✕ ] [ Tab 2 (Active) ✕ ] [ + ]      │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🧭 Toolbar: [ ◀ ] [ ▶ ] [ 🔄 ] [ https://google.com ↵ ]  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ▼ TOP_OFFSET (Vùng bên dưới dành cho WebContentsView)       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │          🌐 WebContentsView (Tab đang Active)           │ │
│ │                                                         │ │
│ │      (Nội dung trang web hoặc file HTML độc lập)        │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### C. Cách `WebContentsView` Hoạt Động Trong Main Process (Electron 30+)

Trong Electron 30+, cửa sổ `BrowserWindow` có thuộc tính `mainWindow.contentView` (là một `View` gốc).
Bạn quản lý các tab bằng cách:

1. **Tạo View mới**:
   ```javascript
   const { WebContentsView } = require('electron');
   
   const tabView = new WebContentsView({
     webPreferences: {
       // Sandbox độc lập cho tab duyệt web
       contextIsolation: true,
       nodeIntegration: false
     }
   });
   ```

2. **Gắn vào hoặc gỡ khỏi Cửa sổ chính**:
   ```javascript
   // Đưa Tab hiển thị lên màn hình
   mainWindow.contentView.addChildView(tabView);

   // Ẩn/gỡ Tab khỏi màn hình (khi chuyển sang Tab khác)
   mainWindow.contentView.removeChildView(tabView);
   ```

3. **Căn chỉnh vị trí & kích thước (Bounds)**:
   ```javascript
   function updateTabBounds(tabView) {
     const [winWidth, winHeight] = mainWindow.getContentSize();
     const TOP_OFFSET = 120; // Tổng chiều cao của Titlebar + Tabbar + Toolbar
     
     tabView.setBounds({
       x: 0,
       y: TOP_OFFSET,
       width: winWidth,
       height: Math.max(0, winHeight - TOP_OFFSET)
     });
   }
   ```

4. **Tự động co giãn khi người dùng Resize cửa sổ**:
   ```javascript
   mainWindow.on('resize', () => {
     if (activeTab) {
       updateTabBounds(activeTab.view);
     }
   });
   ```

---

## 2. Kiến Trúc Luồng IPC Giữa Renderer (Tab Bar) Và Main Process

```
┌──────────────────────────────────────┐                ┌──────────────────────────────────────┐
│        RENDERER (Tab Bar UI)         │                │        MAIN PROCESS (main.js)        │
├──────────────────────────────────────┤                ├──────────────────────────────────────┤
│ 1. Click nút [+]                     │ ── tab:create ─▶ Tạo new WebContentsView              │
│ 2. Click vào Tab khác                │ ── tab:switch ─▶ removeChildView(cũ) -> addChild(mới) │
│ 3. Click nút [✕] trên Tab            │ ── tab:close ──▶ destroy() view -> chuyển sang tab kề │
│ 4. Nhập URL và nhấn Enter            │ ── tab:navigate▶ view.webContents.loadURL(url)       │
│                                      │                │                                      │
│ 5. Nhận 'tab:title-updated'          │ ◀───────────── │ Lắng nghe 'page-title-updated'       │
│ 6. Nhận 'tab:loading' (start/stop)   │ ◀───────────── │ Lắng nghe 'did-start/stop-loading'   │
└──────────────────────────────────────┘                └──────────────────────────────────────┘
```

---

## 3. Bản Thiết Kế Chi Tiết & Hướng Dẫn Code Cho Từng File

### 📁 File 1: `src/main.js` (Bộ điều khiển Tabs)

#### Các bước triển khai:
1. **Import `WebContentsView`** từ module `'electron'`:
   ```javascript
   const { app, BrowserWindow, WebContentsView, ipcMain, ... } = require('electron');
   ```

2. **Khai báo State quản lý Tabs**:
   ```javascript
   const tabs = new Map(); // Lưu danh sách: tabId -> { id, url, title, view, isLoading }
   let activeTabId = null;
   let nextTabId = 1;
   const TOP_OFFSET = 115; // Chiều cao chiếm bởi Header (Titlebar + Tab Bar + Address Bar)
   ```

3. **Viết hàm tính toán toạ độ `updateActiveTabBounds()`**:
   ```javascript
   function updateActiveTabBounds() {
     if (!mainWindow || !activeTabId) return;
     const currentTab = tabs.get(activeTabId);
     if (currentTab && currentTab.view) {
       const [width, height] = mainWindow.getContentSize();
       currentTab.view.setBounds({
         x: 0,
         y: TOP_OFFSET,
         width: width,
         height: Math.max(0, height - TOP_OFFSET)
       });
     }
   }
   ```

4. **Viết hàm `createNewTab(initialUrl)`**:
   ```javascript
   function createNewTab(initialUrl = 'https://www.google.com') {
     const tabId = nextTabId++;
     
     const view = new WebContentsView({
       webPreferences: {
         contextIsolation: true,
         nodeIntegration: false,
         sandbox: true
       }
     });

     const tabData = {
       id: tabId,
       url: initialUrl,
       title: 'New Tab',
       view: view,
       isLoading: false
     };

     tabs.set(tabId, tabData);

     // Lắng nghe các sự kiện native của WebContents
     view.webContents.on('page-title-updated', (event, title) => {
       tabData.title = title;
       if (mainWindow && !mainWindow.isDestroyed()) {
         mainWindow.webContents.send('tab:updated', { id: tabId, title: title, url: view.webContents.getURL() });
       }
     });

     view.webContents.on('did-start-loading', () => {
       tabData.isLoading = true;
       if (mainWindow && !mainWindow.isDestroyed()) {
         mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: true });
       }
     });

     view.webContents.on('did-stop-loading', () => {
       tabData.isLoading = false;
       tabData.url = view.webContents.getURL();
       if (mainWindow && !mainWindow.isDestroyed()) {
         mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: false, url: tabData.url });
       }
     });

     // Tải trang web
     view.webContents.loadURL(initialUrl).catch(err => {
       console.log('Error loading URL:', err.message);
     });

     // Kích hoạt tab này làm Active Tab
     switchTab(tabId);

     // Báo cho Renderer biết có tab mới được tạo
     mainWindow.webContents.send('tab:created', {
       id: tabData.id,
       title: tabData.title,
       url: tabData.url
     });

     return tabId;
   }
   ```

5. **Viết hàm `switchTab(tabId)`**:
   ```javascript
   function switchTab(tabId) {
     if (!tabs.has(tabId)) return;

     // 1. Gỡ View của tab cũ ra khỏi màn hình
     if (activeTabId && tabs.has(activeTabId)) {
       const oldTab = tabs.get(activeTabId);
       mainWindow.contentView.removeChildView(oldTab.view);
     }

     // 2. Gắn View của tab mới vào
     activeTabId = tabId;
     const currentTab = tabs.get(tabId);
     mainWindow.contentView.addChildView(currentTab.view);

     // 3. Đặt lại toạ độ bounds
     updateActiveTabBounds();

     // 4. Báo về Renderer để cập nhật class CSS active cho tab
     mainWindow.webContents.send('tab:switched', {
       id: currentTab.id,
       url: currentTab.view.webContents.getURL(),
       title: currentTab.title
     });
   }
   ```

6. **Viết hàm `closeTab(tabId)`**:
   ```javascript
   function closeTab(tabId) {
     if (!tabs.has(tabId)) return;

     const tabToClose = tabs.get(tabId);

     // Nếu đang đóng đúng tab đang active, cần gỡ view và chọn tab khác
     if (activeTabId === tabId) {
       mainWindow.contentView.removeChildView(tabToClose.view);
       tabs.delete(tabId);
       // Hủy webContents để giải phóng RAM
       tabToClose.view.webContents.close();

       // Chuyển sang tab còn lại gần nhất (nếu có)
       const remainingTabIds = Array.from(tabs.keys());
       if (remainingTabIds.length > 0) {
         switchTab(remainingTabIds[remainingTabIds.length - 1]);
       } else {
         // Nếu đóng hết tab, tạo 1 tab mới mặc định
         activeTabId = null;
         createNewTab('https://www.google.com');
       }
     } else {
       tabs.delete(tabId);
       tabToClose.view.webContents.close();
     }

     mainWindow.webContents.send('tab:closed', { id: tabId });
   }
   ```

7. **Đăng ký các kênh IPC trong `main.js`**:
   ```javascript
   ipcMain.handle('tab:create', (event, url) => createNewTab(url));
   ipcMain.handle('tab:switch', (event, tabId) => switchTab(tabId));
   ipcMain.handle('tab:close', (event, tabId) => closeTab(tabId));
   ipcMain.handle('tab:navigate', (event, { tabId, action, url }) => {
     const tab = tabs.get(tabId || activeTabId);
     if (!tab) return;
     if (action === 'goBack' && tab.view.webContents.canGoBack()) tab.view.webContents.goBack();
     else if (action === 'goForward' && tab.view.webContents.canGoForward()) tab.view.webContents.goForward();
     else if (action === 'reload') tab.view.webContents.reload();
     else if (action === 'loadURL' && url) {
       let target = url.trim();
       if (!target.startsWith('http://') && !target.startsWith('https://')) {
         target = 'https://' + target;
       }
       tab.view.webContents.loadURL(target);
     }
   });
   ```

8. **Gắn vào sự kiện `resize` của `mainWindow`**:
   ```javascript
   mainWindow.on('resize', () => {
     saveBounds();
     updateActiveTabBounds();
   });
   ```
   *Và khi `mainWindow` load xong trang đầu tiên (`mainWindow.loadFile(...)`), bạn gọi `createNewTab()` để mở sẵn tab số 1!*

---

### 📁 File 2: `src/preload.js` (Cầu nối an toàn)

Mở rộng `contextBridge.exposeInMainWorld('electronAPI', { ... })` để thêm các API tab:
```javascript
// Quản lý Multi-Tab (Giai đoạn 4 - Bài 1)
createTab: (url) => ipcRenderer.invoke('tab:create', url),
switchTab: (tabId) => ipcRenderer.invoke('tab:switch', tabId),
closeTab: (tabId) => ipcRenderer.invoke('tab:close', tabId),
navigateTab: (payload) => ipcRenderer.invoke('tab:navigate', payload),

// Lắng nghe sự kiện Tab từ Main gửi về
onTabCreated: (callback) => ipcRenderer.on('tab:created', (e, data) => callback(data)),
onTabSwitched: (callback) => ipcRenderer.on('tab:switched', (e, data) => callback(data)),
onTabUpdated: (callback) => ipcRenderer.on('tab:updated', (e, data) => callback(data)),
onTabClosed: (callback) => ipcRenderer.on('tab:closed', (e, data) => callback(data)),
onTabLoading: (callback) => ipcRenderer.on('tab:loading', (e, data) => callback(data)),
```

---

### 📁 File 3: `src/renderer/index.html` (Thanh Tab & Address Bar)

Đặt thanh Tab Bar & Address Bar ngay bên dưới Custom Titlebar:

```html
<!-- KHU VỰC MULTI-TAB & ADDRESS BAR (GIAI ĐOẠN 4) -->
<div class="browser-header">
  <!-- Thanh Tab Bar -->
  <div class="tab-bar-container">
    <div class="tabs-list" id="tabsList">
      <!-- Các Tab sẽ được Javascript render tự động tại đây -->
    </div>
    <button class="new-tab-btn" id="newTabBtn" title="Mở Tab Mới">+</button>
  </div>

  <!-- Thanh Điều Hướng & Nhập URL -->
  <div class="address-bar-container">
    <div class="nav-controls">
      <button class="nav-btn" id="btnBack" title="Quay lại">◀</button>
      <button class="nav-btn" id="btnForward" title="Tiến lên">▶</button>
      <button class="nav-btn" id="btnReload" title="Tải lại">🔄</button>
    </div>
    <form class="url-form" id="urlForm">
      <input type="text" class="url-input" id="urlInput" placeholder="Nhập địa chỉ URL hoặc tìm kiếm..." autocomplete="off" />
      <button type="submit" class="url-go-btn">Đi tới</button>
    </form>
  </div>
</div>
```

---

### 📁 File 4: `src/renderer/style.css` (Giao diện chuẩn Tab Chrome)

Thêm phong cách CSS cho các tab (chống rung lắc, hiệu ứng active nổi bật, nút close mượt mà):

```css
/* Header trình duyệt chứa Tab Bar & Address Bar */
.browser-header {
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  user-select: none;
}

/* Thanh cuộn chứa các tab */
.tab-bar-container {
  display: flex;
  align-items: center;
  padding: 4px 8px 0 8px;
  background: #090d16;
  gap: 4px;
  overflow-x: auto;
}

.tabs-list {
  display: flex;
  gap: 4px;
  align-items: flex-end;
}

/* Từng Tab đơn lẻ */
.tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px 8px 0 0;
  color: #94a3b8;
  font-size: 12px;
  max-width: 180px;
  min-width: 120px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-top: 2px solid transparent;
}

.tab-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.tab-item.active {
  background: rgba(30, 41, 59, 0.95);
  color: #38bdf8;
  border-top: 2px solid #38bdf8;
  font-weight: 500;
}

.tab-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tab-close-btn {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 11px;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  cursor: pointer;
}

.tab-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  opacity: 1;
}

/* Nút thêm Tab mới */
.new-tab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.new-tab-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

/* Address Bar */
.address-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(30, 41, 59, 0.95);
}

.nav-controls {
  display: flex;
  gap: 4px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.url-form {
  display: flex;
  flex: 1;
  gap: 6px;
}

.url-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
.url-input:focus {
  border-color: #38bdf8;
}

.url-go-btn {
  background: #0284c7;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.url-go-btn:hover {
  background: #0369a1;
}
```

---

### 📁 File 5: `src/renderer/renderer.js` (Xử lý giao diện tương tác Tab)

```javascript
// State lưu các Tab tại Renderer
let currentActiveTabId = null;
const tabsMap = new Map();

const tabsListEl = document.getElementById('tabsList');
const newTabBtn = document.getElementById('newTabBtn');
const urlForm = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const btnBack = document.getElementById('btnBack');
const btnForward = document.getElementById('btnForward');
const btnReload = document.getElementById('btnReload');

// 1. Tạo giao diện phần tử Tab trong DOM
function renderTabElement(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = `tab-item ${tab.id === currentActiveTabId ? 'active' : ''}`;
  tabEl.id = `tab-node-${tab.id}`;
  
  tabEl.innerHTML = `
    <span class="tab-icon">${tab.isLoading ? '⏳' : '🌐'}</span>
    <span class="tab-title">${tab.title || 'New Tab'}</span>
    <button class="tab-close-btn" title="Đóng tab">✕</button>
  `;

  // Click vào tab -> Chuyển tab
  tabEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close-btn')) return;
    window.electronAPI.switchTab(tab.id);
  });

  // Click nút X -> Đóng tab
  const closeBtn = tabEl.querySelector('.tab-close-btn');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.electronAPI.closeTab(tab.id);
  });

  return tabEl;
}

// 2. Lắng nghe các sự kiện từ Preload/Main gửi sang
window.electronAPI.onTabCreated((data) => {
  tabsMap.set(data.id, data);
  const tabEl = renderTabElement(data);
  tabsListEl.appendChild(tabEl);
});

window.electronAPI.onTabSwitched((data) => {
  currentActiveTabId = data.id;
  urlInput.value = data.url || '';
  
  // Cập nhật class active cho DOM
  document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
  const activeNode = document.getElementById(`tab-node-${data.id}`);
  if (activeNode) activeNode.classList.add('active');
});

window.electronAPI.onTabUpdated((data) => {
  const tabData = tabsMap.get(data.id);
  if (tabData) {
    tabData.title = data.title;
    tabData.url = data.url;
    const tabNode = document.getElementById(`tab-node-${data.id}`);
    if (tabNode) {
      tabNode.querySelector('.tab-title').textContent = data.title;
    }
    if (currentActiveTabId === data.id) {
      urlInput.value = data.url;
    }
  }
});

window.electronAPI.onTabLoading((data) => {
  const tabNode = document.getElementById(`tab-node-${data.id}`);
  if (tabNode) {
    tabNode.querySelector('.tab-icon').textContent = data.isLoading ? '⏳' : '🌐';
  }
  if (data.url && currentActiveTabId === data.id) {
    urlInput.value = data.url;
  }
});

window.electronAPI.onTabClosed((data) => {
  tabsMap.delete(data.id);
  const tabNode = document.getElementById(`tab-node-${data.id}`);
  if (tabNode) tabNode.remove();
});

// 3. Xử lý các nút bấm từ người dùng
newTabBtn.addEventListener('click', () => {
  window.electronAPI.createTab('https://www.google.com');
});

urlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (url) {
    window.electronAPI.navigateTab({ tabId: currentActiveTabId, action: 'loadURL', url });
  }
});

btnBack.addEventListener('click', () => {
  window.electronAPI.navigateTab({ tabId: currentActiveTabId, action: 'goBack' });
});

btnForward.addEventListener('click', () => {
  window.electronAPI.navigateTab({ tabId: currentActiveTabId, action: 'goForward' });
});

btnReload.addEventListener('click', () => {
  window.electronAPI.navigateTab({ tabId: currentActiveTabId, action: 'reload' });
});
```

---

## 4. Cách Kiểm Thử Sau Khi Viết Code

Chạy ứng dụng:
```bash
npm start
```

### Các tiêu chí nghiệm thu bài học:
1. Khi app mở lên, xuất hiện ngay 1 tab mặc định và tải trang web bên dưới thanh Address Bar.
2. Bấm nút `+` $\rightarrow$ Mở tab mới, gắn vào thanh Tab Bar, chuyển đổi mượt mà.
3. Bấm qua lại giữa các Tab $\rightarrow$ Tab View tương ứng hiển thị tức thì, URL thanh Address Bar tự đổi theo.
4. Bấm `✕` trên 1 Tab $\rightarrow$ Tab bị đóng, tài nguyên giải phóng và tự chuyển về Tab kề bên.
5. Resize cửa sổ $\rightarrow$ Tab View tự động co giãn kích thước ăn khớp không để lộ khoảng trống hay lỗi giao diện.
6. Thử nhập URL (ví dụ: `github.com` hoặc `vnexpress.net`) $\rightarrow$ Trang web load thành công và đổi tiêu đề tab.
