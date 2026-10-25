import React from 'react';
import {
  LayoutDashboard, Percent, Users, Gamepad2,
  Sparkles, ShoppingBag, CreditCard, AlertTriangle
} from 'lucide-react';
import { getRefundPercentage } from '../../components/modals/OrderDetailModal';

// ─────────────────────────────────────────────
// Sidebar nav items
// ─────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
  { id: 'commission', label: 'Chiết Khấu (15%)', icon: Percent },
  { id: 'users', label: 'Người Dùng', icon: Users },
  { id: 'players', label: 'Game Thủ', icon: Gamepad2 },
  { id: 'moments', label: 'Quản Lý Khoảnh Khắc', icon: Sparkles },
  { id: 'orders', label: 'Đơn Hàng', icon: ShoppingBag },
  { id: 'games', label: 'Danh Mục Game', icon: Gamepad2 },
  { id: 'payments', label: 'Nạp / Rút Tiền', icon: CreditCard },
  { id: 'reports', label: 'Khiếu Nại', icon: AlertTriangle },
];

// ─────────────────────────────────────────────
// Date Parsing & Formatting Helpers
// ─────────────────────────────────────────────
export const parseDateToDateObj = (dateVal) => {
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

export const formatOrderDateTime = (dateVal) => {
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
export const StatusBadge = ({ status, order }) => {
  const map = {
    PENDING: { label: 'Chờ duyệt', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    COMPLETED: { label: 'Hoàn thành', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    AVAILABLE: { label: 'Sẵn sàng', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    BANNED: { label: 'Đã khóa', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    REJECTED: { label: 'Từ chối', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    PLAYING: { label: 'Đang chơi', bg: 'rgba(6,182,212,0.15)', color: '#06b6d4' },
    CONFIRMED: { label: 'Đã xác nhận', bg: 'rgba(6,182,212,0.15)', color: '#06b6d4' },
    CANCELLED: { label: 'Đã hủy', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    CANCELED: { label: 'Đã hủy', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    REFUNDED: { label: 'Đã hoàn tiền', bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
    processed: { label: 'Đã xử lý', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    pending: { label: 'Chờ xử lý', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    rejected: { label: 'Từ chối', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    ACTIVE: { label: 'Đang hiển thị', bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
    HIDDEN: { label: 'Đang ẩn', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    DELETED: { label: 'Đã xóa', bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
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
export const MetricCard = ({ label, value, sub, icon: Icon, color }) => (
  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <div style={{ padding: '8px', borderRadius: '10px', background: `${color}22`, color }}><Icon size={20} /></div>
    </div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
    {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>{sub}</div>}
  </div>
);
