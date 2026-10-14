import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, Users, Gamepad2, ShoppingBag, TrendingUp,
  DollarSign, AlertTriangle, CheckCircle2, XCircle, Search,
  Plus, Lock, Unlock, RefreshCw, BarChart3, Award, Clock,
  Sparkles, ChevronRight, Check, X, CreditCard, Wallet,
  LogOut, Home, ArrowUpCircle, ArrowDownCircle, Eye,
  LayoutDashboard, FileText, Settings, Bell, Moon, Sun,
  Ban, UserCheck, ChevronLeft, Filter, Percent, Info,
  Copy, Download, RotateCcw, Calendar, ArrowUpDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar } from '../utils/avatarUtils';
import { useTheme } from '../context/ThemeContext';
import api from '../api/apiService';
import { BanUserModal } from '../components/modals/BanUserModal';
import { UnbanUserModal } from '../components/modals/UnbanUserModal';
import { UserDetailModal } from '../components/modals/UserDetailModal';
import { OrderDetailModal, getRefundPercentage } from '../components/modals/OrderDetailModal';
import { PlayerDetailModal, getPrimaryGame } from '../components/modals/PlayerDetailModal';

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
// ─────────────────────────────────────────────
// Date Parsing & Formatting Helpers
// ─────────────────────────────────────────────
const parseDateToDateObj = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? null : dateVal;
  if (typeof dateVal === 'number') return new Date(dateVal);

  const str = String(dateVal).trim();
  // Format "HH:mm dd/MM/yyyy" or "HH:mm:ss dd/MM/yyyy"
  const timeDateMatch = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (timeDateMatch) {
    const [, hours, minutes, seconds = 0, day, month, year] = timeDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
  }
  // Format "dd/MM/yyyy HH:mm" or "dd/MM/yyyy"
  const dateTimeMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dateTimeMatch) {
    const [, day, month, year, hours = 0, minutes = 0, seconds = 0] = dateTimeMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
  }
  // Standard ISO or any standard parseable date
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

const formatOrderDateTime = (dateVal) => {
  const d = parseDateToDateObj(dateVal);
  if (!d) return '—';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

// ─────────────────────────────────────────────
// Status badge helper
// ─────────────────────────────────────────────
const StatusBadge = ({ status, order }) => {
  const map = {
    PENDING:   { label: 'Chờ duyệt',    bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    COMPLETED: { label: 'Hoàn thành',   bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
    AVAILABLE: { label: 'Sẵn sàng',     bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
    BANNED:    { label: 'Đã khóa',      bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    REJECTED:  { label: 'Từ chối',      bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    PLAYING:   { label: 'Đang chơi',    bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
    CONFIRMED: { label: 'Đã xác nhận',  bg: 'rgba(6,182,212,0.15)',   color: '#06b6d4' },
    CANCELLED: { label: 'Đã hủy',       bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    CANCELED:  { label: 'Đã hủy',       bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
    REFUNDED:  { label: 'Đã hoàn tiền', bg: 'rgba(168,85,247,0.15)',  color: '#a855f7' },
    processed: { label: 'Đã xử lý',     bg: 'rgba(16,185,129,0.15)',  color: '#10b981' },
    pending:   { label: 'Chờ xử lý',    bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
    rejected:  { label: 'Từ chối',      bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
  };

  const refundPct = (status === 'REFUNDED' || order?.status === 'REFUNDED') ? getRefundPercentage(order) : null;
  const s = map[status] || { label: status, bg: 'rgba(107,114,128,0.15)', color: '#6b7280' };
  const label = (status === 'REFUNDED' && refundPct) ? `Đã hoàn tiền ${refundPct}%` : s.label;

  return (
    <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {label}
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
const OverviewTab = ({ ordersList, usersList, playersList, reportsList, commissionStats, commissionTransactions, loading }) => {
  const pendingCount = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING').length;
  const completedCount = ordersList.filter(o => o.status === 'COMPLETED').length;
  const completionRate = ordersList.length ? `${Math.round((completedCount / ordersList.length) * 100)}%` : '100%';

  // Tổng doanh thu sàn là số tiền sàn ăn được từ chiết khấu (15%) từ cả đơn thuê và donate quà tặng
  const totalPlatformRevenue = commissionStats?.totalCommissionRevenue != null
    ? commissionStats.totalCommissionRevenue
    : (commissionStats?.hireCommissionRevenue || 0) + (commissionStats?.donateCommissionRevenue || 0);

  const hireFee = commissionStats?.hireCommissionRevenue != null ? commissionStats.hireCommissionRevenue : 0;
  const donateFee = commissionStats?.donateCommissionRevenue || 0;
  const hireCount = commissionStats?.hireTransactions != null ? commissionStats.hireTransactions : 0;
  const donateCount = commissionStats?.donateTransactions || 0;

  // Sơ đồ doanh thu sàn 7 ngày gần nhất (số tiền sàn ăn được 15% từng ngày từ thuê và donate)
  const weeklyData = useMemo(() => {
    const days = ['CN','T2','T3','T4','T5','T6','T7'];
    const now = new Date();
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const targetDay = d.getDate();
      const targetMonth = d.getMonth();
      const targetYear = d.getFullYear();

      let dayPlatformFee = 0;
      let hirePart = 0;
      let donatePart = 0;

      if (commissionTransactions && commissionTransactions.length > 0) {
        commissionTransactions.forEach(t => {
          const st = (t.status || '').toUpperCase();
          if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED') return;
          const dateObj = parseDateToDateObj(t.createdAt);
          if (!dateObj) return;
          if (dateObj.getDate() === targetDay && dateObj.getMonth() === targetMonth && dateObj.getFullYear() === targetYear) {
            const fee = Number(t.platformFee) || 0;
            dayPlatformFee += fee;
            if (t.type === 'DONATE') donatePart += fee;
            else hirePart += fee;
          }
        });
      } else {
        ordersList.forEach(o => {
          const st = (o.status || '').toUpperCase();
          if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED') return;
          const dateObj = parseDateToDateObj(o.startTime || o.createdAt || o.hireTime);
          if (!dateObj) return;
          if (dateObj.getDate() === targetDay && dateObj.getMonth() === targetMonth && dateObj.getFullYear() === targetYear) {
            let fee = o.platformFee != null ? o.platformFee : Math.round((o.totalPrice || o.price || 0) * 0.15);
            if (st === 'REFUNDED') {
              const refundPct = o.refundPercentage || 0;
              fee = Math.max(0, Math.round(fee * (1 - refundPct / 100)));
            }
            dayPlatformFee += fee;
            hirePart += fee;
          }
        });
      }

      return {
        day: days[d.getDay()],
        date: `${targetDay}/${targetMonth + 1}`,
        val: dayPlatformFee,
        hirePart,
        donatePart
      };
    });

    const maxVal = Math.max(...result.map(r => r.val), 1);
    return result.map(r => ({ ...r, height: r.val > 0 ? `${Math.max(15, Math.round((r.val/maxVal)*90))}%` : '8px' }));
  }, [commissionTransactions, ordersList]);

  const weeklyTotalCommission = useMemo(() => {
    return weeklyData.reduce((acc, r) => acc + r.val, 0);
  }, [weeklyData]);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Doanh Thu Sàn 7 Ngày Gần Nhất (Chiết khấu 15%)
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'inline-block' }}>
              Số tiền sàn thu về: <strong style={{ color: '#10b981' }}>{weeklyTotalCommission.toLocaleString('vi-VN')} đ</strong> (từ đơn thuê & donate)
            </span>
          </div>
        </div>

        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
          {weeklyData.map((item, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {item.val > 0 ? (item.val >= 1000 ? `${(item.val / 1000).toFixed(0)}k` : `${item.val} đ`) : '0'}
              </span>
              <div
                title={`${item.day} (${item.date}): ${item.val.toLocaleString('vi-VN')} đ (Thuê: ${item.hirePart.toLocaleString('vi-VN')} đ • Donate: ${item.donatePart.toLocaleString('vi-VN')} đ)`}
                style={{
                  width: '100%',
                  maxWidth: '32px',
                  height: item.height,
                  borderRadius: '6px 6px 0 0',
                  background: item.val > 0 ? 'linear-gradient(180deg, #10b981, #6366f1)' : 'rgba(255,255,255,0.06)',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
              />
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
          {[
            { key: 'COMPLETED', label: 'Hoàn thành', color: '#10b981', matches: ['COMPLETED'] },
            { key: 'CONFIRMED', label: 'Đã xác nhận', color: '#06b6d4', matches: ['CONFIRMED', 'IN_PROGRESS'] },
            { key: 'PENDING', label: 'Chờ duyệt', color: '#f59e0b', matches: ['PENDING'] },
            { key: 'CANCELLED', label: 'Đã hủy', color: '#ef4444', matches: ['CANCELLED', 'CANCELED', 'REJECTED'] },
            { key: 'REFUNDED', label: 'Đã hoàn tiền', color: '#a855f7', matches: ['REFUNDED'] },
          ].map(item => {
            const cnt = ordersList.filter(o => item.matches.includes(o.status?.toUpperCase())).length;
            const pct = ordersList.length ? Math.round((cnt / ordersList.length) * 100) : 0;
            return (
              <div key={item.key} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem', marginBottom: '4px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: `${item.color}22`,
                    color: item.color
                  }}>
                    {item.label}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: item.color, transition: 'width 0.4s ease' }} />
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
const UsersTab = ({ usersList = [], setUsersList, loading, reloadUsers }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, BANNED
  const [sortBy, setSortBy] = useState('NEWEST'); // NEWEST, BALANCE_DESC, USERNAME_ASC
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedUserToBan, setSelectedUserToBan] = useState(null);
  const [selectedUserUnban, setSelectedUserUnban] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const { addToast } = useToast();

  // Metrics
  const totalUsers = usersList.length;
  const bannedCount = useMemo(() => {
    return usersList.filter(u => u.enabled === false || u.accountNonLocked === false || u.activeBan != null).length;
  }, [usersList]);
  const activeCount = totalUsers - bannedCount;
  const playerCount = useMemo(() => {
    return usersList.filter(u => u.roles && u.roles.some(r => r.includes('PLAYER'))).length;
  }, [usersList]);

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    return usersList
      .filter(u => {
        // Role filter
        if (roleFilter !== 'ALL') {
          const matchRole = u.roles && u.roles.some(r => r.includes(roleFilter));
          if (!matchRole) return false;
        }

        // Status filter
        const isBanned = u.enabled === false || u.accountNonLocked === false || u.activeBan != null;
        if (statusFilter === 'ACTIVE' && isBanned) return false;
        if (statusFilter === 'BANNED' && !isBanned) return false;

        // Search text
        if (search.trim()) {
          const term = search.toLowerCase().trim();
          const username = (u.username || '').toLowerCase();
          const fullName = (u.fullName || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = (u.phoneNumber || u.phone || '').toLowerCase();
          return username.includes(term) || fullName.includes(term) || email.includes(term) || phone.includes(term);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'BALANCE_DESC') {
          const balA = Number(a.coin ?? a.walletBalance ?? a.balance ?? 0);
          const balB = Number(b.coin ?? b.walletBalance ?? b.balance ?? 0);
          return balB - balA;
        }
        if (sortBy === 'USERNAME_ASC') {
          return (a.username || '').localeCompare(b.username || '');
        }
        // Default NEWEST (by id desc)
        return (b.id || 0) - (a.id || 0);
      });
  }, [usersList, roleFilter, statusFilter, search, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, sortBy]);

  const handleBanSuccess = (userId, banData) => {
    setUsersList?.(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          enabled: false,
          accountNonLocked: false,
          activeBan: {
            reason: banData.reason,
            description: banData.description,
            banType: banData.banType,
            banExpiresAt: banData.banExpiresAt,
            bannedAt: new Date().toISOString()
          }
        };
      }
      return u;
    }));
    addToast('Đã khóa tài khoản thành công!', 'success');
    reloadUsers?.();
  };

  const handleUnbanSuccess = (userId) => {
    setUsersList?.(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          enabled: true,
          accountNonLocked: true,
          activeBan: null
        };
      }
      return u;
    }));
    addToast('Đã mở khóa tài khoản thành công!', 'success');
    reloadUsers?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Summary Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Người Dùng</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '2px' }}>{totalUsers}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Đang Hoạt Động</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{activeCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ban size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Đang Bị Khóa</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{bannedCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gamepad2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Game Thủ / Idol</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4', marginTop: '2px' }}>{playerCount}</div>
          </div>
        </div>
      </div>

      {/* ── Main User Table Panel ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Header Title */}
        <div style={{ marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Quản Lý Người Dùng & Phân Quyền</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Kiểm soát tài khoản, áp dụng chế tài kỷ luật khóa/mở khóa tức thì
          </p>
        </div>

        {/* Controls Toolbar: Responsive Search & Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            width: '100%',
            marginBottom: '20px'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '2 1 240px', minWidth: '180px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              className="form-control"
              style={{
                paddingLeft: '36px',
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px'
              }}
              placeholder="Tìm tên, username, email, sđt..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">🛡️ Admin</option>
              <option value="PLAYER">🎮 Game thủ</option>
              <option value="USER">👤 Thành viên</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">🟢 Đang hoạt động</option>
              <option value="BANNED">🔒 Đang bị khóa</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="NEWEST">Mới nhất</option>
              <option value="BALANCE_DESC">Số dư ví cao nhất</option>
              <option value="USERNAME_ASC">Tên đăng nhập (A-Z)</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Thành viên</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Email & Liên Hệ</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Số dư ví</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Vai trò</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => {
                  const isAdmin = u.roles?.some(r => r.includes('ADMIN'));
                  const isPlayer = u.roles?.some(r => r.includes('PLAYER'));
                  const isBanned = u.enabled === false || u.accountNonLocked === false || u.activeBan != null;
                  const activeBan = u.activeBan;
                  const walletVal = Number(u.coin ?? u.walletBalance ?? u.balance ?? 0);

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s',
                        background: isBanned ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                      }}
                    >
                      {/* Member Info */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={getUserAvatar(u)}
                            alt=""
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: isBanned ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.08)'
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{u.fullName || u.username}</span>
                              <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                #{u.id}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{u.email || '—'}</div>
                        {(u.phoneNumber || u.phone) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            📞 {u.phoneNumber || u.phone}
                          </div>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td style={{ padding: '14px', fontWeight: 800, color: walletVal > 0 ? '#10b981' : 'var(--text-muted)' }}>
                        {walletVal.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            background: isAdmin ? 'rgba(244,63,94,0.15)' : isPlayer ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)',
                            color: isAdmin ? '#f43f5e' : isPlayer ? '#06b6d4' : 'var(--text-muted)'
                          }}
                        >
                          {isAdmin ? '🛡️ Admin' : isPlayer ? '🎮 Game thủ' : '👤 Thành viên'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px' }}>
                        {isBanned ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                width: 'fit-content'
                              }}
                            >
                              <Lock size={11} />
                              Bị khóa
                            </span>
                            {activeBan && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#f87171',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={activeBan.reason}
                              >
                                {activeBan.banType === 'TEMPORARY' ? '⏳ Tạm thời' : '🛑 Vĩnh viễn'}
                                {activeBan.reason ? `: ${activeBan.reason}` : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            Sẵn sàng
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            className="btn btn-outline"
                            title="Xem chi tiết người dùng"
                            style={{ padding: '5px 8px', height: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                            onClick={() => setSelectedUserDetail(u)}
                          >
                            <Eye size={13} />
                          </button>

                          {isAdmin ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 8px' }}>
                              Bảo vệ
                            </span>
                          ) : isBanned ? (
                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                height: 'auto',
                                borderColor: '#10b981',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: 700
                              }}
                              onClick={() => setSelectedUserUnban(u)}
                            >
                              <Unlock size={13} />
                              <span>Mở khóa</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                height: 'auto',
                                borderColor: '#ef4444',
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: 700
                              }}
                              onClick={() => setSelectedUserToBan(u)}
                            >
                              <Lock size={13} />
                              <span>Khóa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {!loading && filteredUsers.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Hiển thị <strong>{((currentPage - 1) * pageSize) + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> trên tổng số <strong>{filteredUsers.length}</strong> người dùng
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '5px 10px', height: 'auto', fontSize: '0.78rem' }}
              >
                Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={page}>
                      {prev && page - prev > 1 && (
                        <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
                      )}
                      <button
                        className={currentPage === page ? 'btn btn-primary' : 'btn btn-outline'}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: '5px 10px',
                          height: 'auto',
                          fontSize: '0.78rem',
                          minWidth: '32px'
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '5px 10px', height: 'auto', fontSize: '0.78rem' }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <BanUserModal
        isOpen={Boolean(selectedUserToBan)}
        onClose={() => setSelectedUserToBan(null)}
        user={selectedUserToBan}
        onSuccess={handleBanSuccess}
      />

      <UnbanUserModal
        isOpen={Boolean(selectedUserUnban)}
        onClose={() => setSelectedUserUnban(null)}
        user={selectedUserUnban}
        onSuccess={handleUnbanSuccess}
      />

      <UserDetailModal
        isOpen={Boolean(selectedUserDetail)}
        onClose={() => setSelectedUserDetail(null)}
        user={selectedUserDetail}
      />
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
  const [gameFilter, setGameFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('REVENUE_DESC');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    api.getPlayersSummary().then(d => { setSummaryData(d); setSummaryLoading(false); });
  }, []);

  const pendingPlayers = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING');
  const activePlayers = playersList.filter(p => p.status !== 'PENDING' && p.adminStatus !== 'PENDING');

  // Danh sách các tựa game có trong hệ thống để đưa vào dropdown bộ lọc
  const availableGameNames = useMemo(() => {
    const set = new Set();
    summaryData.forEach(p => {
      const g = p.gameName || p.game;
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [summaryData]);

  // Gộp các hồ sơ game theo từng Game thủ duy nhất
  const groupedPlayers = useMemo(() => {
    const map = new Map();
    summaryData.forEach(p => {
      const key = p.userId ? String(p.userId) : (p.email || p.name || p.playerName || p.id);
      if (!map.has(key)) {
        map.set(key, {
          key,
          id: p.id,
          userId: p.userId,
          name: p.name || p.fullName || p.playerName,
          playerName: p.playerName || p.username || '',
          email: p.email,
          avatarUrl: p.avatarUrl,
          games: [],
          totalOrders: 0,
          totalReviews: 0,
          totalRevenue: 0,
          status: p.status || 'AVAILABLE',
          ratings: []
        });
      }
      const group = map.get(key);
      const gName = p.gameName || p.game;
      if (gName && !group.games.some(g => g.name === gName)) {
        group.games.push({
          id: p.id,
          name: gName,
          rank: p.rankLabel || '',
          status: p.status,
          totalOrders: p.totalOrders || 0,
          rating: p.rating || 0,
          totalRevenue: p.totalRevenue || 0,
          pricePerHour: p.pricePerHour || p.price || 0,
          server: p.server || '',
          role: p.role || '',
          bio: p.bio || p.description || '',
          totalReviews: p.totalReviews || 0
        });
      }
      group.totalOrders += (p.totalOrders || 0);
      group.totalReviews += (p.totalReviews || 0);
      group.totalRevenue += (p.totalRevenue || 0);
      if (p.rating > 0) {
        group.ratings.push(p.rating);
      }
      if (p.status === 'AVAILABLE') {
        group.status = 'AVAILABLE';
      }
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      avgRating: g.ratings.length ? (g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length) : 0
    }));
  }, [summaryData]);

  const filteredGrouped = useMemo(() => {
    return groupedPlayers
      .filter(p => {
        // Search
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          const matchName = (p.name || '').toLowerCase().includes(s);
          const matchUsername = (p.playerName || '').toLowerCase().includes(s);
          const matchGame = p.games.some(g => (g.name || '').toLowerCase().includes(s));
          if (!matchName && !matchUsername && !matchGame) return false;
        }
        // Game filter
        if (gameFilter !== 'ALL') {
          const hasGame = p.games.some(g => g.name === gameFilter);
          if (!hasGame) return false;
        }
        // Status filter
        if (statusFilter !== 'ALL' && p.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'REVENUE_DESC') return (b.totalRevenue || 0) - (a.totalRevenue || 0);
        if (sortBy === 'ORDERS_DESC') return (b.totalOrders || 0) - (a.totalOrders || 0);
        if (sortBy === 'RATING_DESC') return (b.avgRating || 0) - (a.avgRating || 0);
        if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
  }, [groupedPlayers, search, gameFilter, statusFilter, sortBy]);

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
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Danh Sách Game Thủ ({filteredGrouped.length})
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Đã tối ưu gộp {summaryData.length} hồ sơ theo {groupedPlayers.length} Game thủ
            </p>
          </div>
        </div>

        {/* Controls Toolbar: Responsive Search & Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            width: '100%',
            marginBottom: '20px'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '2 1 240px', minWidth: '180px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none'
              }}
            />
            <input
              className="form-control"
              style={{
                paddingLeft: '36px',
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px'
              }}
              placeholder="Tìm game thủ, username, game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Game Filter */}
          <div style={{ flex: '1 1 150px', minWidth: '135px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
            >
              <option value="ALL">🎮 Tất cả game</option>
              {availableGameNames.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="AVAILABLE">🟢 Đang sẵn sàng</option>
              <option value="BANNED">🔒 Đang bị khóa</option>
              <option value="PENDING">⏳ Chờ duyệt</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="REVENUE_DESC">Doanh thu cao nhất</option>
              <option value="ORDERS_DESC">Số đơn nhiều nhất</option>
              <option value="RATING_DESC">Đánh giá cao nhất</option>
              <option value="NAME_ASC">Tên game thủ (A-Z)</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game thủ</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game đã đăng ký</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Đánh giá</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tổng đơn</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Doanh thu</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
              ) : filteredGrouped.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có game thủ nào phù hợp</td></tr>
              ) : (
                filteredGrouped.map(p => {
                  const primaryGame = getPrimaryGame(p.games);
                  const hasMultiple = p.games && p.games.length > 1;

                  return (
                    <tr key={p.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {/* Game thủ */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={getUserAvatar(p)} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{p.name || p.playerName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              @{p.playerName || 'player'} {p.email ? `• ${p.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Game đã đăng ký */}
                      <td style={{ padding: '14px' }}>
                        {primaryGame ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span>🎮 {primaryGame.name}</span>
                              {primaryGame.rank && <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({primaryGame.rank})</span>}
                            </span>
                            {hasMultiple && (
                              <span
                                title={`Đã đăng ký ${p.games.length} game. Nhấn "Xem chi tiết" để xem tất cả.`}
                                style={{
                                  color: 'var(--text-muted)',
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  letterSpacing: '1px',
                                  userSelect: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setSelectedPlayer(p)}
                              >
                                .....
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Đánh giá */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        ⭐ {p.avgRating > 0 ? p.avgRating.toFixed(1) : '0.0'}
                      </td>

                      {/* Tổng đơn */}
                      <td style={{ padding: '14px', fontWeight: 600 }}>{p.totalOrders} đơn</td>

                      {/* Doanh thu */}
                      <td style={{ padding: '14px', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {(p.totalRevenue || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '14px' }}>
                        <StatusBadge status={p.status || 'AVAILABLE'} />
                      </td>

                      {/* Thao tác: Chi tiết */}
                      <td style={{ padding: '14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPlayer(p)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            gap: '6px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Xem toàn bộ thông tin chi tiết game thủ"
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

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />
    </div>
  );
};

// ─────────────────────────────────────────────
// ORDERS TAB
// ─────────────────────────────────────────────
const OrdersTab = ({ ordersList, loading }) => {
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Available game names extracted from order records
  const availableGameNames = useMemo(() => {
    const set = new Set();
    ordersList.forEach(o => {
      const g = o.game || o.player?.game;
      if (g && typeof g === 'string' && g.trim()) {
        set.add(g.trim());
      }
    });
    return Array.from(set).sort();
  }, [ordersList]);

  // Filtered and sorted orders
  const filtered = useMemo(() => {
    return ordersList
      .filter(o => {
        // Status filter
        if (statusFilter !== 'ALL') {
          const st = (o.status || '').toUpperCase();
          if (statusFilter === 'CANCELLED') {
            if (st !== 'CANCELLED' && st !== 'CANCELED' && st !== 'REJECTED') return false;
          } else if (statusFilter === 'REFUNDED') {
            if (st !== 'REFUNDED') return false;
          } else if (st !== statusFilter) {
            return false;
          }
        }
        // Game filter
        if (gameFilter !== 'ALL') {
          const g = o.game || o.player?.game || '';
          if (g !== gameFilter) return false;
        }
        // Date filter
        if (dateFilter !== 'ALL') {
          const d = parseDateToDateObj(o.startTime || o.createdAt);
          if (!d) return false;
          const now = new Date();
          if (dateFilter === 'TODAY') {
            if (d.getDate() !== now.getDate() || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
          } else if (dateFilter === 'WEEK') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (d < sevenDaysAgo) return false;
          } else if (dateFilter === 'MONTH') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (d < thirtyDaysAgo) return false;
          }
        }
        // Search text
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          const matchId = String(o.id).includes(s);
          const matchRenter = (o.renterName || o.renterUsername || o.renter?.username || '').toLowerCase().includes(s);
          const matchPlayer = (o.playerName || o.player?.username || '').toLowerCase().includes(s);
          const matchGame = (o.game || o.player?.game || '').toLowerCase().includes(s);
          if (!matchId && !matchRenter && !matchPlayer && !matchGame) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'PRICE_DESC') {
          return Number(b.totalPrice || b.price || 0) - Number(a.totalPrice || a.price || 0);
        }
        if (sortBy === 'PRICE_ASC') {
          return Number(a.totalPrice || a.price || 0) - Number(b.totalPrice || b.price || 0);
        }
        const da = parseDateToDateObj(a.startTime || a.createdAt);
        const db = parseDateToDateObj(b.startTime || b.createdAt);
        if (sortBy === 'OLDEST') {
          if (da && db) return da - db;
          return a.id - b.id;
        }
        // Default NEWEST
        if (da && db) return db - da;
        return b.id - a.id;
      });
  }, [ordersList, search, gameFilter, statusFilter, dateFilter, sortBy]);

  const totalFilteredRevenue = useMemo(() => {
    return filtered
      .filter(o => (o.status || '').toUpperCase() === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.totalPrice || o.price || 0), 0);
  }, [filtered]);

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      {/* Title Header */}
      <div style={{ marginBottom: '18px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
          Lịch Sử Đơn Hàng ({filtered.length})
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Tổng {ordersList.length} đơn | Doanh thu hoàn thành (đã lọc): <strong style={{ color: '#10b981' }}>{totalFilteredRevenue.toLocaleString('vi-VN')} đ</strong>
        </p>
      </div>

      {/* Responsive Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          width: '100%',
          marginBottom: '20px'
        }}
      >
        {/* Search Box */}
        <div style={{ position: 'relative', flex: '2 1 220px', minWidth: '180px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              pointerEvents: 'none'
            }}
          />
          <input
            className="form-control"
            style={{ paddingLeft: '36px', height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px' }}
            placeholder="Tìm mã đơn, người thuê, game thủ, game..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Game Filter */}
        <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <select
            className="form-control"
            style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
          >
            <option value="ALL">🎮 Tất cả game</option>
            {availableGameNames.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <select
            className="form-control"
            style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="COMPLETED">🟢 Hoàn thành</option>
            <option value="CONFIRMED">🔵 Đã xác nhận</option>
            <option value="PENDING">⏳ Chờ xác nhận</option>
            <option value="CANCELLED">🔴 Đã hủy</option>
            <option value="REFUNDED">🟣 Đã hoàn tiền</option>
          </select>
        </div>

        {/* Date Filter */}
        <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <select
            className="form-control"
            style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="ALL">📅 Tất cả thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="WEEK">7 ngày gần nhất</option>
            <option value="MONTH">30 ngày qua</option>
          </select>
        </div>

        {/* Sort Filter */}
        <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
          <select
            className="form-control"
            style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="NEWEST">Mới nhất</option>
            <option value="OLDEST">Cũ nhất</option>
            <option value="PRICE_DESC">Tổng tiền cao nhất</option>
            <option value="PRICE_ASC">Tổng tiền thấp nhất</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Mã đơn</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Người thuê</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Game thủ</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Tổng tiền</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Thời gian</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Trạng thái</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không tìm thấy đơn hàng nào phù hợp</td></tr>
            ) : filtered.map(o => {
              const renterDisplayName = o.renterName || o.renterUsername || o.renter?.username || (o.renterId ? `User #${o.renterId}` : '—');
              const playerDisplayName = o.playerName || o.player?.username || (o.playerId ? `Player #${o.playerId}` : '—');

              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {/* Mã đơn */}
                  <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>#{o.id}</span>
                  </td>

                  {/* Người thuê */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={o.renterAvatarUrl || getUserAvatar({ username: renterDisplayName })}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ lineHeight: 1.25 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{renterDisplayName}</div>
                        {o.renterId && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: #{o.renterId}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Game thủ */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={o.playerAvatarUrl || getUserAvatar({ username: playerDisplayName })}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ lineHeight: 1.25 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{playerDisplayName}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                          {o.game || 'Duo Game'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Tổng tiền */}
                  <td style={{ padding: '14px', fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>
                    {(o.totalPrice || o.price || 0).toLocaleString('vi-VN')} đ
                  </td>

                  {/* Thời gian */}
                  <td style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatOrderDateTime(o.startTime || o.createdAt)}
                  </td>

                  {/* Trạng thái */}
                  <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                    <StatusBadge status={o.status} order={o} />
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding: '14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(o)}
                      className="btn btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        gap: '6px',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title="Xem toàn bộ thông tin chi tiết đơn hàng"
                    >
                      <Eye size={13} />
                      <span>Chi tiết</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
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
// ─────────────────────────────────────────────
// PAYMENTS TAB (UPGRADED)
// ─────────────────────────────────────────────
const PaymentsTab = () => {
  const { addToast } = useToast();
  const [tab, setTab] = useState('deposit');
  const [depositList, setDepositList] = useState([]);
  const [withdrawList, setWithdrawList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc nâng cao
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amountFilter, setAmountFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals thao tác
  const [selectedItem, setSelectedItem] = useState(null);
  const [approveItem, setApproveItem] = useState(null);
  const [approveTxId, setApproveTxId] = useState('');
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('Thông tin tài khoản ngân hàng không chính xác');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getAdminTopupPayments(), api.getAdminWithdrawPayments()])
      .then(([dep, wit]) => {
        setDepositList(Array.isArray(dep) ? dep : []);
        setWithdrawList(Array.isArray(wit) ? wit : []);
      })
      .catch(() => addToast('Không thể tải danh sách nạp/rút tiền', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentList = tab === 'deposit' ? depositList : withdrawList;
  const setCurrentList = tab === 'deposit' ? setDepositList : setWithdrawList;

  const mapStatus = s => (s === 'COMPLETED' ? 'processed' : s === 'PENDING' ? 'pending' : 'rejected');

  // Thống kê tổng quan
  const totalDepositSuccess = depositList
    .filter(d => d.status === 'COMPLETED')
    .reduce((sum, d) => sum + (Number(d.coin) || 0), 0);

  const totalWithdrawSuccess = withdrawList
    .filter(w => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (Number(w.coin) || 0), 0);

  const netFlow = totalDepositSuccess - totalWithdrawSuccess;

  const pendingWithdrawList = withdrawList.filter(w => w.status === 'PENDING');
  const pendingDepositList = depositList.filter(d => d.status === 'PENDING');
  const pendingWithdrawCount = pendingWithdrawList.length;
  const pendingDepositCount = pendingDepositList.length;
  const pendingWithdrawAmount = pendingWithdrawList.reduce((sum, w) => sum + (Number(w.coin) || 0), 0);
  const pendingDepositAmount = pendingDepositList.reduce((sum, d) => sum + (Number(d.coin) || 0), 0);

  // Danh sách các phương thức / ngân hàng để lọc
  const uniqueMethods = useMemo(() => {
    const set = new Set();
    currentList.forEach(item => {
      if (tab === 'withdraw') {
        if (item.bankName) set.add(item.bankName.trim());
      } else {
        if (item.method) set.add(item.method.trim());
      }
    });
    return Array.from(set);
  }, [currentList, tab]);

  // Bộ lọc dữ liệu
  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return currentList.filter(item => {
      // 1. Trạng thái
      const ms = mapStatus(item.status);
      if (statusFilter !== 'all' && ms !== statusFilter) return false;

      // 2. Tìm kiếm (ID, Tên, SĐT, STK, Ngân hàng)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const idMatch = String(item.id).includes(q);
        const nameMatch = item.fullName?.toLowerCase().includes(q);
        const phoneMatch = item.phoneNumber?.includes(q);
        const accMatch = item.bankAccountNumber?.toLowerCase().includes(q);
        const bankMatch = item.bankName?.toLowerCase().includes(q);
        const methodMatch = item.method?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch && !accMatch && !bankMatch && !methodMatch) {
          return false;
        }
      }

      // 3. Khoảng tiền
      const coin = Number(item.coin) || 0;
      if (amountFilter === '<100k' && coin >= 100000) return false;
      if (amountFilter === '100k-500k' && (coin < 100000 || coin > 500000)) return false;
      if (amountFilter === '500k-2m' && (coin <= 500000 || coin > 2000000)) return false;
      if (amountFilter === '>2m' && coin <= 2000000) return false;

      // 4. Ngân hàng / Phương thức
      if (methodFilter !== 'all') {
        if (tab === 'withdraw') {
          if (item.bankName?.trim() !== methodFilter) return false;
        } else {
          if (item.method?.trim() !== methodFilter) return false;
        }
      }

      // 5. Thời gian
      if (dateFilter !== 'all') {
        const itemDateObj = parseDateToDateObj(item.createdAt);
        const itemTime = itemDateObj ? itemDateObj.getTime() : 0;
        if (!itemTime) return false;

        if (dateFilter === 'today' && itemTime < todayStart) return false;
        if (dateFilter === 'yesterday' && (itemTime < yesterdayStart || itemTime >= todayStart)) return false;
        if (dateFilter === 'last7days' && itemTime < sevenDaysAgo) return false;
        if (dateFilter === 'last30days' && itemTime < thirtyDaysAgo) return false;
        if (dateFilter === 'thisMonth' && itemTime < thisMonthStart) return false;
        if (dateFilter === 'custom') {
          if (startDate) {
            const startLimit = new Date(startDate).getTime();
            if (itemTime < startLimit) return false;
          }
          if (endDate) {
            const endLimit = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
            if (itemTime >= endLimit) return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'amount-desc') return (Number(b.coin) || 0) - (Number(a.coin) || 0);
      if (sortBy === 'amount-asc') return (Number(a.coin) || 0) - (Number(b.coin) || 0);

      const timeA = parseDateToDateObj(a.createdAt)?.getTime() || 0;
      const timeB = parseDateToDateObj(b.createdAt)?.getTime() || 0;
      if (sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA; // newest default
    });
  }, [currentList, search, statusFilter, dateFilter, startDate, endDate, amountFilter, methodFilter, sortBy, tab]);

  // Tổng tiền trong danh sách sau lọc
  const filteredTotalAmount = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.coin) || 0), 0);
  }, [filtered]);

  const hasActiveFilters = search || statusFilter !== 'all' || dateFilter !== 'all' || amountFilter !== 'all' || methodFilter !== 'all' || sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setAmountFilter('all');
    setMethodFilter('all');
    setSortBy('newest');
  };

  // Sao chép nhanh STK
  const handleCopy = (text, label = 'nội dung') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast(`Đã sao chép ${label}: ${text}`, 'success');
  };

  // Duyệt thanh toán / Rút tiền
  const handleConfirmApprove = async () => {
    if (!approveItem) return;
    setIsSubmitting(true);
    try {
      const txId = approveTxId.trim() || `ADM_${Date.now()}`;
      await api.processPayment(approveItem.id, txId);
      setCurrentList(prev => prev.map(p => p.id === approveItem.id ? { ...p, status: 'COMPLETED' } : p));
      addToast(`Đã duyệt đơn #${approveItem.id} thành công!`, 'success');
      setApproveItem(null);
      setApproveTxId('');
    } catch {
      addToast('Duyệt thanh toán thất bại, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Từ chối giao dịch & Hoàn tiền
  const handleConfirmReject = async () => {
    if (!rejectItem) return;
    setIsSubmitting(true);
    try {
      const reason = rejectReason.trim() || 'Admin từ chối giao dịch';
      await api.refundPayment(rejectItem.id, reason);
      setCurrentList(prev => prev.map(p => p.id === rejectItem.id ? { ...p, status: 'REFUNDED' } : p));
      addToast(`Đã từ chối đơn #${rejectItem.id} và hoàn tiền cho người dùng!`, 'info');
      setRejectItem(null);
      setRejectReason('Thông tin tài khoản ngân hàng không chính xác');
    } catch {
      addToast('Thao tác từ chối thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xuất file CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      addToast('Không có dữ liệu để xuất file', 'warning');
      return;
    }
    const headers = tab === 'withdraw'
      ? ['ID', 'Tên người dùng', 'Số điện thoại', 'Số tiền (VNĐ)', 'Ngân hàng', 'Số tài khoản', 'Chủ tài khoản', 'Ngày tạo', 'Trạng thái']
      : ['ID', 'Tên người dùng', 'Số điện thoại', 'Số tiền (VNĐ)', 'Phương thức', 'Ngày tạo', 'Trạng thái'];

    const rows = filtered.map(item => {
      const statusText = item.status === 'COMPLETED' ? 'Thành công' : item.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối / Hoàn tiền';
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—';
      if (tab === 'withdraw') {
        return [
          item.id,
          `"${item.fullName || '—'}"`,
          `"${item.phoneNumber || '—'}"`,
          item.coin || 0,
          `"${item.bankName || '—'}"`,
          `'${item.bankAccountNumber || '—'}`,
          `"${item.bankAccountName || '—'}"`,
          `"${dateStr}"`,
          `"${statusText}"`
        ];
      }
      return [
        item.id,
        `"${item.fullName || '—'}"`,
        `"${item.phoneNumber || '—'}"`,
        item.coin || 0,
        `"${item.method || 'MANUAL'}"`,
        `"${dateStr}"`,
        `"${statusText}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_${tab === 'withdraw' ? 'rut_tien' : 'nap_tien'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Đã xuất file CSV thành công!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 4 Cards Thống Kê Tổng Quan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <MetricCard
          label="Tổng Tiền Đã Nạp"
          value={`${totalDepositSuccess.toLocaleString('vi-VN')} đ`}
          sub={`${depositList.filter(d => d.status === 'COMPLETED').length} đơn nạp thành công`}
          icon={ArrowDownCircle}
          color="#10b981"
        />
        <MetricCard
          label="Tổng Tiền Đã Rút"
          value={`${totalWithdrawSuccess.toLocaleString('vi-VN')} đ`}
          sub={`${withdrawList.filter(w => w.status === 'COMPLETED').length} đơn rút thành công`}
          icon={ArrowUpCircle}
          color="#f59e0b"
        />
        <MetricCard
          label="Chênh Lệch Nạp - Rút"
          value={`${netFlow >= 0 ? '+' : ''}${netFlow.toLocaleString('vi-VN')} đ`}
          sub="Dòng tiền ròng hệ thống"
          icon={DollarSign}
          color={netFlow >= 0 ? '#6366f1' : '#f43f5e'}
        />
        <MetricCard
          label="Chờ Xử Lý Duyệt"
          value={`${pendingWithdrawCount + pendingDepositCount} đơn`}
          sub={`Rút: ${pendingWithdrawCount} (${pendingWithdrawAmount.toLocaleString('vi-VN')}đ) | Nạp: ${pendingDepositCount}`}
          icon={Clock}
          color="#f43f5e"
        />
      </div>

      {/* Main Container */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Header Tabs: Nạp Tiền & Rút Tiền */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { id: 'deposit', label: '⬇ Quản Lý Nạp Tiền', count: depositList.length, pendingCount: pendingDepositCount },
              { id: 'withdraw', label: '⬆ Quản Lý Rút Tiền', count: withdrawList.length, pendingCount: pendingWithdrawCount },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setMethodFilter('all');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: tab === t.id ? (t.id === 'withdraw' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--primary)') : 'rgba(255,255,255,0.05)',
                  color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span>{t.label}</span>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>({t.count})</span>
                {t.pendingCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 900 }}>
                    {t.pendingCount} chờ
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Nút Xuất CSV và Nút Tải Lại */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-outline"
              style={{ height: '36px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleExportCSV}
              title="Xuất danh sách đang lọc ra file CSV Excel"
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>
            <button
              className="btn btn-outline"
              style={{ height: '36px', fontSize: '0.82rem', padding: '0 10px' }}
              onClick={fetchData}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Hệ Thống Bộ Lọc Nâng Cao */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Hàng 1: Ô tìm kiếm & Các select */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {/* 1. Tìm kiếm */}
            <div style={{ position: 'relative', minWidth: '200px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: '34px', height: '38px', fontSize: '0.85rem' }}
                placeholder={tab === 'withdraw' ? "Tìm theo tên, SĐT, STK, mã #ID..." : "Tìm theo tên, SĐT, mã #ID..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* 2. Trạng thái */}
            <div>
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">⏳ Chờ duyệt (Pending)</option>
                <option value="processed">✅ Đã xử lý (Completed)</option>
                <option value="rejected">❌ Từ chối / Hoàn tiền</option>
              </select>
            </div>

            {/* 3. Khoảng thời gian */}
            <div>
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              >
                <option value="all">Tất cả thời gian</option>
                <option value="today">Hôm nay</option>
                <option value="yesterday">Hôm qua</option>
                <option value="last7days">7 ngày qua</option>
                <option value="last30days">30 ngày qua</option>
                <option value="thisMonth">Tháng này</option>
                <option value="custom">Tùy chọn khoảng ngày...</option>
              </select>
            </div>

            {/* 4. Khoảng số tiền */}
            <div>
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                value={amountFilter}
                onChange={e => setAmountFilter(e.target.value)}
              >
                <option value="all">Tất cả mệnh giá</option>
                <option value="<100k">Dưới 100.000 đ</option>
                <option value="100k-500k">100.000 đ - 500.000 đ</option>
                <option value="500k-2m">500.000 đ - 2.000.000 đ</option>
                <option value=">2m">Trên 2.000.000 đ</option>
              </select>
            </div>

            {/* 5. Ngân hàng / Phương thức */}
            {uniqueMethods.length > 0 && (
              <div>
                <select
                  className="form-control"
                  style={{ height: '38px', fontSize: '0.85rem' }}
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                >
                  <option value="all">{tab === 'withdraw' ? 'Tất cả ngân hàng' : 'Tất cả phương thức'}</option>
                  {uniqueMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 6. Sắp xếp */}
            <div>
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="amount-desc">Số tiền: Cao → Thấp</option>
                <option value="amount-asc">Số tiền: Thấp → Cao</option>
              </select>
            </div>
          </div>

          {/* Hàng 2: Tùy chọn ngày tùy chỉnh (Nếu chọn custom) */}
          {dateFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '4px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Từ ngày:</span>
              <input
                type="date"
                className="form-control"
                style={{ height: '34px', fontSize: '0.82rem', width: 'auto' }}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Đến ngày:</span>
              <input
                type="date"
                className="form-control"
                style={{ height: '34px', fontSize: '0.82rem', width: 'auto' }}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          )}

          {/* Hàng 3: Thanh tóm tắt kết quả theo bộ lọc */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              Đang hiển thị <strong>{filtered.length}</strong> / {currentList.length} giao dịch
              <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
              Tổng tiền lọc được: <strong style={{ color: tab === 'withdraw' ? '#f59e0b' : '#10b981' }}>{filteredTotalAmount.toLocaleString('vi-VN')} đ</strong>
            </div>

            {hasActiveFilters && (
              <button
                className="btn btn-outline"
                style={{ height: '30px', padding: '0 10px', fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                onClick={handleResetFilters}
              >
                <RotateCcw size={12} style={{ marginRight: '4px' }} />
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* Bảng Dữ Liệu Giao Dịch */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Mã Đơn</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Người Dùng</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Số Tiền</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>{tab === 'withdraw' ? 'Ngân Hàng' : 'Phương Thức'}</th>
                {tab === 'withdraw' && <th style={{ padding: '12px 14px', textAlign: 'left' }}>Tài Khoản Nhận Tiền</th>}
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Ngày Tạo</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Trạng Thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {hasActiveFilters ? 'Không tìm thấy giao dịch nào phù hợp với bộ lọc' : 'Không có giao dịch nào'}
                  </td>
                </tr>
              ) : filtered.map(item => {
                const ms = mapStatus(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    {/* ID */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--primary)' }}>
                      #{item.id}
                    </td>

                    {/* Người dùng */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={item.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                          alt=""
                          style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.fullName || '—'}</div>
                          {item.phoneNumber && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.phoneNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Số tiền */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: '0.95rem', color: tab === 'deposit' ? '#10b981' : '#f59e0b' }}>
                      {(item.coin || 0).toLocaleString('vi-VN')} đ
                    </td>

                    {/* Phương thức / Ngân hàng */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {tab === 'withdraw' ? (item.bankName || 'Ngân hàng') : (item.method || 'VIETQR')}
                    </td>

                    {/* Cột tài khoản nhận (cho tab rút tiền) */}
                    {tab === 'withdraw' && (
                      <td style={{ padding: '12px 14px', fontSize: '0.82rem' }}>
                        {item.bankAccountNumber ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{item.bankAccountNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.bankAccountNumber, 'số tài khoản')}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                title="Sao chép STK"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                              {item.bankAccountName || '—'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )}

                    {/* Ngày tạo */}
                    <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={ms} />
                    </td>

                    {/* Hành động */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 8px', fontSize: '0.75rem', height: 'auto' }}
                          onClick={() => setSelectedItem(item)}
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>

                        {ms === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto', background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                setApproveItem(item);
                                setApproveTxId(`TX_${Date.now()}`);
                              }}
                              title="Duyệt giao dịch"
                            >
                              <Check size={14} /> <span>Duyệt</span>
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '6px 8px', fontSize: '0.75rem', height: 'auto', borderColor: '#ef4444', color: '#ef4444' }}
                              onClick={() => setRejectItem(item)}
                              title="Từ chối & Hoàn tiền"
                            >
                              <X size={14} />
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

      {/* Modal Chi Tiết Giao Dịch */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '460px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Chi Tiết Giao Dịch #{selectedItem.id}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedItem(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['Người dùng', selectedItem.fullName || '—'],
                ['Số điện thoại', selectedItem.phoneNumber || '—'],
                ['Số tiền', `${(selectedItem.coin || 0).toLocaleString('vi-VN')} đ`],
                ['Phương thức / Loại', tab === 'withdraw' ? 'Rút Tiền Về Ngân Hàng' : (selectedItem.method || 'VIETQR')],
                ['Ngày tạo', selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString('vi-VN') : '—'],
                ['Trạng thái', selectedItem.status === 'COMPLETED' ? 'Đã duyệt thành công' : selectedItem.status === 'PENDING' ? 'Chờ duyệt' : 'Đã từ chối / Hoàn tiền'],
                ...(tab === 'withdraw' ? [
                  ['Ngân hàng thụ hưởng', selectedItem.bankName || '—'],
                  ['Số tài khoản', selectedItem.bankAccountNumber || '—'],
                  ['Tên chủ tài khoản', selectedItem.bankAccountName || '—'],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>

            {mapStatus(selectedItem.status) === 'pending' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#10b981', borderColor: '#10b981', height: '42px', fontWeight: 700 }}
                  onClick={() => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    setApproveItem(item);
                    setApproveTxId(`TX_${Date.now()}`);
                  }}
                >
                  <Check size={16} /> <span>Duyệt Thanh Toán</span>
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', height: '42px', fontWeight: 700 }}
                  onClick={() => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    setRejectItem(item);
                  }}
                >
                  <X size={16} /> <span>Từ Chối & Hoàn Tiền</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Duyệt Đơn */}
      {approveItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setApproveItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                Xác Nhận Duyệt Đơn #{approveItem.id}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setApproveItem(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {tab === 'withdraw'
                ? `Bạn đang xác nhận đã chuyển khoản ngân hàng thành công số tiền ${(approveItem.coin || 0).toLocaleString('vi-VN')} đ cho người dùng.`
                : `Xác nhận đã nhận được tiền nạp ${(approveItem.coin || 0).toLocaleString('vi-VN')} đ của người dùng.`}
            </p>

            {tab === 'withdraw' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span>
                  <span style={{ fontWeight: 700 }}>{approveItem.bankName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800 }}>{approveItem.bankAccountNumber}</span>
                    <button type="button" onClick={() => handleCopy(approveItem.bankAccountNumber, 'STK')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
                  <span style={{ fontWeight: 700 }}>{approveItem.bankAccountName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tiền cần chuyển:</span>
                  <span style={{ fontWeight: 900, color: '#f59e0b', fontSize: '1rem' }}>{(approveItem.coin || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                Mã tham chiếu / Mã giao dịch ngân hàng (Tùy chọn)
              </label>
              <input
                type="text"
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                placeholder="VD: MB_123456789..."
                value={approveTxId}
                onChange={e => setApproveTxId(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setApproveItem(null)} disabled={isSubmitting}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                onClick={handleConfirmApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ Chối & Hoàn Tiền */}
      {rejectItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRejectItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ef4444' }}>
                Từ Chối Giao Dịch #{rejectItem.id}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setRejectItem(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Khi từ chối, số tiền <strong>{(rejectItem.coin || 0).toLocaleString('vi-VN')} đ</strong> sẽ được <strong style={{ color: '#10b981' }}>tự động hoàn lại vào ví</strong> của người dùng <strong>{rejectItem.fullName}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                Chọn nhanh lý do từ chối:
              </label>
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem', marginBottom: '8px' }}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              >
                <option value="Thông tin tài khoản ngân hàng không chính xác">Thông tin tài khoản ngân hàng không chính xác</option>
                <option value="Tên chủ tài khoản không khớp với số tài khoản">Tên chủ tài khoản không khớp với số tài khoản</option>
                <option value="Số tài khoản ngân hàng không tồn tại">Số tài khoản ngân hàng không tồn tại</option>
                <option value="Tài khoản có dấu hiệu vi phạm chính sách giao dịch">Tài khoản có dấu hiệu vi phạm chính sách giao dịch</option>
                <option value="Khác">Lý do khác (tự nhập bên dưới)</option>
              </select>

              <input
                type="text"
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                placeholder="Nhập chi tiết lý do gửi cho người dùng..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setRejectItem(null)} disabled={isSubmitting}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: '#ef4444', borderColor: '#ef4444', fontWeight: 700 }}
                onClick={handleConfirmReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Từ Chối & Hoàn Tiền'}
              </button>
            </div>
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
  const [commissionTransactions, setCommissionTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersR, playersR, ordersR, gamesR, reportsR, commStatsR, commTxR] = await Promise.allSettled([
        api.getUsers(), api.getPlayers(), api.getAllOrdersAdmin(), api.getGames(), api.getReports(), api.getAdminCommissionStats(), api.getAdminCommissionTransactions({ type: 'ALL' })
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
