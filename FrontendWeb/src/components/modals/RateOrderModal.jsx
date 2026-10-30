import React, { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import '../../styles/modals.css';

export const RateOrderModal = ({ order, isOpen, onClose, onReviewed }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Gánh team cực tốt', 'Giọng nói dễ thương']);

  const isCurrentRenter = Boolean(
    order && (
      (user?.id && (
        String(user.id) === String(order.renterId) ||
        String(user.id) === String(order.renter?.id)
      )) ||
      (user?.username && (
        user.username.toLowerCase() === (order.renterName || '').toLowerCase() ||
        user.username.toLowerCase() === (order.renter?.username || '').toLowerCase()
      ))
    )
  );

  if (!isOpen || !order || !isCurrentRenter) return null;

  const sampleTags = [
    { key: 'rate.tagCarry', fallback: 'Gánh team cực tốt' },
    { key: 'rate.tagSweetVoice', fallback: 'Giọng nói dễ thương' },
    { key: 'rate.tagEnthusiastic', fallback: 'Rất nhiệt tình' },
    { key: 'rate.tagTopTier', fallback: 'Kỹ năng đỉnh cao' },
    { key: 'rate.tagPunctual', fallback: 'Đúng giờ' },
    { key: 'rate.tagHumorous', fallback: 'Hài hước vui vẻ' }
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onReviewed) onReviewed(order.id, rating, comment);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Star size={22} color="#f59e0b" fill="#f59e0b" />
            <span>{t('rate.title', 'Đánh Giá Dịch Vụ Player')}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Player info */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img
              src={order.player?.avatar}
              alt={order.player?.fullName}
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px auto', border: '2px solid var(--primary)' }}
            />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{order.player?.fullName}</h4>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('rate.orderLabel', 'Đơn hàng: #{id} • {game}').replace('{id}', order.id).replace('{game}', order.game)}</div>
          </div>

          {/* Star rating selector */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                style={{ padding: '6px', background: 'none' }}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star
                  size={32}
                  fill={(hoverRating || rating) >= star ? '#f59e0b' : 'transparent'}
                  color={(hoverRating || rating) >= star ? '#f59e0b' : 'var(--text-muted)'}
                />
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">{t('rate.selectTags', 'Chọn Nhãn Đánh Giá:')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {sampleTags.map((item) => {
                const tagLabel = t(item.key, item.fallback);
                const isSelected = selectedTags.includes(item.fallback) || selectedTags.includes(tagLabel);
                return (
                  <button
                    type="button"
                    key={item.key}
                    className={`badge ${isSelected ? 'badge-primary' : 'badge-offline'}`}
                    style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.82rem' }}
                    onClick={() => toggleTag(tagLabel)}
                  >
                    {tagLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div className="form-group">
            <label className="form-label">{t('rate.detailedReview', 'Nhận Xét Chi Tiết:')}</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder={t('rate.reviewPlaceholder', 'Chia sẻ trải nghiệm chơi game của bạn với player này...')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ padding: '16px 0 0 0', borderTop: 'none' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('rate.cancel', 'Hủy')}
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={16} />
              <span>{t('rate.submit', 'Gửi Đánh Giá')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateOrderModal;
