import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, Users, Gamepad2, ShoppingBag, TrendingUp,
  DollarSign, AlertTriangle, CheckCircle2, XCircle, Search,
  Plus, Lock, Unlock, RefreshCw, BarChart3, Award, Clock,
  Sparkles, ChevronRight, Check, X, CreditCard, Wallet,
  LogOut, Home, ArrowUpCircle, ArrowDownCircle, Eye,
  LayoutDashboard, FileText, Settings, Bell, Moon, Sun,
  Ban, UserCheck, ChevronLeft, Filter, Percent, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar } from '../utils/avatarUtils';
import { useTheme } from '../context/ThemeContext';
import api from '../api/apiService';

// ─────────────────────────────────────────────
// Sidebar nav items
// ─────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview',   label: 'Tổng Quan',             icon: LayoutDashboard },
  { id: 'commission', label: 'Chiết Khấu (15%)',      icon: Percent },
  { id: 'users',      label: 'Người Dùng',             icon: Users },
  { id: 'players',    label: 'Game Thủ',               icon: Gamepad2 },
  { id: 'orders',     label: 'Đơn Hàng',               icon: ShoppingBag },
  { id: 'games',      label: 'Danh Mục Game',          icon: Gamepad2 },
  { id: 'payments',   label: 'Nạp / Rút Tiền',        icon: CreditCard },
  { id: 'reports',    label: 'Khiếu Nại',              icon: AlertTriangle },
];

// ─────────────────────────────────────────────
// Status badge helper
// ─────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    PENDING:   { label: 'Chờ duyệt',   bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    COMPLETED: { label: 'Hoàn thành',  bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
    AVAILABLE: { label: 'Sẵn sàng',    bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
    BANNED:    { label: 'Đã khóa',     bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    REJECTED:  { label: 'Từ chối',     bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    PLAYING:   { label: 'Đang chơi',   bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
    CONFIRMED: { label: 'Đã xác nhận', bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
    CANCELLED: { label: 'Đã hủy',      bg: 'rgba(107,114,128,0.15)', color: '#6b7280' },
    processed: { label: 'Đã xử lý',    bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
    pending:   { label: 'Chờ xử lý',   bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    rejected:  { label: 'Từ chối',     bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  };
  const s = map[status] || { label: status, bg: 'rgba(107,114,128,0.15)', color: '#6b7280' };
  return (
    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────
// Metric card
// ─────────────────────────────────────────────
const MetricCard = ({ label, value, sub, icon: Icon, color }) => (
  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <div style={{ padding: '8px', borderRadius: '10px', background: `${color}22`, color }}><Icon size={20} /></div>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</div>}
  </div>
);

// ─────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────
const OverviewTab = ({ ordersList, usersList, playersList, reportsList, commissionStats, loading }) => {
  const pendingCount = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING').length;
  const completedCount = ordersList.filter(o => o.status === 'COMPLETED').length;
  const completionRate = ordersList.length ? `${Math.round((completedCount / ordersList.length) * 100)}%` : '100%';

  // Doanh thu sàn 15% tổng hợp từ cả thuê player và donate quà (loại trừ đơn bị hủy / đã hoàn tiền)
  const hireRevenue = useMemo(() => ordersList.filter(o => 
    o.status !== 'CANCELLED' && o.status !== 'CANCELED' && o.status !== 'REJECTED' && o.status !== 'REFUNDED'
  ).reduce((s, o) => s + (o.totalPrice || o.price || 0), 0), [ordersList]);

  const hireFee = commissionStats?.hireCommissionRevenue != null ? commissionStats.hireCommissionRevenue : Math.round(hireRevenue * 0.15);
  const donateFee = commissionStats?.donateCommissionRevenue || 0;
  const totalPlatformRevenue = commissionStats?.totalCommissionRevenue != null ? commissionStats.totalCommissionRevenue : (hireFee + donateFee);
  const totalGmv = commissionStats?.totalTransactionVolume != null ? commissionStats.totalTransactionVolume : (hireRevenue + (donateFee ? Math.round(donateFee / 0.15) : 0));
  const hireCount = commissionStats?.hireTransactions != null ? commissionStats.hireTransactions : ordersList.filter(o => o.status !== 'CANCELLED' && o.status !== 'CANCELED' && o.status !== 'REJECTED' && o.status !== 'REFUNDED').length;
  const donateCount = commissionStats?.donateTransactions || 0;

  const weeklyData = useMemo(() => {
    const days = ['CN','T2','T3','T4','T5','T6','T7'];
    const now = new Date();
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const val = ordersList.filter(o => o.createdAt?.startsWith(dateStr)).reduce((s, o) => s + (o.totalPrice || o.price || 0), 0);
      return { day: days[d.getDay()], date: `${d.getDate()}/${d.getMonth()+1}`, val };
    });
    const maxVal = Math.max(...result.map(r => r.val), 1);
    return result.map(r => ({ ...r, height: r.val > 0 ? `${Math.max(15, Math.round((r.val/maxVal)*90))}%` : '8px' }));
  }, [ordersList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <MetricCard
          label="Doanh Thu Sàn (15%)"
          value={`${totalPlatformRevenue.toLocaleString('vi-VN')} đ`}
          sub={`Thuê: ${hireFee.toLocaleString('vi-VN')} đ (${hireCount} đơn) • Donate: ${donateFee.toLocaleString('vi-VN')} đ (${donateCount} lượt)`}
          icon={Percent}
          color="#10b981"
        />
        <MetricCard label="Tổng Đơn Thuê" value={`${ordersList.length} đơn`} sub={`Tỷ lệ hoàn thành: ${completionRate}`} icon={ShoppingBag} color="#6366f1" />
        <MetricCard label="Tổng Tài Khoản" value={usersList.length.toLocaleString()} sub={`${playersList.filter(p=>p.status!=='PENDING').length} Game thủ hoạt động`} icon={Users} color="#06b6d4" />
        <MetricCard label="Game Thủ Chờ Duyệt" value={`${pendingCount} hồ sơ`} sub={`${reportsList.filter(r=>r.status==='PENDING').length} khiếu nại chưa xử lý`} icon={Award} color="#f59e0b" />
      </div>

      {/* Revenue Chart */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 20px' }}>Doanh Thu 7 Ngày Gần Nhất</h3>
        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
          {weeklyData.map((item, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.val > 0 ? `${(item.val/1000).toFixed(0)}k` : '0'}</span>
              <div title={`${item.day}: ${item.val.toLocaleString('vi-VN')} đ`} style={{ width: '100%', maxWidth: '32px', height: item.height, borderRadius: '6px 6px 0 0', background: item.val > 0 ? 'linear-gradient(180deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.06)', transition: 'all 0.3s', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.day}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px' }}>Phân Bổ Trạng Thái Đơn</h3>
          {['COMPLETED','CONFIRMED','PENDING','CANCELLED'].map(s => {
            const cnt = ordersList.filter(o => o.status === s).length;
            const pct = ordersList.length ? Math.round((cnt / ordersList.length) * 100) : 0;
            return (
              <div key={s} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '4px' }}>
                  <StatusBadge status={s} />
                  <span style={{ color: 'var(--text-muted)' }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '3px' }}>
                  <div style={{ width: `${pct || 1}%`, height: '100%', borderRadius: '3px', background: 'var(--primary)' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px' }}>Trạng Thái Hệ Thống</h3>
          {[
            { label: 'Kết nối Backend', ok: true },
            { label: 'Cơ sở dữ liệu', ok: true },
            { label: 'Dịch vụ thanh toán', ok: true },
            { label: 'Thông báo push', ok: true },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px' }}>Online</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// COMMISSION TAB (CHIẾT KHẤU 15% HỆ THỐNG)
// ─────────────────────────────────────────────
const CommissionTab = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        api.getAdminCommissionStats(),
        api.getAdminCommissionTransactions({ type: typeFilter, search })
      ]);
      setStats(sData);
      setTransactions(tData);
    } catch (err) {
      console.error('Lỗi tải dữ liệu chiết khấu:', err);
      addToast('Không thể tải dữ liệu chiết khấu sàn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionData();
  }, [typeFilter]);

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t =>
      t.transactionCode?.toLowerCase().includes(q) ||
      t.senderFullName?.toLowerCase().includes(q) ||
      t.senderUsername?.toLowerCase().includes(q) ||
      t.receiverFullName?.toLowerCase().includes(q) ||
      t.receiverUsername?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Policy Card Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(236,72,153,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '16px',
        padding: '22px 26px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', display: 'flex' }}>
              <Percent size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Chính Sách Chiết Khấu Sàn: 15% Cố Định</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Áp dụng tự động cho <strong>toàn bộ giao dịch Thuê Player và Donate quà tặng</strong>. 
            Người dùng chi trả 100%, <strong>Game thủ (Idol) thực nhận 85%</strong> và <strong>Nền tảng thu 15%</strong> làm phí vận hành và dịch vụ.
          </p>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '12px 18px',
          minWidth: '240px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
            💡 Ví dụ minh họa
          </div>
          <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Tổng giao dịch: <strong>1.000.000 đ</strong></div>
            <div style={{ color: '#10b981', fontWeight: 700 }}>→ Sàn thu (15%): +150.000 đ</div>
            <div style={{ color: '#38bdf8', fontWeight: 700 }}>→ Idol nhận (85%): +850.000 đ</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <MetricCard
          label="Tổng Chiết Khấu Thu Được (15%)"
          value={`${(stats?.totalCommissionRevenue || 0).toLocaleString('vi-VN')} đ`}
          sub={`Từ ${stats?.totalTransactions || 0} giao dịch hoàn tất`}
          icon={Percent}
          color="#10b981"
        />
        <MetricCard
          label="Chiết Khấu Thuê Player (15%)"
          value={`${(stats?.hireCommissionRevenue || 0).toLocaleString('vi-VN')} đ`}
          sub={`${stats?.hireTransactions || 0} đơn thuê hoàn thành`}
          icon={ShoppingBag}
          color="#6366f1"
        />
        <MetricCard
          label="Chiết Khấu Donate Tặng Quà (15%)"
          value={`${(stats?.donateCommissionRevenue || 0).toLocaleString('vi-VN')} đ`}
          sub={`${stats?.donateTransactions || 0} lượt tặng quà thành công`}
          icon={Sparkles}
          color="#ec4899"
        />
        <MetricCard
          label="Tổng Giá Trị Giao Dịch (GMV)"
          value={`${(stats?.totalTransactionVolume || 0).toLocaleString('vi-VN')} đ`}
          sub={`Idol đã nhận 85%: ${(stats?.totalPlayerEarnings || 0).toLocaleString('vi-VN')} đ`}
          icon={DollarSign}
          color="#06b6d4"
        />
      </div>

      {/* Transactions Container */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'Tất Cả Giao Dịch' },
              { id: 'HIRE', label: '🎮 Thuê Player' },
              { id: 'DONATE', label: '🎁 Donate Quà Tặng' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: typeFilter === tab.id ? 'var(--primary)' : 'transparent',
                  color: typeFilter === tab.id ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '220px' }}
                placeholder="Tìm mã GD, người gửi, Idol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={fetchCommissionData}
              className="btn btn-outline"
              style={{ height: '36px', padding: '0 12px', fontSize: '0.82rem' }}
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span style={{ marginLeft: '6px' }}>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Mã GD</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Thời Gian</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Loại Giao Dịch</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Người Chi Trả</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Game Thủ (Idol)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Giá Gốc (100%)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Phí Sàn (15%)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Idol Nhận (85%)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu chiết khấu...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Không tìm thấy giao dịch chiết khấu nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const isHire = t.type === 'HIRE';
                  return (
                    <tr
                      key={t.transactionCode || t.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                        #{t.transactionCode || t.id}
                      </td>
                      <td style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {t.createdAt || '—'}
                      </td>
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isHire ? 'rgba(99,102,241,0.15)' : 'rgba(236,72,153,0.15)',
                          color: isHire ? '#818cf8' : '#f472b6',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {isHire ? <ShoppingBag size={12} /> : <Sparkles size={12} />}
                          {t.typeLabel || (isHire ? 'Thuê Player' : 'Donate')}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={getUserAvatar({ avatar: t.senderAvatar, username: t.senderUsername })}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{t.senderFullName || t.senderUsername || 'Khách'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{t.senderUsername || 'user'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={getUserAvatar({ avatar: t.receiverAvatar, username: t.receiverUsername })}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fbbf24' }}>{t.receiverFullName || t.receiverUsername || 'Player'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{t.receiverUsername || 'player'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600 }}>
                        {(t.originalAmount || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        +{(t.platformFee || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#38bdf8' }}>
                        {(t.playerReceived || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <StatusBadge status={t.status || 'COMPLETED'} />
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedTx(t)}
                          style={{
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Breakdown Modal */}
      {selectedTx && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: '18px', padding: '26px', maxWidth: '520px', width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>
                  <Percent size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Chi Tiết Chiết Khấu #{selectedTx.transactionCode}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedTx.createdAt || 'Hôm nay'}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Parties Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Người Trả / Khách</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={getUserAvatar({ avatar: selectedTx.senderAvatar, username: selectedTx.senderUsername })} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedTx.senderFullName || selectedTx.senderUsername}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{selectedTx.senderUsername}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Game Thủ (Idol)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={getUserAvatar({ avatar: selectedTx.receiverAvatar, username: selectedTx.receiverUsername })} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>{selectedTx.receiverFullName || selectedTx.receiverUsername}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{selectedTx.receiverUsername}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Formula Breakdown Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.08) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                Hạch Toán Chiết Khấu (Tỷ lệ 15%)
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng giá trị giao dịch gốc (100%):</span>
                <span style={{ fontWeight: 700 }}>{(selectedTx.originalAmount || 0).toLocaleString('vi-VN')} đ</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem', color: '#10b981' }}>
                <span>Phí chiết khấu sàn thu (15%):</span>
                <span style={{ fontWeight: 800 }}>-{(selectedTx.platformFee || 0).toLocaleString('vi-VN')} đ</span>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1rem', color: '#38bdf8' }}>
                <span style={{ fontWeight: 700 }}>Idol thực nhận vào ví (85%):</span>
                <span style={{ fontWeight: 900 }}>{(selectedTx.playerReceived || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Note & Description */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              <strong>Mô tả:</strong> {selectedTx.description || 'Giao dịch qua cổng PlayZone'}
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="btn btn-primary"
              style={{ width: '100%', height: '40px', fontSize: '0.88rem' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// USERS TAB
// ─────────────────────────────────────────────
const UsersTab = ({ usersList, loading }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const { addToast } = useToast();

  const filtered = usersList
    .filter(u => roleFilter === 'ALL' || (u.roles && u.roles.some(r => r.includes(roleFilter))))
    .filter(u => !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  const handleBan = async (u) => {
    try {
      const action = u.enabled !== false ? 'ban' : 'unban';
      await api.request?.({ method: 'put', url: `/api/users/${u.id}/${action}` });
      addToast(`Đã ${action === 'ban' ? 'khóa' : 'mở khóa'} ${u.username}`, 'success');
    } catch {
      addToast('Thao tác thất bại', 'error');
    }
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Danh Sách Người Dùng ({usersList.length})</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>Quản lý tài khoản và phân quyền</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '200px' }} placeholder="Tìm username, email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="ALL">Tất cả vai trò</option>
            <option value="ADMIN">Admin</option>
            <option value="PLAYER">Game thủ</option>
            <option value="USER">Thành viên</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Thành viên</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Số dư ví</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Vai trò</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Trạng thái</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có kết quả</td></tr>
            ) : filtered.map(u => {
              const isAdmin = u.roles?.some(r => r.includes('ADMIN'));
              const isPlayer = u.roles?.some(r => r.includes('PLAYER'));
              const isBanned = u.enabled === false;
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={getUserAvatar(u)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{u.fullName || u.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{u.email || '—'}</td>
                  <td style={{ padding: '14px', fontWeight: 700, color: '#10b981' }}>{((u.coin ?? u.walletBalance ?? u.balance ?? 0)).toLocaleString('vi-VN')} đ</td>
                  <td style={{ padding: '14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: isAdmin ? 'rgba(244,63,94,0.15)' : isPlayer ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)', color: isAdmin ? '#f43f5e' : isPlayer ? '#06b6d4' : 'var(--text-muted)' }}>
                      {isAdmin ? '🛡️ Admin' : isPlayer ? '🎮 Game thủ' : '👤 Thành viên'}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}><StatusBadge status={isBanned ? 'BANNED' : 'AVAILABLE'} /></td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    {!isAdmin && (
                      <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.75rem', height: 'auto', borderColor: isBanned ? '#10b981' : '#ef4444', color: isBanned ? '#10b981' : '#ef4444' }} onClick={() => handleBan(u)}>
                        {isBanned ? <Unlock size={13} /> : <Lock size={13} />}
                        <span style={{ marginLeft: '4px' }}>{isBanned ? 'Mở khóa' : 'Khóa'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PLAYERS TAB
// ─────────────────────────────────────────────
const PlayersTab = ({ playersList, setPlayersList, loading }) => {
  const { addToast } = useToast();
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    api.getPlayersSummary().then(d => { setSummaryData(d); setSummaryLoading(false); });
  }, []);

  const pendingPlayers = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING');
  const activePlayers = playersList.filter(p => p.status !== 'PENDING' && p.adminStatus !== 'PENDING');

  const filteredSummary = summaryData.filter(p => {
    const matchSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.playerName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = async (pid) => {
    try {
      await api.approvePlayer(pid);
      setPlayersList(prev => prev.map(p => String(p.id) === String(pid) ? { ...p, status: 'AVAILABLE', adminStatus: 'APPROVED' } : p));
      addToast('Đã phê duyệt Game thủ!', 'success');
    } catch { addToast('Phê duyệt thất bại', 'error'); }
  };

  const handleReject = async (pid) => {
    try {
      await api.rejectPlayer(pid);
      setPlayersList(prev => prev.filter(p => String(p.id) !== String(pid)));
      addToast('Đã từ chối hồ sơ', 'info');
    } catch { addToast('Thao tác thất bại', 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Pending approvals */}
      {pendingPlayers.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Hồ Sơ Chờ Duyệt ({pendingPlayers.length})</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {pendingPlayers.map(p => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <img src={getUserAvatar(p)} alt="" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.fullName || p.name || p.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{p.primaryGame || p.game || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{(p.pricePerHour || p.price || 0).toLocaleString('vi-VN')} đ/h</div>
                  </div>
                </div>
                {p.bio && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', margin: '0 0 12px' }}>"{p.bio}"</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.82rem', background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApprove(p.id)}>
                    <Check size={14} /> <span>Phê duyệt</span>
                  </button>
                  <button className="btn btn-outline" style={{ padding: '8px 12px', fontSize: '0.82rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReject(p.id)}>
                    <X size={14} /> <span>Từ chối</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full player list with summary data */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Danh Sách Game Thủ ({summaryData.length})</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '180px' }} placeholder="Tìm game thủ..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">Tất cả</option>
              <option value="AVAILABLE">Sẵn sàng</option>
              <option value="BANNED">Bị khóa</option>
              <option value="PENDING">Chờ duyệt</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game thủ</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Đánh giá</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tổng đơn</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Doanh thu</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
              ) : filteredSummary.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có game thủ nào</td></tr>
              ) : filteredSummary.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={getUserAvatar(p)} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name || p.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.playerName || p.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px', color: 'var(--text-muted)' }}>{p.gameName || p.game || '—'}</td>
                  <td style={{ padding: '14px' }}>⭐ {(p.rating || 0).toFixed(1)}</td>
                  <td style={{ padding: '14px', fontWeight: 600 }}>{p.totalOrders || 0}</td>
                  <td style={{ padding: '14px', color: '#10b981', fontWeight: 700 }}>{(p.totalRevenue || 0).toLocaleString('vi-VN')} đ</td>
                  <td style={{ padding: '14px' }}><StatusBadge status={p.status || 'AVAILABLE'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────
const OrdersTab = ({ ordersList, loading }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = ordersList
    .filter(o => statusFilter === 'ALL' || o.status === statusFilter)
    .filter(o => !search || String(o.id).includes(search) || o.renterUsername?.toLowerCase().includes(search.toLowerCase()) || o.playerName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Lịch Sử Đơn Hàng ({ordersList.length})</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '180px' }} placeholder="Tìm mã đơn, tên..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">Tất cả</option>
            <option value="PENDING">Chờ xác nhận</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Mã đơn</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Người thuê</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game thủ</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tổng tiền</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Thời gian</th>
              <th style={{ padding: '10px 14px', textAlign: 'left' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có đơn hàng nào</td></tr>
            ) : filtered.map(o => (
              <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '14px', fontWeight: 700, color: 'var(--primary)' }}>#{o.id}</td>
                <td style={{ padding: '14px' }}>{o.renterUsername || o.renterId || '—'}</td>
                <td style={{ padding: '14px' }}>{o.playerName || o.playerId || '—'}</td>
                <td style={{ padding: '14px', fontWeight: 700, color: '#10b981' }}>{(o.totalPrice || o.price || 0).toLocaleString('vi-VN')} đ</td>
                <td style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td style={{ padding: '14px' }}><StatusBadge status={o.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// GAMES TAB
// ─────────────────────────────────────────────
const GamesTab = ({ gamesList, setGamesList, loading }) => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('MOBA');
  const [formPlatform, setFormPlatform] = useState('MOBILE');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formHasRoles, setFormHasRoles] = useState(false);
  const [formRanks, setFormRanks] = useState('');
  const [formRoles, setFormRoles] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const filtered = gamesList.filter(g => !search || g.name?.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormImageUrl(''); setFormWebsiteUrl('');
    setFormHasRoles(false); setFormRanks(''); setFormRoles('');
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      const ranksArray = formRanks.trim() ? formRanks.split(',').map(r => r.trim()).filter(Boolean) : [];
      const rolesArray = formHasRoles && formRoles.trim() ? formRoles.split(',').map(r => r.trim()).filter(Boolean) : [];
      const created = await api.createGame({
        name: formName.trim(),
        description: formDescription.trim() || formName.trim(),
        category: formCategory,
        platform: formPlatform,
        status: 'ACTIVE',
        hasRoles: formHasRoles,
        imageUrl: formImageUrl.trim() || null,
        websiteUrl: formWebsiteUrl.trim() || null,
        availableRanks: ranksArray,
        availableRoles: rolesArray
      });
      setGamesList(prev => [...prev, created]);
      addToast(`Đã thêm game "${formName}"`, 'success');
      resetForm();
      setShowForm(false);
    } catch (err) {
      addToast(err.response?.data || 'Không thể thêm game. Kiểm tra lại quyền Admin.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Danh Mục Game ({gamesList.length})</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '180px' }} placeholder="Tìm game..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => setShowForm(v => !v)}>
            <Plus size={15} /> <span>Thêm game</span>
          </button>
        </div>
      </div>
      {showForm && (
        <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
            <div style={{ flex: 2, minWidth: '160px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tên game *</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Ví dụ: PUBG Mobile" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div style={{ flex: 3, minWidth: '180px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mô tả</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Mô tả ngắn về game..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>
            <div style={{ minWidth: '130px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Thể loại</label>
              <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                <option value="MOBA">MOBA</option>
                <option value="FPS">FPS</option>
                <option value="RPG">RPG</option>
                <option value="BATTLE_ROYALE">Battle Royale</option>
                <option value="STRATEGY">Strategy</option>
                <option value="SPORT">Sport</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div style={{ minWidth: '120px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nền tảng</label>
              <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={formPlatform} onChange={e => setFormPlatform(e.target.value)}>
                <option value="MOBILE">Mobile</option>
                <option value="PC">PC</option>
                <option value="CONSOLE">Console</option>
              </select>
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Link ảnh bìa (URL)</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="https://..." value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Website chính thức (URL)</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="https://..." value={formWebsiteUrl} onChange={e => setFormWebsiteUrl(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ flex: 3, minWidth: '250px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                🏆 Danh sách Rank <span style={{ fontWeight: 400 }}>(phân cách bằng dấu phẩy, thứ tự thấp→cao)</span>
              </label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Ví dụ: Đồng, Bạc, Vàng, Bạch Kim, Kim Cương..." value={formRanks} onChange={e => setFormRanks(e.target.value)} />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Có vị trí/Role?</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', cursor: 'pointer' }} onClick={() => setFormHasRoles(v => !v)}>
                <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: formHasRoles ? 'var(--primary)' : 'var(--border-color)', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: formHasRoles ? '18px' : '2px', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: '0.85rem' }}>{formHasRoles ? 'Có' : 'Không'}</span>
              </div>
            </div>
            {formHasRoles && (
              <div style={{ flex: 3, minWidth: '250px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  🎮 Danh sách Vị Trí/Role <span style={{ fontWeight: 400 }}>(phân cách bằng dấu phẩy)</span>
                </label>
                <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Ví dụ: Top, Rừng, Mid, Xạ Thủ, Hỗ Trợ" value={formRoles} onChange={e => setFormRoles(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button className="btn btn-primary" style={{ fontSize: '0.85rem', height: '36px' }} onClick={handleAdd} disabled={submitting || !formName.trim()}>
                {submitting ? 'Đang lưu...' : 'Lưu game'}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem', height: '36px' }} onClick={() => { setShowForm(false); resetForm(); }}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedGame && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedGame(null)}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            {(selectedGame.imageUrl || selectedGame.image) && <img src={selectedGame.imageUrl || selectedGame.image} alt={selectedGame.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px 16px 0 0' }} onError={e => { e.target.style.display='none'; }} />}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{selectedGame.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{selectedGame.category}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>{selectedGame.platform}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedGame(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
              </div>
              {selectedGame.websiteUrl && <a href={selectedGame.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>{selectedGame.websiteUrl}</a>}
              {selectedGame.availableRanks?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>🏆 DANH SÁCH RANK ({selectedGame.availableRanks.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedGame.availableRanks.map((r, i) => <span key={i} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>{r}</span>)}
                  </div>
                </div>
              )}
              {selectedGame.availableRoles?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>🎮 DANH SÁCH VỊ TRÍ/ROLE ({selectedGame.availableRoles.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedGame.availableRoles.map((r, i) => <span key={i} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{r}</span>)}
                  </div>
                </div>
              )}
              {(!selectedGame.availableRanks?.length && !selectedGame.availableRoles?.length) && (
                <div style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Game này chưa có danh sách rank/role được cấu hình.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Đang tải...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {filtered.map(g => (
            <div key={g.id} style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => setSelectedGame(g)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {(g.imageUrl || g.image)
                ? <img src={g.imageUrl || g.image} alt={g.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                : null}
              <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: (g.imageUrl || g.image) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}><Gamepad2 size={32} style={{ color: '#fff', opacity: 0.7 }} /></div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {g.category} · {g.platform}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {g.availableRanks?.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>🏆 {g.availableRanks.length} rank</span>}
                  {g.availableRoles?.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>🎮 {g.availableRoles.length} role</span>}
                </div>
                {g.status && <div style={{ marginTop: '6px' }}><StatusBadge status={g.status} /></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// PAYMENTS TAB (NEW)
// ─────────────────────────────────────────────
const PaymentsTab = () => {
  const { addToast } = useToast();
  const [tab, setTab] = useState('deposit');
  const [depositList, setDepositList] = useState([]);
  const [withdrawList, setWithdrawList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getAdminTopupPayments(), api.getAdminWithdrawPayments()])
      .then(([dep, wit]) => { setDepositList(dep); setWithdrawList(wit); })
      .finally(() => setLoading(false));
  }, []);

  const currentList = tab === 'deposit' ? depositList : withdrawList;
  const setCurrentList = tab === 'deposit' ? setDepositList : setWithdrawList;

  const mapStatus = s => s === 'COMPLETED' ? 'processed' : s === 'PENDING' ? 'pending' : 'rejected';

  const filtered = currentList.filter(item => {
    const ms = mapStatus(item.status);
    const matchStatus = statusFilter === 'all' || ms === statusFilter;
    const matchSearch = !search || String(item.id).includes(search) || item.fullName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleApprove = async (item) => {
    try {
      await api.processPayment(item.id);
      setCurrentList(prev => prev.map(p => p.id === item.id ? { ...p, status: 'COMPLETED' } : p));
      addToast('Đã xác nhận thanh toán!', 'success');
      setSelectedItem(null);
    } catch { addToast('Xác nhận thất bại', 'error'); }
  };

  const handleReject = async (item) => {
    try {
      await api.refundPayment(item.id, 'Admin từ chối');
      setCurrentList(prev => prev.map(p => p.id === item.id ? { ...p, status: 'REJECTED' } : p));
      addToast('Đã từ chối giao dịch', 'info');
      setSelectedItem(null);
    } catch { addToast('Thao tác thất bại', 'error'); }
  };

  const totalPending = depositList.filter(d => d.status === 'PENDING').length + withdrawList.filter(w => w.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <MetricCard label="Nạp tiền chờ duyệt" value={depositList.filter(d=>d.status==='PENDING').length} sub={`Tổng: ${depositList.length}`} icon={ArrowDownCircle} color="#10b981" />
        <MetricCard label="Rút tiền chờ duyệt" value={withdrawList.filter(w=>w.status==='PENDING').length} sub={`Tổng: ${withdrawList.length}`} icon={ArrowUpCircle} color="#f59e0b" />
        <MetricCard label="Tổng chờ xử lý" value={totalPending} sub="Cần xử lý ngay" icon={CreditCard} color="#f43f5e" />
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Tab header */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          {[
            { id: 'deposit', label: '⬇ Nạp Tiền', count: depositList.length, pendingCount: depositList.filter(d=>d.status==='PENDING').length },
            { id: 'withdraw', label: '⬆ Rút Tiền', count: withdrawList.length, pendingCount: withdrawList.filter(w=>w.status==='PENDING').length },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); setStatusFilter('all'); }} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', background: tab === t.id ? 'var(--primary)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t.label}
              {t.pendingCount > 0 && <span style={{ background: '#f43f5e', color: '#fff', fontSize: '0.72rem', padding: '1px 6px', borderRadius: '10px' }}>{t.pendingCount}</span>}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: '32px', height: '34px', fontSize: '0.83rem', minWidth: '160px' }} placeholder="Tìm tên, ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ height: '34px', fontSize: '0.83rem' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processed">Đã xử lý</option>
              <option value="rejected">Từ chối</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Người dùng</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Số tiền</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Phương thức</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Ngày</th>
                {tab === 'withdraw' && <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tài khoản nhận</th>}
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có giao dịch nào</td></tr>
              ) : filtered.map(item => {
                const ms = mapStatus(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--primary)' }}>#{item.id}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600 }}>{item.fullName || '—'}</div>
                      {item.phoneNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.phoneNumber}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: tab === 'deposit' ? '#10b981' : '#f59e0b' }}>
                      {(item.coin || 0).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{item.method || 'MANUAL'}</td>
                    <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    {tab === 'withdraw' && (
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem' }}>
                        {item.bankName ? <span>{item.bankName}<br /><span style={{ color: 'var(--text-muted)' }}>{item.bankAccountNumber}</span></span> : '—'}
                      </td>
                    )}
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={ms} /></td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '0.75rem', height: 'auto' }} onClick={() => setSelectedItem(item)}>
                          <Eye size={13} />
                        </button>
                        {ms === 'pending' && (
                          <>
                            <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem', height: 'auto', background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApprove(item)}>
                              <Check size={13} /> <span>Duyệt</span>
                            </button>
                            <button className="btn btn-outline" style={{ padding: '5px 8px', fontSize: '0.75rem', height: 'auto', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReject(item)}>
                              <X size={13} />
                            </button>
                          </>
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

      {/* Detail Modal */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '420px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Chi Tiết Giao Dịch #{selectedItem.id}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedItem(null)}><X size={20} /></button>
            </div>
            {[
              ['Người dùng', selectedItem.fullName || '—'],
              ['Số điện thoại', selectedItem.phoneNumber || '—'],
              ['Số tiền', `${(selectedItem.coin || 0).toLocaleString('vi-VN')} đ`],
              ['Phương thức', selectedItem.method || 'MANUAL'],
              ['Ngày tạo', selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString('vi-VN') : '—'],
              ...(tab === 'withdraw' ? [
                ['Ngân hàng', selectedItem.bankName || '—'],
                ['Số tài khoản', selectedItem.bankAccountNumber || '—'],
                ['Tên tài khoản', selectedItem.bankAccountName || '—'],
              ] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.87rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {mapStatus(selectedItem.status) === 'pending' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-primary" style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApprove(selectedItem)}>
                  <Check size={15} /> <span>Xác nhận</span>
                </button>
                <button className="btn btn-outline" style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReject(selectedItem)}>
                  <X size={15} /> <span>Từ chối</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────
const ReportsTab = ({ reportsList, setReportsList, loading, onStatsRefresh }) => {
  const { addToast } = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [resolutionTexts, setResolutionTexts] = useState({});
  const [refundPercentages, setRefundPercentages] = useState({});

  const handleResolve = async (id) => {
    const report = reportsList.find(r => r.id === id);
    const percent = refundPercentages[id] !== undefined ? Number(refundPercentages[id]) : 100;
    const finalPercent = (percent > 0 && percent <= 100) ? percent : 100;
    const defaultResolution = report?.order 
      ? `Admin chấp thuận khiếu nại (Hoàn tiền ${finalPercent}%)`
      : 'Admin đã chấp thuận khiếu nại';
    const resolution = resolutionTexts[id]?.trim() || defaultResolution;

    try {
      await api.updateReportStatus(id, 'RESOLVED', resolution, finalPercent);
      setReportsList(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'RESOLVED',
        resolution,
        refundPercentage: finalPercent,
        order: r.order ? { ...r.order, status: 'REFUNDED' } : r.order
      } : r));
      setExpandedId(null);
      if (onStatsRefresh) onStatsRefresh();
      addToast(`Đã chấp thuận khiếu nại & hoàn tiền ${finalPercent}% thành công (Số tiền còn lại đã chuyển vào số dư khả dụng của idol)!`, 'success');
    } catch (e) {
      addToast('Lỗi khi xử lý khiếu nại!', 'error');
    }
  };

  const handleReject = async (id) => {
    const resolution = resolutionTexts[id]?.trim() || 'Admin từ chối khiếu nại';
    try {
      await api.updateReportStatus(id, 'REJECTED', resolution);
      setReportsList(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED', resolution } : r));
      setExpandedId(null);
      if (onStatsRefresh) onStatsRefresh();
      addToast('Đã từ chối khiếu nại (Toàn bộ số tiền đóng băng đã chuyển vào số dư khả dụng của idol)!', 'success');
    } catch (e) {
      addToast('Lỗi khi từ chối khiếu nại!', 'error');
    }
  };

  const pending = reportsList.filter(r => r.status === 'PENDING');
  const processed = reportsList.filter(r => r.status === 'RESOLVED' || r.status === 'REJECTED');

  const getReporterName = (r) => r.reporter?.username || r.reporter?.fullName || r.reportedBy || 'Khách hàng';
  const getTargetName = (r) => r.reportedPlayer?.username || r.reportedPlayer?.user?.username || r.targetUser || 'Game thủ';

  const ReportStatusBadge = ({ status }) => {
    const map = {
      PENDING: { label: 'Chờ xử lý', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
      INVESTIGATING: { label: 'Đang điều tra', bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
      RESOLVED: { label: 'Đã xử lý', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
      REJECTED: { label: 'Từ chối', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    };
    const s = map[status?.toUpperCase()] || map.PENDING;
    return (
      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, fontWeight: 700 }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Khiếu Nại & Vi Phạm ({reportsList.length})</h3>
        <div style={{ display: 'flex', gap: '10px', fontSize: '0.85rem' }}>
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>{pending.length} chờ xử lý</span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>{processed.length} đã xử lý</span>
        </div>
      </div>
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Đang tải...</p>
      ) : reportsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 10px', display: 'block' }} />
          <div>Không có khiếu nại nào!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reportsList.map(r => {
            const isExpanded = expandedId === r.id;
            const imageList = r.imageUrls ? r.imageUrls.split(',').map(s => s.trim()).filter(Boolean) : [];
            return (
              <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', cursor: 'pointer' }}
                onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>#{r.id}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(244,63,94,0.15)', color: '#f43f5e', fontWeight: 700 }}>
                      {r.reason || 'Khiếu nại'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                    <ReportStatusBadge status={r.status || 'PENDING'} />
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: isExpanded ? '12px' : 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span><strong>{getReporterName(r)}</strong> tố cáo <strong>{getTargetName(r)}</strong></span>
                  {r.order?.id && (
                    <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.12)', color: '#0284c7', fontSize: '0.78rem', fontWeight: 600 }}>
                      Đơn #{r.order.id} ({Number(r.order.price || 0).toLocaleString('vi-VN')} đ)
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}
                    onClick={e => e.stopPropagation()}>
                    {r.order && (
                      <div style={{ marginBottom: '12px', fontSize: '0.85rem', padding: '12px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span>
                            💰 <strong>Đơn thuê #{r.order.id}</strong> • Giá đơn: <strong style={{ color: '#059669' }}>{Number(r.order.price || 0).toLocaleString('vi-VN')} đ</strong>
                          </span>
                          <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, background: r.order.status === 'REFUNDED' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: r.order.status === 'REFUNDED' ? '#ef4444' : '#10b981' }}>
                            {r.order.status === 'REFUNDED' ? 'Đã Hoàn Tiền' : r.order.status}
                          </span>
                        </div>

                        {/* Nếu đơn PENDING: Cho phép nhập % hoàn tiền */}
                        {r.status === 'PENDING' && (() => {
                          const orderPrice = Number(r.order.price || 0);
                          const curPercent = refundPercentages[r.id] !== undefined ? refundPercentages[r.id] : 100;
                          const numPercent = Number(curPercent) || 0;
                          const playerRecv = Number(r.order.playerReceived || Math.round(orderPrice * 0.85));
                          const renterRefundVal = Math.round(orderPrice * (numPercent / 100));
                          const playerDeductVal = Math.round(playerRecv * (numPercent / 100));

                          return (
                            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0284c7' }}>
                                  🎯 Tỷ lệ hoàn tiền: <span style={{ color: '#10b981' }}>{numPercent}%</span>
                                </label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[20, 40, 50, 70, 100].map(p => (
                                    <button
                                      key={p}
                                      type="button"
                                      className="btn btn-sm"
                                      style={{
                                        padding: '2px 7px',
                                        fontSize: '0.75rem',
                                        height: 'auto',
                                        borderRadius: '6px',
                                        background: numPercent === p ? '#0284c7' : 'rgba(255,255,255,0.06)',
                                        color: numPercent === p ? '#fff' : 'var(--text-secondary)',
                                        border: '1px solid ' + (numPercent === p ? '#0284c7' : 'var(--border-color)')
                                      }}
                                      onClick={() => setRefundPercentages(prev => ({ ...prev, [r.id]: p }))}
                                    >
                                      {p}%
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="range"
                                  min="1"
                                  max="100"
                                  value={numPercent}
                                  onChange={e => setRefundPercentages(prev => ({ ...prev, [r.id]: Math.min(100, Math.max(1, Number(e.target.value))) }))}
                                  style={{ flex: 1, accentColor: '#0284c7', cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={curPercent}
                                    onChange={e => {
                                      const val = e.target.value === '' ? '' : Math.min(100, Math.max(1, Number(e.target.value)));
                                      setRefundPercentages(prev => ({ ...prev, [r.id]: val }));
                                    }}
                                    style={{
                                      width: '56px',
                                      padding: '3px 6px',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      background: 'var(--bg-primary)',
                                      color: 'var(--text-primary)',
                                      fontSize: '0.84rem',
                                      fontWeight: 700,
                                      textAlign: 'center'
                                    }}
                                  />
                                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>%</span>
                                </div>
                              </div>

                              {/* Hộp xem trước số tiền hoàn & phạt */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                background: 'rgba(0,0,0,0.18)',
                                fontSize: '0.8rem'
                              }}>
                                <div>
                                  <div style={{ color: 'var(--text-muted)' }}>Khách nhận lại ({numPercent}%):</div>
                                  <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.92rem' }}>
                                    +{renterRefundVal.toLocaleString('vi-VN')} Coin
                                  </div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)' }}>Idol bị thu hồi ({numPercent}%):</div>
                                  <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.92rem' }}>
                                    -{playerDeductVal.toLocaleString('vi-VN')} Coin
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    <div style={{ fontSize: '0.85rem', marginBottom: '10px' }}>
                      <strong>Mô tả:</strong> {r.description || '—'}
                    </div>
                    {/* Link bằng chứng (Google Drive / Link đính kèm) */}
                    {(r.videoUrl || r.imageUrls) && (
                      <div style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
                        <strong>Link bằng chứng:</strong>{' '}
                        <a
                          href={r.videoUrl || r.imageUrls}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: '#0284c7',
                            fontWeight: 600,
                            textDecoration: 'underline',
                            wordBreak: 'break-all',
                            marginLeft: '4px'
                          }}
                        >
                          🔗 {r.videoUrl || r.imageUrls}
                        </a>
                      </div>
                    )}
                    {imageList.length > 1 && (
                      <div style={{ marginBottom: '12px' }}>
                        <strong style={{ fontSize: '0.85rem' }}>Ảnh bằng chứng:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                          {imageList.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`Bằng chứng ${idx + 1}`}
                                style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                                onError={e => { e.target.style.display = 'none'; }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {r.resolution && (
                      <div style={{ fontSize: '0.85rem', marginBottom: '10px', color: r.status === 'REJECTED' ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong>Kết quả xử lý:</strong> <span>{r.resolution}</span>
                        {r.refundPercentage && (
                          <span style={{ fontSize: '0.76rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                            Hoàn {r.refundPercentage}% ({Number(r.refundAmount || 0).toLocaleString('vi-VN')} Coin)
                          </span>
                        )}
                      </div>
                    )}
                    {r.status === 'PENDING' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          placeholder="Ghi chú kết quả xử lý (tuỳ chọn)..."
                          value={resolutionTexts[r.id] || ''}
                          onChange={e => setResolutionTexts(prev => ({ ...prev, [r.id]: e.target.value }))}
                          rows={2}
                          style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.85rem', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', height: 'auto' }}
                            onClick={() => handleResolve(r.id)}>
                            <CheckCircle2 size={14} /> <span>Chấp thuận & Hoàn tiền</span>
                          </button>
                          <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.8rem', height: 'auto', borderColor: '#ef4444', color: '#ef4444' }}
                            onClick={() => handleReject(r.id)}>
                            <X size={14} /> <span>Từ chối</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────
export const AdminPage = () => {
  const { user, isAdmin, isAuthenticated, logout } = useAuth();
  const { addToast } = useToast();
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
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersR, playersR, ordersR, gamesR, reportsR, commStatsR] = await Promise.allSettled([
        api.getUsers(), api.getPlayers(), api.getAllOrdersAdmin(), api.getGames(), api.getReports(), api.getAdminCommissionStats()
      ]);
      if (usersR.status === 'fulfilled' && Array.isArray(usersR.value)) setUsersList(usersR.value);
      if (playersR.status === 'fulfilled' && Array.isArray(playersR.value)) setPlayersList(playersR.value);
      if (ordersR.status === 'fulfilled' && Array.isArray(ordersR.value)) setOrdersList(ordersR.value);
      if (gamesR.status === 'fulfilled' && Array.isArray(gamesR.value)) setGamesList(gamesR.value);
      if (reportsR.status === 'fulfilled' && Array.isArray(reportsR.value)) setReportsList(reportsR.value);
      if (commStatsR.status === 'fulfilled' && commStatsR.value) setCommissionStats(commStatsR.value);
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
        width: SIDEBAR_WIDTH, minHeight: '100vh', background: 'var(--card-bg)',
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
          position: 'sticky', top: 0, zIndex: 90, background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border-color)', padding: '0 24px',
          display: 'flex', alignItems: 'center', height: '64px', gap: '16px'
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
          {activeSection === 'overview' && <OverviewTab ordersList={ordersList} usersList={usersList} playersList={playersList} reportsList={reportsList} commissionStats={commissionStats} loading={loading} />}
          {activeSection === 'commission' && <CommissionTab />}
          {activeSection === 'users' && <UsersTab usersList={usersList} loading={loading} />}
          {activeSection === 'players' && <PlayersTab playersList={playersList} setPlayersList={setPlayersList} loading={loading} />}
          {activeSection === 'orders' && <OrdersTab ordersList={ordersList} loading={loading} />}
          {activeSection === 'games' && <GamesTab gamesList={gamesList} setGamesList={setGamesList} loading={loading} />}
          {activeSection === 'payments' && <PaymentsTab />}
          {activeSection === 'reports' && (
            <ReportsTab
              reportsList={reportsList}
              setReportsList={setReportsList}
              loading={loading}
              onStatsRefresh={async () => {
                try {
                  const comm = await api.getAdminCommissionStats();
                  if (comm) setCommissionStats(comm);
                  const allOrd = await api.getAllOrdersAdmin();
                  if (allOrd) setOrdersList(allOrd);
                } catch (ignored) {}
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
