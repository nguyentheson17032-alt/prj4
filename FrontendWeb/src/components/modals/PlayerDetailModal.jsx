import React from 'react';
import { createPortal } from 'react-dom';
import { X, Trophy, Star, ShoppingBag, DollarSign, Gamepad2, Server, Award, Info, Sparkles } from 'lucide-react';

export const getPrimaryGame = (games) => {
  if (!games || games.length === 0) return null;
  const sorted = [...games].sort((a, b) => {
    // 1. Số lượng thuê nhiều nhất (totalOrders giảm dần)
    const ordersA = Number(a.totalOrders) || 0;
    const ordersB = Number(b.totalOrders) || 0;
    if (ordersB !== ordersA) {
      return ordersB - ordersA;
    }
    // 2. Nếu số lượng thuê bằng nhau: xét đến số sao (rating giảm dần)
    const ratingA = Number(a.rating) || 0;
    const ratingB = Number(b.rating) || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    // 3. Nếu số sao bằng nhau: xét đến Bảng chữ cái ký tự (alphabetical A-Z)
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
  });
  return sorted[0];
};

export const PlayerDetailModal = ({ isOpen, onClose, player }) => {
  if (!isOpen || !player) return null;

  const sortedGames = [...(player.games || [])].sort((a, b) => {
    const ordersA = Number(a.totalOrders) || 0;
    const ordersB = Number(b.totalOrders) || 0;
    if (ordersB !== ordersA) return ordersB - ordersA;
    const ratingA = Number(a.rating) || 0;
    const ratingB = Number(b.rating) || 0;
    if (ratingB !== ratingA) return ratingB - ratingA;
    return (a.name || '').trim().localeCompare((b.name || '').trim(), 'vi', { sensitivity: 'base' });
  });

  const primaryGame = sortedGames[0];
  const isBanned = player.status === 'BANNED';

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
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #181824 0%, #11111a 100%)',
          borderRadius: '20px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cover / Header */}
        <div
          style={{
            height: '110px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '14px',
            flexShrink: 0
          }}
        >
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: 'none',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: '0 24px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Avatar and Info Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-45px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <img
              src={player.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.playerName || player.name}`}
              alt=""
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #181824',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                background: '#1e1e2d'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: isBanned ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: isBanned ? '#ef4444' : '#10b981',
                  border: `1px solid ${isBanned ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                }}
              >
                {isBanned ? '🔒 Đang Bị Khóa' : player.status === 'PENDING' ? '⏳ Chờ Duyệt' : '🟢 Đang Sẵn Sàng'}
              </span>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                🎮 {player.games.length} Game Đăng Ký
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
              {player.name || player.playerName}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              @{player.playerName || 'player'} {player.userId ? `• User ID: #${player.userId}` : ''} {player.email ? `• ${player.email}` : ''}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div
            style={{
              marginTop: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
              gap: '10px'
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <Star size={14} style={{ color: '#fbbf24' }} />
                <span>Đánh giá</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                ⭐ {player.avgRating > 0 ? player.avgRating.toFixed(1) : '0.0'}
                {player.totalReviews > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '4px' }}>
                    ({player.totalReviews})
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <ShoppingBag size={14} style={{ color: '#38bdf8' }} />
                <span>Tổng đơn thuê</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                {player.totalOrders || 0} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>đơn</span>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                <DollarSign size={14} style={{ color: '#10b981' }} />
                <span>Tổng doanh thu</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                {(player.totalRevenue || 0).toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>

          {/* List of Registered Games */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gamepad2 size={18} style={{ color: 'var(--primary)' }} />
                <span>Danh Sách Game Đã Đăng Ký ({sortedGames.length})</span>
              </h4>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Sắp xếp theo: Đơn thuê nhiều nhất &gt; Sao &gt; Tên A-Z
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedGames.map((g, idx) => {
                const isTop = idx === 0;
                return (
                  <div
                    key={g.id || idx}
                    style={{
                      background: isTop ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isTop ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    {/* Top Game Highlight Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#f8fafc' }}>
                          🎮 {g.name}
                        </span>
                        {g.rank && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}
                          >
                            🏆 {g.rank}
                          </span>
                        )}
                      </div>

                      {isTop && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                          }}
                        >
                          <Sparkles size={11} />
                          <span>Game hiển thị ưu tiên</span>
                        </span>
                      )}
                    </div>

                    {/* Stats for this game */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Giá thuê: <strong style={{ color: '#10b981' }}>{(g.pricePerHour || 0).toLocaleString('vi-VN')} đ/h</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Đơn thuê: <strong style={{ color: '#f8fafc' }}>{g.totalOrders || 0} đơn</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Đánh giá: <strong style={{ color: '#fbbf24' }}>⭐ {(g.rating || 0).toFixed(1)}</strong>
                      </div>
                      {(g.totalRevenue !== undefined && g.totalRevenue > 0) && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Thu nhập: <strong style={{ color: '#10b981' }}>{(g.totalRevenue).toLocaleString('vi-VN')} đ</strong>
                        </div>
                      )}
                      {g.server && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Máy chủ: <strong style={{ color: '#cbd5e1' }}>{g.server}</strong>
                        </div>
                      )}
                      {g.role && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Vai trò: <strong style={{ color: '#cbd5e1' }}>{g.role}</strong>
                        </div>
                      )}
                    </div>

                    {/* Bio / Description for this game */}
                    {(g.bio || g.description) && (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#cbd5e1',
                          background: 'rgba(0, 0, 0, 0.25)',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontStyle: 'italic',
                          borderLeft: '3px solid var(--primary)'
                        }}
                      >
                        "{g.bio || g.description}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 24px', fontSize: '0.88rem', borderRadius: '10px' }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PlayerDetailModal;
