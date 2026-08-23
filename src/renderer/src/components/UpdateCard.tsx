import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, CheckCircle, AlertCircle, ArrowUpCircle, GitBranch, Sparkles } from 'lucide-react';

interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export const UpdateCard: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [newVersionInfo, setNewVersionInfo] = useState<{ version: string; releaseDate?: string } | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Lấy version hiện tại từ app
    window.electronAPI?.getSystemInfo?.().then((info) => {
      if (info?.appVersion) setCurrentVersion(info.appVersion);
    });

    // Lắng nghe các sự kiện Auto-Updater từ Main Process
    const unsubChecking = window.electronAPI?.onUpdateChecking?.(() => {
      setUpdateStatus('checking');
      setErrorMessage(null);
    });

    const unsubAvailable = window.electronAPI?.onUpdateAvailable?.((info) => {
      setUpdateStatus('available');
      setNewVersionInfo(info);
    });

    const unsubNotAvailable = window.electronAPI?.onUpdateNotAvailable?.(() => {
      setUpdateStatus('not-available');
    });

    const unsubProgress = window.electronAPI?.onUpdateDownloadProgress?.((p) => {
      setUpdateStatus('downloading');
      setProgress(p);
    });

    const unsubDownloaded = window.electronAPI?.onUpdateDownloaded?.((info) => {
      setUpdateStatus('downloaded');
      setNewVersionInfo(info);
    });

    const unsubError = window.electronAPI?.onUpdateError?.((err) => {
      setUpdateStatus('error');
      setErrorMessage(err);
    });

    return () => {
      unsubChecking?.();
      unsubAvailable?.();
      unsubNotAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setErrorMessage(null);
    const res = await window.electronAPI?.checkForUpdates?.();
    if (res?.isDev) {
      // Trong môi trường Dev, thông báo rõ ràng cho người dùng
      setTimeout(() => {
        setUpdateStatus('not-available');
      }, 800);
    }
  };

  const handleQuitAndInstall = () => {
    window.electronAPI?.quitAndInstallUpdate?.();
  };

  // Nút giả lập tải bản cập nhật để trải nghiệm UI ngay trong Dev Mode
  const handleSimulateUpdate = () => {
    setUpdateStatus('available');
    setNewVersionInfo({ version: '1.1.0', releaseDate: new Date().toLocaleDateString('vi-VN') });

    let currentPercent = 0;
    const interval = setInterval(() => {
      currentPercent += 15;
      if (currentPercent >= 100) {
        clearInterval(interval);
        setProgress({ percent: 100, bytesPerSecond: 2500000, transferred: 78451200, total: 78451200 });
        setUpdateStatus('downloaded');
      } else {
        setUpdateStatus('downloading');
        setProgress({
          percent: currentPercent,
          bytesPerSecond: 2500000,
          transferred: Math.round((78451200 * currentPercent) / 100),
          total: 78451200,
        });
      }
    }, 400);
  };

  return (
    <section className="glass-card" style={{ border: '1px solid rgba(56, 189, 248, 0.25)' }}>
      {/* Header Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(56, 189, 248, 0.2))',
              color: '#38bdf8',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
            }}
          >
            <ArrowUpCircle size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                Tự Động Cập Nhật (Auto-Updater & GitHub Releases)
              </h2>
              <span
                className="badge"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                v{currentVersion}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Kết nối kho lưu trữ: <a href="https://github.com/LeThangUIT/electron-quickstart" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>LeThangUIT/electron-quickstart</a>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSimulateUpdate}
            className="btn btn-secondary"
            title="Thử nghiệm hiệu ứng tải cập nhật"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Sparkles size={13} color="#fbbf24" /> Giả Lập Tải Cập Nhật
          </button>
          <button
            onClick={handleCheckUpdate}
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <RefreshCw size={13} className={updateStatus === 'checking' ? 'spin' : ''} />
            {updateStatus === 'checking' ? 'Đang kiểm tra...' : 'Kiểm Tra Bản Mới'}
          </button>
        </div>
      </div>

      {/* Status Box */}
      <div
        style={{
          background: 'rgba(7, 11, 20, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {updateStatus === 'idle' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px' }}>
            <GitBranch size={16} color="#38bdf8" />
            <span>Sẵn sàng kiểm tra phiên bản mới từ GitHub Releases.</span>
          </div>
        )}

        {updateStatus === 'checking' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontSize: '13px' }}>
            <span className="pulsing-dot" style={{ background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
            <span>Đang gửi yêu cầu kiểm tra file <code>latest.yml</code> trên GitHub Releases...</span>
          </div>
        )}

        {updateStatus === 'not-available' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '13px' }}>
            <CheckCircle size={16} color="#34d399" />
            <span>Bạn đang sử dụng phiên bản mới nhất (<strong>v{currentVersion}</strong>). Không cần cập nhật!</span>
          </div>
        )}

        {updateStatus === 'available' && newVersionInfo && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fbbf24', fontSize: '13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={16} color="#fbbf24" />
              <span>Phát hiện bản phát hành mới: <strong>v{newVersionInfo.version}</strong>! Đang bắt đầu tải ngầm...</span>
            </div>
          </div>
        )}

        {updateStatus === 'downloading' && progress && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                ⏳ Đang tải bản cập nhật: {progress.percent}%
              </span>
              <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                {(progress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s • {(progress.transferred / 1024 / 1024).toFixed(1)}MB / {(progress.total / 1024 / 1024).toFixed(1)}MB
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress.percent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 10px #38bdf8',
                }}
              />
            </div>
          </div>
        )}

        {updateStatus === 'downloaded' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '13px' }}>
              <CheckCircle size={18} color="#34d399" />
              <span>
                🎉 Bản cập nhật <strong>v{newVersionInfo?.version || '1.1.0'}</strong> đã được tải xong vào máy!
              </span>
            </div>
            <button
              onClick={handleQuitAndInstall}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', fontSize: '12px', padding: '6px 14px' }}
            >
              🔄 Khởi Động Lại & Nâng Cấp Ngay
            </button>
          </div>
        )}

        {updateStatus === 'error' && errorMessage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontSize: '13px' }}>
            <AlertCircle size={16} color="#f87171" />
            <span>Lỗi cập nhật: {errorMessage}</span>
          </div>
        )}
      </div>
    </section>
  );
};
