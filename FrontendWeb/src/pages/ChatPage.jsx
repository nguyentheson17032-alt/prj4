import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Send,
  Gamepad2,
  Search,
  MessageSquare,
  UserCheck,
  Loader2
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import api from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar } from '../utils/avatarUtils';
import '../styles/chat.css';

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
};

const mapBackendMessage = (m, currentUserId) => {
  const isMe = String(m.senderId) === String(currentUserId);
  return {
    id: m.id || `${m.senderId}_${m.timestamp}`,
    sender: isMe ? 'me' : 'them',
    senderId: m.senderId,
    senderName: m.senderName,
    receiverId: m.receiverId,
    receiverName: m.receiverName,
    text: m.content,
    time: formatTime(m.timestamp),
    rawTimestamp: m.timestamp,
    read: m.read
  };
};

const mapBackendConversation = (c, currentUserId, existingPartner = null) => {
  const msgs = (c.messages || []).map(m => mapBackendMessage(m, currentUserId));
  // Robust fallback for partner ID
  const resolvedPartnerId = c.partnerId || c.otherUserId || c.conversationId || existingPartner?.id;
  const fallbackAvatar = existingPartner?.avatar || getUserAvatar({ username: c.partnerUsername || c.otherName });
  const finalAvatar = (c.partnerAvatar && c.partnerAvatar.trim() !== '') ? c.partnerAvatar : fallbackAvatar;

  return {
    id: `conv_${resolvedPartnerId}`,
    conversationId: c.conversationId,
    partnerId: resolvedPartnerId,
    partner: {
      id: resolvedPartnerId,
      fullName: c.otherName || existingPartner?.fullName || c.partnerUsername || 'Người dùng',
      username: c.partnerUsername || existingPartner?.username || '',
      avatar: finalAvatar,
      status: 'ONLINE',
      isPlayer: existingPartner?.isPlayer || false,
      primaryGame: existingPartner?.primaryGame || ''
    },
    lastMessage: c.lastMessage || (msgs.length > 0 ? msgs[msgs.length - 1].text : 'Bắt đầu cuộc trò chuyện'),
    lastMessageTime: formatTime(c.lastMessageTime) || 'Vừa xong',
    rawLastTime: c.lastMessageTime,
    unreadCount: c.unreadCount || 0,
    messages: msgs
  };
};

export const ChatPage = ({ onHirePlayer }) => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const activeConvRef = useRef(null);

  // Keep activeConvRef always up to date for polling interval
  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  // Initial loading of conversations and target partner from URL params
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initChat = async () => {
      setLoading(true);
      try {
        // 1. Fetch conversations from backend
        const apiData = await api.getConversations();
        let convList = [];
        if (Array.isArray(apiData)) {
          convList = apiData.map(c => mapBackendConversation(c, user.id));
        }

        // 2. Parse URL params (e.g. redirected from Player Detail or Orders)
        const paramPartnerId = searchParams.get('partnerId') || searchParams.get('userId');
        const paramPlayerId = searchParams.get('player');
        const paramName = searchParams.get('name');
        const paramUsername = searchParams.get('username') || paramName;
        const paramAvatar = searchParams.get('avatar');
        const paramRole = searchParams.get('role') || searchParams.get('game');
        const isPartnerPlayer = searchParams.get('isPlayer') === 'true' || Boolean(paramPlayerId);

        let resolvedPartnerId = paramPartnerId;
        let resolvedPlayerInfo = null;

        // If player ID is provided, resolve the real User ID of the player
        if (paramPlayerId) {
          try {
            resolvedPlayerInfo = await api.getPlayerById(paramPlayerId);
            if (resolvedPlayerInfo && resolvedPlayerInfo.userId) {
              resolvedPartnerId = resolvedPlayerInfo.userId;
            }
          } catch (_) {}
        }

        if (!resolvedPartnerId && paramPlayerId) {
          resolvedPartnerId = paramPlayerId;
        }

        // Check if user is trying to chat with self
        if (resolvedPartnerId && String(resolvedPartnerId) === String(user.id)) {
          addToast('Bạn không thể mở cuộc trò chuyện với chính mình!', 'info');
          resolvedPartnerId = null;
        }

        let selected = null;

        if (resolvedPartnerId) {
          // Check if conversation already exists in loaded list
          const found = convList.find(c => String(c.partner?.id || c.partnerId) === String(resolvedPartnerId));

          const partnerName = paramName || resolvedPlayerInfo?.fullName || resolvedPlayerInfo?.username || paramUsername || 'Idol PlayZone';
          const partnerUser = paramUsername || resolvedPlayerInfo?.username || partnerName;
          const partnerAvatarResolved = paramAvatar || resolvedPlayerInfo?.avatar || getUserAvatar({ username: partnerUser });

          if (found) {
            // Update partner meta with freshest info from navigation
            if (paramAvatar) found.partner.avatar = paramAvatar;
            if (paramName) found.partner.fullName = paramName;
            if (isPartnerPlayer || resolvedPlayerInfo) {
              found.partner.isPlayer = true;
              if (paramRole) found.partner.primaryGame = paramRole;
            }
            selected = found;
          } else {
            // Try fetching existing messages between the two users from server
            let existingServerConv = null;
            try {
              existingServerConv = await api.getConversation(resolvedPartnerId);
            } catch (_) {}

            if (existingServerConv && (existingServerConv.messages?.length > 0 || existingServerConv.conversationId)) {
              const mapped = mapBackendConversation(existingServerConv, user.id, {
                id: resolvedPartnerId,
                avatar: partnerAvatarResolved,
                fullName: partnerName,
                username: partnerUser,
                isPlayer: isPartnerPlayer || Boolean(resolvedPlayerInfo),
                primaryGame: paramRole || resolvedPlayerInfo?.primaryGame || 'Idol Duo'
              });
              if (paramAvatar) mapped.partner.avatar = paramAvatar;
              if (paramName) mapped.partner.fullName = paramName;
              if (isPartnerPlayer || resolvedPlayerInfo) {
                mapped.partner.isPlayer = true;
                mapped.partner.primaryGame = paramRole || resolvedPlayerInfo?.primaryGame || 'Idol Duo';
              }
              convList = [mapped, ...convList.filter(c => String(c.partner?.id || c.partnerId) !== String(resolvedPartnerId))];
              selected = mapped;
            } else {
              // Create a new draft conversation
              const newPartner = {
                id: resolvedPartnerId,
                fullName: partnerName,
                username: partnerUser,
                avatar: partnerAvatarResolved,
                primaryGame: paramRole || resolvedPlayerInfo?.primaryGame || (isPartnerPlayer ? 'Idol Duo' : 'Khách Hàng'),
                status: 'ONLINE',
                isPlayer: isPartnerPlayer || Boolean(resolvedPlayerInfo)
              };

              const draftConv = {
                id: `conv_${resolvedPartnerId}`,
                conversationId: null,
                partnerId: resolvedPartnerId,
                partner: newPartner,
                lastMessage: 'Bắt đầu cuộc trò chuyện',
                lastMessageTime: 'Vừa xong',
                unreadCount: 0,
                messages: []
              };

              convList = [draftConv, ...convList.filter(c => String(c.partner?.id || c.partnerId) !== String(resolvedPartnerId))];
              selected = draftConv;
            }
          }
        }

        if (!selected && convList.length > 0) {
          selected = convList[0];
        }

        if (isMounted) {
          setConversations(convList);
          if (selected) {
            setActiveConv(selected);
            // Fetch latest messages & mark as read
            const targetId = selected.partner?.id || selected.partnerId;
            if (targetId) {
              api.markAllMessagesAsRead(targetId).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
    };
  }, [user, searchParams]);

  // Polling for incoming messages while viewing ChatPage
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        // 1. Fetch updated conversation list
        const apiConvs = await api.getConversations();
        if (Array.isArray(apiConvs)) {
          setConversations(prev => {
            const currentActive = activeConvRef.current;
            const freshMappedList = apiConvs.map(c => {
              const targetId = c.partnerId || c.otherUserId || c.conversationId;
              const existing = prev.find(p => String(p.partner?.id || p.partnerId) === String(targetId));
              return mapBackendConversation(c, user.id, existing?.partner);
            });

            // Preserve active conversation draft if user has not sent a message yet
            let merged = [...freshMappedList];
            if (currentActive && !merged.some(c => String(c.partner?.id || c.partnerId) === String(currentActive.partner?.id || currentActive.partnerId))) {
              merged = [currentActive, ...merged];
            }
            return merged;
          });
        }

        // 2. If an active conversation is open, poll latest messages for it
        const curPartnerId = activeConvRef.current?.partner?.id || activeConvRef.current?.partnerId;
        if (curPartnerId) {
          const freshData = await api.getConversation(curPartnerId);
          if (freshData && Array.isArray(freshData.messages)) {
            const mappedFresh = mapBackendConversation(freshData, user.id, activeConvRef.current?.partner);
            setActiveConv(prev => {
              const prevTargetId = prev?.partner?.id || prev?.partnerId;
              if (!prev || String(prevTargetId) !== String(curPartnerId)) return prev;

              const prevMsgs = prev.messages || [];
              const newMsgs = mappedFresh.messages || [];

              // Check if any change occurred in messages
              if (
                prevMsgs.length !== newMsgs.length ||
                (newMsgs.length > 0 && prevMsgs[prevMsgs.length - 1]?.id !== newMsgs[newMsgs.length - 1]?.id)
              ) {
                // If there are unread messages addressed to me, mark read on server
                const hasThemUnread = newMsgs.some(m => m.sender === 'them' && !m.read);
                if (hasThemUnread) {
                  api.markAllMessagesAsRead(curPartnerId).catch(() => {});
                }

                return {
                  ...prev,
                  ...mappedFresh,
                  partner: {
                    ...mappedFresh.partner,
                    avatar: prev.partner?.avatar || mappedFresh.partner?.avatar,
                    fullName: prev.partner?.fullName || mappedFresh.partner?.fullName,
                    isPlayer: prev.partner?.isPlayer || mappedFresh.partner?.isPlayer
                  }
                };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // Background polling errors can be safely ignored
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  // Select conversation handler
  const handleSelectConversation = async (conv) => {
    setActiveConv(conv);
    const targetId = conv.partner?.id || conv.partnerId;
    if (targetId) {
      try {
        const fresh = await api.getConversation(targetId);
        if (fresh) {
          const mapped = mapBackendConversation(fresh, user?.id, conv.partner);
          setActiveConv(mapped);
        }
        await api.markAllMessagesAsRead(targetId);
        // Clear unread badge locally in conversation list
        setConversations(prev => prev.map(c =>
          String(c.partner?.id || c.partnerId) === String(targetId)
            ? { ...c, unreadCount: 0 }
            : c
        ));
      } catch (err) {
        console.error('Error fetching conversation:', err);
      }
    }
  };

  // Send message handler
  const handleSendMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!messageText.trim() || sending) return;

    if (!activeConv) {
      addToast('Vui lòng chọn một cuộc trò chuyện để bắt đầu gửi tin nhắn!', 'warning');
      return;
    }

    const partnerId = activeConv.partner?.id || activeConv.partnerId || activeConv.conversationId;
    if (!partnerId) {
      addToast('Không tìm thấy thông tin đối phương để gửi tin nhắn. Vui lòng bấm chọn lại hội thoại!', 'error');
      return;
    }

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic UI update
    const optimisticMsg = {
      id: `temp_${Date.now()}`,
      sender: 'me',
      senderId: user?.id,
      text: content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      rawTimestamp: new Date().toISOString()
    };

    const updatedMessages = [...(activeConv.messages || []), optimisticMsg];
    const updatedConv = {
      ...activeConv,
      lastMessage: content,
      lastMessageTime: optimisticMsg.time,
      messages: updatedMessages
    };

    setActiveConv(updatedConv);
    setConversations(prev => {
      const filtered = prev.filter(c => String(c.partner?.id || c.partnerId) !== String(partnerId));
      return [updatedConv, ...filtered];
    });

    try {
      // 1. Send via backend API
      await api.sendMessage(partnerId, content);

      // 2. Fetch fresh conversation from server to confirm
      const freshConv = await api.getConversation(partnerId);
      if (freshConv) {
        const mapped = mapBackendConversation(freshConv, user?.id, activeConv.partner);
        setActiveConv(mapped);
        setConversations(prev => {
          const filtered = prev.filter(c => String(c.partner?.id || c.partnerId) !== String(partnerId));
          return [mapped, ...filtered];
        });
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      addToast(err?.response?.data || 'Không thể gửi tin nhắn. Vui lòng thử lại!', 'error');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    (c.partner?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.partner?.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="container animate-fade-in" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: 'var(--bg-card)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <MessageSquare size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Hộp Thoại Tin Nhắn</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
            Vui lòng đăng nhập tài khoản để xem tin nhắn và trò chuyện cùng Idol Duo Game!
          </p>
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
            Về Trang Chủ Đăng Nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div className="chat-container">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            <span>Hộp Thoại Tin Nhắn</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {conversations.length} hội thoại
            </span>
          </div>

          <div className="chat-search-wrap">
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
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
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 10px', color: 'var(--text-muted)', gap: '8px' }}>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: '0.85rem' }}>Đang tải tin nhắn...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Chưa có cuộc trò chuyện nào
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`chat-item ${activeConv?.id === conv.id || String(activeConv?.partner?.id || activeConv?.partnerId) === String(conv.partner?.id || conv.partnerId) ? 'active' : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={conv.partner?.avatar || getUserAvatar({ username: conv.partner?.username || conv.partner?.fullName })}
                      alt={conv.partner?.fullName}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getUserAvatar({ username: conv.partner?.username || conv.partner?.fullName });
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: 0, right: 0 }}>
                      <span className={`status-dot ${conv.partner?.status === 'ONLINE' ? 'online' : 'offline'}`} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.partner?.fullName}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '6px', whiteSpace: 'nowrap' }}>
                        {conv.lastMessageTime}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="chat-unread-badge">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Main Area */}
        {activeConv ? (
          <div className="chat-main">
            {/* Header */}
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={activeConv.partner?.avatar || getUserAvatar({ username: activeConv.partner?.username || activeConv.partner?.fullName })}
                  alt={activeConv.partner?.fullName}
                  style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getUserAvatar({ username: activeConv.partner?.username || activeConv.partner?.fullName });
                  }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {activeConv.partner?.fullName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                    <StatusBadge status={activeConv.partner?.status || 'ONLINE'} />
                    <span style={{ color: 'var(--text-muted)' }}>
                      • {activeConv.partner?.primaryGame || (activeConv.partner?.isPlayer ? 'Idol Duo' : 'Thành viên')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Hire CTA if partner is a Player */}
              {activeConv.partner?.isPlayer && onHirePlayer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => onHirePlayer(activeConv.partner)}
                  >
                    <Gamepad2 size={16} />
                    <span>Thuê Player Này</span>
                  </button>
                </div>
              )}
            </div>

            {/* Messages Body */}
            <div className="chat-messages">
              {(!activeConv.messages || activeConv.messages.length === 0) ? (
                <div style={{ textAlign: 'center', margin: 'auto', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <MessageSquare size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.95rem' }}>
                    Bắt đầu cuộc trò chuyện với <strong>{activeConv.partner?.fullName}</strong>
                  </p>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    Gửi tin nhắn bên dưới để trao đổi thông tin chơi game nhé!
                  </span>
                </div>
              ) : (
                activeConv.messages.map((msg) => (
                  <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                    <div>{msg.text}</div>
                    <div className="chat-time">{msg.time}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <input
                type="text"
                className="form-control"
                placeholder={`Nhắn tin cho ${activeConv.partner?.fullName || 'đối phương'}...`}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                disabled={sending}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '10px 18px' }}
                disabled={!messageText.trim() || sending}
                onClick={(e) => {
                  e.preventDefault();
                  handleSendMessage(e);
                }}
                title="Gửi tin nhắn"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', height: '100%', gap: '12px' }}>
            <MessageSquare size={48} style={{ opacity: 0.3 }} />
            <span>Chọn một hội thoại ở danh sách bên trái để bắt đầu trò chuyện</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
