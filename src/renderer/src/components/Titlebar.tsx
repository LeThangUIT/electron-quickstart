import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Zap } from 'lucide-react';

export const Titlebar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Lắng nghe sự kiện maximize/unmaximize từ Main Process
    const unsubscribe = window.electronAPI?.onMaximizedState?.((maxState) => {
      setIsMaximized(maxState);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = async () => {
    const res = await window.electronAPI?.maximizeWindow();
    if (typeof res === 'boolean') {
      setIsMaximized(res);
    } else if (res && typeof res.isMaximized === 'boolean') {
      setIsMaximized(res.isMaximized);
    }
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '36px',
        background: '#040711',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '12px',
        zIndex: 9999,
        // @ts-ignore
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      {/* App Logo & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)',
            color: '#fff',
            borderRadius: '4px',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Zap size={13} fill="#fff" />
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', letterSpacing: '0.3px' }}>
          Electron Masterclass <span style={{ color: '#38bdf8', fontWeight: 700 }}>+ React & Vite (HMR)</span>
        </span>
      </div>

      {/* Window Controls */}
      <div
        style={{
          display: 'flex',
          height: '100%',
          // @ts-ignore
          WebkitAppRegion: 'no-drag',
        }}
      >
        <button
          onClick={handleMinimize}
          title="Thu nhỏ"
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Minus size={14} />
        </button>

        <button
          onClick={handleMaximize}
          title={isMaximized ? 'Khôi phục' : 'Phóng to'}
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>

        <button
          onClick={handleClose}
          title="Đóng ứng dụng"
          style={{
            width: '46px',
            height: '100%',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e11d48';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#94a3b8';
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
