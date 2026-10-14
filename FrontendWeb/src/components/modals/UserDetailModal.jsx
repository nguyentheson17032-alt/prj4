import React from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Phone, Calendar, DollarSign, Shield, X, Clock, AlertTriangle } from 'lucide-react';

export const UserDetailModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

  const isAdmin = user.roles?.some(r => r.includes('ADMIN'));
  const isPlayer = user.roles?.some(r => r.includes('PLAYER'));
  const isBanned = user.enabled === false || !user.accountNonLocked || user.activeBan != null;
  const activeBan = user.activeBan;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '560px',
          background: 'linear-gradient(145deg, #181824 0%, #11111a 100%)',
          borderRadius: '20px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Cover / Header */}
        <div
          style={{
            height: '110px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: 'none',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Profile info section */}
        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-45px', marginBottom: '16px' }}>
            <img
              src={user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
              alt=""
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #181824',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)'
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: isBanned ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: isBanned ? '#ef4444' : '#10b981',
                  border: `1px solid ${isBanned ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                }}
              >
                {isBanned ? '🔒 Đang Bị Khóa' : '🟢 Sẵn Sàng'}
              </span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  background: isAdmin ? 'rgba(244, 63, 94, 0.15)' : isPlayer ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  color: isAdmin ? '#f43f5e' : isPlayer ? '#06b6d4' : 'var(--text-muted)'
                }}
              >
                {isAdmin ? '🛡️ Admin' : isPlayer ? '🎮 Game thủ' : '👤 Thành viên'}
              </span>
            </div>
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{user.fullName || user.username}</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{user.username} (ID: #{user.id})</p>
          </div>

          {/* Ban Alert if Banned */}
          {isBanned && (
            <div
              style={{
                marginTop: '16px',
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.88rem' }}>
                <AlertTriangle size={16} />
                <span>Chi tiết tài khoản đang bị khóa:</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                <strong>Lý do:</strong> {activeBan?.reason || 'Khóa bởi Ban Quản Trị'}
              </div>
              {activeBan?.description && (
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <strong>Mô tả:</strong> {activeBan.description}
                </div>
              )}
              {activeBan?.banExpiresAt && (
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '2px' }}>
                  ⏳ Hạn mở khóa: {new Date(activeBan.banExpiresAt).toLocaleString('vi-VN')}
                </div>
              )}
            </div>
          )}

          {/* Details Grid */}
          <div
            style={{
              marginTop: '18px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}
          >
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc', wordBreak: 'break-all' }}>
                {user.email || '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Số dư ví</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>
                {((user.coin ?? user.walletBalance ?? user.balance ?? 0)).toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Số điện thoại</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                {user.phoneNumber || user.phone || '—'}
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Ngày tạo</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 24px', fontSize: '0.88rem' }}
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

export default UserDetailModal;
