import React, { useState, useEffect } from 'react';
import { X, Palette, User, Check } from 'lucide-react';
import { AppSettings } from '../../../preload';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (theme: string) => void;
  onUsernameChange: (username: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onThemeChange,
  onUsernameChange,
}) => {
  const [username, setUsername] = useState('Electron Explorer');
  const [selectedTheme, setSelectedTheme] = useState('theme-default');
  const [fontSize, setFontSize] = useState('font-md');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.electronAPI?.getSettings?.().then((cfg) => {
        if (cfg) {
          if (cfg.username) setUsername(cfg.username);
          if (cfg.theme) setSelectedTheme(cfg.theme);
          if (cfg.fontSize) setFontSize(cfg.fontSize);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const newSettings: AppSettings = {
      username,
      theme: selectedTheme,
      fontSize,
      updatedAt: timestamp,
    };

    // ⚡ 1. Đồng bộ tức thì qua HTML5 BroadcastChannel Web API (Renderer-to-Renderer)
    const liveChannel = new BroadcastChannel('app_live_channel');
    liveChannel.postMessage({
      type: 'THEME_SYNC',
      theme: selectedTheme,
      timestamp,
    });
    liveChannel.close();

    // 2. Cập nhật state nội bộ React
    onThemeChange(selectedTheme);
    onUsernameChange(username);

    // 3. Gửi về Main Process qua IPC để lưu bền vững vào đĩa cứng (JSON store)
    await window.electronAPI?.saveSettings?.(newSettings);

    setSaveStatus(`✅ Đã lưu & đồng bộ Theme "${selectedTheme}" lúc ${timestamp}!`);
    setTimeout(() => {
      setSaveStatus(null);
      onClose();
    }, 1200);
  };

  const themes = [
    { id: 'theme-default', name: 'Slate Tối (Mặc định)', color: '#38bdf8', border: '#0284c7' },
    { id: 'theme-cyberpunk', name: 'Cyberpunk Neon', color: '#ec4899', border: '#f43f5e' },
    { id: 'theme-emerald', name: 'Emerald Matrix', color: '#10b981', border: '#059669' },
    { id: 'theme-sunset', name: 'Sunset Glow', color: '#f97316', border: '#ea580c' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: '460px',
          maxWidth: '90%',
          background: '#090d16',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={20} color="#38bdf8" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>Cài Đặt & Giao Diện (Settings)</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Username */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
            <User size={13} style={{ display: 'inline', marginRight: '6px' }} /> Tên Người Dùng:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              background: '#030712',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#f8fafc',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Theme Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
            Chủ Đề (Theme Color):
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTheme(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '8px',
                  background: selectedTheme === t.id ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: selectedTheme === t.id ? `2px solid ${t.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: t.color }} />
                <span style={{ flex: 1 }}>{t.name}</span>
                {selectedTheme === t.id && <Check size={14} color={t.color} />}
              </div>
            ))}
          </div>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              fontSize: '12px',
              marginBottom: '14px',
              textAlign: 'center',
            }}
          >
            {saveStatus}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy Bỏ
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Áp Dụng & Đồng Bộ
          </button>
        </div>
      </div>
    </div>
  );
};
