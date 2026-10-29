import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Gamepad2,
  Compass,
  Flame,
  MessageSquare,
  ShoppingBag,
  Wallet,
  PlusCircle,
  User,
  LogOut,
  Moon,
  Sun,
  Search,
  Bell,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Landmark
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserAvatar } from '../../utils/avatarUtils';
import api from '../../api/apiService';
import realtimeService from '../../services/realtimeService';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Globe } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import '../../styles/navbar.css';

export const Navbar = ({ onOpenDeposit, onOpenWithdraw, onOpenAuth }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const { addToast } = useToast();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [bellBadgeCount, setBellBadgeCount] = useState(0);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  // Real-time WebSocket listener for immediate badge updates
  useEffect(() => {
    if (!user) return;

    const unsubMsg = realtimeService.onMessage((msg) => {
      if (window.location.pathname !== '/chat' && String(msg.senderId) !== String(user.id)) {
        setUnreadMsgCount(prev => prev + 1);
      }
    });

    const unsubNotif = realtimeService.onNotification((notif) => {
      setUnreadNotifCount(prev => prev + 1);
      setBellBadgeCount(prev => prev + 1);
      if (notif?.title) {
        addToast(`${notif.title}: ${notif.message || ''}`, 'info');
      }
    });

    const unsubCounts = realtimeService.onCountsUpdate((counts) => {
      if (counts?.unreadMessages != null) setUnreadMsgCount(counts.unreadMessages);
      if (counts?.unreadNotifications != null) setUnreadNotifCount(counts.unreadNotifications);
    });

    return () => {
      unsubMsg();
      unsubNotif();
      unsubCounts();
    };
  }, [user]);

  // Poll unread messages and notifications count
  useEffect(() => {
    if (!user) {
      setUnreadMsgCount(0);
      setUnreadNotifCount(0);
      setBellBadgeCount(0);
      return;
    }

    const fetchCounts = async () => {
      try {
        const msgCount = await api.getUnreadMessageCount();
        setUnreadMsgCount(msgCount);
      } catch (_) {}

      try {
        const notifs = await api.getNotifications();
        const unread = notifs.filter((n) => typeof n.read === 'boolean' ? !n.read : !n.isRead);
        setUnreadNotifCount(unread.length);

        const storageKey = `playzone_notif_seen_${user.id || user.username}`;
        const lastSeenTimeStr = localStorage.getItem(storageKey);

        if (!lastSeenTimeStr) {
          // Người dùng chưa từng bấm vào chuông -> hiện toàn bộ số chưa đọc
          setBellBadgeCount(unread.length);
        } else {
          const lastSeenTime = new Date(lastSeenTimeStr).getTime();
          // Chỉ đếm những thông báo CHƯA ĐỌC được tạo SAU thời điểm bấm chuông gần nhất
          const newSinceSeen = unread.filter((n) => {
            const createdTime = n.createdAt ? new Date(n.createdAt).getTime() : 0;
            return createdTime > lastSeenTime;
          }).length;
          setBellBadgeCount(newSinceSeen);
        }
      } catch (_) {}
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      // Khi bấm mở chuông: RESET badge trên chuông về 0 và lưu lại mốc thời gian vừa xem
      setBellBadgeCount(0);
      if (user) {
        localStorage.setItem(
          `playzone_notif_seen_${user.id || user.username}`,
          new Date().toISOString()
        );
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="navbar">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="nav-brand">
          <div className="logo-badge">
            <Gamepad2 size={24} />
          </div>
          <span className="gradient-text">PlayZone</span>
          <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(6,182,212,0.2)', color: '#38bdf8', borderRadius: '6px', fontWeight: 700, marginLeft: '-4px' }}>DUO</span>
        </Link>

        {/* Search Bar */}
        <div className="nav-search">
          <Search size={16} className="nav-search-icon" />
          <input
            type="text"
            className="nav-search-input"
            placeholder="Tìm game, player, rank, idol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* Navigation Menu */}
        <nav className="nav-menu">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Flame size={18} />
            <span>{t('nav.home')}</span>
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Compass size={18} />
            <span>{t('nav.explore')}</span>
          </NavLink>
          <NavLink to="/moments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Sparkles size={18} />
            <span>{t('nav.moments')}</span>
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ShoppingBag size={18} />
            <span>{t('nav.orders')}</span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ color: '#f43f5e', fontWeight: 700 }}
            >
              <ShieldCheck size={18} />
              <span>{t('nav.admin')}</span>
            </NavLink>
          )}
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => changeLanguage(language === 'vi' ? 'en' : 'vi')}
            className="nav-icon-btn"
            title={language === 'vi' ? 'Chuyển sang Tiếng Anh (EN)' : 'Switch to Vietnamese (VI)'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            <Globe size={16} />
            <span>{language === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="nav-icon-btn"
            title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isAuthenticated ? (
            <>
              {/* Wallet Balance & Quick Deposit */}
              <div
                className="balance-chip"
                onClick={onOpenDeposit}
                title={`Số dư khả dụng: ${(user?.balance || user?.coin || 0).toLocaleString('vi-VN')} đ${user?.frozenBalance > 0 ? ` (Đang đóng băng: ${user.frozenBalance.toLocaleString('vi-VN')} đ)` : ''} - Bấm để nạp thêm`}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Wallet size={16} color="var(--primary-light, #06b6d4)" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.1 }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>Khả dụng</span>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{(user?.balance || user?.coin || 0).toLocaleString('vi-VN')} đ</span>
                </div>
                {user?.frozenBalance > 0 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#f59e0b',
                      background: 'rgba(245,158,11,0.15)',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                    title={`Đang đóng băng: ${user.frozenBalance.toLocaleString('vi-VN')} đ (Tự động vào số dư khả dụng sau 24h hoặc khi khách đánh giá ≥4★)`}
                  >
                    ⏳ {user.frozenBalance.toLocaleString('vi-VN')}đ
                  </span>
                )}
                <span style={{ fontSize: '0.7rem', background: 'var(--accent-amber)', color: '#000', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>+</span>
              </div>

              {/* Chat Icon */}
              <Link to="/chat" className="nav-icon-btn" title="Tin nhắn" style={{ position: 'relative' }}>
                <MessageSquare size={18} />
                {unreadMsgCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--accent-red, #ef4444)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                  }}>
                    {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                  </span>
                )}
              </Link>

              {/* Notifications */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button
                  className="nav-icon-btn"
                  onClick={handleToggleNotifications}
                  title="Thông báo"
                >
                  <Bell size={18} />
                  {bellBadgeCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 4px',
                        borderRadius: '9999px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        boxShadow: '0 2px 8px rgba(236, 72, 153, 0.45)'
                      }}
                    >
                      {bellBadgeCount > 99 ? '99+' : bellBadgeCount}
                    </span>
                  )}
                </button>

                <NotificationDropdown
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  unreadCount={unreadNotifCount}
                  onUnreadCountChange={setUnreadNotifCount}
                />
              </div>

              {/* User Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div
                  className="user-menu-trigger"
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <img src={getUserAvatar(user)} alt={user.fullName || user.username} className="nav-avatar" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.fullName || user.username}
                  </span>
                  <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
                </div>

                {showDropdown && (
                  <div className="user-dropdown animate-fade-in">
                    <div style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.username}</div>

                    </div>
                    <div className="dropdown-divider" />
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="dropdown-item"
                        onClick={() => setShowDropdown(false)}
                        style={{ color: '#f43f5e', fontWeight: 700, background: 'rgba(244, 63, 94, 0.1)' }}
                      >
                        <ShieldCheck size={16} />
                        <span>Bảng Quản Trị (Admin)</span>
                      </Link>
                    )}
                    <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <User size={16} />
                      <span>Hồ Sơ Cá Nhân</span>
                    </Link>
                    <Link to="/orders" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <ShoppingBag size={16} />
                      <span>Đơn Thuê Của Tôi</span>
                    </Link>
                    <Link to="/wallet" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <Wallet size={16} />
                      <span>Ví & Lịch Sử Giao Dịch</span>
                    </Link>
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        setShowDropdown(false);
                        if (onOpenWithdraw) onOpenWithdraw();
                      }}
                      style={{ color: '#f59e0b', width: '100%', textAlign: 'left', background: 'transparent', border: 'none' }}
                    >
                      <Landmark size={16} />
                      <span>Rút Tiền Về Ngân Hàng</span>
                    </button>
                    <Link to="/register-player" className="dropdown-item" onClick={() => setShowDropdown(false)} style={{ color: 'var(--secondary)' }}>
                      <PlusCircle size={16} />
                      <span>Đăng Ký Làm Player</span>
                    </Link>
                    <Link to="/policy" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                      <ShieldCheck size={16} />
                      <span>Chính Sách & Điều Khoản</span>
                    </Link>
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item"
                      style={{ color: 'var(--accent-red)', width: '100%', textAlign: 'left' }}
                      onClick={() => {
                        logout();
                        setShowDropdown(false);
                      }}
                    >
                      <LogOut size={16} />
                      <span>Đăng Xuất</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              <span>Đăng Nhập / Đăng Ký</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
