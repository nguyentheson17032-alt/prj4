import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Unlock, ShieldCheck, AlertCircle, X, Check } from 'lucide-react';
import api from '../../api/apiService';

export const UnbanUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [unbanReason, setUnbanReason] = useState('Đã được Ban Quản Trị xem xét và mở khóa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const activeBan = user.activeBan;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.unbanUser(user.id, unbanReason.trim() || 'Mở khóa bởi Admin');
      onSuccess?.(user.id);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Không thể mở khóa tài khoản.';
      if (typeof msg === 'string' && (msg.toLowerCase().includes('no active ban') || msg.toLowerCase().includes('not found'))) {
        // User already has no active ban record in DB, complete unban state on frontend
        onSuccess?.(user.id);
        onClose();
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: '500px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #181824 0%, #11111a 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(16, 185, 129, 0.15)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.05) 100%)',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}
            >
              <Unlock size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}>
                Mở Khóa Tài Khoản
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Khôi phục toàn bộ quyền truy cập và hoạt động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: 'var(--text-muted)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(16, 185, 129, 0.4) transparent' }}>
            {/* User Card */}
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <img
                src={user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                alt=""
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                  {user.fullName || user.username}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  @{user.username} {user.email ? `• ${user.email}` : ''}
                </div>
              </div>
            </div>

            {/* Current ban info preview if available */}
            {activeBan && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                  Thông tin vi phạm trước đó:
                </div>
                <div style={{ color: '#cbd5e1' }}>
                  <strong>Lý do:</strong> {activeBan.reason || 'Vi phạm điều khoản'}
                </div>
                {activeBan.description && (
                  <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
                    <strong>Ghi chú:</strong> {activeBan.description}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: '16px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                Lý do mở khóa:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập lý do hoặc căn cứ mở khóa..."
                value={unbanReason}
                onChange={(e) => setUnbanReason(e.target.value)}
                style={{ height: '40px', fontSize: '0.88rem' }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {['Đã hết hạn phạt', 'Người dùng cam kết không tái phạm', 'Ân xá từ Ban Quản Trị', 'Khiếu nại được chấp thuận'].map((reason, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setUnbanReason(reason)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '0.78rem',
                color: '#6ee7b7',
                marginBottom: '10px',
                lineHeight: 1.4
              }}
            >
              ✅ <strong>Thông báo:</strong> Sau khi mở khóa, người dùng có thể đăng nhập bình thường và trạng thái sẽ chuyển về <strong>Sẵn sàng</strong>.
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 15, 23, 0.95)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              flexShrink: 0
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '0.88rem' }}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                padding: '8px 20px',
                fontSize: '0.88rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Unlock size={15} />
              {loading ? 'Đang Mở Khóa...' : 'Xác Nhận Mở Khóa'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default UnbanUserModal;
