import React, { useState, useEffect } from 'react';
import { X, Clock, Gamepad2, Tag, Check, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import '../../styles/modals.css';

export const BookingModal = ({ player, isOpen, onClose, onOpenDeposit }) => {
  const { user, deductBalance } = useAuth();
  const { addToast } = useToast();
  
  const [selectedGame, setSelectedGame] = useState(player?.games?.[0]?.name || player?.primaryGame || 'Liên Quân Mobile');
  const [hours, setHours] = useState(2);
  const [scheduleType, setScheduleType] = useState('NOW'); // NOW, SCHEDULE
  const [selectedVoucher, setSelectedVoucher] = useState('');
  const [vouchers, setVouchers] = useState([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    if (player) {
      setSelectedGame(player.games?.[0]?.name || player.primaryGame || 'Liên Quân Mobile');
    }
    const loadVouchers = async () => {
      const data = await api.getVouchers();
      setVouchers(data || []);
    };
    loadVouchers();
  }, [player]);

  if (!isOpen || !player) return null;

  const basePrice = player.pricePerHour || 50000;
  const subtotal = basePrice * hours;

  // Calculate discount
  let discountAmount = 0;
  const appliedVoucher = vouchers.find(v => v.code === selectedVoucher);
  if (appliedVoucher) {
    discountAmount = Math.min((subtotal * appliedVoucher.discountPercent) / 100, appliedVoucher.maxDiscount);
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);
  const userBalance = user?.balance || 0;
  const hasEnoughBalance = userBalance >= finalTotal;

  const handleConfirmBooking = async () => {
    if (!hasEnoughBalance) {
      addToast('Số dư trong ví không đủ, vui lòng nạp thêm!', 'error');
      onOpenDeposit();
      return;
    }

    setIsSubmitting(true);
    try {
      const successDeduct = deductBalance(finalTotal);
      if (!successDeduct) {
        addToast('Lỗi trừ tiền ví', 'error');
        setIsSubmitting(false);
        return;
      }

      const orderData = {
        player: player,
        game: selectedGame,
        hours: hours,
        pricePerHour: basePrice,
        totalPrice: subtotal,
        discount: discountAmount,
        finalPrice: finalTotal,
        note: note || 'Duo leo rank',
        scheduleType: scheduleType,
        status: 'IN_PROGRESS'
      };

      const res = await api.createOrder(orderData);
      setCreatedOrder(res);
      setIsSuccess(true);
      
      // Fire celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      addToast(`Thuê thành công Player ${player.fullName}!`, 'success');
    } catch (err) {
      addToast('Có lỗi xảy ra khi tạo đơn thuê!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setCreatedOrder(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles className="gradient-text" size={22} />
            <span>{isSuccess ? 'Đặt Thuê Thành Công!' : 'Thuê Player & Duo Game'}</span>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {isSuccess ? (
          <div className="modal-body animate-fade-in" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              color: 'var(--accent-green)'
            }}>
              <Check size={36} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>
              Bạn Đã Thuê {player.fullName} Thành Công!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Mã đơn hàng: <strong style={{ color: 'var(--primary)' }}>{createdOrder?.id || 'ORD-9999'}</strong>. Player đã nhận được thông báo và sẽ liên hệ ngay trong vòng 2 phút.
            </p>

            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Game:</span>
                <span style={{ fontWeight: 700 }}>{selectedGame}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Thời lượng:</span>
                <span style={{ fontWeight: 700 }}>{hours} Giờ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng thanh toán:</span>
                <span style={{ fontWeight: 800, color: 'var(--accent-pink)' }}>{finalTotal.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleClose}>
                Đóng
              </button>
              <a href={`/chat?player=${player.id}`} className="btn btn-primary" style={{ flex: 1 }}>
                <span>Nhắn Tin Ngay</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            {/* Player Quick Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 16px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}>
              <img src={player.avatar} alt={player.fullName} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{player.fullName}</div>
                <div style={{ color: 'var(--accent-amber)', fontSize: '0.82rem', fontWeight: 600 }}>⭐ {player.rating || 5.0} • {player.orderCount || 100}+ đơn</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--accent-pink)', fontWeight: 800, fontSize: '1.05rem' }}>{basePrice.toLocaleString('vi-VN')} đ</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/ giờ</div>
              </div>
            </div>

            {/* Choose Game */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gamepad2 size={16} />
                <span>Chọn Game Muốn Duo:</span>
              </label>
              <select
                className="form-control"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
              >
                {player.games?.map((g, idx) => (
                  <option key={idx} value={g.name}>{g.name} ({g.rank || 'Pro'})</option>
                )) || <option value={player.primaryGame}>{player.primaryGame}</option>}
              </select>
            </div>

            {/* Choose Hours */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} />
                <span>Thời Lượng Thuê:</span>
              </label>
              <div className="preset-grid">
                {[1, 2, 3, 4, 5, 8].map(h => (
                  <button
                    key={h}
                    type="button"
                    className={`preset-chip ${hours === h ? 'active' : ''}`}
                    onClick={() => setHours(h)}
                  >
                    {h} Giờ
                  </button>
                ))}
              </div>
            </div>

            {/* Voucher code */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={16} />
                <span>Mã Giảm Giá / Voucher:</span>
              </label>
              <select
                className="form-control"
                value={selectedVoucher}
                onChange={(e) => setSelectedVoucher(e.target.value)}
              >
                <option value="">Không áp dụng voucher</option>
                {vouchers.map(v => (
                  <option key={v.code} value={v.code}>{v.code} - {v.description}</option>
                ))}
              </select>
            </div>

            {/* Special Note */}
            <div className="form-group">
              <label className="form-label">Ghi Chú Cho Player (Tùy chọn):</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Đánh rank Cao Thủ, cần bật mic Discord..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Pricing Summary */}
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginTop: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Tạm tính ({hours} giờ x {basePrice.toLocaleString('vi-VN')} đ):</span>
                <span>{subtotal.toLocaleString('vi-VN')} đ</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: 'var(--accent-green)' }}>
                  <span>Voucher giảm giá:</span>
                  <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
                fontSize: '1.1rem',
                fontWeight: 800
              }}>
                <span>Tổng Thanh Toán:</span>
                <span className="gradient-text">{finalTotal.toLocaleString('vi-VN')} đ</span>
              </div>

              {/* Wallet Info Alert */}
              <div style={{
                marginTop: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: hasEnoughBalance ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${hasEnoughBalance ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: hasEnoughBalance ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  Số dư ví: <strong>{userBalance.toLocaleString('vi-VN')} đ</strong>
                </span>
                {!hasEnoughBalance && (
                  <button
                    className="btn btn-sm btn-cyan"
                    onClick={onOpenDeposit}
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                  >
                    + Nạp Thêm
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isSuccess && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={handleClose}>
              Hủy
            </button>
            <button
              className="btn btn-primary"
              disabled={isSubmitting}
              onClick={handleConfirmBooking}
            >
              <ShieldCheck size={18} />
              <span>{isSubmitting ? 'Đang Xử Lý...' : 'Xác Nhận Đặt Thuê'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
