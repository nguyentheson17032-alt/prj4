import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  CheckCheck,
  Trash2,
  Check,
  ShoppingBag,
  CreditCard,
  ArrowDownCircle,
  Heart,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Info,
  ExternalLink,
  Loader2,
  Clock,
  Gamepad2,
  Star,
  Wallet
} from 'lucide-react';
import api from '../../api/apiService';
import realtimeService from '../../services/realtimeService';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/notificationDropdown.css';

/**
 * Format timestamp to relative human-readable string in Vietnamese
 */
const formatRelativeTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return String(timeStr);

    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch (_) {
    return String(timeStr);
  }
};

/**
 * Clean up embedded raw ISO strings (e.g. 2026-10-13T12:05:50) in message bodies
 */
const cleanMessageText = (msg) => {
  if (!msg) return '';
  return msg.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/g, (_, y, m, d, hh, mm) => {
    return `${hh}:${mm} ngày ${d}/${m}/${y}`;
  });
};

/**
 * Robust check if a notification item is unread
 */
const isItemUnread = (item) => {
  if (typeof item?.read === 'boolean') return !item.read;
  if (typeof item?.isRead === 'boolean') return !item.isRead;
  return false;
};

/**
 * Map notification type to icon and styling class
 */
const getNotificationTypeConfig = (type) => {
  const t = (type || '').toUpperCase();

  // Wallet / Payout / Topup / VNPay
  if (
    t.includes('WALLET') ||
    t.includes('PAYOUT') ||
    t.includes('TOPUP') ||
    t.includes('VNPAY') ||
    t.includes('PAYMENT') ||
    t.includes('COIN') ||
    t.includes('BALANCE')
  ) {
    return { icon: <Wallet size={19} />, className: 'payment' };
  }

  // Withdraw
  if (t.includes('WITHDRAW')) {
    return { icon: <ArrowDownCircle size={19} />, className: 'withdraw' };
  }

  // Donate
  if (t.includes('DONATE') || t.includes('GIFT')) {
    return { icon: <Heart size={19} />, className: 'donate' };
  }

  // Review / Rating
  if (t.includes('REVIEW') || t.includes('RATING') || t.includes('STAR')) {
    return { icon: <Star size={19} />, className: 'review' };
  }

  // Orders / Rent / Hire
  if (
    t.includes('ORDER') ||
    t.includes('RENT') ||
    t.includes('HIRE') ||
    t.includes('UPCOMING') ||
    t.includes('ENDING') ||
    t.includes('COMPLETE')
  ) {
    return { icon: <Gamepad2 size={19} />, className: 'order' };
  }

  // Chat / Message
  if (t.includes('MESSAGE') || t.includes('CHAT')) {
    return { icon: <MessageSquare size={19} />, className: 'message' };
  }

  // Moment / Post
  if (t.includes('MOMENT') || t.includes('POST')) {
    return { icon: <Sparkles size={19} />, className: 'moment' };
  }

  // Report / Ban / Lock
  if (t.includes('REPORT') || t.includes('BAN') || t.includes('LOCK')) {
    return { icon: <ShieldAlert size={19} />, className: 'report' };
  }

  return { icon: <Bell size={19} />, className: 'system' };
};

export const NotificationDropdown = ({ isOpen, onClose, unreadCount, onUnreadCountChange }) => {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications whenever opened
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const data = await api.getNotifications();
        if (isMounted) {
          setNotifications(data);
          const unread = data.filter(isItemUnread).length;
          onUnreadCountChange(unread);
        }
      } catch (err) {
        console.error('Fetch notifications error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchNotifications();

    const unsubRealtime = realtimeService.onNotification((newNotif) => {
      if (newNotif && isMounted) {
        setNotifications((prev) => [newNotif, ...prev]);
        // Navbar already maintains the badge count and listens to counts_update; avoid double increment
      }
    });

    return () => {
      isMounted = false;
      unsubRealtime();
    };
  }, [isOpen, onUnreadCountChange]);

  const unreadItems = useMemo(() => {
    return notifications.filter(isItemUnread);
  }, [notifications]);

  const displayedNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return unreadItems;
    }
    return notifications;
  }, [activeTab, notifications, unreadItems]);

  const handleItemClick = async (notif) => {
    const unread = isItemUnread(notif);
    if (unread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
      );
      onUnreadCountChange(Math.max(0, unreadCount - 1));
      api.markNotificationAsRead(notif.id);
    }

    onClose();

    // Custom action URL
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
      return;
    }

    // Smart fallback routing
    const t = (notif.type || '').toUpperCase();
    if (
      t.includes('ORDER') ||
      t.includes('RENT') ||
      t.includes('HIRE') ||
      notif.orderId
    ) {
      navigate('/orders');
    } else if (t.includes('MESSAGE')) {
      navigate('/chat');
    } else if (t.includes('MOMENT')) {
      navigate('/moments');
    } else if (
      t.includes('WALLET') ||
      t.includes('TOPUP') ||
      t.includes('WITHDRAW') ||
      t.includes('PAYMENT') ||
      t.includes('VNPAY')
    ) {
      navigate('/profile');
    }
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
    );
    onUnreadCountChange(Math.max(0, unreadCount - 1));
    await api.markNotificationAsRead(id);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    const itemToDelete = notifications.find((n) => n.id === id);
    const wasUnread = itemToDelete && isItemUnread(itemToDelete);

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) {
      onUnreadCountChange(Math.max(0, unreadCount - 1));
    }
    await api.deleteNotification(id);
  };

  const readItemsCount = useMemo(() => {
    return notifications.filter((n) => !isItemUnread(n)).length;
  }, [notifications]);

  const [isDeletingRead, setIsDeletingRead] = useState(false);

  const handleDeleteAllRead = async () => {
    if (readItemsCount === 0 || isDeletingRead) return;
    setIsDeletingRead(true);
    const readIds = notifications.filter((n) => !isItemUnread(n)).map((n) => n.id);
    try {
      setNotifications((prev) => prev.filter(isItemUnread));
      await api.deleteAllReadNotifications(readIds);
    } catch (err) {
      console.error('Delete all read notifications error:', err);
    } finally {
      setIsDeletingRead(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    const unreadIds = unreadItems.map((n) => n.id);
    try {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, isRead: true }))
      );
      onUnreadCountChange(0);
      await api.markAllNotificationsAsRead(unreadIds);
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="notif-header">
        <div className="notif-header-title">
          <span className="notif-title-text">{t('notif.title', 'Thông Báo')}</span>
          {unreadCount > 0 && (
            <span className="notif-badge-pill">{unreadCount} {t('notif.newBadge', 'mới')}</span>
          )}
        </div>
        <div className="notif-header-actions">
          {readItemsCount > 0 && (
            <button
              className="notif-action-btn delete-read-btn"
              onClick={handleDeleteAllRead}
              disabled={isDeletingRead}
              title={t('notif.deleteRead', 'Xóa tất cả thông báo đã đọc')}
            >
              {isDeletingRead ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              <span>{t('notif.deleteRead', 'Xóa đã đọc')} ({readItemsCount})</span>
            </button>
          )}

          <button
            className="notif-action-btn"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            title={unreadCount > 0 ? t('notif.markAll', 'Đánh dấu tất cả thông báo là đã đọc') : t('notif.emptyUnread', 'Không có thông báo mới')}
          >
            {isMarkingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCheck size={15} />
            )}
            <span>{t('notif.markAll', 'Đã đọc tất cả')}</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="notif-tabs">
        <button
          className={`notif-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>{t('notif.all', 'Tất cả')}</span>
          <span className="notif-tab-count">{notifications.length}</span>
        </button>
        <button
          className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`}
          onClick={() => setActiveTab('unread')}
        >
          <span>{t('notif.unread', 'Chưa đọc')}</span>
          <span className="notif-tab-count">{unreadItems.length}</span>
        </button>
      </div>

      {/* List Container */}
      <div className="notif-list-container">
        {loading ? (
          // Skeleton loaders
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="notif-skeleton-item">
              <div className="notif-skeleton-avatar" />
              <div className="notif-skeleton-lines">
                <div className="notif-skeleton-line" style={{ width: '55%' }} />
                <div className="notif-skeleton-line" style={{ width: '85%' }} />
              </div>
            </div>
          ))
        ) : displayedNotifications.length === 0 ? (
          // Empty State
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <Bell size={28} />
            </div>
            <div className="notif-empty-title">
              {activeTab === 'unread'
                ? t('notif.emptyUnread', 'Không có thông báo chưa đọc')
                : t('notif.empty', 'Bạn chưa có thông báo nào')}
            </div>
            <div className="notif-empty-sub">
              {activeTab === 'unread'
                ? 'Tuyệt vời! Bạn đã xem hết tất cả thông báo của mình.'
                : 'Các cập nhật đơn thuê, tin nhắn và biến động số dư sẽ hiển thị tại đây.'}
            </div>
          </div>
        ) : (
          displayedNotifications.map((item) => {
            const isUnread = isItemUnread(item);
            const config = getNotificationTypeConfig(item.type);

            return (
              <div
                key={item.id}
                className={`notif-item ${isUnread ? 'unread' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {/* Type Icon */}
                <div className={`notif-icon-wrap ${config.className}`}>
                  {config.icon}
                </div>

                {/* Content */}
                <div className="notif-content">
                  <div className="notif-item-title" title={item.title}>
                    {item.title || 'Thông báo hệ thống'}
                  </div>

                  <div className="notif-item-message">
                    {cleanMessageText(item.message)}
                  </div>

                  {/* Metadata Row: Time + Unread indicator / Quick actions */}
                  <div className="notif-item-meta">
                    <span className="notif-item-time">
                      <Clock size={11} />
                      {formatRelativeTime(item.createdAt)}
                    </span>

                    <div className="notif-item-meta-right">
                      {isUnread && (
                        <span className="notif-pill-unread">
                          <span className="notif-pill-dot" />
                          Mới
                        </span>
                      )}

                      <div className="notif-item-actions">
                        {isUnread && (
                          <button
                            className="notif-mini-btn mark-read"
                            onClick={(e) => handleMarkAsRead(e, item.id)}
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          className="notif-mini-btn"
                          onClick={(e) => handleDelete(e, item.id)}
                          title="Xóa thông báo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="notif-footer">
        <div
          className="notif-footer-link"
          onClick={() => {
            onClose();
            navigate('/orders');
          }}
        >
          <span>{t('notif.orderHistory', 'Xem lịch sử đơn hàng')}</span>
          <ExternalLink size={14} />
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
