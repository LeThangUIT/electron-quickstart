import React, { useState } from 'react';
import { Cpu, Calculator, FileEdit, ExternalLink, HardDrive, Terminal, Zap, BookOpen } from 'lucide-react';
import { SystemInfo } from '../../../preload';

export const Dashboard: React.FC = () => {
  const [sysInfo, setSysInfo] = useState<SystemInfo | null>(null);
  const [isLoadingSysInfo, setIsLoadingSysInfo] = useState(false);

  // Fibonacci State
  const [fibInput, setFibInput] = useState(38);
  const [fibResult, setFibResult] = useState<{ num: number; result: number; time: string } | null>(null);
  const [isCalc, setIsCalc] = useState(false);

  // Mini File Editor State
  const [fileContent, setFileContent] = useState('');
  const [filePath, setFilePath] = useState('Chưa lưu file');

  const handleFetchSystemInfo = async () => {
    setIsLoadingSysInfo(true);
    try {
      const info = await window.electronAPI?.getSystemInfo?.();
      if (info) setSysInfo(info);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSysInfo(false);
    }
  };

  const handleCalcFibonacci = () => {
    setIsCalc(true);
    const start = performance.now();
    
    // Thuật toán Fibonacci đệ quy
    const fib = (n: number): number => (n <= 1 ? n : fib(n - 1) + fib(n - 2));
    const result = fib(fibInput);
    const end = performance.now();

    setFibResult({
      num: fibInput,
      result,
      time: `${(end - start).toFixed(2)}ms`,
    });
    setIsCalc(false);
  };

  const handleSaveFile = async () => {
    if (!fileContent.trim()) {
      alert('Vui lòng nhập nội dung trước khi lưu!');
      return;
    }
    const res = await window.electronAPI?.saveFile?.(fileContent);
    if (res?.success && res.filePath) {
      setFilePath(res.filePath);
      alert(`Đã lưu file thành công: ${res.filePath}`);
    }
  };

  const handleQuickTab = (url: string) => {
    window.electronAPI?.createTab?.(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Quick Launch Action Bar */}
      <section className="glass-card" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>🚀 Khởi Chạy Nhanh:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleQuickTab('app://notes')}
              className="btn btn-purple"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              📝 Mở Tab Ghi Chú (Local View)
            </button>
            <button
              onClick={() => handleQuickTab('https://www.google.com')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              🔍 Google
            </button>
            <button
              onClick={() => handleQuickTab('https://github.com')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              🐙 GitHub
            </button>
            <button
              onClick={() => handleQuickTab('https://www.electronjs.org')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              ⚡ Electron Docs
            </button>
          </div>
        </div>
      </section>

      {/* Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Card 1: System Info (IPC 2-Way) */}
        <section className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                padding: '8px',
                borderRadius: '10px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
              }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                Thông Tin Hệ Thống (IPC 2-Way)
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                Gọi <code>invoke('system:get-info')</code> để lấy RAM, CPU từ Node.js.
              </p>
            </div>
          </div>

          <button
            onClick={handleFetchSystemInfo}
            disabled={isLoadingSysInfo}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: sysInfo ? '16px' : '0' }}
          >
            <Zap size={14} /> {isLoadingSysInfo ? 'Đang đọc OS...' : 'Lấy Thông Tin Hệ Thống Ngay'}
          </button>

          {sysInfo && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Hệ điều hành:</span>
                <strong style={{ color: '#f1f5f9' }}>{sysInfo.platform} ({sysInfo.osRelease})</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>RAM Khả dụng:</span>
                <strong style={{ color: '#34d399' }}>{sysInfo.freeMemory} / {sysInfo.totalMemory}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>CPU:</span>
                <strong style={{ color: '#f1f5f9' }}>{sysInfo.cpuModel} ({sysInfo.cpuCores} cores)</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', display: 'block' }}>Electron / Node:</span>
                <strong style={{ color: '#38bdf8' }}>v{sysInfo.electronVersion} / v{sysInfo.nodeVersion}</strong>
              </div>
            </div>
          )}
        </section>

        {/* Card 2: Fibonacci Calculation Lab */}
        <section className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                padding: '8px',
                borderRadius: '10px',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
              }}
            >
              <Calculator size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                Thử Nghiệm Tính Toán Fibonacci
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                Đo lường thời gian thực thi thuật toán nặng trong React/Electron.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <input
              type="number"
              value={fibInput}
              min={1}
              max={43}
              onChange={(e) => setFibInput(Number(e.target.value))}
              style={{
                width: '80px',
                background: '#070b14',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#f1f5f9',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCalcFibonacci}
              disabled={isCalc}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {isCalc ? 'Đang tính toán...' : `Tính Fibonacci(F${fibInput})`}
            </button>
          </div>

          {fibResult && (
            <div
              style={{
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#e2e8f0' }}>
                Kết quả F({fibResult.num}) = <strong style={{ color: '#34d399' }}>{fibResult.result.toLocaleString()}</strong>
              </span>
              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>⚡ {fibResult.time}</span>
            </div>
          )}
        </section>

        {/* Card 3: Mini Notepad & Native File Dialog */}
        <section className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  color: '#f97316',
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  display: 'flex',
                }}
              >
                <FileEdit size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  Mini Notepad: Hộp Thoại Native & Đọc/Ghi File
                </h2>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Giao tiếp qua <code>dialog.showSaveDialog</code> & Node.js <code>fs.promises</code>.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setFileContent('')} className="btn btn-secondary" style={{ fontSize: '12px' }}>
                🧹 Xóa Trắng
              </button>
              <button onClick={handleSaveFile} className="btn btn-primary" style={{ fontSize: '12px' }}>
                💾 Lưu Ra File Vật Lý
              </button>
            </div>
          </div>

          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
            📁 File: {filePath}
          </div>

          <textarea
            value={fileContent}
            onChange={(e) => setFileContent(e.target.value)}
            placeholder="Nhập nội dung ghi chú tại đây... Bấm 'Lưu Ra File Vật Lý' để mở hộp thoại lưu file của Windows!"
            style={{
              width: '100%',
              height: '100px',
              background: 'rgba(7, 11, 20, 0.8)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </section>
      </div>
    </div>
  );
};
