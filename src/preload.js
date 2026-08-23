const { contextBridge, ipcRenderer } = require('electron');

/**
 * PRELOAD SCRIPT - CẦU NỐI AN TOÀN (BRIDGE)
 * 
 * Tại sao cần Preload Script?
 * 1. Renderer Process (Giao diện web) bị cách ly (`contextIsolation: true`) và không có quyền truy cập Node.js (`nodeIntegration: false`).
 * 2. Preload Script chạy trong môi trường có quyền truy cập một phần Node.js và DOM, giúp expose các hàm được chọn lọc ra `window` object.
 * 3. KHÔNG BAO GIỜ expose trực tiếp `ipcRenderer` (như: window.ipcRenderer = ipcRenderer) vì kẻ xấu/XSS có thể gửi bất kỳ message nào!
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // 1. IPC 2-chiều: Yêu cầu thông tin hệ thống từ Main (invoke -> handle)
  getSystemInfo: () => ipcRenderer.invoke('system:get-info'),

  // 2. IPC 2-chiều: Yêu cầu tính toán nặng ở Main process (invoke -> handle)
  calculateFibonacci: (n) => ipcRenderer.invoke('math:fibonacci', n),

  // 3. IPC 1-chiều (Renderer -> Main): Gửi log / ping lên terminal của Main
  pingMain: (message) => ipcRenderer.send('renderer:ping-main', message),

  //
  getHomeDir: () => ipcRenderer.invoke('system:user-path'),

  // 4. IPC 1-chiều (Main -> Renderer): Lắng nghe sự kiện Heartbeat tick từ Main
  onHeartbeat: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('heartbeat-tick', subscription);

    // Trả về hàm hủy đăng ký (cleanup function)
    return () => {
      ipcRenderer.removeListener('heartbeat-tick', subscription);
    };
  },

  // Lắng nghe sự kiện được kích hoạt từ Application Menu hoặc Context Menu
  onMenuAction: (callback) => {
    const subscription = (_event, message) => callback(message);
    ipcRenderer.on('menu:action', subscription);
    return () => ipcRenderer.removeListener('menu:action', subscription);
  },

  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (content) => ipcRenderer.invoke('file:save', content),
  confirmClear: () => ipcRenderer.invoke('dialog:confirm-clear'),

  // Module shell (Giai đoạn 2 - Bài 4)
  showInFolder: (fullPath) => ipcRenderer.invoke('shell:show-in-folder', fullPath),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  beep: () => ipcRenderer.invoke('shell:beep'),

  // ==========================================
  // GIAI ĐOẠN 3 - BÀI 1: MULTI-WINDOW & MODAL IPC
  // ==========================================
  // 1. Mở Cửa sổ Cài Đặt (Modal Window)
  openSettings: () => ipcRenderer.invoke('window:open-settings'),

  // 2. Đóng Cửa sổ Cài Đặt
  closeSettings: () => ipcRenderer.invoke('window:close-settings'),

  // 3. Lấy cấu hình ứng dụng hiện tại
  getSettings: () => ipcRenderer.invoke('settings:get'),

  // 4. Lưu và phát tán cấu hình mới
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // 5. Lắng nghe sự kiện khi Cài đặt được cập nhật từ Cửa sổ khác
  onSettingsChanged: (callback) => {
    const subscription = (_event, newSettings) => callback(newSettings);
    ipcRenderer.on('settings:updated', subscription);
    return () => ipcRenderer.removeListener('settings:updated', subscription);
  },

  // ==========================================
  // GIAI ĐOẠN 3 - BÀI 2: PERSISTENT STORAGE
  // ==========================================
  getStorePath: () => ipcRenderer.invoke('store:get-path'),

  // ==========================================
  // GIAI ĐOẠN 3 - BÀI 3: CUSTOM TITLEBAR IPC
  // ==========================================
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback) => {
    const subscription = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window:maximized-state', subscription);
    return () => ipcRenderer.removeListener('window:maximized-state', subscription);
  },

  // ==========================================
  // GIAI ĐOẠN 4 - BÀI 1: MULTI-TAB (WebContentsView) IPC
  // ==========================================
  createTab: (url) => ipcRenderer.invoke('tab:create', url),
  switchTab: (tabId) => ipcRenderer.invoke('tab:switch', tabId),
  closeTab: (tabId) => ipcRenderer.invoke('tab:close', tabId),
  navigateTab: (payload) => ipcRenderer.invoke('tab:navigate', payload),
  getTabsState: () => ipcRenderer.invoke('tab:get-all'),

  // Lắng nghe sự kiện từ Main gửi về Renderer
  onTabCreated: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tab:created', subscription);
    return () => ipcRenderer.removeListener('tab:created', subscription);
  },
  onTabSwitched: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tab:switched', subscription);
    return () => ipcRenderer.removeListener('tab:switched', subscription);
  },
  onTabUpdated: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tab:updated', subscription);
    return () => ipcRenderer.removeListener('tab:updated', subscription);
  },
  onTabClosed: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tab:closed', subscription);
    return () => ipcRenderer.removeListener('tab:closed', subscription);
  },
  onTabLoading: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tab:loading', subscription);
    return () => ipcRenderer.removeListener('tab:loading', subscription);
  },
  // ==========================================
  // GIAI ĐOẠN 4 - BÀI 2: IPC BROADCAST & TAB-TO-TAB MESSAGING
  // ==========================================
  broadcastMessage: (message) => ipcRenderer.invoke('tab:broadcast-message', message),
  onBroadcastMessage: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('tab:broadcast-received', subscription);
    return () => ipcRenderer.removeListener('tab:broadcast-received', subscription);
  },

  // ==========================================
  // GIAI ĐOẠN 6: AUTO-UPDATER (electron-updater)
  // ==========================================
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quit-and-install'),
  onUpdateChecking: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('updater:checking', subscription);
    return () => ipcRenderer.removeListener('updater:checking', subscription);
  },
  onUpdateAvailable: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:available', subscription);
    return () => ipcRenderer.removeListener('updater:available', subscription);
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:not-available', subscription);
    return () => ipcRenderer.removeListener('updater:not-available', subscription);
  },
  onUpdateDownloadProgress: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:download-progress', subscription);
    return () => ipcRenderer.removeListener('updater:download-progress', subscription);
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:downloaded', subscription);
    return () => ipcRenderer.removeListener('updater:downloaded', subscription);
  },
  onUpdateError: (callback) => {
    const subscription = (_event, data) => callback(data);
    ipcRenderer.on('updater:error', subscription);
    return () => ipcRenderer.removeListener('updater:error', subscription);
  }
});
