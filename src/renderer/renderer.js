// Helper ghi log lên giao diện Terminal Box
function appendLog(message, type = 'system') {
  const consoleBox = document.getElementById('console-logs');
  if (!consoleBox) return;

  const line = document.createElement('div');
  line.className = `log-line log-${type}`;

  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = `[${new Date().toLocaleTimeString('vi-VN')}]`;

  const content = document.createElement('span');
  content.textContent = message;

  line.appendChild(time);
  line.appendChild(content);
  consoleBox.appendChild(line);

  // Tự động cuộn xuống dòng mới nhất
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  // Kiểm tra xem Electron API từ preload.js đã được expose chưa
  if (!window.electronAPI) {
    appendLog('LỖI: window.electronAPI không tồn tại! Hãy kiểm tra file preload.js.', 'error');
    return;
  }

  appendLog('Preload Bridge kết nối thành công: window.electronAPI đã sẵn sàng.', 'system');

  // ==========================================
  // 1. Lắng nghe nhịp tim (Heartbeat) từ Main Process (1-way: Main -> Renderer)
  // ==========================================
  const heartbeatText = document.getElementById('heartbeat-text');

  window.electronAPI.onHeartbeat((data) => {
    if (heartbeatText) {
      heartbeatText.textContent = `Main Alive: ${data.uptimeSeconds}s | Free RAM: ${data.freeMemoryMB}MB`;
    }
  });

  // ==========================================
  // 2. Lấy thông tin hệ thống (IPC 2-Way: invoke / handle)
  // ==========================================
  const btnFetchInfo = document.getElementById('btn-fetch-info');
  const sysInfoGrid = document.getElementById('sys-info-grid');

  btnFetchInfo.addEventListener('click', async () => {
    try {
      appendLog('Đang gửi yêu cầu invoke("system:get-info") tới Main Process...', 'send');
      
      const info = await window.electronAPI.getSystemInfo();
      
      appendLog(`Nhận phản hồi từ Main Process: Máy ${info.hostname} (${info.platform} ${info.arch})`, 'receive');

      // Điền dữ liệu vào giao diện
      document.getElementById('val-os').textContent = `${info.osType} (${info.platform} - ${info.arch})`;
      document.getElementById('val-cpu').textContent = `${info.cpuModel} (${info.cpuCores} cores)`;
      document.getElementById('val-ram').textContent = `${info.freeMemGB} GB trống / ${info.totalMemGB} GB`;
      document.getElementById('val-electron').textContent = `v${info.electronVersion}`;
      document.getElementById('val-node').textContent = `v${info.nodeVersion}`;
      document.getElementById('val-chrome').textContent = `v${info.chromeVersion}`;

      sysInfoGrid.style.display = 'grid';
    } catch (err) {
      appendLog(`Lỗi khi lấy thông tin hệ thống: ${err.message}`, 'error');
    }
  });

  // ==========================================
  // 3. Gửi tin nhắn 1 chiều (1-Way: send -> on)
  // ==========================================
  const btnSendPing = document.getElementById('btn-send-ping');
  const inputPingMsg = document.getElementById('input-ping-msg');

  btnSendPing.addEventListener('click', () => {
    const msg = inputPingMsg.value.trim();
    if (!msg) return;

    // Gửi sang Main Process qua kênh renderer:ping-main
    window.electronAPI.pingMain(msg);
    appendLog(`Đã bắn tín hiệu 1 chiều (send): "${msg}" -> Hãy xem Terminal Node.js!`, 'send');
  });

  // ==========================================
  // 4. Tính toán nặng 2 chiều (2-Way: invoke / handle)
  // ==========================================
  const btnCalcFib = document.getElementById('btn-calc-fib');
  const inputFibNum = document.getElementById('input-fib-num');
  const fibResultBox = document.getElementById('fib-result-box');

  btnCalcFib.addEventListener('click', async () => {
    const num = parseInt(inputFibNum.value, 10);
    if (isNaN(num)) return;

    try {
      appendLog(`Gửi yêu cầu invoke("math:fibonacci", ${num}) sang Node.js...`, 'send');
      fibResultBox.style.display = 'block';
      fibResultBox.textContent = '⏳ Node.js đang tính toán đệ quy ở Main Process...';

      const res = await window.electronAPI.calculateFibonacci(num);

      fibResultBox.textContent = `✅ Fibonacci(${res.input}) = ${res.result.toLocaleString()} (Thời gian tính: ${res.durationMs}ms)`;
      appendLog(`Kết quả tính toán nhận về: ${res.result} (${res.durationMs}ms)`, 'receive');
    } catch (err) {
      fibResultBox.textContent = `❌ Lỗi: ${err.message}`;
      appendLog(`Lỗi tính toán: ${err.message}`, 'error');
    }
  });

  // ==========================================
  // 5. Xóa nhật ký console
  // ==========================================
  const btnClearLogs = document.getElementById('btn-clear-logs');
  btnClearLogs.addEventListener('click', () => {
    const consoleBox = document.getElementById('console-logs');
    consoleBox.innerHTML = '';
    appendLog('Đã dọn dẹp nhật ký.', 'system');
  });

  // 6. Lấy thông tin thư mục user
  const btnGetHomeDir = document.getElementById('btn-get-home-dir');
  btnGetHomeDir.addEventListener('click', async () => {
  const homeDir = await window.electronAPI.getHomeDir();
  console.log("🚀 ~ homeDir:", homeDir);
  
  // Hiển thị đúng id home-dir-grid
  document.getElementById('home-dir-grid').style.display = 'grid';
  document.getElementById('val-home-dir').textContent = homeDir;
  
  // Ghi thêm log vào Terminal UI để trực quan
  appendLog(`Lấy đường dẫn User Home thành công: ${homeDir}`, 'receive');

  });

  // Lắng nghe tín hiệu kích hoạt từ Menu
  if (window.electronAPI.onMenuAction) {
    window.electronAPI.onMenuAction((message) => {
      appendLog(`[Native Menu Event]: ${message}`, 'receive');
    });
  }

    // ==========================================
  // 8. Mini Notepad: Mở file, Lưu file & Dialog xác nhận
  // ==========================================
  const btnOpenFile = document.getElementById('btn-open-file');
  const btnSaveFile = document.getElementById('btn-save-file');
  const btnShowInFolder = document.getElementById('btn-show-in-folder');
  const btnClearEditor = document.getElementById('btn-clear-editor');
  const editorTextarea = document.getElementById('editor-textarea');
  const filePathBadge = document.getElementById('file-path-badge');

  let currentActiveFilePath = null; // Lưu đường dẫn file hiện tại

  // Mở file
  btnOpenFile?.addEventListener('click', async () => {
    try {
      appendLog('Đang mở hộp thoại Native Open Dialog...', 'send');
      const res = await window.electronAPI.openFile();

      if (res.canceled) {
        appendLog('Người dùng đã hủy chọn file.', 'system');
        return;
      }

      currentActiveFilePath = res.filePath;
      editorTextarea.value = res.content;
      filePathBadge.textContent = `Đang mở: ${res.filePath}`;
      btnShowInFolder.style.display = 'inline-flex';
      appendLog(`Đã đọc thành công file: ${res.filePath} (${res.content.length} ký tự)`, 'receive');
    } catch (err) {
      appendLog(`Lỗi khi mở file: ${err.message}`, 'error');
    }
  });

  // Lưu file
  btnSaveFile?.addEventListener('click', async () => {
    try {
      const content = editorTextarea.value;
      appendLog('Đang mở hộp thoại Native Save Dialog...', 'send');
      const res = await window.electronAPI.saveFile(content);

      if (res.canceled) {
        appendLog('Người dùng đã hủy lưu file.', 'system');
        return;
      }

      currentActiveFilePath = res.filePath;
      filePathBadge.textContent = `Đã lưu vào: ${res.filePath}`;
      btnShowInFolder.style.display = 'inline-flex';
      appendLog(`Đã lưu tệp tin thành công tại: ${res.filePath}`, 'receive');
    } catch (err) {
      appendLog(`Lỗi khi lưu file: ${err.message}`, 'error');
    }
  });

  // Xem trong thư mục (Module shell.showItemInFolder)
  btnShowInFolder?.addEventListener('click', () => {
    if (currentActiveFilePath) {
      window.electronAPI.showInFolder(currentActiveFilePath);
      appendLog(`Mở File Explorer và bôi đen file: ${currentActiveFilePath}`, 'send');
    }
  });

  // Xóa trắng (Có hộp thoại native cảnh báo)
  btnClearEditor?.addEventListener('click', async () => {
    const isConfirmed = await window.electronAPI.confirmClear();
    if (isConfirmed) {
      editorTextarea.value = '';
      currentActiveFilePath = null;
      btnShowInFolder.style.display = 'none';
      filePathBadge.textContent = 'Chưa mở file nào';
      appendLog('Đã xóa trắng nội dung soạn thảo sau khi xác nhận.', 'system');
    } else {
      appendLog('Đã hủy thao tác xóa.', 'system');
    }
  });

  // ==========================================
  // 9. Module Shell: Mở URL ngoài, App Desktop & Beep
  // ==========================================
  const btnOpenSpotify = document.getElementById('btn-open-spotify');
  const btnOpenCalc = document.getElementById('btn-open-calc');
  const btnOpenDocs = document.getElementById('btn-open-docs');
  const btnBeep = document.getElementById('btn-beep');

  // Mở ứng dụng Spotify Desktop
  btnOpenSpotify?.addEventListener('click', () => {
    // Protocol URI 'spotify:' sẽ kích hoạt app Spotify trên máy tính
    window.electronAPI.openExternal('spotify:');
    appendLog('Đã gọi shell.openExternal("spotify:") -> Đang kích hoạt app Spotify!', 'send');
  });

  // Mở ứng dụng Máy tính Windows (Calculator)
  btnOpenCalc?.addEventListener('click', () => {
    // Protocol URI 'calculator:' sẽ mở app Máy tính Windows
    window.electronAPI.openExternal('calculator:');
    appendLog('Đã gọi shell.openExternal("calculator:") -> Đang mở Máy tính Windows!', 'send');
  });

  btnOpenDocs?.addEventListener('click', () => {
    const docsUrl = 'https://www.electronjs.org/docs/latest';
    window.electronAPI.openExternal(docsUrl);
    appendLog(`Đã yêu cầu OS mở trình duyệt ngoài tới: ${docsUrl}`, 'send');
  });

  btnBeep?.addEventListener('click', () => {
    window.electronAPI.beep();
    appendLog('Đã phát âm thanh Beep hệ thống!', 'send');
  });

  // ==========================================
  // 10. GIAI ĐOẠN 3 - BÀI 1: MULTI-WINDOW & SETTINGS SYNC
  // ==========================================
  const btnOpenSettingsHeader = document.getElementById('btn-open-settings-header');
  const btnOpenSettingsCard = document.getElementById('btn-open-settings-card');
  const userDisplayName = document.getElementById('user-display-name');
  const valActiveTheme = document.getElementById('val-active-theme');
  const valActiveUser = document.getElementById('val-active-user');
  const valActiveFontSize = document.getElementById('val-active-fontsize');
  const valSyncStatus = document.getElementById('val-sync-status');

  // Hàm áp dụng theme và cỡ chữ lên DOM
  function applyThemeAndConfig(config) {
    if (!config) return;

    // 1. Cập nhật CSS class trên <body>
    document.body.className = ''; // Xóa hết theme cũ
    if (config.theme) {
      document.body.classList.add(config.theme);
    }
    if (config.fontSize) {
      document.body.classList.add(config.fontSize);
    }

    // 2. Cập nhật thông tin hiển thị trên UI
    if (config.username) {
      if (userDisplayName) userDisplayName.textContent = config.username;
      if (valActiveUser) valActiveUser.textContent = config.username;
    }

    if (valActiveTheme) {
      const themeLabels = {
        'theme-default': 'Slate Tối (Mặc định)',
        'theme-cyberpunk': 'Cyberpunk Neon',
        'theme-emerald': 'Emerald Forest',
        'theme-sunset': 'Sunset Orange'
      };
      valActiveTheme.textContent = themeLabels[config.theme] || config.theme;
    }

    if (valActiveFontSize) {
      const sizeLabels = {
        'font-sm': 'Nhỏ gọn (13px)',
        'font-md': 'Tiêu chuẩn (14px)',
        'font-lg': 'Lớn (16px)'
      };
      valActiveFontSize.textContent = sizeLabels[config.fontSize] || config.fontSize;
    }

    if (valSyncStatus && config.updatedAt) {
      valSyncStatus.textContent = `🟢 Đã đồng bộ lúc ${config.updatedAt}`;
    }
  }

  // Nạp cấu hình ban đầu từ Main Process
  if (window.electronAPI.getSettings) {
    window.electronAPI.getSettings().then((initSettings) => {
      if (initSettings) applyThemeAndConfig(initSettings);
    }).catch(err => console.error('Lỗi khi nạp config ban đầu:', err));
  }

  // Mở cửa sổ Cài Đặt (Modal)
  const handleOpenSettings = async () => {
    try {
      appendLog('Đang gửi yêu cầu mở Cửa sổ Cài đặt con (Modal Window)...', 'send');
      await window.electronAPI.openSettings();
      appendLog('Cửa sổ Cài đặt (Settings Window) đã được kích hoạt thành công.', 'receive');
    } catch (err) {
      appendLog(`Lỗi khi mở Cửa sổ Cài đặt: ${err.message}`, 'error');
    }
  };

  btnOpenSettingsHeader?.addEventListener('click', handleOpenSettings);
  btnOpenSettingsCard?.addEventListener('click', handleOpenSettings);

  // Mở file config lưu trữ trên ổ cứng (app.getPath('userData'))
  const btnOpenConfigFolder = document.getElementById('btn-open-config-folder');
  btnOpenConfigFolder?.addEventListener('click', async () => {
    if (window.electronAPI.getStorePath) {
      const storePath = await window.electronAPI.getStorePath();
      if (storePath) {
        window.electronAPI.showInFolder(storePath);
        appendLog(`[Persistent Store] Mở File Explorer và bôi đen file: ${storePath}`, 'send');
      }
    }
  });

  // Lắng nghe sự kiện cấu hình thay đổi từ Main Process (Được phát tán khi cửa sổ Settings lưu)
  if (window.electronAPI.onSettingsChanged) {
    window.electronAPI.onSettingsChanged((newConfig) => {
      appendLog(`[Window-to-Window IPC] Nhận cấu hình mới từ Settings Modal: Theme=${newConfig.theme}, User=${newConfig.username}`, 'receive');
      applyThemeAndConfig(newConfig);
    });
  }

  // ==========================================
  // GIAI ĐOẠN 3 - BÀI 3: CUSTOM TITLEBAR HANDLERS
  // ==========================================
  const btnMin = document.getElementById('btn-window-minimize');
  const btnMax = document.getElementById('btn-window-maximize');
  const btnClose = document.getElementById('btn-window-close');
  const iconMax = document.getElementById('icon-maximize');
  const iconRestore = document.getElementById('icon-restore');
  const valWindowState = document.getElementById('val-window-state');

  // Nút demo trong Card Mục 7
  const btnDemoMin = document.getElementById('btn-demo-minimize');
  const btnDemoMax = document.getElementById('btn-demo-maximize');
  const btnDemoClose = document.getElementById('btn-demo-close');

  // 1. Xử lý Thu nhỏ
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
    appendLog('[Custom Titlebar] Gọi lệnh Thu nhỏ (Minimize) cửa sổ.', 'send');
  };
  btnMin?.addEventListener('click', handleMinimize);
  btnDemoMin?.addEventListener('click', handleMinimize);

  // 2. Xử lý Phóng to / Khôi phục
  const handleToggleMaximize = async () => {
    if (window.electronAPI?.toggleMaximizeWindow) {
      const isMax = await window.electronAPI.toggleMaximizeWindow();
      appendLog(`[Custom Titlebar] Chuyển đổi trạng thái phóng to: ${isMax ? 'Phóng to cực đại (Maximized)' : 'Kích thước bình thường (Restored)'}`, 'send');
    }
  };
  btnMax?.addEventListener('click', handleToggleMaximize);
  btnDemoMax?.addEventListener('click', handleToggleMaximize);

  // 3. Xử lý Đóng
  const handleClose = () => {
    appendLog('[Custom Titlebar] Gọi lệnh Đóng (Close) cửa sổ.', 'send');
    window.electronAPI?.closeWindow();
  };
  btnClose?.addEventListener('click', handleClose);
  btnDemoClose?.addEventListener('click', handleClose);

  // 4. Cập nhật Icon Maximize / Restore khi cửa sổ thay đổi trạng thái
  const updateMaximizeUI = (isMaximized) => {
    if (iconMax && iconRestore) {
      if (isMaximized) {
        iconMax.style.display = 'none';
        iconRestore.style.display = 'block';
        if (btnMax) btnMax.title = 'Khôi phục kích thước';
      } else {
        iconMax.style.display = 'block';
        iconRestore.style.display = 'none';
        if (btnMax) btnMax.title = 'Phóng to';
      }
    }
    if (valWindowState) {
      valWindowState.textContent = isMaximized ? '🔲 Đang Phóng To (Maximized)' : 'Bình thường (Normal)';
      valWindowState.style.color = isMaximized ? '#38bdf8' : '#34d399';
    }
  };

  // 5. Lắng nghe sự kiện từ Main Process
  if (window.electronAPI?.onMaximizeChange) {
    window.electronAPI.onMaximizeChange((isMaximized) => {
      appendLog(`[Window State Event] Trạng thái cửa sổ: ${isMaximized ? 'Maximized' : 'Normal'}`, 'receive');
      updateMaximizeUI(isMaximized);
    });
  }

  // 6. Kiểm tra trạng thái phóng to ban đầu khi khởi động
  if (window.electronAPI?.isWindowMaximized) {
    window.electronAPI.isWindowMaximized().then((isMax) => {
      updateMaximizeUI(isMax);
    }).catch(console.error);
  }

  // ==========================================
  // GIAI ĐOẠN 4 - BÀI 1: MULTI-TAB (WebContentsView) UI HANDLERS
  // ==========================================
  const tabsListEl = document.getElementById('tabsList');
  const newTabBtn = document.getElementById('newTabBtn');
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnBack = document.getElementById('btnBack');
  const btnForward = document.getElementById('btnForward');
  const btnReload = document.getElementById('btnReload');

  const valActiveTab = document.getElementById('val-active-tab');
  const valTotalTabs = document.getElementById('val-total-tabs');

  // Quick Action Buttons
  const btnOpenLocalNotes = document.getElementById('btn-open-local-notes');
  const btnQuickGoogle = document.getElementById('btn-quick-google');
  const btnQuickGithub = document.getElementById('btn-quick-github');
  const btnQuickWiki = document.getElementById('btn-quick-wiki');
  const btnQuickElectron = document.getElementById('btn-quick-electron');

  let currentActiveTabId = null;
  const tabsMap = new Map();

  // 1. Hàm render phần tử Tab trong DOM
  function renderTabElement(tab) {
    // Kiểm tra xem đã có node chưa
    let tabEl = document.getElementById(`tab-node-${tab.id}`);
    if (!tabEl) {
      tabEl = document.createElement('div');
      tabEl.id = `tab-node-${tab.id}`;
      tabsListEl.appendChild(tabEl);
    }

    tabEl.className = `tab-item ${tab.id === currentActiveTabId ? 'active' : ''}`;
    
    let icon = tab.isDashboard ? '🏠' : (tab.isLocalTab ? '📝' : (tab.isLoading ? '⏳' : '🌐'));
    let cleanTitle = (tab.title || (tab.isDashboard ? 'Dashboard Hệ Thống' : 'New Tab')).replace(/^[🏠📝🌐⏳]\s*/, '');
    let closeBtnHtml = tab.isDashboard ? '' : '<button class="tab-close-btn" title="Đóng tab">✕</button>';

    tabEl.innerHTML = `
      <span class="tab-icon">${icon}</span>
      <span class="tab-title" title="${cleanTitle}">${cleanTitle}</span>
      ${closeBtnHtml}
    `;

    // Click vào tab -> Chuyển sang Tab đó
    tabEl.onclick = (e) => {
      if (e.target.classList.contains('tab-close-btn')) return;
      window.electronAPI.switchTab(tab.id);
    };

    // Click nút [✕] -> Đóng tab
    const closeBtn = tabEl.querySelector('.tab-close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        window.electronAPI.closeTab(tab.id);
      };
    }

    return tabEl;
  }

  // Helper cập nhật badge tổng số tab
  function updateTotalTabsBadge() {
    if (valTotalTabs) {
      valTotalTabs.textContent = `${tabsMap.size} tab${tabsMap.size > 1 ? 's' : ''}`;
    }
  }

  // 2. Lắng nghe các sự kiện Multi-Tab từ Main Process qua Preload
  if (window.electronAPI?.onTabCreated) {
    window.electronAPI.onTabCreated((data) => {
      tabsMap.set(data.id, data);
      renderTabElement(data);
      updateTotalTabsBadge();
      appendLog(`[Multi-Tab] Đã tạo tab mới: ID ${data.id} ("${data.title}")`, 'receive');
    });
  }

  if (window.electronAPI?.onTabSwitched) {
    window.electronAPI.onTabSwitched((data) => {
      currentActiveTabId = data.id;
      if (urlInput) {
        urlInput.value = data.isDashboard ? 'app://dashboard' : (data.url || '');
      }
      if (valActiveTab) {
        valActiveTab.textContent = `ID ${data.id}: ${data.title}`;
      }

      // Cập nhật class active cho DOM
      document.querySelectorAll('.tab-item').forEach((el) => el.classList.remove('active'));
      const activeNode = document.getElementById(`tab-node-${data.id}`);
      if (activeNode) activeNode.classList.add('active');

      appendLog(`[Multi-Tab] Đã chuyển sang Active Tab: ID ${data.id} ("${data.title}")`, 'system');
    });
  }

  if (window.electronAPI?.onTabUpdated) {
    window.electronAPI.onTabUpdated((data) => {
      const tabData = tabsMap.get(data.id);
      if (tabData) {
        tabData.title = data.title;
        tabData.url = data.url;
        const tabNode = document.getElementById(`tab-node-${data.id}`);
        if (tabNode) {
          const titleEl = tabNode.querySelector('.tab-title');
          if (titleEl) {
            titleEl.textContent = data.title;
            titleEl.title = data.title;
          }
        }
        if (currentActiveTabId === data.id && urlInput) {
          urlInput.value = data.url;
          if (valActiveTab) {
            valActiveTab.textContent = `ID ${data.id}: ${data.title}`;
          }
        }
      }
    });
  }

  if (window.electronAPI?.onTabLoading) {
    window.electronAPI.onTabLoading((data) => {
      const tabData = tabsMap.get(data.id);
      if (tabData) {
        tabData.isLoading = data.isLoading;
        if (data.url) tabData.url = data.url;
      }
      const tabNode = document.getElementById(`tab-node-${data.id}`);
      if (tabNode) {
        const iconEl = tabNode.querySelector('.tab-icon');
        if (iconEl) {
          iconEl.textContent = data.isLoading ? '⏳' : (tabData?.isDashboard ? '🏠' : '🌐');
        }
      }
      if (data.url && currentActiveTabId === data.id && urlInput) {
        urlInput.value = data.url;
      }
    });
  }

  if (window.electronAPI?.onTabClosed) {
    window.electronAPI.onTabClosed((data) => {
      tabsMap.delete(data.id);
      const tabNode = document.getElementById(`tab-node-${data.id}`);
      if (tabNode) tabNode.remove();
      updateTotalTabsBadge();
      appendLog(`[Multi-Tab] Đã đóng Tab ID ${data.id}`, 'system');
    });
  }

  // 3. Xử lý các tương tác người dùng
  newTabBtn?.addEventListener('click', () => {
    appendLog('[Multi-Tab] Bấm nút [+] -> Yêu cầu tạo Tab mới...', 'send');
    window.electronAPI?.createTab('https://www.google.com');
  });

  urlForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (url) {
      appendLog(`[Multi-Tab] Điều hướng Tab ${currentActiveTabId} tới: "${url}"`, 'send');
      window.electronAPI?.navigateTab({ tabId: currentActiveTabId, action: 'loadURL', url });
    }
  });

  btnBack?.addEventListener('click', () => {
    window.electronAPI?.navigateTab({ tabId: currentActiveTabId, action: 'goBack' });
  });

  btnForward?.addEventListener('click', () => {
    window.electronAPI?.navigateTab({ tabId: currentActiveTabId, action: 'goForward' });
  });

  btnReload?.addEventListener('click', () => {
    window.electronAPI?.navigateTab({ tabId: currentActiveTabId, action: 'reload' });
  });

  // Quick Action Click Handlers
  btnOpenLocalNotes?.addEventListener('click', () => {
    appendLog('[Multi-Tab] Mở Tab tính năng nội bộ: "📝 Ghi Chú & Soạn Thảo" (notes.html)...', 'send');
    window.electronAPI?.createTab('app://notes');
  });

  btnQuickGoogle?.addEventListener('click', () => {
    window.electronAPI?.createTab('https://www.google.com');
  });

  btnQuickGithub?.addEventListener('click', () => {
    window.electronAPI?.createTab('https://github.com');
  });

  btnQuickWiki?.addEventListener('click', () => {
    window.electronAPI?.createTab('https://vi.wikipedia.org');
  });

  btnQuickElectron?.addEventListener('click', () => {
    window.electronAPI?.createTab('https://www.electronjs.org');
  });

  // Đồng bộ danh sách tab ban đầu nếu có sẵn
  if (window.electronAPI?.getTabsState) {
    window.electronAPI.getTabsState().then((existingTabs) => {
      if (Array.isArray(existingTabs) && existingTabs.length > 0) {
        existingTabs.forEach((t) => {
          tabsMap.set(t.id, t);
          renderTabElement(t);
          if (t.isActive) {
            currentActiveTabId = t.id;
            const activeNode = document.getElementById(`tab-node-${t.id}`);
            if (activeNode) activeNode.classList.add('active');
            if (urlInput) urlInput.value = t.url;
            if (valActiveTab) valActiveTab.textContent = `ID ${t.id}: ${t.title}`;
          }
        });
        updateTotalTabsBadge();
      }
    }).catch(console.error);
  }

  // ==========================================
  // GIAI ĐOẠN 4 - BÀI 2: BROADCASTCHANNEL WEB API & TAB-TO-TAB SYNC
  // ==========================================
  const inputBroadcastMsg = document.getElementById('input-broadcast-msg');
  const btnSendBroadcast = document.getElementById('btn-send-broadcast');
  const tabBroadcastFeed = document.getElementById('tab-broadcast-feed');
  const liveNotesSyncBadge = document.getElementById('live-notes-sync-badge');

  // Khởi tạo kênh BroadcastChannel chuẩn Web API (Renderer-to-Renderer)
  const liveChannel = new BroadcastChannel('app_live_channel');

  // Hàm vẽ tin nhắn vào Feed UI
  function appendBroadcastMessage(sender, text, timestamp, source = 'BroadcastChannel') {
    if (!tabBroadcastFeed) return;
    if (tabBroadcastFeed.querySelector('div[style*="font-style: italic"]')) {
      tabBroadcastFeed.innerHTML = '';
    }
    const msgEl = document.createElement('div');
    msgEl.style.padding = '4px 8px';
    msgEl.style.borderRadius = '4px';
    msgEl.style.background = 'rgba(168, 85, 247, 0.12)';
    msgEl.style.borderLeft = '3px solid #c084fc';
    msgEl.innerHTML = `
      <span style="color: #94a3b8;">[${timestamp}]</span> 
      <strong style="color: #c084fc;">${sender}:</strong> 
      <span style="color: #f1f5f9;">${text}</span>
      <span style="font-size: 10px; color: #a855f7; margin-left: 6px; opacity: 0.8;">(${source})</span>
    `;
    tabBroadcastFeed.appendChild(msgEl);
    tabBroadcastFeed.scrollTop = tabBroadcastFeed.scrollHeight;
  }

  // 1. Gửi tin nhắn qua BroadcastChannel Web API
  btnSendBroadcast?.addEventListener('click', () => {
    const text = inputBroadcastMsg?.value.trim();
    if (!text) return;

    const payload = {
      type: 'CHAT',
      sender: '🏠 Dashboard',
      text: text,
      timestamp: new Date().toLocaleTimeString('vi-VN')
    };

    // Bắn trực tiếp qua BroadcastChannel tới tất cả các Tab cùng Origin!
    liveChannel.postMessage(payload);

    // Hiển thị tin nhắn của chính mình
    appendBroadcastMessage('🏠 Bạn (Dashboard)', text, payload.timestamp, 'Native BroadcastChannel');

    // Đồng thời kích hoạt qua Main IPC để log lên Terminal
    window.electronAPI?.broadcastMessage?.(text);

    inputBroadcastMsg.value = '';
    appendLog(`[BroadcastChannel] Đã phát sóng tin: "${text}"`, 'send');
  });

  inputBroadcastMsg?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnSendBroadcast?.click();
    }
  });

  // 2. Lắng nghe trực tiếp qua BroadcastChannel Web API (Không qua Main Process!)
  liveChannel.onmessage = (event) => {
    const data = event.data;
    if (!data) return;

    // Xử lý sự kiện CHAT
    if (data.type === 'CHAT' && data.sender !== '🏠 Dashboard') {
      appendBroadcastMessage(data.sender, data.text, data.timestamp, 'Native BroadcastChannel P2P');
      appendLog(`[BroadcastChannel P2P] Nhận tin từ "${data.sender}": "${data.text}"`, 'receive');
    }

    // Xử lý sự kiện Realtime Typing Stats từ Tab Ghi Chú
    if (data.type === 'NOTES_TYPING' && liveNotesSyncBadge) {
      liveNotesSyncBadge.textContent = `📝 Đang soạn thảo: ${data.words} từ • ${data.chars} ký tự • ${data.lines} dòng (Cập nhật ${data.timestamp})`;
      liveNotesSyncBadge.style.color = '#34d399';
    }

    // Xử lý sự kiện đổi Theme từ Cửa sổ Settings qua BroadcastChannel
    if (data.type === 'THEME_SYNC') {
      appendLog(`[BroadcastChannel] Nhận lệnh đổi theme trực tiếp: "${data.theme}"`, 'receive');
    }
  };
});


