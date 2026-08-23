import React, { useState, useEffect } from 'react';
import { TabData } from '../../../preload';
import { Plus, ArrowLeft, ArrowRight, RotateCw, Globe, Home, FileText, X, Lock } from 'lucide-react';

interface TabBarProps {
  onOpenLocalNotes: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ onOpenLocalNotes }) => {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [urlInputValue, setUrlInputValue] = useState<string>('app://dashboard');

  useEffect(() => {
    // 1. Đồng bộ danh sách tab ban đầu
    window.electronAPI?.getTabsState?.().then((existingTabs) => {
      if (Array.isArray(existingTabs) && existingTabs.length > 0) {
        setTabs(existingTabs);
        const active = existingTabs.find((t) => t.isActive);
        if (active) {
          setActiveTabId(active.id);
          setUrlInputValue(active.url);
        }
      }
    });

    // 2. Lắng nghe các sự kiện tab từ Main Process
    const unsubCreated = window.electronAPI?.onTabCreated?.((newTab) => {
      setTabs((prev) => [...prev.filter((t) => t.id !== newTab.id), newTab]);
    });

    const unsubSwitched = window.electronAPI?.onTabSwitched?.((switchedTab) => {
      setActiveTabId(switchedTab.id);
      setUrlInputValue(switchedTab.url);
    });

    const unsubUpdated = window.electronAPI?.onTabUpdated?.((updatedTab) => {
      setTabs((prev) => prev.map((t) => (t.id === updatedTab.id ? { ...t, ...updatedTab } : t)));
      if (updatedTab.id === activeTabId && updatedTab.url) {
        setUrlInputValue(updatedTab.url);
      }
    });

    const unsubClosed = window.electronAPI?.onTabClosed?.((closed) => {
      setTabs((prev) => prev.filter((t) => t.id !== closed.id));
    });

    const unsubLoading = window.electronAPI?.onTabLoading?.((loading) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === loading.id ? { ...t, isLoading: loading.isLoading } : t))
      );
    });

    return () => {
      unsubCreated?.();
      unsubSwitched?.();
      unsubUpdated?.();
      unsubClosed?.();
      unsubLoading?.();
    };
  }, [activeTabId]);

  const handleCreateNewTab = (url = 'https://www.google.com') => {
    window.electronAPI?.createTab?.(url);
  };

  const handleSwitchTab = (id: number) => {
    window.electronAPI?.switchTab?.(id);
  };

  const handleCloseTab = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    window.electronAPI?.closeTab?.(id);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInputValue.trim()) return;
    window.electronAPI?.navigateTab?.({
      tabId: activeTabId,
      action: 'loadURL',
      url: urlInputValue,
    });
  };

  const handleNavAction = (action: 'goBack' | 'goForward' | 'reload') => {
    window.electronAPI?.navigateTab?.({ tabId: activeTabId, action });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '36px',
        left: 0,
        right: 0,
        height: '80px',
        background: '#070b14',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9998,
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
      }}
    >
      {/* 1. Tab Bar */}
      <div
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: '6px',
          overflowX: 'auto',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const cleanTitle = (tab.title || (tab.isDashboard ? 'Dashboard' : 'New Tab')).replace(/^[🏠📝🌐⏳]\s*/, '');

          return (
            <div
              key={tab.id}
              onClick={() => handleSwitchTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                height: '32px',
                borderRadius: '6px 6px 0 0',
                background: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#38bdf8' : '#94a3b8',
                border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                borderBottom: 'none',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                maxWidth: '180px',
                minWidth: '110px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              {tab.isDashboard ? (
                <Home size={14} color="#38bdf8" />
              ) : tab.isLocalTab ? (
                <FileText size={14} color="#a855f7" />
              ) : (
                <Globe size={14} color="#34d399" />
              )}

              <span
                style={{
                  flex: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {cleanTitle}
              </span>

              {!tab.isDashboard && (
                <button
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  title="Đóng tab"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* Plus Button */}
        <button
          onClick={() => handleCreateNewTab('https://www.google.com')}
          title="Mở tab mới (Web View)"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 2. Navigation & Address Bar */}
      <div
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => handleNavAction('goBack')}
            title="Quay lại (Back)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => handleNavAction('goForward')}
            title="Tiến lên (Forward)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => handleNavAction('reload')}
            title="Tải lại (Reload)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <RotateCw size={14} />
          </button>
        </div>

        {/* Address Bar Form */}
        <form onSubmit={handleNavigate} style={{ flex: 1, display: 'flex', gap: '8px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: '#030712',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              padding: '0 10px',
              gap: '8px',
            }}
          >
            <Lock size={12} color="#34d399" />
            <input
              type="text"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              placeholder="Nhập URL (ví dụ: google.com, github.com)..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#f1f5f9',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '4px 12px', fontSize: '12px' }}
          >
            Truy cập
          </button>
        </form>
      </div>
    </div>
  );
};
