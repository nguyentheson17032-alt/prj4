import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, Eye, X } from 'lucide-react';
import { OrderDetailModal } from '../../components/modals/OrderDetailModal';
import { parseDateToDateObj, formatOrderDateTime, StatusBadge } from './adminHelpers';

export const OrdersTab = ({ ordersList, loading }) => {
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
            if (st !== 'CANCELLED' && st !== 'CANCELED' && st !== 'REJECTED' && st !== 'EXPIRED') return false;
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

  const hasActiveFilters = Boolean(
    search || gameFilter !== 'ALL' || statusFilter !== 'ALL' || dateFilter !== 'ALL' || sortBy !== 'NEWEST'
  );

  const handleResetFilters = () => {
    setSearch('');
    setGameFilter('ALL');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setSortBy('NEWEST');
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      {/* Title Header & Top Right Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
            Lịch Sử Đơn Hàng ({filtered.length})
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Kiểm tra toàn bộ đơn đặt thuê Idol, trạng thái thanh toán và giải ngân
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '250px' }}>
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
                paddingLeft: '34px',
                paddingRight: search ? '30px' : '12px',
                height: '38px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px'
              }}
              placeholder="Tìm mã đơn, người thuê, idol, game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
          width: '100%',
          marginBottom: '16px'
        }}
      >
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

        {/* Reset button if active */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ height: '40px', padding: '0 12px', fontSize: '0.82rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={handleResetFilters}
          >
            <RotateCcw size={13} />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Thanh tóm tắt kết quả theo bộ lọc */}
      <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
        Đang hiển thị <strong>{filtered.length}</strong> / {ordersList.length} đơn hàng
        <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
        Doanh thu hoàn thành (đã lọc): <strong style={{ color: '#10b981' }}>{totalFilteredRevenue.toLocaleString('vi-VN')} đ</strong>
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

export default OrdersTab;
