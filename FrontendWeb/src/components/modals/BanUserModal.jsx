import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Lock, ShieldAlert, Clock, AlertTriangle, Calendar, X, Check } from 'lucide-react';
import api from '../../api/apiService';

const PRESET_DAYS = [1, 3, 7, 14, 30];

const PRESET_REASONS = [
  'Vi phạm quy tắc ứng xử / Ngôn từ độc hại',
  'Gian lận thanh toán / Giao dịch ví bất thường',
  'Spam tin nhắn / Phát tán liên kết độc hại',
  'Quấy rối / Đe dọa Idol hoặc thành viên khác',
  'Hủy đơn hàng vô lý liên tục / Phá hoại dịch vụ',
  'Lý do khác (Nhập chi tiết)'
];

export const BanUserModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [banType, setBanType] = useState('TEMPORARY'); // TEMPORARY | PERMANENT
  const [days, setDays] = useState(7);
  const [customDays, setCustomDays] = useState('');
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finalDays = useMemo(() => {
    if (banType === 'PERMANENT') return 0;
    if (days === 'CUSTOM') {
      const parsed = parseInt(customDays, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 1;
    }
    return Number(days) || 7;
  }, [banType, days, customDays]);

  const estimatedExpiry = useMemo(() => {
    if (banType === 'PERMANENT') return null;
    const d = new Date();
    d.setDate(d.getDate() + finalDays);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, [banType, finalDays]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const finalReason = selectedReason === 'Lý do khác (Nhập chi tiết)' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setError('Vui lòng nhập lý do khóa tài khoản.');
      return;
    }

    if (banType === 'TEMPORARY' && (!finalDays || finalDays <= 0)) {
      setError('Số ngày bị khóa phải lớn hơn 0.');
      return;
    }

    setLoading(true);
    try {
      if (banType === 'TEMPORARY') {
        await api.banUserTemporarily({
          userId: user.id,
          reason: finalReason,
          description: description.trim(),
          days: finalDays
        });
      } else {
        await api.banUserPermanently({
          userId: user.id,
          reason: finalReason,
          description: description.trim()
        });
      }

      onSuccess?.(user.id, {
        banType,
        reason: finalReason,
        description: description.trim(),
        days: finalDays,
        banExpiresAt: estimatedExpiry
      });
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Không thể khóa tài khoản.';
      setError(msg);
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
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #181824 0%, #11111a 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.15)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header (Fixed) */}
        <div
          style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.05) 100%)',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
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
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444'
              }}
            >
              <Lock size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f87171' }}>
                Khóa Tài Khoản Người Dùng
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Thiết lập thời hạn và nguyên nhân vi phạm
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

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(239, 68, 68, 0.4) transparent' }}>
            {/* User Card */}
            <div
              style={{
                marginBottom: '18px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={user.avatarUrl || user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
                  alt=""
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
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
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Số dư ví</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#10b981' }}>
                  {(user.coin ?? user.walletBalance ?? user.balance ?? 0).toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>
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
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Ban Type selector */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>
              Hình thức khóa:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setBanType('TEMPORARY')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: banType === 'TEMPORARY' ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: banType === 'TEMPORARY' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: banType === 'TEMPORARY' ? '#f59e0b' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Clock size={16} />
                Khóa Tạm Thời
              </button>
              <button
                type="button"
                onClick={() => setBanType('PERMANENT')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: banType === 'PERMANENT' ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: banType === 'PERMANENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: banType === 'PERMANENT' ? '#ef4444' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <ShieldAlert size={16} />
                Khóa Vĩnh Viễn
              </button>
            </div>
          </div>

          {/* Days Selection (if Temporary) */}
          {banType === 'TEMPORARY' && (
            <div style={{ marginBottom: '16px', background: 'rgba(245, 158, 11, 0.05)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                Số ngày bị khóa:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {PRESET_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDays(d); setCustomDays(''); }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: days === d ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: days === d ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                      color: days === d ? '#000' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {d} ngày
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDays('CUSTOM')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: days === 'CUSTOM' ? '1.5px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: days === 'CUSTOM' ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
                    color: days === 'CUSTOM' ? '#000' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  Tùy chỉnh
                </button>
              </div>

              {days === 'CUSTOM' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    placeholder="Nhập số ngày (ví dụ 10, 45...)"
                    className="form-control"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    style={{ height: '38px', fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ngày</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#f59e0b', marginTop: '6px' }}>
                <Calendar size={13} />
                <span>Dự kiến tài khoản sẽ tự động mở khóa vào: <strong>{estimatedExpiry}</strong></span>
              </div>
            </div>
          )}

          {/* Reason Selection */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
              Lý do bị khóa <span style={{ color: '#ef4444' }}>*</span>:
            </label>
            <select
              className="form-control"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{ height: '40px', fontSize: '0.88rem', marginBottom: selectedReason === 'Lý do khác (Nhập chi tiết)' ? '8px' : '0' }}
            >
              {PRESET_REASONS.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>

            {selectedReason === 'Lý do khác (Nhập chi tiết)' && (
              <input
                type="text"
                className="form-control"
                placeholder="Nhập lý do vi phạm cụ thể..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                style={{ height: '38px', fontSize: '0.85rem' }}
                required
              />
            )}
          </div>

          {/* Description text area */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
              Mô tả chi tiết vi phạm (người dùng sẽ đọc khi đăng nhập):
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Ví dụ: Bạn đã dùng ngôn từ xúc phạm người chơi khác trong đơn hàng #1234, vui lòng tuân thủ quy chuẩn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          {/* Warning banner */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              fontSize: '0.78rem',
              color: '#fca5a5',
              marginBottom: '20px',
              lineHeight: 1.4
            }}
          >
            ⚠️ <strong>Lưu ý:</strong> Tài khoản của người dùng sẽ bị vô hiệu hóa tức thì. Khi đăng nhập, hệ thống sẽ hiện popup hiển thị chính xác số ngày bị khóa và lý do vi phạm này.
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
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
              }}
            >
              <Lock size={15} />
              {loading ? 'Đang Xử Lý...' : 'Xác Nhận Khóa Tài Khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default BanUserModal;
