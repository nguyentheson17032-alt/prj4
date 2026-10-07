import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Image,
  Smile,
  Gamepad2,
  PhoneCall,
  Video,
  MoreVertical,
  Search,
  CheckCheck
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/chat.css';

export const ChatPage = ({ onHirePlayer }) => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadConversations = async () => {
      const data = await api.getConversations();
      setConversations(data || []);

      const targetPlayerId = searchParams.get('player');
      if (targetPlayerId) {
        const found = data?.find(c => c.partner?.id === Number(targetPlayerId));
        if (found) {
          setActiveConv(found);
        } else {
          // Fetch target player info and create temp active conversation
          const p = await api.getPlayerById(targetPlayerId);
          if (p) {
            const newConv = {
              id: Date.now(),
              partner: p,
              lastMessage: 'Bắt đầu cuộc trò chuyện',
              lastMessageTime: 'Vừa xong',
              unreadCount: 0,
              messages: [
                { id: 1, sender: 'them', text: `Chào bạn! Mình là ${p.fullName}. Rất vui được gặp bạn nhé! ✨`, time: 'Vừa xong' }
              ]
            };
            setConversations(prev => [newConv, ...prev]);
            setActiveConv(newConv);
          }
        }
      } else if (data?.length > 0) {
        setActiveConv(data[0]);
      }
    };
    loadConversations();
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: messageText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...(activeConv.messages || []), newMsg];
    const updatedConv = {
      ...activeConv,
      lastMessage: newMsg.text,
      lastMessageTime: newMsg.time,
      messages: updatedMessages
    };

    setActiveConv(updatedConv);
    setConversations(prev => prev.map(c => c.id === activeConv.id ? updatedConv : c));
    setMessageText('');

    // Simulate quick friendly auto-reply after 1.5s
    setTimeout(() => {
      const replyMsg = {
        id: Date.now() + 1,
        sender: 'them',
        text: 'Dạ mình đã nhận được tin nhắn của bạn rồi nhé! Cần duo rank hay chơi vui thì bảo mình nha ❤️',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const autoUpdatedConv = {
        ...updatedConv,
        lastMessage: replyMsg.text,
        lastMessageTime: replyMsg.time,
        messages: [...updatedMessages, replyMsg]
      };
      setActiveConv(autoUpdatedConv);
      setConversations(prev => prev.map(c => c.id === activeConv.id ? autoUpdatedConv : c));
    }, 1500);
  };

  const filteredConversations = conversations.filter(c =>
    c.partner?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.partner?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container animate-fade-in">
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span>Hộp Thoại Tin Nhắn</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{conversations.length} hội thoại</span>
          </div>

          <div className="chat-search-wrap">
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                placeholder="Tìm hội thoại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="chat-list">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`chat-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                onClick={() => setActiveConv(conv)}
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src={conv.partner?.avatar}
                    alt={conv.partner?.fullName}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                    <span className={`status-dot ${conv.partner?.status === 'ONLINE' ? 'online' : 'offline'}`} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.partner?.fullName}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{conv.lastMessageTime}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.lastMessage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Main */}
        {activeConv ? (
          <div className="chat-main">
            {/* Header */}
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={activeConv.partner?.avatar}
                  alt={activeConv.partner?.fullName}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                />
                <div>
                  <Link to={`/player/${activeConv.partner?.id}`} style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {activeConv.partner?.fullName}
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                    <StatusBadge status={activeConv.partner?.status} />
                    <span style={{ color: 'var(--text-muted)' }}>• {activeConv.partner?.primaryGame}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => onHirePlayer(activeConv.partner)}
                >
                  <Gamepad2 size={16} />
                  <span>Thuê Player Này</span>
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="chat-messages">
              {activeConv.messages?.map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                  <div>{msg.text}</div>
                  <div className="chat-time">{msg.time}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input
                type="text"
                className="form-control"
                placeholder="Nhập tin nhắn..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '10px 18px' }}
                disabled={!messageText.trim()}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Chọn một hội thoại để bắt đầu trò chuyện
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
