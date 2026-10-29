import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, User, Gamepad2, Calendar, Clock, DollarSign, 
  ShieldCheck, AlertTriangle, Star, CheckCircle, Info, MessageSquare, Shield
} from 'lucide-react';

const formatDateTime = (dt) => {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return String(dt);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return String(dt);
  }
};

export const getRefundPercentage = (order) => {
  if (!order) return null;
  if (order.refundPercentage != null && order.refundPercentage > 0) {
    return order.refundPercentage;
  }
  if (order.refundAmount != null && order.refundAmount > 0) {
    const total = Number(order.totalPrice || order.price || 0);
    if (total > 0) return Math.min(100, Math.max(1, Math.round((order.refundAmount / total) * 100)));
  }
  // Deduce from totalPrice and playerReceived if status is REFUNDED
  const st = (order.status || '').toUpperCase();
  if (st === 'REFUNDED') {
    const total = Number(order.totalPrice || order.price || 0);
    const recv = Number(order.playerReceived);
    if (total > 0 && !isNaN(recv)) {
      const standardRecv = Math.round(total * 0.85);
      if (standardRecv > 0) {
        const diff = standardRecv - recv;
        if (diff > 0) {
          return Math.min(100, Math.max(1, Math.round((diff / standardRecv) * 100)));
        }
      }
      if (recv === 0) return 100;
    }
    return 100;
  }
  return null;
};

const getStatusBadge = (status, refundPercentage) => {
  const st = (status || 'PENDING').toUpperCase();
  switch (st) {
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
    case 'CONFIRMED':
      return { label: 'Đã xác nhận', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' };
    case 'PENDING':
      return { label: 'Chờ xác nhận', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    case 'CANCELLED':
    case 'CANCELED':
    case 'REJECTED':
      return { label: 'Đã hủy', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
    case 'EXPIRED':
      return { label: 'Hết hạn xác nhận', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
    case 'REFUNDED':
      return { 
        label: refundPercentage ? `Đã hoàn tiền ${refundPercentage}%` : 'Đã hoàn tiền', 
        bg: 'rgba(168, 85, 247, 0.15)', 
        color: '#a855f7', 
        border: 'rgba(168, 85, 247, 0.3)' 
      };
    default:
      return { label: status, bg: 'rgba(255, 255, 255, 0.08)', color: '#94a3b8', border: 'rgba(255, 255, 255, 0.15)' };
  }
};

export const OrderDetailModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const refundPercent = getRefundPercentage(order);
  const stBadge = getStatusBadge(order.status, refundPercent);
  const totalPrice = Number(order.totalPrice || order.price || 0);
  const platformFee = Number(order.platformFee !== undefined ? order.platformFee : Math.round(totalPrice * 0.15));
  const playerReceived = Number(order.playerReceived !== undefined ? order.playerReceived : (totalPrice - platformFee));
  const refundAmount = order.refundAmount != null && order.refundAmount > 0
    ? Number(order.refundAmount)
    : (refundPercent ? Math.round(totalPrice * (refundPercent / 100)) : 0);

  const renterDisplayName = order.renterName || order.renterUsername || order.renter?.username || (order.renterId ? `User #${order.renterId}` : 'Khách Hàng');
  const playerDisplayName = order.playerName || order.player?.username || order.player?.fullName || (order.playerId ? `Game thủ #${order.playerId}` : 'Game Thủ');

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          background: 'linear-gradient(145deg, #181824 0%, #11111a 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}
            >
              <Gamepad2 size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  Đơn Hàng #{order.id}
                </h3>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: stBadge.bg,
                    color: stBadge.color,
                    border: `1px solid ${stBadge.border}`
                  }}
                >
                  {stBadge.label}
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                Thời gian tạo: {formatDateTime(order.startTime || order.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#fff',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body content with scroll */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Two Parties: Renter & Player Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {/* Renter Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  👤 Người Thuê (Khách hàng)
                </span>
                {order.renterId && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
                    ID: #{order.renterId}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={order.renterAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${renterDisplayName}`}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(56, 189, 248, 0.4)' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{renterDisplayName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)' }}>Tài khoản thành viên</div>
                </div>
              </div>
            </div>

            {/* Player Box */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🎮 Game Thủ (Idol PlayZone)
                </span>
                {order.playerId && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
                    ID: #{order.playerId}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={order.playerAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${playerDisplayName}`}
                  alt=""
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(168, 85, 247, 0.4)' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{playerDisplayName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--primary, #6366f1)', fontWeight: 600 }}>
                    {order.game || 'Duo Game'} {order.playerRank ? `• ${order.playerRank}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Service & Time Breakdown */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
              ⏱️ Chi Tiết Lịch Thuê & Thời Lượng
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Tựa Game</div>
                <div style={{ fontWeight: 600, color: '#fff', marginTop: '3px' }}>{order.game || 'Duo Game'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Thời Lượng Thuê</div>
                <div style={{ fontWeight: 600, color: '#fff', marginTop: '3px' }}>
                  {order.hours ? `${order.hours} giờ` : '1 giờ'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Khung Giờ</div>
                <div style={{ fontWeight: 600, color: '#fff', marginTop: '3px', fontSize: '0.85rem' }}>
                  {order.hireTime || formatDateTime(order.startTime)}
                </div>
              </div>
            </div>

            {order.specialRequest && (
              <div style={{ marginTop: '4px', background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '2px' }}>💬 Lời nhắn / Ghi chú đặc biệt:</div>
                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontStyle: 'italic' }}>"{order.specialRequest}"</div>
              </div>
            )}
          </div>

          {/* Financial Breakdown */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '14px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '8px' }}>
              💰 Phân Bổ Tài Chính & Chiết Khấu
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Tổng thanh toán (Người thuê trả)</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>
                {totalPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                Phí dịch vụ nền tảng PlayZone (15%)
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b' }}>
                + {platformFee.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {refundPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(168, 85, 247, 0.12)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <span style={{ fontSize: '0.85rem', color: '#c084fc', fontWeight: 700 }}>
                  💸 Đã hoàn tiền cho người thuê ({refundPercent}%)
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#c084fc' }}>
                  {refundAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                {refundPercent > 0 ? `Idol thực nhận (sau khi trừ ${refundPercent}% hoàn tiền)` : 'Idol thực nhận (85%)'}
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#6366f1' }}>
                {playerReceived.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {order.payoutStatus && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted, #94a3b8)' }}>Trạng thái quyết toán ví Idol:</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: order.payoutStatus === 'RELEASED' ? '#10b981' : order.payoutStatus === 'FROZEN' ? '#ef4444' : '#f59e0b' 
                }}>
                  {order.payoutStatus === 'RELEASED' ? '✅ Đã quyết toán' : order.payoutStatus === 'FROZEN' ? '❄️ Tạm đóng băng' : '⏳ Chờ duyệt giải ngân'}
                </span>
              </div>
            )}
          </div>

          {/* Rating & Review (if exists) */}
          {(order.isReviewed || order.reviewRating) && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={16} color="#f59e0b" fill="#f59e0b" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
                  Đánh giá từ khách hàng: {order.reviewRating || 5} / 5 ⭐
                </span>
              </div>
              {order.reviewComment && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', fontStyle: 'italic' }}>
                  "{order.reviewComment}"
                </p>
              )}
            </div>
          )}

          {/* Report Alert (if reported) */}
          {order.isReported && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444' }}>
                  Đơn hàng này có khiếu nại ({order.reportStatus || 'Đang xử lý'})
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                  Vui lòng kiểm tra mục Báo Cáo & Khiếu Nại để xem chi tiết bằng chứng và lịch sử khiếu nại.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-outline"
            style={{
              padding: '8px 24px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default OrderDetailModal;
