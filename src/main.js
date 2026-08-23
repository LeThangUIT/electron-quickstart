const { app, BrowserWindow, WebContentsView, ipcMain, Menu, Tray, nativeImage, globalShortcut, dialog, Notification, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const os = require('os');
const fs = require('fs').promises; // Sử dụng fs.promises cho async/await
const Store = require('./store');   // Module lưu trữ cấu hình bền vững (Giai đoạn 3 - Bài 2)

// Biến toàn cục lưu trữ cửa sổ chính để tránh bị Garbage Collector giải phóng
let mainWindow = null;
let settingsWindow = null; // Biến giữ tham chiếu Cửa sổ Cài đặt con (Modal Window)
let heartbeatInterval = null;
let tray = null;          // Biến giữ tham chiếu Tray tránh bị Garbage Collector thu hồi
let isQuitting = false;   // Biến cờ xác định người dùng muốn ẩn hay thoát hẳn

// ==========================================
// GIAI ĐOẠN 4 - BÀI 1: QUẢN LÝ ĐA TAB (WebContentsView)
// ==========================================
const tabs = new Map(); // Lưu danh sách: tabId -> { id, url, title, view, isDashboard, isLoading }
let activeTabId = null;
let nextTabId = 1;
const TOP_OFFSET = 112; // Chiều cao Header (Titlebar 36px + Tab bar 38px + Address bar 38px)

// Khởi tạo nơi lưu trữ cấu hình bền vững (Persistent Config Store)
const store = new Store({
  configName: 'app-settings',
  defaults: {
    username: 'Electron Explorer',
    theme: 'theme-default',
    fontSize: 'font-md',
    windowBounds: { width: 1000, height: 720 },
    savedTabs: [{ url: 'app://dashboard', isDashboard: true }]
  }
});

/**
 * Hàm khởi tạo cửa sổ chính của ứng dụng
 */
function createWindow() {
  // Lấy lại vị trí & kích thước cửa sổ đã lưu từ lần sử dụng trước
  const savedBounds = store.get('windowBounds') || { width: 1000, height: 720 };

  mainWindow = new BrowserWindow({
    x: savedBounds.x,
    y: savedBounds.y,
    width: savedBounds.width || 1000,
    height: savedBounds.height || 720,
    minWidth: 800,
    minHeight: 600,
      frame: false,
    title: 'Electron Stage 1 - Nền tảng & IPC Bảo mật',
    backgroundColor: '#0f172a', // Màu nền tránh nháy trắng khi cửa sổ đang load
    webPreferences: {
      // 1. Chỉ định file cầu nối preload.js
      preload: path.join(__dirname, 'preload.js'),
      // 2. BẬT contextIsolation (Bắt buộc theo chuẩn bảo mật hiện đại)
      contextIsolation: true,
      // 3. TẮT nodeIntegration (Không cho phép Renderer gọi trực tiếp require('fs') hay Node API)
      nodeIntegration: false,
      // 4. Bật chế độ sandbox bảo vệ
      sandbox: true
    }
  });

  // Nạp giao diện React: Trong chế độ Dev nạp Vite Dev Server (HMR), trong Production nạp file bundle tĩnh
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html')).catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    });
  }

  // Bật DevTools khi lập trình (tùy chọn)
  mainWindow.webContents.openDevTools();

  // Bắt đầu gửi nhịp tim (Heartbeat tick) từ Main sang Renderer mỗi giây để minh họa chiều Main -> Renderer
  startHeartbeat();
  



  // Bắt sự kiện người dùng thay đổi kích thước hoặc di chuyển cửa sổ để lưu lại
  const saveBounds = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      store.set('windowBounds', mainWindow.getBounds());
      updateActiveTabBounds();
    }
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Khi mainWindow load xong HTML, khôi phục lại các Tab từ phiên trước
  mainWindow.webContents.once('did-finish-load', () => {
    if (tabs.size === 0) {
      restoreTabSession();
    }
  });

  // GIAI ĐOẠN 3 - BÀI 3: Lắng nghe trạng thái Maximize / Unmaximize để đồng bộ icon Renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-state', false);
  });

  // Bắt sự kiện người dùng bấm nút [X] (Đóng cửa sổ)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault(); // CHẶN KHÔNG CHO ĐÓNG CỬA SỔ
      mainWindow.hide();       // Chỉ ẩn cửa sổ xuống khay hệ thống
      console.log('\x1b[33m[Window]\x1b[0m Đã ẩn cửa sổ xuống System Tray thay vì thoát app.');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (heartbeatInterval) clearInterval(heartbeatInterval);
  });
}

/**
 * Gửi định kỳ dữ liệu từ Main Process -> Renderer Process (1-way: Main to Renderer)
 */
function startHeartbeat() {
  let secondsRunning = 0;
  heartbeatInterval = setInterval(() => {
    secondsRunning++;
    if (mainWindow && !mainWindow.isDestroyed()) {
      // webContents.send dùng để đẩy sự kiện từ Main xuống Renderer
      mainWindow.webContents.send('heartbeat-tick', {
        uptimeSeconds: secondsRunning,
        freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
        timestamp: new Date().toLocaleTimeString('vi-VN')
      });
    }
  }, 1000);
}

// ==========================================
// THIẾT LẬP CÁC KÊNH IPC (Inter-Process Communication)
// ==========================================

/**
 * 1. IPC 1 Chiều (Renderer -> Main): Dùng ipcMain.on
 * Renderer gửi tín hiệu (lệnh log/thông báo) mà không cần đợi Main trả lời.
 */
ipcMain.on('renderer:ping-main', (event, data) => {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  console.log(`\x1b[36m[Main Process - ${timestamp}]\x1b[0m Nhận tin nhắn 1 chiều từ Renderer: "${data}"`);
});

/**
 * 2. IPC 2 Chiều (Renderer <-> Main): Dùng ipcMain.handle
 * Renderer gửi yêu cầu (request) và Main xử lý rồi trả về Promise kết quả (response).
 */
ipcMain.handle('system:get-info', async () => {
  // Main Process có toàn quyền truy cập Node.js & OS
  return {
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    osType: os.type(),
    osRelease: os.release(),
    cpuModel: os.cpus()[0]?.model || 'N/A',
    cpuCores: os.cpus().length,
    totalMemGB: (os.totalmem() / (1024 ** 3)).toFixed(2),
    freeMemGB: (os.freemem() / (1024 ** 3)).toFixed(2),
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome
  };
});

// Xử lý tính toán mẫu (mô phỏng tác vụ nặng trên Node.js)
ipcMain.handle('math:fibonacci', async (event, n) => {
  const num = parseInt(n, 10);
  if (isNaN(num) || num < 0 || num > 45) {
    throw new Error('Số nhập vào phải nằm trong khoảng từ 0 đến 45');
  }

  // Hàm tính Fibonacci đệ quy
  function fib(x) {
    if (x <= 1) return x;
    return fib(x - 1) + fib(x - 2);
  }

  const startTime = Date.now();
  const result = fib(num);
  const durationMs = Date.now() - startTime;

  return {
    input: num,
    result: result,
    durationMs: durationMs
  };
});

ipcMain.handle('system:user-path', async () => {
  return os.homedir();
})

// ==========================================
// VÒNG ĐỜI ỨNG DỤNG (Application Lifecycle)
// ==========================================

// Khi Electron đã khởi tạo xong và sẵn sàng tạo giao diện
app.whenReady().then(() => {
  app.setAppUserModelId('com.electron.roadmap');
  createWindow();
  setupTray();
  setupAppMenu();
  setupContextMenu();
  // Đăng ký phím tắt toàn hệ điều hành Ctrl+Shift+H
  const ret = globalShortcut.register('CommandOrControl+Shift+H', () => {
    console.log('\x1b[35m[Global Shortcut]\x1b[0m Ctrl+Shift+H đã được bấm!');
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide(); // Đang hiện thì ẩn
    } else {
      mainWindow.show(); // Đang ẩn thì hiện
      mainWindow.focus();
    }
  });
  if (!ret) {
    console.error('Đăng ký phím tắt thất bại!');
  }
});

// Khi tất cả các cửa sổ đã bị đóng
app.on('window-all-closed', () => {
  // Trên Windows/Linux, thoát ứng dụng hoàn toàn khi đóng hết cửa sổ
  // (Trên macOS thường ứng dụng vẫn duy trì trên thanh menu)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// HỦY ĐĂNG KÝ phím tắt khi app chuẩn bị thoát (Rất quan trọng!)
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  console.log('[Global Shortcut] Đã giải phóng tất cả phím tắt.');
});


/**
 * 1. Thiết lập Custom Application Menu
 */
function setupAppMenu() {
  const template = [
    {
      label: 'Tệp (File)',
      submenu: [
        {
          label: 'Gửi lời chào từ Menu',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu:action', 'Lời chào được kích hoạt từ Application Menu (Ctrl+M)!');
            }
          }
        },
        {
          label: 'Cài đặt ứng dụng...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        { role: 'reload', label: 'Tải lại trang (Reload)' },
        { role: 'forceReload', label: 'Tải lại cưỡng bức (Force Reload)' },
        { type: 'separator' },
        { role: 'quit', label: 'Thoát ứng dụng (Quit)', accelerator: 'CmdOrCtrl+Q' }
      ]
    },
    {
      label: 'Chỉnh sửa (Edit)',
      submenu: [
        { role: 'undo', label: 'Hoàn tác (Undo)' },
        { role: 'redo', label: 'Làm lại (Redo)' },
        { type: 'separator' },
        { role: 'cut', label: 'Cắt (Cut)' },
        { role: 'copy', label: 'Sao chép (Copy)' },
        { role: 'paste', label: 'Dán (Paste)' },
        { role: 'selectAll', label: 'Chọn tất cả (Select All)' }
      ]
    },
    {
      label: 'Giao diện (View)',
      submenu: [
        { role: 'toggleDevTools', label: 'Bật/Tắt DevTools', accelerator: 'F12' },
        { role: 'togglefullscreen', label: 'Bật/Tắt Toàn màn hình', accelerator: 'F11' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Thu phóng mặc định' },
        { role: 'zoomIn', label: 'Phóng to' },
        { role: 'zoomOut', label: 'Thu nhỏ' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 2. Thiết lập Context Menu (Chuột phải)
 */
function setupContextMenu() {
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenuTemplate = [
      { role: 'copy', label: 'Sao chép (Copy)' },
      { role: 'paste', label: 'Dán (Paste)' },
      { type: 'separator' },
      {
        label: 'Gửi thông báo từ Chuột Phải',
        click: () => {
          mainWindow.webContents.send('menu:action', `Bạn vừa click chuột phải tại tọa độ (${params.x}, ${params.y})!`);
        }
      },
      { type: 'separator' },
      {
        label: 'Kiểm tra phần tử này (Inspect Element)',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
        }
      }
    ];

    const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
    contextMenu.popup({ window: mainWindow });
  });
}

/**
 * 3. Thiết lập Khay hệ thống (System Tray)
 */
function setupTray() {
  // Tạo icon mẫu 16x16 bằng Data URL SVG (hoặc truyền path tới file ảnh .png)
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#38bdf8">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  `;
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}`);

  // Khởi tạo Tray
  tray = new Tray(icon);
  tray.setToolTip('Electron Roadmap - Ứng dụng đang chạy ngầm');

  // Menu chuột phải cho Tray
  const trayContextMenu = Menu.buildFromTemplate([
    {
      label: 'Hiện / Ẩn ứng dụng',
      click: () => {
        toggleWindowVisibility();
      }
    },
    {
      label: 'Gửi thông báo từ Tray',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('menu:action', 'Bạn vừa tương tác từ System Tray Icon!');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Thoát hoàn toàn',
      click: () => {
        isQuitting = true; // Bật cờ cho phép thoát
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(trayContextMenu);

  // Click vào icon khay thì Ẩn/Hiện cửa sổ
  tray.on('click', () => {
    toggleWindowVisibility();
  });
}

// Hàm hỗ trợ chuyển đổi trạng thái Ẩn / Hiện của cửa sổ
function toggleWindowVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// 1. Mở file từ ổ đĩa
ipcMain.handle('file:open', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Chọn file để đọc',
    properties: ['openFile'],
    filters: [
      { name: 'Text / Code Files', extensions: ['txt', 'md', 'json', 'js', 'html', 'css'] },
      { name: 'Tất cả file', extensions: ['*'] }
    ]
  });

  if (canceled || filePaths.length === 0) {
    return { canceled: true };
  }

  const filePath = filePaths[0];
  const content = await fs.readFile(filePath, 'utf-8');

  return {
    canceled: false,
    filePath: filePath,
    content: content
  };
});

// 2. Lưu nội dung ra file
ipcMain.handle('file:save', async (event, textContent) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Lưu tệp tin',
    defaultPath: 'ghi-chu.txt',
    filters: [
      { name: 'Tệp văn bản (.txt)', extensions: ['txt'] },
      { name: 'Markdown (.md)', extensions: ['md'] }
    ]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await fs.writeFile(filePath, textContent, 'utf-8');

  // Bắn Native Notification hệ thống khi lưu thành công
  if (Notification.isSupported()) {
    const notif = new Notification({
      title: '💾 Lưu tệp tin thành công!',
      body: `Đã lưu tệp vào: ${filePath}`,
      silent: false
    });

    notif.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });

    notif.show();
  }

  return {
    canceled: false,
    filePath: filePath
  };
});

// 3. Hiển thị hộp thoại hỏi xác nhận (Message Box)
ipcMain.handle('dialog:confirm-clear', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Xóa ngay', 'Hủy bỏ'],
    defaultId: 1, // Mặc định focus vào nút Hủy để tránh lỡ tay
    cancelId: 1,
    title: 'Xác nhận dọn dẹp',
    message: 'Bạn có chắc chắn muốn xóa toàn bộ nội dung đang soạn thảo?',
    detail: 'Dữ liệu chưa lưu sẽ bị mất vĩnh viễn!'
  });

  return result.response === 0; // Trả về true nếu chọn 'Xóa ngay' (nút index 0)
});

// ==========================================
// GIAI ĐOẠN 2 - BÀI 4: CÁC KÊNH IPC CHO MODULE SHELL
// ==========================================

// 1. Mở File Explorer và bôi đen file vừa lưu
ipcMain.handle('shell:show-in-folder', async (event, fullPath) => {
  if (fullPath) {
    shell.showItemInFolder(fullPath);
  }
});

// 2. Mở URL bên ngoài trình duyệt mặc định
ipcMain.handle('shell:open-external', async (event, url) => {
  if (url) {
    await shell.openExternal(url);
  }
});

// 3. Phát tiếng Beep hệ thống
ipcMain.handle('shell:beep', async () => {
  shell.beep();
});

// ==========================================
// GIAI ĐOẠN 3 - BÀI 1: MULTI-WINDOW & MODAL IPC
// ==========================================

/**
 * Hàm khởi tạo Cửa sổ Cài đặt Con (Settings Modal Window)
 */
function createSettingsWindow() {
  // Nếu cửa sổ Cài đặt đang mở, chỉ cần kích hoạt (focus) nó lên trước
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 580,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow,          // Gán mainWindow làm cha
    modal: true,                 // Khóa tương tác với cửa sổ cha khi đang mở
    show: false,                 // Ẩn ban đầu, đợi ready-to-show để tránh giật/nháy trắng
    title: 'Cài Đặt Hệ Thống',
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings.html'));

  // Ẩn thanh menu mặc định của cửa sổ con
  settingsWindow.setMenu(null);

  // KỸ THUẬT QUAN TRỌNG: Chỉ hiển thị khi nội dung đã render hoàn chỉnh
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    console.log('\x1b[35m[Multi-Window]\x1b[0m Cửa sổ Cài đặt (Settings Modal) đã sẵn sàng và hiển thị.');
  });

  // Khi cửa sổ con bị đóng, dọn dẹp tham chiếu để Garbage Collector thu hồi
  settingsWindow.on('closed', () => {
    settingsWindow = null;
    console.log('\x1b[35m[Multi-Window]\x1b[0m Cửa sổ Cài đặt đã được đóng và dọn dẹp bộ nhớ.');
  });
}

// 1. Kênh IPC yêu cầu mở Settings Window
ipcMain.handle('window:open-settings', async () => {
  createSettingsWindow();
  return { success: true };
});

// 2. Kênh IPC yêu cầu đóng Settings Window
ipcMain.handle('window:close-settings', async () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
  return { success: true };
});

// 3. Kênh IPC lấy thông tin cài đặt hiện tại từ file lưu trữ bền vững
ipcMain.handle('settings:get', async () => {
  return store.get();
});

// 4. Kênh IPC lưu và phát tán cài đặt mới sang TẤT CẢ các Tab và Cửa Sổ (IPC Broadcast)
ipcMain.handle('settings:save', async (event, newSettings) => {
  store.set(newSettings);
  const updatedSettings = store.get();
  console.log('\x1b[32m[Persistent Store]\x1b[0m Đã lưu cấu hình vào đĩa cứng:', updatedSettings);

  // Phát tín hiệu IPC Broadcast xuống MainWindow, SettingsWindow và tất cả các Tab đang mở
  broadcastToAllTabs('settings:updated', updatedSettings);

  return { success: true, settings: updatedSettings };
});

// 5. Kênh IPC lấy đường dẫn file config trên ổ đĩa
ipcMain.handle('store:get-path', async () => {
  return store.getFilePath();
});

// ==========================================
// GIAI ĐOẠN 3 - BÀI 3: CUSTOM TITLEBAR & FRAMELESS WINDOW IPC
// ==========================================

// 1. Thu nhỏ cửa sổ
ipcMain.handle('window:minimize', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
  return { success: true };
});

// 2. Phóng to cực đại hoặc khôi phục kích thước
ipcMain.handle('window:toggle-maximize', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return mainWindow.isMaximized();
  }
  return false;
});

// 3. Đóng cửa sổ (Custom Titlebar [X])
ipcMain.handle('window:close', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    isQuitting = true; // Đặt cờ thoát hẳn ứng dụng khi người dùng bấm [X]
    mainWindow.destroy();
    app.quit();
  }
  return { success: true };
});

// 4. Kiểm tra trạng thái có đang Maximize không
ipcMain.handle('window:is-maximized', async () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});

// ==========================================
// GIAI ĐOẠN 4 - BÀI 1: MULTI-TAB (WebContentsView) CONTROLLERS & IPC
// ==========================================

/**
 * Căn chỉnh kích thước và toạ độ của WebContentsView đang active khớp với vùng hiển thị bên dưới Header
 */
function updateActiveTabBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || !activeTabId) return;
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

/**
 * Chuyển đổi qua lại giữa các Tab (Active Tab)
 */
function switchTab(tabId) {
  if (!tabs.has(tabId)) return;

  const prevActiveId = activeTabId;
  const currentTab = tabs.get(tabId);
  activeTabId = tabId;

  if (mainWindow && !mainWindow.isDestroyed()) {
    // 1. Gỡ View của tab cũ ra khỏi mainWindow.contentView nếu có
    if (prevActiveId && tabs.has(prevActiveId) && prevActiveId !== tabId) {
      const oldTab = tabs.get(prevActiveId);
      if (oldTab && oldTab.view) {
        try {
          if (mainWindow.contentView.children && mainWindow.contentView.children.includes(oldTab.view)) {
            mainWindow.contentView.removeChildView(oldTab.view);
          }
        } catch (err) {
          console.warn('[Tabs] Lỗi khi gỡ view cũ:', err.message);
        }
      }
    }

    // 2. Gắn View của tab mới vào nếu là Web View hoặc Local Tab
    if (currentTab.view) {
      try {
        if (mainWindow.contentView.children && !mainWindow.contentView.children.includes(currentTab.view)) {
          mainWindow.contentView.addChildView(currentTab.view);
        }
        updateActiveTabBounds();
      } catch (err) {
        console.warn('[Tabs] Lỗi khi gắn view mới:', err.message);
      }
    }
    // Nếu là Dashboard (view = null), không gắn gì -> hiển thị giao diện HTML của mainWindow

    // 3. Gửi thông báo về Renderer
    mainWindow.webContents.send('tab:switched', {
      id: currentTab.id,
      url: currentTab.isDashboard ? 'app://dashboard' : (currentTab.isLocalTab ? 'app://notes' : (currentTab.view ? currentTab.view.webContents.getURL() : currentTab.url)),
      title: currentTab.title,
      isDashboard: !!currentTab.isDashboard,
      isLocalTab: !!currentTab.isLocalTab
    });
  }
}

/**
 * Tạo Tab mới
 * @param {string} initialUrl - Địa chỉ web khởi đầu
 * @param {boolean} isDashboard - Có phải tab Dashboard cục bộ không
 */
function createNewTab(initialUrl = 'https://www.google.com', isDashboard = false) {
  const tabId = nextTabId++;
  let view = null;
  const isLocalNotes = initialUrl === 'app://notes' || initialUrl === 'local:notes';

  if (!isDashboard) {
    view = new WebContentsView({
      webPreferences: {
        // Cấp preload script cho các Tab nội bộ để có thể gọi window.electronAPI
        preload: isLocalNotes ? path.join(__dirname, 'preload.js') : undefined,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    // Lắng nghe sự kiện cập nhật tiêu đề web
    view.webContents.on('page-title-updated', (event, title) => {
      const tab = tabs.get(tabId);
      if (tab) {
        tab.title = title || 'Không có tiêu đề';
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tab:updated', {
            id: tabId,
            title: tab.title,
            url: isLocalNotes ? 'app://notes' : view.webContents.getURL()
          });
        }
      }
    });

    // Lắng nghe trạng thái bắt đầu tải trang
    view.webContents.on('did-start-loading', () => {
      const tab = tabs.get(tabId);
      if (tab) {
        tab.isLoading = true;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: true });
        }
      }
    });

    // Lắng nghe trạng thái tải trang hoàn tất
    view.webContents.on('did-stop-loading', () => {
      const tab = tabs.get(tabId);
      if (tab) {
        tab.isLoading = false;
        tab.url = isLocalNotes ? 'app://notes' : view.webContents.getURL();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('tab:loading', { id: tabId, isLoading: false, url: tab.url });
        }
      }
    });

    // Tự động mở link popup / new window trong tab hiện tại hoặc tab mới thay vì cửa sổ riêng
    view.webContents.setWindowOpenHandler(({ url }) => {
      createNewTab(url, false);
      return { action: 'deny' };
    });

    // Nạp nội dung: Nếu là Tab nội bộ thì nạp file HTML cục bộ, ngược lại nạp URL
    if (isLocalNotes) {
      view.webContents.loadFile(path.join(__dirname, 'renderer', 'notes.html')).catch((err) => {
        console.log(`[Tab ${tabId}] Lỗi nạp notes.html:`, err.message);
      });
    } else {
      let target = initialUrl.trim();
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        target = 'https://' + target;
      }
      view.webContents.loadURL(target).catch((err) => {
        console.log(`[Tab ${tabId}] Lỗi tải URL:`, err.message);
      });
    }
  }

  let defaultTitle = 'New Tab';
  if (isDashboard) defaultTitle = 'Dashboard Hệ Thống';
  else if (isLocalNotes) defaultTitle = 'Soạn Thảo & Ghi Chú';

  const tabData = {
    id: tabId,
    url: isDashboard ? 'app://dashboard' : (isLocalNotes ? 'app://notes' : initialUrl),
    title: defaultTitle,
    view: view,
    isDashboard: isDashboard,
    isLocalTab: isLocalNotes,
    isLoading: false
  };

  tabs.set(tabId, tabData);

  // Báo Renderer tạo phần tử DOM tab
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tab:created', {
      id: tabData.id,
      title: tabData.title,
      url: tabData.url,
      isDashboard: isDashboard,
      isLocalTab: isLocalNotes
    });
  }

  // Tự động chuyển sang tab vừa tạo
  switchTab(tabId);

  // Tự động lưu lại phiên làm việc các Tab
  saveTabSession();

  return tabId;
}

/**
 * Đóng Tab
 * @param {number} tabId 
 */
function closeTab(tabId) {
  if (!tabs.has(tabId)) return;

  const tabToClose = tabs.get(tabId);

  // Không cho đóng nếu chỉ còn 1 tab
  if (tabs.size <= 1) {
    console.log('[Tabs] Không thể đóng tab cuối cùng.');
    return;
  }

  // Nếu tab có view thì gỡ ra khỏi contentView và hủy webContents
  if (tabToClose.view) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        if (mainWindow.contentView.children && mainWindow.contentView.children.includes(tabToClose.view)) {
          mainWindow.contentView.removeChildView(tabToClose.view);
        }
      } catch (err) {
        console.warn('[Tabs] Lỗi khi gỡ view lúc đóng:', err.message);
      }
    }
    try {
      tabToClose.view.webContents.close();
    } catch (err) {
      console.warn('[Tabs] Lỗi khi đóng webContents:', err.message);
    }
  }

  tabs.delete(tabId);

  // Nếu vừa đóng đúng tab đang active, tự động chuyển sang tab liền kề
  if (activeTabId === tabId) {
    const remainingTabIds = Array.from(tabs.keys());
    if (remainingTabIds.length > 0) {
      switchTab(remainingTabIds[remainingTabIds.length - 1]);
    }
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tab:closed', { id: tabId });
  }

  // Cập nhật lại session các Tab sau khi đóng
  saveTabSession();
}

// ==========================================
// ĐĂNG KÝ CÁC KÊNH IPC CHO MULTI-TAB
// ==========================================

// 1. Tạo tab mới
ipcMain.handle('tab:create', (event, url) => {
  return createNewTab(url || 'https://www.google.com', false);
});

// 2. Chuyển tab
ipcMain.handle('tab:switch', (event, tabId) => {
  switchTab(tabId);
  return { success: true };
});

// 3. Đóng tab
ipcMain.handle('tab:close', (event, tabId) => {
  closeTab(tabId);
  return { success: true };
});

// 4. Điều hướng Tab (Back, Forward, Reload, Load URL)
ipcMain.handle('tab:navigate', (event, { tabId, action, url }) => {
  const targetId = tabId || activeTabId;
  const tab = tabs.get(targetId);
  if (!tab || !tab.view) return { success: false, reason: 'Tab không phải là Web View' };

  if (action === 'goBack' && tab.view.webContents.canGoBack()) {
    tab.view.webContents.goBack();
  } else if (action === 'goForward' && tab.view.webContents.canGoForward()) {
    tab.view.webContents.goForward();
  } else if (action === 'reload') {
    tab.view.webContents.reload();
  } else if (action === 'loadURL' && url) {
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }
    tab.view.webContents.loadURL(target).catch(console.error);
  }

  return { success: true };
});

// 5. Lấy danh sách tất cả các tab hiện có
ipcMain.handle('tab:get-all', () => {
  return Array.from(tabs.values()).map((t) => ({
    id: t.id,
    url: t.isDashboard ? 'app://dashboard' : (t.view ? t.view.webContents.getURL() : t.url),
    title: t.title,
    isDashboard: !!t.isDashboard,
    isLocalTab: !!t.isLocalTab,
    isActive: t.id === activeTabId
  }));
});

// 6. GIAI ĐOẠN 4 - BÀI 2: Kênh IPC gửi tin nhắn phát sóng liên Tab (Tab-to-Tab Messaging)
ipcMain.handle('tab:broadcast-message', (event, message) => {
  let senderName = 'Dashboard Hệ Thống';
  for (const [id, tab] of tabs.entries()) {
    if (tab.view && tab.view.webContents.id === event.sender.id) {
      senderName = `Tab ${id} (${tab.title})`;
      break;
    }
  }

  const payload = {
    sender: senderName,
    text: message,
    timestamp: new Date().toLocaleTimeString('vi-VN')
  };

  console.log(`\x1b[36m[IPC Broadcast]\x1b[0m "${senderName}" phát sóng: "${message}"`);
  broadcastToAllTabs('tab:broadcast-received', payload);
  return { success: true, payload };
});

/**
 * GIAI ĐOẠN 4 - BÀI 2: HÀM PHÁT TÁN BROADCAST ĐỒNG LOẠT
 */
function broadcastToAllTabs(channel, payload) {
  // 1. Gửi tới MainWindow
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
  // 2. Gửi tới Settings Modal Window (nếu đang mở)
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send(channel, payload);
  }
  // 3. Gửi tới tất cả WebContentsView (Tab con)
  tabs.forEach((tab) => {
    if (tab.view && !tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send(channel, payload);
    }
  });
}

/**
 * GIAI ĐOẠN 4 - BÀI 2: TỰ ĐỘNG LƯU SESSION CÁC TAB ĐANG MỞ
 */
function saveTabSession() {
  if (tabs.size === 0) return;
  const tabList = Array.from(tabs.values()).map((t) => ({
    url: t.isDashboard ? 'app://dashboard' : (t.isLocalTab ? 'app://notes' : (t.view ? t.view.webContents.getURL() : t.url)),
    title: t.title,
    isDashboard: !!t.isDashboard,
    isLocalTab: !!t.isLocalTab
  }));
  store.set('savedTabs', tabList);
}

/**
 * GIAI ĐOẠN 4 - BÀI 2: TỰ ĐỘNG KHÔI PHỤC SESSION CÁC TAB TỪ LẦN DÙNG TRƯỚC
 */
function restoreTabSession() {
  const savedTabs = store.get('savedTabs');
  if (Array.isArray(savedTabs) && savedTabs.length > 0) {
    savedTabs.forEach((t) => {
      createNewTab(t.url, !!t.isDashboard);
    });
  } else {
    createNewTab('app://dashboard', true);
  }
}

// ==========================================
// GIAI ĐOẠN 6: CƠ CHẾ AUTO-UPDATER (electron-updater)
// ==========================================
autoUpdater.autoDownload = true; // Tự động tải ngầm khi có bản mới
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = console;

// 1. Đang kiểm tra bản cập nhật
autoUpdater.on('checking-for-update', () => {
  console.log('\x1b[36m[Auto-Updater]\x1b[0m Đang kiểm tra bản cập nhật mới trên GitHub Releases...');
  broadcastToAllTabs('updater:checking', {});
});

// 2. Phát hiện có bản cập nhật mới
autoUpdater.on('update-available', (info) => {
  console.log(`\x1b[32m[Auto-Updater]\x1b[0m Phát hiện phiên bản mới: v${info.version}!`);
  broadcastToAllTabs('updater:available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : ''
  });
});

// 3. Ứng dụng đã là phiên bản mới nhất
autoUpdater.on('update-not-available', (info) => {
  console.log('\x1b[34m[Auto-Updater]\x1b[0m Ứng dụng đang ở phiên bản mới nhất:', info.version);
  broadcastToAllTabs('updater:not-available', {
    version: info.version
  });
});

// 4. Bắn tiến độ tải về (Download Progress)
autoUpdater.on('download-progress', (progressObj) => {
  const progress = {
    percent: Math.round(progressObj.percent || 0),
    bytesPerSecond: progressObj.bytesPerSecond || 0,
    transferred: progressObj.transferred || 0,
    total: progressObj.total || 0
  };
  console.log(`\x1b[35m[Auto-Updater]\x1b[0m Tiến độ tải: ${progress.percent}% (${(progress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s)`);
  broadcastToAllTabs('updater:download-progress', progress);
});

// 5. Tải xong bản cập nhật vào máy
autoUpdater.on('update-downloaded', (info) => {
  console.log('\x1b[32m[Auto-Updater]\x1b[0m Bản cập nhật đã tải xong và sẵn sàng cài đặt!');
  broadcastToAllTabs('updater:downloaded', {
    version: info.version,
    releaseDate: info.releaseDate
  });
});

// 6. Xử lý lỗi cập nhật
autoUpdater.on('error', (err) => {
  console.error('\x1b[31m[Auto-Updater Lỗi]\x1b[0m:', err ? err.message : err);
  broadcastToAllTabs('updater:error', err ? err.message : 'Lỗi kết nối cập nhật');
});

// IPC Handlers cho Auto-Updater
ipcMain.handle('updater:check', async () => {
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  if (isDev) {
    console.log('\x1b[33m[Auto-Updater]\x1b[0m Đang ở môi trường Dev (chưa đóng gói).');
    return {
      success: true,
      isDev: true,
      message: 'Đang ở môi trường Dev. Tính năng Auto-Update thực tế kết nối GitHub Releases sẽ hoạt động khi đóng gói thành file .exe!'
    };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result ? result.updateInfo : null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('updater:quit-and-install', () => {
  const isDev = !app.isPackaged && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV);
  if (isDev) {
    console.log('\x1b[33m[Auto-Updater]\x1b[0m Đang ở môi trường Dev (mô phỏng nâng cấp). Đang khởi động lại ứng dụng...');
    app.relaunch();
    app.exit(0);
    return { success: true, simulated: true };
  }
  console.log('\x1b[32m[Auto-Updater]\x1b[0m Khởi động lại để cài đặt phiên bản mới...');
  autoUpdater.quitAndInstall();
  return { success: true };
});


