import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, RefreshCw, ChevronRight,
  Home, Moon, Sun, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUserAvatar } from '../utils/avatarUtils';
import { useTheme } from '../context/ThemeContext';
import api from '../api/apiService';
import {
  NAV_ITEMS,
  OverviewTab,
  CommissionTab,
  UsersTab,
  PlayersTab,
  MomentsTab,
  OrdersTab,
  GamesTab,
  PaymentsTab,
  ReportsTab
} from './admin';

// Re-export modules and helpers for backwards compatibility
export {
  NAV_ITEMS,
  OverviewTab,
  CommissionTab,
  UsersTab,
  PlayersTab,
  MomentsTab,
  OrdersTab,
  GamesTab,
  PaymentsTab,
  ReportsTab,
  StatusBadge,
  MetricCard,
  parseDateToDateObj,
  formatOrderDateTime
} from './admin';

// ─────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────
export const AdminPage = () => {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Detect active section from URL
  const pathSection = location.pathname.split('/admin/')[1] || 'overview';
  const [activeSection, setActiveSection] = useState(pathSection);

  useEffect(() => {
    const s = location.pathname.split('/admin/')[1] || 'overview';
    setActiveSection(s);
  }, [location.pathname]);

  // Data state
  const [usersList, setUsersList] = useState([]);
  const [playersList, setPlayersList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [gamesList, setGamesList] = useState([]);
  const [commissionStats, setCommissionStats] = useState(null);
  const [commissionTransactions, setCommissionTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersR, playersR, ordersR, gamesR, reportsR, commStatsR, commTxR] = await Promise.allSettled([
        api.getUsers(),
        api.getPlayers(),
        api.getAllOrdersAdmin(),
        api.getGames(),
        api.getReports(),
        api.getAdminCommissionStats(),
        api.getAdminCommissionTransactions({ type: 'ALL' })
      ]);
      if (usersR.status === 'fulfilled' && Array.isArray(usersR.value)) setUsersList(usersR.value);
      if (playersR.status === 'fulfilled' && Array.isArray(playersR.value)) setPlayersList(playersR.value);
      if (ordersR.status === 'fulfilled' && Array.isArray(ordersR.value)) setOrdersList(ordersR.value);
      if (gamesR.status === 'fulfilled' && Array.isArray(gamesR.value)) setGamesList(gamesR.value);
      if (reportsR.status === 'fulfilled' && Array.isArray(reportsR.value)) setReportsList(reportsR.value);
      if (commStatsR.status === 'fulfilled' && commStatsR.value) setCommissionStats(commStatsR.value);
      if (commTxR.status === 'fulfilled' && Array.isArray(commTxR.value)) setCommissionTransactions(commTxR.value);
    } catch (err) {
      console.error('Admin data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && isAdmin) loadData();
  }, [isAuthenticated, isAdmin]);

  const pendingPlayers = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING').length;
  const pendingReports = reportsList.filter(r => r.status === 'PENDING').length;
  const pendingPayments = 0; // loaded lazily in PaymentsTab

  // ─── Not admin ───
  if (!isAuthenticated || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '40px', maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(244,63,94,0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px' }}>Khu Vực Quản Trị</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Trang này chỉ dành cho <strong>Quản Trị Viên</strong>.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-outline"><span>Về Trang Chủ</span></Link>
          </div>
        </div>
      </div>
    );
  }

  const navBadges = { players: pendingPlayers, reports: pendingReports };

  // ─── Admin layout ───
  const SIDEBAR_WIDTH = sidebarCollapsed ? '64px' : '220px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: SIDEBAR_WIDTH, minHeight: '100vh', background: isDark ? '#0f172a' : '#ffffff',
        borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, zIndex: 100, transition: 'width 0.25s ease', overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #f43f5e, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={18} style={{ color: '#fff' }} />
          </div>
          {!sidebarCollapsed && <span style={{ fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap' }}>PlayZone Admin</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const badge = navBadges[item.id];
            const isActive = activeSection === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveSection(item.id); navigate(`/admin${item.id === 'overview' ? '' : '/' + item.id}`); }}
                title={sidebarCollapsed ? item.label : ''}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500, fontSize: '0.88rem',
                  transition: 'all 0.15s', textAlign: 'left', width: '100%', whiteSpace: 'nowrap'
                }}>
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!sidebarCollapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                {!sidebarCollapsed && badge > 0 && (
                  <span style={{ background: '#f43f5e', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button onClick={() => navigate('/')} title="Về PlayZone" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.88rem', whiteSpace: 'nowrap', width: '100%' }}>
            <Home size={18} style={{ flexShrink: 0 }} />
            {!sidebarCollapsed && <span>Về PlayZone</span>}
          </button>
          <button onClick={toggleTheme} title="Đổi theme" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.88rem', whiteSpace: 'nowrap', width: '100%' }}>
            {isDark ? <Sun size={18} style={{ flexShrink: 0 }} /> : <Moon size={18} style={{ flexShrink: 0 }} />}
            {!sidebarCollapsed && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Thu gọn" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.88rem', width: '100%' }}>
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!sidebarCollapsed && <span>Thu gọn</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ marginLeft: SIDEBAR_WIDTH, flex: 1, transition: 'margin-left 0.25s ease', minWidth: 0 }}>
        {/* Top header */}
        <header style={{
          position: 'sticky',
          top: 0,
          zIndex: 90,
          background: isDark ? '#0f172a' : '#ffffff',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(0, 0, 0, 0.05)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: '64px',
          gap: '16px'
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {NAV_ITEMS.find(n => n.id === activeSection)?.label || 'Tổng Quan'}
            </span>
          </div>
          <button onClick={loadData} className="btn btn-outline" style={{ fontSize: '0.82rem', height: '34px', padding: '0 12px' }} title="Làm mới">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {!sidebarCollapsed && <span style={{ marginLeft: '6px' }}>Làm mới</span>}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={getUserAvatar(user)} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user?.fullName || user?.username}</div>
              <div style={{ fontSize: '0.72rem', color: '#f43f5e' }}>Admin</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ padding: '24px' }}>
          {activeSection === 'overview' && (
            <OverviewTab
              ordersList={ordersList}
              usersList={usersList}
              playersList={playersList}
              reportsList={reportsList}
              commissionStats={commissionStats}
              commissionTransactions={commissionTransactions}
              loading={loading}
            />
          )}
          {activeSection === 'commission' && <CommissionTab />}
          {activeSection === 'users' && <UsersTab usersList={usersList} setUsersList={setUsersList} loading={loading} reloadUsers={loadData} />}
          {activeSection === 'players' && <PlayersTab playersList={playersList} setPlayersList={setPlayersList} loading={loading} />}
          {activeSection === 'moments' && <MomentsTab />}
          {activeSection === 'orders' && <OrdersTab ordersList={ordersList} loading={loading} />}
          {activeSection === 'games' && <GamesTab gamesList={gamesList} setGamesList={setGamesList} loading={loading} />}
          {activeSection === 'payments' && <PaymentsTab />}
          {activeSection === 'reports' && (
            <ReportsTab
              reportsList={reportsList}
              setReportsList={setReportsList}
              loading={loading}
              reloadReports={loadData}
              onStatsRefresh={async () => {
                try {
                  const comm = await api.getAdminCommissionStats();
                  if (comm) setCommissionStats(comm);
                  const allOrd = await api.getAllOrdersAdmin();
                  if (allOrd) setOrdersList(allOrd);
                } catch (ignored) { }
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
