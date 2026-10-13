import React, { useState } from 'react';
import { X, Gift, Sparkles, Send, Wallet, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import '../../styles/modals.css';

// Custom SVG Icons ensuring 100% cross-platform crisp rendering without font issues
const BobaIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cupGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffd8be" />
        <stop offset="100%" stopColor="#d9824c" />
      </linearGradient>
      <linearGradient id="lidGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
    </defs>
    <path d="M36 4L26 28" stroke="#ec4899" strokeWidth="5" strokeLinecap="round" />
    <path d="M37 6L32 18" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
    <ellipse cx="32" cy="22" rx="19" ry="6" fill="url(#lidGrad)" stroke="#94a3b8" strokeWidth="1.5" />
    <path d="M15 22C15 15 49 15 49 22" fill="#f8fafc" fillOpacity="0.4" stroke="#94a3b8" strokeWidth="1.5" />
    <path d="M17 24L21 54C21.5 57.5 24.5 60 28 60H36C39.5 60 42.5 57.5 43 54L47 24Z" fill="url(#cupGrad)" stroke="#9a3412" strokeWidth="1.5" />
    <circle cx="27" cy="52" r="3" fill="#381e11" />
    <circle cx="33" cy="53" r="3" fill="#2d170c" />
    <circle cx="37" cy="50" r="3" fill="#451a03" />
    <circle cx="29" cy="46" r="3" fill="#2d170c" />
    <circle cx="35" cy="44" r="3" fill="#381e11" />
    <path d="M20 28L23 50" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
    <path d="M32 35C30.5 33 28 33.5 28 35.5C28 37.5 32 40 32 40C32 40 36 37.5 36 35.5C36 33.5 33.5 33 32 35Z" fill="#ec4899" />
  </svg>
);

const RoseIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="roseGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#9f1239" />
      </linearGradient>
      <linearGradient id="stemGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#15803d" />
      </linearGradient>
    </defs>
    <path d="M32 34C32 44 29 52 30 60" stroke="url(#stemGrad)" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M32 44C38 42 44 45 46 48C41 50 35 48 32 44Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
    <path d="M31 51C25 49 20 52 18 55C23 57 28 55 31 51Z" fill="#16a34a" stroke="#15803d" strokeWidth="1" />
    <ellipse cx="32" cy="20" rx="16" ry="14" fill="url(#roseGrad)" />
    <path d="M20 18C20 10 32 8 36 12C42 16 42 26 36 29C28 32 20 28 20 18Z" fill="#be123c" />
    <path d="M26 15C28 11 36 11 38 15C40 19 38 24 33 25C28 26 24 21 26 15Z" fill="#f43f5e" />
    <circle cx="32" cy="18" r="4" fill="#fda4af" />
    <path d="M30 17C31 16 33 16 34 17" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const CakeIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cakeBase" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#be185d" />
      </linearGradient>
      <linearGradient id="frosting" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#fdf2f8" />
        <stop offset="100%" stopColor="#fce7f3" />
      </linearGradient>
      <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <rect x="12" y="36" width="40" height="20" rx="5" fill="url(#cakeBase)" stroke="#9d174d" strokeWidth="1.5" />
    <path d="M12 40C15 43 19 43 22 40C25 43 29 43 32 40C35 43 39 43 42 40C45 43 49 43 52 40V36H12V40Z" fill="url(#frosting)" />
    <rect x="18" y="24" width="28" height="13" rx="4" fill="#ec4899" stroke="#9d174d" strokeWidth="1.5" />
    <path d="M18 28C20 30 23 30 25 28C27 30 30 30 32 28C34 30 37 30 39 28C41 30 44 30 46 28V24H18V28Z" fill="url(#frosting)" />
    <rect x="30" y="13" width="4" height="11" rx="1.5" fill="#38bdf8" />
    <ellipse cx="32" cy="9" rx="3.5" ry="5.5" fill="url(#flame)" />
    <ellipse cx="32" cy="10" rx="1.5" ry="3" fill="#ffffff" />
    <circle cx="22" cy="46" r="1.5" fill="#fde047" />
    <circle cx="32" cy="48" r="1.5" fill="#fde047" />
    <circle cx="42" cy="46" r="1.5" fill="#fde047" />
  </svg>
);

const BearIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bearFur" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
    </defs>
    <circle cx="18" cy="19" r="9" fill="url(#bearFur)" stroke="#78350f" strokeWidth="1.5" />
    <circle cx="18" cy="19" r="5" fill="#fde68a" />
    <circle cx="46" cy="19" r="9" fill="url(#bearFur)" stroke="#78350f" strokeWidth="1.5" />
    <circle cx="46" cy="19" r="5" fill="#fde68a" />
    <ellipse cx="32" cy="50" rx="18" ry="12" fill="url(#bearFur)" stroke="#78350f" strokeWidth="1.5" />
    <circle cx="18" cy="50" r="6" fill="#b45309" />
    <circle cx="46" cy="50" r="6" fill="#b45309" />
    <ellipse cx="32" cy="30" rx="19" ry="16" fill="url(#bearFur)" stroke="#78350f" strokeWidth="1.5" />
    <ellipse cx="32" cy="34" rx="9" ry="7" fill="#fef3c7" />
    <ellipse cx="32" cy="31" rx="4" ry="2.5" fill="#451a03" />
    <path d="M32 33.5V36.5M30 36.5C31 38 33 38 34 36.5" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="25" cy="27" r="3" fill="#1c1917" />
    <circle cx="26" cy="26" r="1" fill="#ffffff" />
    <circle cx="39" cy="27" r="3" fill="#1c1917" />
    <circle cx="40" cy="26" r="1" fill="#ffffff" />
    <path d="M27 44L32 47L27 50ZM37 44L32 47L37 50Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
    <circle cx="32" cy="47" r="2.5" fill="#dc2626" />
  </svg>
);

const CrownIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldCrown" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#eab308" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id="ruby" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
      <linearGradient id="sapphire" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#67e8f9" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>
    <path d="M10 46L14 20L25 33L32 15L39 33L50 20L54 46Z" fill="url(#goldCrown)" stroke="#713f12" strokeWidth="2" strokeLinejoin="round" />
    <rect x="9" y="46" width="46" height="8" rx="3" fill="#ca8a04" stroke="#713f12" strokeWidth="1.5" />
    <circle cx="14" cy="19" r="3.5" fill="url(#ruby)" stroke="#7f1d1d" strokeWidth="1" />
    <circle cx="32" cy="14" r="4.5" fill="url(#ruby)" stroke="#7f1d1d" strokeWidth="1" />
    <circle cx="50" cy="19" r="3.5" fill="url(#ruby)" stroke="#7f1d1d" strokeWidth="1" />
    <polygon points="32,27 35,32 32,37 29,32" fill="url(#sapphire)" stroke="#0c4a6e" strokeWidth="1" />
    <circle cx="18" cy="50" r="2.5" fill="url(#sapphire)" />
    <circle cx="32" cy="50" r="2.5" fill="url(#ruby)" />
    <circle cx="46" cy="50" r="2.5" fill="url(#sapphire)" />
  </svg>
);

const SupercarIcon = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="cockpit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="wheel" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
    </defs>
    <path d="M10 27H18V24H10Z" fill="#06b6d4" stroke="#0891b2" strokeWidth="1" />
    <path d="M12 27L14 33" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
    <path d="M22 30L29 23H41L47 30Z" fill="url(#cockpit)" stroke="#38bdf8" strokeWidth="1.5" />
    <path d="M8 36L14 32H49C54 32 58 35 60 38L57 43H7L8 36Z" fill="url(#carBody)" stroke="#1d4ed8" strokeWidth="1.5" />
    <path d="M53 37L61 38" stroke="#a5f3fc" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="19" cy="44" r="8" fill="url(#wheel)" stroke="#64748b" strokeWidth="1.5" />
    <circle cx="19" cy="44" r="4" fill="#06b6d4" />
    <circle cx="47" cy="44" r="8" fill="url(#wheel)" stroke="#64748b" strokeWidth="1.5" />
    <circle cx="47" cy="44" r="4" fill="#8b5cf6" />
    <path d="M28 47H38" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GiftIcon = ({ type, size = 44 }) => {
  switch (type) {
    case 'boba':
      return <BobaIcon size={size} />;
    case 'rose':
      return <RoseIcon size={size} />;
    case 'cake':
      return <CakeIcon size={size} />;
    case 'bear':
      return <BearIcon size={size} />;
    case 'crown':
      return <CrownIcon size={size} />;
    case 'supercar':
      return <SupercarIcon size={size} />;
    default:
      return <BobaIcon size={size} />;
  }
};

const DEFAULT_GIFTS = [
  { id: 'boba', name: 'Trà Sữa', price: 30000, exp: '+150 Exp', color: 'rgba(217, 130, 76, 0.15)' },
  { id: 'rose', name: 'Hoa Hồng Tình Bạn', price: 50000, exp: '+250 Exp', color: 'rgba(244, 63, 94, 0.15)' },
  { id: 'cake', name: 'Bánh Kem Ngọt Ngào', price: 100000, exp: '+600 Exp', color: 'rgba(236, 72, 153, 0.15)' },
  { id: 'bear', name: 'Gấu Bông Khổng Lồ', price: 200000, exp: '+1200 Exp', color: 'rgba(217, 119, 6, 0.15)' },
  { id: 'crown', name: 'Vương Miện Nữ Hoàng', price: 500000, exp: '+3500 Exp', color: 'rgba(234, 179, 8, 0.15)' },
  { id: 'supercar', name: 'Siêu Xe Cyber Car', price: 1000000, exp: '+8000 Exp', color: 'rgba(59, 130, 246, 0.15)' }
];

export const DonateModal = ({ player, isOpen, onClose, onOpenDeposit }) => {
  const { user, deductBalance, refreshUser } = useAuth();
  const { addToast } = useToast();
  
  const [selectedGift, setSelectedGift] = useState(DEFAULT_GIFTS[0]);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !player) return null;

  const currentBalance = Number(user?.balance || user?.coin || user?.walletBalance || 0);
  const isBalanceEnough = currentBalance >= selectedGift.price;
  const playerName = player.fullName || player.name || player.username || 'Idol PlayZone';

  const handleSendGift = async () => {
    if (!user) {
      addToast('Vui lòng đăng nhập để tặng quà!', 'error');
      return;
    }

    if (!isBalanceEnough) {
      addToast('Số dư ví không đủ để tặng món quà này, vui lòng nạp thêm!', 'error');
      if (onOpenDeposit) onOpenDeposit();
      return;
    }

    setIsSubmitting(true);
    try {
      const targetPlayerId = player.id || player.userId;
      const giftMessage = message.trim() || `Tặng ${selectedGift.name} kèm lời chúc tốt đẹp nhất!`;

      // 1. Gọi backend API donate thực sự lưu vào database
      await api.donateToPlayer(targetPlayerId, selectedGift.price, giftMessage);

      // 2. Cập nhật số dư người dùng
      if (deductBalance) {
        deductBalance(selectedGift.price);
      }
      if (refreshUser) {
        await refreshUser();
      }

      // 3. Hiệu ứng pháo hoa chúc mừng
      confetti({
        particleCount: 150,
        spread: 110,
        origin: { y: 0.6 }
      });

      // 4. Toast thông báo thành công
      addToast(`Đã tặng ${selectedGift.name} (${selectedGift.price.toLocaleString('vi-VN')} đ) cho ${playerName}!`, 'success');

      // 5. Reset form và đóng modal
      setMessage('');
      onClose();
    } catch (err) {
      console.error('Donate error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Tặng quà thất bại. Vui lòng thử lại!';
      addToast(errMsg, 'error');
      if (errMsg.toLowerCase().includes('số dư')) {
        if (onOpenDeposit) onOpenDeposit();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <Gift size={22} color="#ec4899" />
            <span>Tặng Quà Cho {playerName}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* User Wallet Balance Bar */}
          <div className="donate-wallet-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={16} color="var(--accent-primary)" />
              <span style={{ color: 'var(--text-secondary)' }}>Số dư ví hiện tại:</span>
              <span className="balance-val">{currentBalance.toLocaleString('vi-VN')} đ</span>
            </div>
            {onOpenDeposit && (
              <span
                className="topup-link"
                onClick={() => {
                  onClose();
                  onOpenDeposit();
                }}
              >
                + Nạp Thêm
              </span>
            )}
          </div>

          {/* Gifts Grid */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Chọn Món Quà Idol Yêu Thích:</span>
              <span style={{ color: 'var(--accent-pink)', fontSize: '0.8rem', fontWeight: 600 }}>
                {selectedGift.name} ({selectedGift.exp})
              </span>
            </label>
            <div className="gift-grid">
              {DEFAULT_GIFTS.map((g) => {
                const isSelected = selectedGift.id === g.id;
                return (
                  <div
                    key={g.id}
                    className={`gift-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedGift(g)}
                  >
                    <div
                      className="gift-icon-wrapper"
                      style={{ background: isSelected ? 'rgba(236, 72, 153, 0.2)' : g.color }}
                    >
                      <GiftIcon type={g.id} size={42} />
                    </div>
                    <span className="gift-name">{g.name}</span>
                    <span className="gift-price">{g.price.toLocaleString('vi-VN')} đ</span>
                    <span className="gift-exp-badge">{g.exp}</span>
                  </div>
                );
              })}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Summary */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tổng giá trị quà tặng:</span>
              <span style={{ fontSize: '0.75rem', color: isBalanceEnough ? 'var(--accent-green)' : '#ef4444' }}>
                {isBalanceEnough
                  ? `Số dư sau khi tặng: ${(currentBalance - selectedGift.price).toLocaleString('vi-VN')} đ`
                  : 'Số dư không đủ để tặng quà này'}
              </span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--accent-pink)', fontSize: '1.2rem' }}>
              {selectedGift.price.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            padding: '8px 12px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px dashed rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>💡 Chiết khấu hệ thống: <strong>15%</strong></span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Idol thực nhận: {Math.round(selectedGift.price * 0.85).toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </button>
          {!isBalanceEnough ? (
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                if (onOpenDeposit) onOpenDeposit();
              }}
            >
              <PlusCircle size={16} />
              <span>Nạp Thêm Tiền</span>
            </button>
          ) : (
            <button
              className="btn btn-accent"
              disabled={isSubmitting}
              onClick={handleSendGift}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Đang Tặng Quà...' : 'Tặng Quà Ngay'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonateModal;
