import React, { useState } from 'react';
import { X, Gift, Sparkles, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/modals.css';

const DEFAULT_GIFTS = [
  { id: 'boba', name: 'Trà Sữa', price: 30000, icon: '🧋', exp: '+150 Exp' },
  { id: 'rose', name: 'Hoa Hồng Tình Bạn', price: 50000, icon: '🌹', exp: '+250 Exp' },
  { id: 'cake', name: 'Bánh Kem Ngọt Ngào', price: 100000, icon: '🎂', exp: '+600 Exp' },
  { id: 'bear', name: 'Gấu Bông Khổng Lồ', price: 200000, icon: '🧸', exp: '+1200 Exp' },
  { id: 'crown', name: 'Vương Miện Nữ Hoàng', price: 500000, icon: '👑', exp: '+3500 Exp' },
  { id: 'supercar', name: 'Siêu Xe Cyber Car', price: 1000000, icon: '🏎️', exp: '+8000 Exp' }
];

export const DonateModal = ({ player, isOpen, onClose, onOpenDeposit }) => {
  const { user, deductBalance } = useAuth();
  const { addToast } = useToast();
  
  const [selectedGift, setSelectedGift] = useState(DEFAULT_GIFTS[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !player) return null;

  const handleSendGift = () => {
    if (!user || user.balance < selectedGift.price) {
      addToast('Số dư ví không đủ để tặng quà này, vui lòng nạp thêm!', 'error');
      onOpenDeposit();
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      deductBalance(selectedGift.price);
      setIsSubmitting(false);
      onClose();

      // Fire confetti fireworks
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 }
      });

      addToast(`Đã tặng ${selectedGift.icon} ${selectedGift.name} cho ${player.fullName}!`, 'success');
    }, 600);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Gift size={22} color="#ec4899" />
            <span>Tặng Quà Cho {player.fullName}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Gifts Grid */}
          <div className="form-group">
            <label className="form-label">Chọn Món Quà Idol Yêu Thích:</label>
            <div className="gift-grid">
              {DEFAULT_GIFTS.map((g) => (
                <div
                  key={g.id}
                  className={`gift-card ${selectedGift.id === g.id ? 'active' : ''}`}
                  onClick={() => setSelectedGift(g)}
                >
                  <span className="gift-icon">{g.icon}</span>
                  <span className="gift-name">{g.name}</span>
                  <span className="gift-price">{g.price.toLocaleString('vi-VN')} đ</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{g.exp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Message input */}
          <div className="form-group">
            <label className="form-label">Lời Nhắn Gửi Tặng:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Chúc em live vui vẻ và leo rank mượt mà nha! ❤️"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)'
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Giá trị quà tặng:</span>
            <span style={{ fontWeight: 800, color: 'var(--accent-pink)', fontSize: '1.1rem' }}>
              {selectedGift.price.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button
            className="btn btn-accent"
            disabled={isSubmitting}
            onClick={handleSendGift}
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Đang Tặng...' : 'Tặng Quà Ngay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DonateModal;
