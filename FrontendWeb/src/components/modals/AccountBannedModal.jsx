import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, Calendar, Info, Mail, Phone, X } from 'lucide-react';

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'Không xác định';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

export const AccountBannedModal = ({ isOpen, onClose, banDetails, username }) => {
  if (!isOpen) return null;

  const isPermanent = banDetails?.banType === 'PERMANENT' || !banDetails?.banExpiresAt || banDetails?.remainingDays === -1;
  const reason = banDetails?.reason || 'Vi phạm điều khoản & quy định sử dụng dịch vụ';
  const description = banDetails?.description;
  const bannedAt = banDetails?.bannedAt;
  const banExpiresAt = banDetails?.banExpiresAt;
  const remainingFormatted = banDetails?.remainingFormatted || (banDetails?.remainingDays != null ? `${banDetails.remainingDays} ngày` : 'Vĩnh viễn');
  const bannedBy = banDetails?.bannedBy || 'Ban Quản Trị';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: '520px',
          background: 'linear-gradient(145deg, #181824 0%, #11111a 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 20px 50px rgba(239, 68, 68, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.05) 100%)',
            padding: '24px 24px 20px',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
              }}
            >
              <ShieldAlert size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>
                  Tài Khoản Đang Bị Khóa
                </h3>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                {username ? `Tài khoản @${username} đã bị đình chỉ` : 'Quyền truy cập của bạn tạm thời bị khóa'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status summary banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: '12px',
              background: isPermanent ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${isPermanent ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} color={isPermanent ? '#ef4444' : '#f59e0b'} />
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Thời hạn xử lý
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: isPermanent ? '#ef4444' : '#f59e0b' }}>
                  {isPermanent ? 'Khóa Vĩnh Viễn' : `Khóa tạm thời (${remainingFormatted})`}
                </div>
              </div>
            </div>
            {!isPermanent && banExpiresAt && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Hết hạn vào</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  {formatDateTime(banExpiresAt)}
                </div>
              </div>
            )}
          </div>

          {/* Reason Box */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={16} color="#ef4444" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                Hành vi vi phạm
              </span>
            </div>
            <div
              style={{
                fontSize: '0.98rem',
                fontWeight: 600,
                color: '#f8fafc',
                lineHeight: 1.5,
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '10px 14px',
                borderRadius: '8px',
                borderLeft: '4px solid #ef4444'
              }}
            >
              {reason}
            </div>

            {description && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>
                  Chi tiết vi phạm:
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    color: '#cbd5e1',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line'
                  }}
                >
                  {description}
                </div>
              </div>
            )}
          </div>

          {/* Additional info grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              fontSize: '0.82rem'
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>
                <Calendar size={13} />
                <span>Ngày thực hiện</span>
              </div>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                {formatDateTime(bannedAt)}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>
                <Info size={13} />
                <span>Xử lý bởi</span>
              </div>
              <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                {bannedBy}
              </div>
            </div>
          </div>

          {/* Support Notice */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.18)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary, #cbd5e1)',
              lineHeight: 1.5
            }}
          >
            💡 <strong>Cần hỗ trợ hoặc khiếu nại?</strong> Nếu bạn cho rằng quyết định này có sự nhầm lẫn, vui lòng liên hệ Ban Quản Trị qua Email <span style={{ color: '#38bdf8', fontWeight: 600 }}>support@playzone.vn</span> hoặc Hotline <span style={{ color: '#38bdf8', fontWeight: 600 }}>1900 6868</span>.
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '42px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
            }}
          >
            Đã Hiểu và Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountBannedModal;
