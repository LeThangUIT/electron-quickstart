import React, { useState, useEffect, useRef } from 'react';
import { Radio, Send, Activity } from 'lucide-react';

interface BroadcastMessage {
  sender: string;
  text: string;
  timestamp: string;
  source: string;
}

export const BroadcastCard: React.FC = () => {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [notesStatus, setNotesStatus] = useState<string>('Chưa có hoạt động gõ phím');
  const liveChannelRef = useRef<BroadcastChannel | null>(null);
  const feedBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ⚡ Khởi tạo kênh BroadcastChannel chuẩn HTML5 Web API
    const liveChannel = new BroadcastChannel('app_live_channel');
    liveChannelRef.current = liveChannel;

    liveChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      // 1. Nhận tin nhắn Chat
      if (data.type === 'CHAT' && data.sender !== '🏠 Dashboard (React)') {
        setMessages((prev) => [
          ...prev,
          {
            sender: data.sender,
            text: data.text,
            timestamp: data.timestamp,
            source: 'BroadcastChannel P2P',
          },
        ]);
      }

      // 2. Nhận Live Typing Stats từ Tab Ghi Chú
      if (data.type === 'NOTES_TYPING') {
        setNotesStatus(
          `📝 Đang gõ: ${data.words} từ • ${data.chars} ký tự • ${data.lines} dòng (Cập nhật lúc ${data.timestamp})`
        );
      }
    };

    return () => {
      liveChannel.close();
    };
  }, []);

  useEffect(() => {
    feedBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    const timestamp = new Date().toLocaleTimeString('vi-VN');
    const payload = {
      type: 'CHAT',
      sender: '🏠 Dashboard (React)',
      text,
      timestamp,
    };

    // Bắn qua HTML5 BroadcastChannel Web API (Renderer-to-Renderer)
    liveChannelRef.current?.postMessage(payload);

    // Bắn thêm qua Main IPC để log ra terminal
    window.electronAPI?.broadcastMessage?.(text);

    // Hiển thị tin nhắn của chính mình
    setMessages((prev) => [
      ...prev,
      {
        sender: '🏠 Bạn (Dashboard React)',
        text,
        timestamp,
        source: 'Native BroadcastChannel',
      },
    ]);

    setInputText('');
  };

  return (
    <section className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              padding: '8px',
              borderRadius: '10px',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              display: 'flex',
            }}
          >
            <Radio size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              BroadcastChannel Web API & Inter-Tab Sync
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              Giao tiếp P2P thời gian thực giữa các Tab React/HTML mà <strong>không cần qua Main Process</strong>.
            </p>
          </div>
        </div>

        <span
          className="badge"
          style={{
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#c084fc',
          }}
        >
          ⚡ HTML5 BroadcastChannel
        </span>
      </div>

      {/* Live Notes Typing Indicator */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} color="#34d399" />
          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>Theo dõi Tab Ghi Chú (Realtime):</span>
        </div>
        <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 500 }}>{notesStatus}</span>
      </div>

      {/* Input Message */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn để bắn qua BroadcastChannel('app_live_channel')..."
          style={{
            flex: 1,
            background: '#070b14',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f1f5f9',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn btn-purple"
          style={{ whiteSpace: 'nowrap' }}
        >
          <Send size={14} /> ⚡ Bắn Tin
        </button>
      </form>

      {/* Message Feed */}
      <div
        style={{
          background: '#030712',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '12px',
          minHeight: '90px',
          maxHeight: '140px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ color: '#64748b', fontStyle: 'italic' }}>
            Chưa có tin nhắn nào trên BroadcastChannel. Hãy nhập tin nhắn bên trên hoặc mở Tab Ghi Chú!
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                background: 'rgba(168, 85, 247, 0.12)',
                borderLeft: '3px solid #c084fc',
              }}
            >
              <span style={{ color: '#94a3b8' }}>[{msg.timestamp}]</span>{' '}
              <strong style={{ color: '#c084fc' }}>{msg.sender}:</strong>{' '}
              <span style={{ color: '#f1f5f9' }}>{msg.text}</span>
              <span style={{ fontSize: '10px', color: '#a855f7', marginLeft: '6px', opacity: 0.8 }}>
                ({msg.source})
              </span>
            </div>
          ))
        )}
        <div ref={feedBottomRef} />
      </div>
    </section>
  );
};
