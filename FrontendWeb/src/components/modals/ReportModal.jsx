import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, AlertTriangle, Send, Link, ShieldAlert, ShieldCheck, 
  Clock, MessageSquareWarning, DollarSign, UserX, HelpCircle, 
  CheckCircle2, Gamepad2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import '../../styles/modals.css';

const REPORT_REASONS = [
  { id: 'Idol vắng mặt / không chơi game cùng', icon: Clock, label: 'Idol vắng mặt / Không chơi game' },
  { id: 'Ngôn từ thô tục / xúc phạm / toxic', icon: MessageSquareWarning, label: 'Xúc phạm / Toxic / Thái độ xấu' },
  { id: 'Gian lận / lừa đảo / buff bẩn', icon: ShieldAlert, label: 'Gian lận / Hack / Buff bẩn' },
  { id: 'Đòi thêm tiền ngoài thỏa thuận', icon: DollarSign, label: 'Đòi thêm tiền ngoài thỏa thuận' },
  { id: 'Không đúng thông tin hồ sơ / ảnh / giới tính', icon: UserX, label: 'Sai lệch thông tin hồ sơ / ảnh' },
  { id: 'Lý do khác', icon: HelpCircle, label: 'Lý do khác...' },
];

const ReportModal = ({ player, isOpen, onClose, onOpenAuth, onReported }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [reason, setReason] = useState(REPORT_REASONS[0].id);
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setReason(REPORT_REASONS[0].id);
    setDescription('');
    setEvidenceUrl('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onClose();
      onOpenAuth?.();
      return;
    }
    if (!player?.id) {
      addToast('Không tìm thấy thông tin người chơi để tố cáo!', 'error');
      return;
    }
    if (!reason) {
      addToast('Vui lòng chọn lý do tố cáo!', 'warning');
      return;
    }
    if (!description.trim()) {
      addToast('Vui lòng mô tả chi tiết vi phạm!', 'warning');
      return;
    }
    if (description.trim().length > 1000) {
      addToast('Mô tả vi phạm không được vượt quá 1000 ký tự!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.createReport({
        reportedPlayerId: player.id,
        orderId: player.orderId || null,
        reason,
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim() || null,
      });
      onReported?.(player.orderId, 'PENDING', player.id);
      addToast('Tố cáo đã được gửi! Chúng tôi sẽ xem xét trong 24-48 giờ.', 'success');
      handleClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || '';
      if (typeof msg === 'string' && (msg.includes('already reported') || msg.includes('1 lần') || msg.includes('trước đó'))) {
        addToast(msg || 'Bạn chỉ được tố cáo người chơi này 1 lần duy nhất!', 'warning');
        onReported?.(player.orderId, 'REJECTED', player.id);
        handleClose();
      } else if (typeof msg === 'string' && msg.includes('đánh giá')) {
        addToast(msg, 'warning');
        handleClose();
      } else {
        addToast(msg || 'Gửi tố cáo thất bại. Vui lòng thử lại!', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !player) return null;

  const modalElement = (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div
        className="report-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="report-modal-header">
          <button
            className="modal-close-btn"
            onClick={handleClose}
            style={{ position: 'absolute', top: '20px', right: '20px' }}
            title="Đóng"
          >
            <X size={18} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <div
              className="hero-tag"
              style={{
                margin: '0 auto 10px auto',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#f43f5e',
                fontSize: '0.78rem',
                padding: '4px 14px'
              }}
            >
              <ShieldAlert size={14} />
              <span>Hệ Thống Khiếu Nại & Bảo Vệ Khách Hàng</span>
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 900, marginBottom: '6px' }}>
              Gửi Khiếu Nại & <span className="gradient-text" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb7185)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tố Cáo Idol</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto' }}>
              Khiếu nại sẽ được Quản Trị Viên đối soát, hoàn tiền vào số dư khả dụng và xử phạt idol vi phạm.
            </p>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          
          {/* Target Idol Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={player.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.fullName || player.name || 'player'}`}
                alt={player.fullName || player.name}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #f43f5e'
                }}
                onError={(e) => {
                  e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${player.fullName || 'player'}`;
                }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                  {player.fullName || player.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                  {player.game && (
                    <span className="badge badge-primary" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      <Gamepad2 size={11} style={{ marginRight: '3px' }} />
                      {player.game}
                    </span>
                  )}
                  {player.orderId && (
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                      Mã đơn #{player.orderId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {player.orderPrice != null && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Số tiền thanh toán</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f43f5e' }}>
                  {Number(player.orderPrice).toLocaleString('vi-VN')} đ
                </div>
              </div>
            )}
          </div>

          {/* Reason Selectable Pills */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '10px' }}>
              Lý do khiếu nại tố cáo <span style={{ color: '#f43f5e' }}>*</span>:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
              {REPORT_REASONS.map((r) => {
                const isSelected = reason === r.id;
                const IconComponent = r.icon;
                return (
                  <div
                    key={r.id}
                    className={`report-reason-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setReason(r.id)}
                  >
                    <IconComponent size={15} style={{ flexShrink: 0, color: isSelected ? '#f43f5e' : 'var(--text-muted)' }} />
                    <span style={{ flex: 1 }}>{r.label}</span>
                    {isSelected && <CheckCircle2 size={14} color="#f43f5e" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0 }}>
                Mô tả chi tiết vụ việc <span style={{ color: '#f43f5e' }}>*</span>:
              </label>
              <span style={{ fontSize: '0.76rem', color: description.length > 900 ? '#f43f5e' : 'var(--text-muted)' }}>
                {description.length}/1000 ký tự
              </span>
            </div>
            <textarea
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={1000}
              placeholder="Mô tả cụ thể thời gian, diễn biến vụ việc, hành vi vi phạm hoặc các thỏa thuận không được idol thực hiện..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Evidence Link */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px' }}>
              <Link size={15} color="#38bdf8" />
              <span>Đường dẫn bằng chứng (Google Drive, Ảnh, Video...)</span>
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(tùy chọn)</span>
            </label>
            <input
              type="url"
              className="form-control"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              maxLength={500}
              placeholder="https://drive.google.com/... hoặc link ảnh, video đối soát"
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                boxSizing: 'border-box'
              }}
            />
            <div
              style={{
                marginTop: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px dashed rgba(56, 189, 248, 0.3)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                display: 'flex',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '1rem' }}>💡</span>
              <div>
                <strong style={{ color: '#38bdf8' }}>Khuyên dùng:</strong> Hãy tải hình ảnh, video bằng chứng lên <strong>Google Drive</strong> và mở quyền truy cập <span style={{ color: '#7dd3fc', fontWeight: 600 }}>"Bất kỳ ai có đường liên kết đều có thể xem"</span> để Quản Trị Viên đối soát và hoàn tiền nhanh nhất.
              </div>
            </div>
          </div>

          {/* Policy Box */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              marginBottom: '24px',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontWeight: 700, color: '#f43f5e' }}>
              <ShieldCheck size={16} />
              <span>Chính Sách Hoàn Tiền Bảo Vệ Khách Hàng</span>
            </div>
            <div>
              Khi khiếu nại được Admin duyệt chấp thuận, số tiền hoàn sẽ được <strong>chuyển trực tiếp vào Số Dư Khả Dụng</strong> của bạn và khấu trừ từ số dư đang đóng băng của Idol.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minWidth: '110px', padding: '11px 20px', borderRadius: 'var(--radius-md)', fontWeight: 600 }}
              onClick={handleClose}
              disabled={submitting}
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                minWidth: '170px',
                padding: '11px 24px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                borderColor: '#f43f5e',
                boxShadow: '0 4px 18px rgba(244, 63, 94, 0.35)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              disabled={submitting}
            >
              {submitting ? (
                <span>Đang gửi khiếu nại...</span>
              ) : (
                <>
                  <Send size={15} />
                  <span>Gửi Khiếu Nại</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalElement, document.body);
};

export default ReportModal;
