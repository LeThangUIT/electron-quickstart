/**
 * SETTINGS MODAL RENDERER SCRIPT
 * Quản lý tương tác trên giao diện Cài đặt và gửi dữ liệu về Main Process
 */

document.addEventListener('DOMContentLoaded', async () => {
  const inputUsername = document.getElementById('input-username');
  const themeRadios = document.getElementsByName('app-theme');
  const selectFontSize = document.getElementById('select-font-size');
  const btnSave = document.getElementById('btn-save-settings');
  const btnCancel = document.getElementById('btn-cancel');
  const statusToast = document.getElementById('status-toast');

  // 1. Tải cấu hình hiện tại từ Main Process khi mở cửa sổ
  try {
    if (window.electronAPI && window.electronAPI.getSettings) {
      const currentSettings = await window.electronAPI.getSettings();
      if (currentSettings) {
        if (currentSettings.username) inputUsername.value = currentSettings.username;
        if (currentSettings.fontSize) selectFontSize.value = currentSettings.fontSize;
        if (currentSettings.theme) {
          for (const radio of themeRadios) {
            if (radio.value === currentSettings.theme) {
              radio.checked = true;
              break;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Không thể nạp cấu hình hiện tại:', err);
  }

  // 2. Xử lý bấm nút "Áp Dụng & Đồng Bộ"
  btnSave.addEventListener('click', async () => {
    let selectedTheme = 'theme-default';
    for (const radio of themeRadios) {
      if (radio.checked) {
        selectedTheme = radio.value;
        break;
      }
    }

    const settingsData = {
      username: inputUsername.value.trim() || 'Người dùng Electron',
      theme: selectedTheme,
      fontSize: selectFontSize.value,
      updatedAt: new Date().toLocaleTimeString('vi-VN')
    };

    // ⚡ Phát sóng đổi theme trực tiếp qua HTML5 BroadcastChannel Web API (Renderer-to-Renderer)
    const liveChannel = new BroadcastChannel('app_live_channel');
    liveChannel.postMessage({
      type: 'THEME_SYNC',
      theme: selectedTheme,
      timestamp: settingsData.updatedAt
    });

    try {
      btnSave.disabled = true;
      btnSave.innerText = 'Đang lưu...';

      // Gửi cấu hình về Main Process qua IPC 2 chiều để lưu vào đĩa cứng
      await window.electronAPI.saveSettings(settingsData);

      // Hiển thị thông báo thành công
      statusToast.style.display = 'block';
      statusToast.innerText = `✅ Đã lưu & đồng bộ Theme "${selectedTheme}" lúc ${settingsData.updatedAt}!`;

      setTimeout(() => {
        statusToast.style.display = 'none';
        btnSave.disabled = false;
        btnSave.innerHTML = '<span>💾</span> Áp Dụng & Đồng Bộ';
      }, 1500);
    } catch (error) {
      alert('Lỗi khi lưu cấu hình: ' + error.message);
      btnSave.disabled = false;
      btnSave.innerHTML = '<span>💾</span> Áp Dụng & Đồng Bộ';
    }
  });

  // 3. Xử lý bấm nút "Đóng"
  btnCancel.addEventListener('click', async () => {
    if (window.electronAPI && window.electronAPI.closeSettings) {
      await window.electronAPI.closeSettings();
    } else {
      window.close();
    }
  });
});
