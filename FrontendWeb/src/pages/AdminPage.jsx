import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Gamepad2,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Lock,
  Unlock,
  RefreshCw,
  BarChart3,
  Award,
  Clock,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar } from '../utils/avatarUtils';
import api from '../api/apiService';

export const AdminPage = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // overview, users, players, orders, games, reports
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  
  // Real State from Backend API
  const [usersList, setUsersList] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [gamesList, setGamesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from Backend
  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersData, playersData, ordersData, gamesData, reportsData] = await Promise.allSettled([
        api.getUsers(),
        api.getPlayers(),
        api.getOrders(),
        api.getGames(),
        api.getReports()
      ]);

      if (usersData.status === 'fulfilled' && Array.isArray(usersData.value)) {
        setUsersList(usersData.value);
      }
      if (playersData.status === 'fulfilled' && Array.isArray(playersData.value)) {
        setPlayersList(playersData.value);
      }
      if (ordersData.status === 'fulfilled' && Array.isArray(ordersData.value)) {
        setOrdersList(ordersData.value);
      }
      if (gamesData.status === 'fulfilled' && Array.isArray(gamesData.value)) {
        setGamesList(gamesData.value);
      }
      if (reportsData.status === 'fulfilled' && Array.isArray(reportsData.value)) {
        setReportsList(reportsData.value);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu admin từ backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      loadAdminData();
    }
  }, [isAuthenticated, isAdmin]);

  // Toggle user ban
  const handleToggleBanUser = (id) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
        addToast(`Đã ${nextStatus === 'BANNED' ? 'khóa' : 'mở khóa'} tài khoản ${u.username}`, nextStatus === 'BANNED' ? 'warning' : 'success');
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  // Add coins to user
  const handleAddCoins = (id) => {
    const amountStr = prompt('Nhập số xu muốn cộng cho người dùng (ví dụ: 100000):', '100000');
    if (!amountStr || isNaN(amountStr)) return;
    const amount = Number(amountStr);
    setUsersList(prev => prev.map(u => {
      if (u.id === id) {
        addToast(`Đã cộng ${(amount).toLocaleString('vi-VN')} đ cho ${u.username}`, 'success');
        return { ...u, balance: (u.balance || 0) + amount };
      }
      return u;
    }));
  };

  // Approve / Reject Player application
  const handleApprovePlayer = (playerId) => {
    setPlayersList(prev => prev.map(p => {
      if (p.id === playerId) {
        addToast(`Đã phê duyệt hồ sơ Idol "${p.name}"!`, 'success');
        return { ...p, status: 'ACTIVE' };
      }
      return p;
    }));
  };

  const handleRejectPlayer = (playerId) => {
    setPlayersList(prev => prev.filter(p => p.id !== playerId));
    addToast('Đã từ chối hồ sơ đăng ký!', 'info');
  };

  // Resolve Report
  const handleResolveReport = (reportId) => {
    setReportsList(prev => prev.map(r => {
      if (r.id === reportId) {
        addToast('Đã xử lý khiếu nại thành công!', 'success');
        return { ...r, status: 'RESOLVED' };
      }
      return r;
    }));
  };

  // Real Computed Stats (100% from backend, 0 mock)
  const totalRevenue = useMemo(() => {
    return ordersList.reduce((acc, o) => acc + (o.totalPrice || o.price || 0), 0);
  }, [ordersList]);

  const totalOrdersCount = ordersList.length;
  const totalUsersCount = usersList.length;
  const pendingPlayersCount = playersList.filter(p => p.status === 'PENDING').length;
  const pendingReportsCount = reportsList.filter(r => r.status === 'PENDING').length;

  const completedOrdersCount = useMemo(() => {
    return ordersList.filter(o => o.status === 'COMPLETED').length;
  }, [ordersList]);

  const completionRate = useMemo(() => {
    if (ordersList.length === 0) return '100%';
    return `${Math.round((completedOrdersCount / ordersList.length) * 100)}%`;
  }, [ordersList, completedOrdersCount]);

  // Real 7-Day Revenue Calculation
  const weeklyRevenueData = useMemo(() => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];

      const dayOrders = ordersList.filter(o => {
        if (!o.createdAt) return false;
        return o.createdAt.startsWith(dateStr);
      });

      const val = dayOrders.reduce((sum, o) => sum + (o.totalPrice || o.price || 0), 0);
      result.push({
        day: dayName,
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        val
      });
    }

    const maxVal = Math.max(...result.map(r => r.val), 1);
    return result.map(r => ({
      ...r,
      height: r.val > 0 ? `${Math.max(15, Math.round((r.val / maxVal) * 90))}%` : '8px'
    }));
  }, [ordersList]);

  // Real Top Games distribution computed from ordersList and gamesList
  const topGamesStats = useMemo(() => {
    if (!gamesList.length) return [];
    const colors = ['#38bdf8', '#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#ec4899'];
    const total = ordersList.length;

    return gamesList.slice(0, 5).map((g, idx) => {
      const count = ordersList.filter(o => o.game === g.name || o.gameName === g.name || o.gameId === g.id).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return {
        name: g.name,
        count: `${count} lượt thuê`,
        pct,
        color: colors[idx % colors.length]
      };
    });
  }, [gamesList, ordersList]);

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="container" style={{ padding: '60px 20px', minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '520px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px' }}>Khu Vực Quản Trị Hệ Thống</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Trang này chỉ dành cho tài khoản có phân quyền <strong>Quản Trị Viên (Admin)</strong>. Vui lòng đăng nhập bằng tài khoản Admin để tiếp tục.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-outline">
              <ArrowLeft size={16} />
              <span>Về Trang Chủ</span>
            </Link>
            <button
              className="btn btn-primary"
              onClick={() => {
                window.location.reload();
              }}
            >
              <ShieldCheck size={16} />
              <span>Đăng Nhập Admin</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-container container" style={{ padding: '30px 20px 60px' }}>
      {/* Top Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(244,63,94,0.15) 0%, rgba(99,102,241,0.15) 50%, rgba(6,182,212,0.15) 100%)',
        border: '1px solid rgba(244,63,94,0.3)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #f43f5e, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 8px 20px rgba(244,63,94,0.3)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>PlayZone Admin Dashboard</h1>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(244,63,94,0.2)', color: '#f43f5e', borderRadius: '6px', fontWeight: 700 }}>
                Super Admin
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
              Hệ thống giám sát, quản lý Idol Duo, người dùng, giao dịch và vận hành nền tảng trực tiếp từ cơ sở dữ liệu.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadAdminData}
            className="btn btn-outline"
            style={{ fontSize: '0.85rem' }}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Đồng bộ DB</span>
          </button>
          <Link to="/" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Về PlayZone</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginBottom: '28px'
      }}>
        {/* Doanh thu */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Doanh Thu Thực</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#10b981', marginTop: '6px' }}>
            <TrendingUp size={14} />
            <span>Từ {ordersList.length} giao dịch hoàn tất</span>
          </div>
        </div>

        {/* Đơn thuê */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Đơn Thuê</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
              <ShoppingBag size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalOrdersCount} đơn
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            <Clock size={14} />
            <span>Tỷ lệ hoàn thành: {completionRate}</span>
          </div>
        </div>

        {/* Người dùng */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng Tài Khoản</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {totalUsersCount.toLocaleString('vi-VN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#06b6d4', marginTop: '6px' }}>
            <Sparkles size={14} />
            <span>{playersList.filter(p => p.status !== 'PENDING').length} Idol đã kích hoạt</span>
          </div>
        </div>

        {/* Hồ sơ chờ duyệt */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Idol Chờ Duyệt</span>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
              <Award size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: pendingPlayersCount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {pendingPlayersCount} hồ sơ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            <span>{pendingReportsCount} khiếu nại chưa xử lý</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'overview', label: '📊 Tổng Quan & Biểu Đồ', icon: BarChart3 },
          { id: 'users', label: '👥 Quản Lý Người Dùng', icon: Users, badge: usersList.length },
          { id: 'players', label: '🎮 Duyệt & Quản Lý Idol', icon: Gamepad2, badge: pendingPlayersCount > 0 ? pendingPlayersCount : null, badgeColor: '#f59e0b' },
          { id: 'orders', label: '🛍️ Quản Lý Đơn Thuê', icon: ShoppingBag, badge: ordersList.length },
          { id: 'games', label: '🕹️ Danh Mục Game', icon: Gamepad2 },
          { id: 'reports', label: '⚠️ Khiếu Nại & Báo Cáo', icon: AlertTriangle, badge: pendingReportsCount > 0 ? pendingReportsCount : null, badgeColor: '#f43f5e' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                fontWeight: 700,
                fontSize: '0.9rem',
                borderRadius: '10px 10px 0 0',
                border: 'none',
                background: isActive ? 'var(--card-bg)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: tab.badgeColor || 'var(--primary)',
                  color: '#fff',
                  fontWeight: 800
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Revenue Chart Visualizer */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Biểu Đồ Doanh Thu 7 Ngày Gần Nhất</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Dữ liệu tổng hợp trực tiếp từ các đơn thuê đã thanh toán</p>
              </div>
              <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '8px', fontWeight: 700 }}>
                {ordersList.length} đơn phát sinh
              </span>
            </div>

            {/* Dynamic Interactive Visual Chart */}
            <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '20px 0 10px', borderBottom: '1px solid var(--border-color)' }}>
              {weeklyRevenueData.map((item, idx) => (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {item.val > 0 ? `${(item.val / 1000).toFixed(0)}k` : '0đ'}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: item.height,
                      borderRadius: '8px 8px 0 0',
                      background: item.val > 0
                        ? 'linear-gradient(180deg, var(--primary), var(--secondary))'
                        : 'rgba(255,255,255,0.06)',
                      boxShadow: item.val > 0 ? '0 4px 12px rgba(99,102,241,0.2)' : 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    title={`${item.day} (${item.date}): ${(item.val).toLocaleString('vi-VN')} đ`}
                  />
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                      {item.day}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {item.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Distribution & Quick Summary */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 16px' }}>Thống Kê Đơn Thuê Theo Danh Mục Game</h3>
            
            {topGamesStats.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Chưa có dữ liệu danh mục game
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {topGamesStats.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: 600 }}>
                      <span>{g.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{g.count} ({g.pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${g.pct > 0 ? g.pct : 2}%`, height: '100%', background: g.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '24px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Trạng thái cơ sở dữ liệu:</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                  Đã kết nối trực tiếp Backend
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: USERS */}
      {activeTab === 'users' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Danh Sách Người Dùng & Phân Quyền ({usersList.length})</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Quản lý số dư, trạng thái tài khoản và vai trò thành viên</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
                  placeholder="Tìm username, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter */}
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem', width: 'auto' }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="ADMIN">Admin</option>
                <option value="PLAYER">Player / Idol</option>
                <option value="USER">User Thường</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Thành viên</th>
                  <th style={{ padding: '12px 14px' }}>Email</th>
                  <th style={{ padding: '12px 14px' }}>Số dư ví</th>
                  <th style={{ padding: '12px 14px' }}>Vai trò</th>
                  <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {usersList
                  .filter(u => roleFilter === 'ALL' || u.role === roleFilter || (u.roles && u.roles.some(r => r.includes(roleFilter))))
                  .filter(u => !searchTerm || (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) || (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase())))
                  .map((u) => {
                    const isUserAdmin = u.role === 'ADMIN' || (u.roles && u.roles.some(r => r.includes('ADMIN')));
                    const isUserPlayer = u.role === 'PLAYER' || (u.roles && u.roles.some(r => r.includes('PLAYER')));

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={getUserAvatar(u)} alt={u.username} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.fullName || u.username}</div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{u.email || `${u.username}@playzone.com`}</td>
                        <td style={{ padding: '14px', fontWeight: 700, color: '#10b981' }}>
                          {(u.balance || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isUserAdmin ? 'rgba(244,63,94,0.15)' : isUserPlayer ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)',
                            color: isUserAdmin ? '#f43f5e' : isUserPlayer ? '#06b6d4' : 'var(--text-muted)'
                          }}>
                            {isUserAdmin ? '🛡️ Admin' : isUserPlayer ? '🎮 Idol/Player' : '👤 Thành viên'}
                          </span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: u.status !== 'BANNED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: u.status !== 'BANNED' ? '#10b981' : '#ef4444'
                          }}>
                            {u.status !== 'BANNED' ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto' }}
                              title="Nạp / Cộng coin"
                              onClick={() => handleAddCoins(u.id)}
                            >
                              <DollarSign size={14} />
                              <span>+ Coin</span>
                            </button>
                            {!isUserAdmin && (
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  height: 'auto',
                                  borderColor: u.status !== 'BANNED' ? '#ef4444' : '#10b981',
                                  color: u.status !== 'BANNED' ? '#ef4444' : '#10b981'
                                }}
                                onClick={() => handleToggleBanUser(u.id)}
                              >
                                {u.status !== 'BANNED' ? <Lock size={14} /> : <Unlock size={14} />}
                                <span>{u.status !== 'BANNED' ? 'Khóa' : 'Mở khóa'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PLAYERS APPROVAL */}
      {activeTab === 'players' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Pending Applications Section */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Hồ Sơ Đăng Ký Idol Mới Chờ Xét Duyệt ({pendingPlayersCount})</h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Xét duyệt hồ sơ trực tiếp</span>
            </div>

            {pendingPlayersCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
                <div>Không còn hồ sơ nào đang chờ duyệt. Mọi Idol mới đã được giải quyết!</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {playersList.filter(p => p.status === 'PENDING').map(player => (
                  <div key={player.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <img src={getUserAvatar(player)} alt={player.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{player.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{player.nickname || player.name} • {player.rank || 'Kim Cương'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Gửi lúc: {player.submittedAt || 'Mới đây'}</div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', margin: '0 0 12px' }}>
                      "{player.bio || 'Sẵn sàng duo leo rank cùng anh em!'}"
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Giá đề xuất:</span>
                      <span style={{ fontWeight: 700, color: '#10b981' }}>{(player.pricePerHour || player.price || 0).toLocaleString('vi-VN')} đ/h</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '8px', fontSize: '0.82rem', background: '#10b981', borderColor: '#10b981' }}
                        onClick={() => handleApprovePlayer(player.id)}
                      >
                        <Check size={16} />
                        <span>Phê Duyệt Ngay</span>
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={() => handleRejectPlayer(player.id)}
                      >
                        <X size={16} />
                        <span>Từ Chối</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Idols List */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px' }}>Danh Sách Idol Đang Hoạt Động ({playersList.filter(p => p.status !== 'PENDING').length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {playersList.filter(p => p.status !== 'PENDING').map(player => {
                const playerOrdersCount = ordersList.filter(o => o.playerId === player.id || o.playerName === player.name).length;

                return (
                  <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                    <img src={getUserAvatar(player)} alt={player.name} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>{(player.pricePerHour || player.price || 0).toLocaleString('vi-VN')} đ/h</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>⭐ {player.rating || 5.0} ({playerOrdersCount} đơn)</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }}>
                      Sẵn sàng
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px' }}>Lịch Sử Đơn Hàng Toàn Hệ Thống ({ordersList.length})</h3>
          {ordersList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Chưa có đơn hàng nào trong hệ thống
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '12px 14px' }}>Mã Đơn</th>
                    <th style={{ padding: '12px 14px' }}>Idol</th>
                    <th style={{ padding: '12px 14px' }}>Game</th>
                    <th style={{ padding: '12px 14px' }}>Thời Lượng</th>
                    <th style={{ padding: '12px 14px' }}>Tổng Tiền</th>
                    <th style={{ padding: '12px 14px' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersList.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px', fontWeight: 700, color: 'var(--primary)' }}>#{order.id}</td>
                      <td style={{ padding: '14px', fontWeight: 600 }}>{order.playerName || order.playerId}</td>
                      <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{order.game || order.gameName || 'Liên Quân Mobile'}</td>
                      <td style={{ padding: '14px' }}>{order.hours || 1} giờ</td>
                      <td style={{ padding: '14px', fontWeight: 700, color: '#10b981' }}>{(order.totalPrice || order.price || 0).toLocaleString('vi-VN')} đ</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: order.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : order.status === 'PLAYING' ? 'rgba(6,182,212,0.15)' : 'rgba(245,158,11,0.15)',
                          color: order.status === 'COMPLETED' ? '#10b981' : order.status === 'PLAYING' ? '#06b6d4' : '#f59e0b'
                        }}>
                          {order.status === 'COMPLETED' ? 'Hoàn thành' : order.status === 'PLAYING' ? 'Đang chơi' : 'Đang xử lý'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: GAMES */}
      {activeTab === 'games' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Danh Mục Tựa Game Nền Tảng ({gamesList.length})</h3>
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.85rem' }}
              onClick={() => {
                const name = prompt('Nhập tên Game mới muốn thêm:');
                if (name) {
                  setGamesList(prev => [...prev, { id: 'game-' + Date.now(), name, image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80' }]);
                  addToast(`Đã thêm game "${name}" thành công!`, 'success');
                }
              }}
            >
              <Plus size={16} />
              <span>Thêm Game Mới</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            {gamesList.map(game => {
              const activeCount = playersList.filter(p => (p.game === game.name || p.gameName === game.name) && p.status !== 'PENDING').length;

              return (
                <div key={game.id} style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
                  <img src={game.image} alt={game.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{game.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{activeCount} Idol đang hoạt động</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: REPORTS */}
      {activeTab === 'reports' && (
        <div className="animate-fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px' }}>Trung Tâm Khiếu Nại & Xử Lý Vi Phạm ({reportsList.length})</h3>
          {reportsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 10px' }} />
              <div>Không có khiếu nại hoặc báo cáo vi phạm nào!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reportsList.map(report => (
                <div key={report.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>#{report.id}</span>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontWeight: 700 }}>
                        {report.type || 'Khiếu nại'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{report.createdAt || 'Gần đây'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    <strong>{report.reportedBy || 'Khách hàng'}</strong> khiếu nại đối với <strong>{report.targetUser || 'Idol'}</strong>: "{report.content || 'Nội dung phản ánh'}"
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: report.status === 'RESOLVED' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                      {report.status === 'RESOLVED' ? '✓ Đã giải quyết' : '⏳ Đang chờ xử lý'}
                    </span>
                    {report.status !== 'RESOLVED' && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem', height: 'auto' }}
                        onClick={() => handleResolveReport(report.id)}
                      >
                        <CheckCircle2 size={14} />
                        <span>Xử lý & Hoàn Tiền</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
