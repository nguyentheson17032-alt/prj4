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
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getUserAvatar } from '../../utils/avatarUtils';
import '../../styles/navbar.css';

export const Navbar = ({ onOpenDeposit, onOpenAuth }) => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

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
            <span>Trang Chủ</span>
          </NavLink>
          <NavLink to="/explore" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Compass size={18} />
            <span>Khám Phá</span>
          </NavLink>
          <NavLink to="/moments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Sparkles size={18} />
            <span>Khoảnh Khắc</span>
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <ShoppingBag size={18} />
            <span>Đơn Thuê</span>
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              style={{ color: '#f43f5e', fontWeight: 700 }}
            >
              <ShieldCheck size={18} />
              <span>Quản Trị</span>
            </NavLink>
          )}
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
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
                title="Bấm để nạp thêm coin"
              >
                <Wallet size={16} />
                <span>{(user?.balance || 0).toLocaleString('vi-VN')} đ</span>
                <span style={{ fontSize: '0.7rem', background: 'var(--accent-amber)', color: '#000', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>+</span>
              </div>

              {/* Chat Icon */}
              <Link to="/chat" className="nav-icon-btn" title="Tin nhắn">
                <MessageSquare size={18} />
              </Link>

              {/* Notifications */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button
                  className="nav-icon-btn"
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Thông báo"
                >
                  <Bell size={18} />
                </button>

                {showNotifications && (
                  <div className="user-dropdown animate-fade-in" style={{ width: '320px', right: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', fontWeight: 700, fontSize: '0.95rem' }}>
                      <span>Thông Báo</span>
                    </div>
                    <div className="dropdown-divider" />
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Không có thông báo mới nào
                    </div>
                  </div>
                )}
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
                    <div style={{ padding: '6px 12px' }}>
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
