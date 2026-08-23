import React, { useState, useEffect } from 'react';
import { Titlebar } from './components/Titlebar';
import { TabBar } from './components/TabBar';
import { Dashboard } from './components/Dashboard';
import { BroadcastCard } from './components/BroadcastCard';
import { UpdateCard } from './components/UpdateCard';
import { SettingsModal } from './components/SettingsModal';
import { Settings, Zap, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [username, setUsername] = useState('Electron Explorer');
  const [theme, setTheme] = useState('theme-default');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [heartbeatTime, setHeartbeatTime] = useState('Đang kết nối...');

  useEffect(() => {
    // 1. Áp dụng theme class vào thẻ body
    document.body.className = theme;

    // 2. Lấy cấu hình ban đầu
    window.electronAPI?.getSettings?.().then((cfg) => {
      if (cfg) {
        if (cfg.username) setUsername(cfg.username);
        if (cfg.theme) {
          setTheme(cfg.theme);
          document.body.className = cfg.theme;
        }
      }
    });

    // 3. Lắng nghe cập nhật settings từ IPC Broadcast
    const unsubSettings = window.electronAPI?.onSettingsChanged?.((newSettings) => {
      if (newSettings?.theme) {
        setTheme(newSettings.theme);
        document.body.className = newSettings.theme;
      }
      if (newSettings?.username) {
        setUsername(newSettings.username);
      }
    });

    // 4. Lắng nghe trực tiếp qua HTML5 BroadcastChannel Web API
    const liveChannel = new BroadcastChannel('app_live_channel');
    liveChannel.onmessage = (event) => {
      if (event.data?.type === 'THEME_SYNC' && event.data.theme) {
        setTheme(event.data.theme);
        document.body.className = event.data.theme;
      }
    };

    // 5. Polling Heartbeat
    const interval = setInterval(() => {
      window.electronAPI?.getHeartbeat?.().then((time) => {
        if (time) setHeartbeatTime(time);
      });
    }, 1000);

    return () => {
      unsubSettings?.();
      liveChannel.close();
      clearInterval(interval);
    };
  }, [theme]);

  const handleOpenLocalNotes = () => {
    window.electronAPI?.createTab?.('app://notes');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Custom Frameless Titlebar */}
      <Titlebar />

      {/* 2. Chrome-style Multi-Tab Bar & Address Bar */}
      <TabBar onOpenLocalNotes={handleOpenLocalNotes} />

      {/* 3. Main Dashboard Body */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', padding: '24px', flex: 1 }}>
        {/* Top Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.4)',
              }}
            >
              <Zap size={24} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                Electron.js Masterclass
              </h1>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                Giai Đoạn 6: Auto-Updater & GitHub Releases (LeThangUIT) 🚀
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* User Profile Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#e2e8f0',
              }}
            >
              <span className="pulsing-dot" />
              <span>{username}</span>
            </div>

            {/* Heartbeat Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '20px',
                padding: '6px 12px',
                fontSize: '11px',
                color: '#34d399',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <ShieldCheck size={13} />
              <span>Main IPC: {heartbeatTime}</span>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              <Settings size={14} /> Cài Đặt
            </button>
          </div>
        </header>

        {/* 4. Auto-Updater Card (Giai đoạn 6) */}
        <div style={{ marginBottom: '20px' }}>
          <UpdateCard />
        </div>

        {/* 5. Dashboard Features Grid */}
        <Dashboard />

        {/* 6. BroadcastChannel Web API Live Messenger */}
        <div style={{ marginTop: '20px' }}>
          <BroadcastCard />
        </div>
      </div>

      {/* 6. Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onThemeChange={(newTheme) => {
          setTheme(newTheme);
          document.body.className = newTheme;
        }}
        onUsernameChange={(newName) => setUsername(newName)}
      />
    </div>
  );
};
