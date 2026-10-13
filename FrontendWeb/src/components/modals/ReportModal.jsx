import React, { useState } from 'react';
import { X, AlertTriangle, Send, Link, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import '../../styles/modals.css';

const REPORT_REASONS = [
  'Hành vi không phù hợp',
  'Lừa đảo / gian lận',
  'Ngôn từ thô tục / xúc phạm',
  'Không đúng thông tin hồ sơ',
  'Không thực hiện đúng hợp đồng',
  'Quấy rối',
  'Lý do khác',
];

const ReportModal = ({ player, isOpen, onClose, onOpenAuth, onReported }) => {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setReason('');
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

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(244,63,94,0.15)', color: '#f43f5e',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Tố Cáo & Khiếu Nại Đơn Thuê</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Về Idol: <strong style={{ color: 'var(--text-primary)' }}>{player.fullName || player.name}</strong>
                {player.orderId && (
                  <span style={{ marginLeft: '6px', color: '#0ea5e9' }}>
                    • Đơn #{player.orderId} ({Number(player.orderPrice || 0).toLocaleString('vi-VN')} đ)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Reason select */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Lý do tố cáo <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '0.9rem', appearance: 'auto'
              }}
            >
              <option value="">-- Chọn lý do --</option>
              {REPORT_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Mô tả chi tiết <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: description.length > 900 ? '#f43f5e' : 'var(--text-muted)' }}>
                {description.length}/1000
              </span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              maxLength={1000}
              placeholder="Mô tả cụ thể vụ việc, thời gian xảy ra, chi tiết khiếu nại..."
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Single Evidence URL (Google Drive / Link) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              <Link size={14} /> Link bằng chứng (Google Drive, ảnh, video...)
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(tùy chọn)</span>
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={e => setEvidenceUrl(e.target.value)}
              maxLength={500}
              placeholder="https://drive.google.com/drive/folders/... hoặc link bằng chứng khác"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                color: 'var(--text-primary)', fontSize: '0.88rem', boxSizing: 'border-box'
              }}
            />
            <div style={{
              marginTop: '8px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px dashed rgba(56, 189, 248, 0.3)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              💡 <strong style={{ color: '#0284c7' }}>Khuyên dùng:</strong> Hãy tải hình ảnh, video bằng chứng lên <strong>Google Drive</strong> và mở quyền truy cập là <span style={{ color: '#0ea5e9', fontWeight: 600 }}>"Bất kỳ ai có đường liên kết đều có thể xem"</span> (Public link) để Admin đối soát nhanh chóng.
            </div>
          </div>

          {/* Notice */}
          <div style={{
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', fontSize: '0.82rem',
            color: 'var(--text-secondary)', lineHeight: 1.5
          }}>
            <div style={{ marginBottom: '4px' }}>
              💰 <strong style={{ color: '#10b981' }}>Chính sách hoàn tiền:</strong> Khi đơn tố cáo được Admin xác minh và chấp nhận, bạn sẽ được <strong>hoàn lại 100% số tiền thuê</strong> vào ví, và Idol sẽ bị thu hồi khoản tiền nhận được từ đơn này.
            </div>
            <div>
              ⚠️ Tố cáo sai sự thật có thể dẫn đến việc tài khoản của bạn bị giới hạn.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={handleClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary"
              style={{ flex: 1, background: '#f43f5e', borderColor: '#f43f5e' }}
              disabled={submitting}>
              <Send size={15} />
              <span>{submitting ? 'Đang gửi...' : 'Gửi Tố Cáo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
