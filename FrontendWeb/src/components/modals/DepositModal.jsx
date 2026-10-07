import React, { useState } from 'react';
import { X, Wallet, QrCode, CreditCard, ShieldCheck, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/modals.css';

export const DepositModal = ({ isOpen, onClose }) => {
  const { deposit, user } = useAuth();
  const { addToast } = useToast();

  const [amount, setAmount] = useState(100000);
  const [paymentMethod, setPaymentMethod] = useState('VIETQR'); // VIETQR, VNPAY, MOMO
  const [isSuccess, setIsSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDepositInfo, setLastDepositInfo] = useState(null);

  if (!isOpen) return null;

  const presetAmounts = [
    { value: 50000, label: '50.000 đ', percent: 0 },
    { value: 100000, label: '100.000 đ', bonus: '+5%', percent: 0.05 },
    { value: 200000, label: '200.000 đ', bonus: '+8%', percent: 0.08 },
    { value: 500000, label: '500.000 đ', bonus: '+10%', percent: 0.10 },
    { value: 1000000, label: '1.000.000 đ', bonus: '+15%', percent: 0.15 },
    { value: 2000000, label: '2.000.000 đ', bonus: '+20%', percent: 0.20 }
  ];

  const selectedPreset = presetAmounts.find((p) => p.value === amount) || {
    value: amount,
    percent: 0,
    bonus: null
  };
  const bonusAmount = Math.round(amount * (selectedPreset.percent || 0));
  const totalReceived = amount + bonusAmount;

  const handleDeposit = async () => {
    setIsProcessing(true);
    try {
      await deposit(totalReceived);
      setLastDepositInfo({
        amount,
        bonusAmount,
        bonusLabel: selectedPreset.bonus,
        totalReceived
      });
      setIsProcessing(false);
      setIsSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      const bonusText = bonusAmount > 0 ? ` (+${bonusAmount.toLocaleString('vi-VN')} đ thưởng)` : '';
      addToast(`Nạp thành công! Đã cộng ${totalReceived.toLocaleString('vi-VN')} đ${bonusText} vào ví.`, 'success');
    } catch (err) {
      setIsProcessing(false);
      addToast(err.message || 'Nạp tiền thất bại, vui lòng thử lại', 'error');
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setLastDepositInfo(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Wallet className="gradient-text" size={22} />
            <span>Nạp Coin Vào Ví PlayZone</span>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {isSuccess ? (
          <div className="modal-body animate-fade-in" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-green)'
            }}>
              <Check size={36} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '6px' }}>
              Nạp Tiền Thành Công!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Coin đã được nạp tự động vào ví PlayZone của bạn.
            </p>

            {/* Detailed summary receipt */}
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              marginBottom: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <span>Mệnh giá nạp:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(lastDepositInfo?.amount || amount).toLocaleString('vi-VN')} đ</span>
              </div>
              {lastDepositInfo?.bonusAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--accent-pink)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} /> Thưởng khuyến mãi ({lastDepositInfo?.bonusLabel}):
                  </span>
                  <span style={{ fontWeight: 700 }}>+{lastDepositInfo?.bonusAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div style={{
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 800
              }}>
                <span>Tổng coin thực nhận:</span>
                <span style={{ color: 'var(--accent-green)' }}>+{(lastDepositInfo?.totalReceived || totalReceived).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
              fontSize: '1rem',
              fontWeight: 700
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Số dư ví hiện tại: </span>
              <span className="gradient-text">{(user?.balance || 0).toLocaleString('vi-VN')} đ</span>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleClose}>
              Xác Nhận & Tiếp Tục
            </button>
          </div>
        ) : (
          <div className="modal-body">
            {/* Current Balance */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px'
            }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Số dư ví hiện tại:</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-amber)' }}>
                {(user?.balance || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Select Amount Presets */}
            <div className="form-group">
              <label className="form-label">Chọn Mệnh Giá Nạp:</label>
              <div className="preset-grid">
                {presetAmounts.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`preset-chip ${amount === p.value ? 'active' : ''}`}
                    onClick={() => setAmount(p.value)}
                  >
                    {p.bonus && <span className="preset-chip-bonus">{p.bonus}</span>}
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Promotion / Total calculation preview */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.08))',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>Mệnh giá thanh toán:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{amount.toLocaleString('vi-VN')} đ</span>
              </div>
              {bonusAmount > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--accent-pink)', marginBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={14} /> Thưởng thêm ({selectedPreset.bonus}):
                  </span>
                  <span style={{ fontWeight: 700 }}>+{bonusAmount.toLocaleString('vi-VN')} đ</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  💡 <em>Chọn gói từ 100.000 đ để nhận thêm ưu đãi thưởng đến +20% coin</em>
                </div>
              )}
              <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                paddingTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Thực nhận vào ví:</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-green)' }}>
                  +{totalReceived.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Select Method */}
            <div className="form-group">
              <label className="form-label">Phương Thức Thanh Toán:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'VIETQR' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('VIETQR')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px' }}
                >
                  <QrCode size={20} color="#06b6d4" />
                  <span style={{ fontSize: '0.8rem' }}>VietQR Quét Mã</span>
                </button>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'VNPAY' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('VNPAY')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px' }}
                >
                  <CreditCard size={20} color="#3b82f6" />
                  <span style={{ fontSize: '0.8rem' }}>Cổng VNPay</span>
                </button>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'MOMO' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('MOMO')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 6px' }}
                >
                  <Sparkles size={20} color="#ec4899" />
                  <span style={{ fontSize: '0.8rem' }}>Ví MoMo</span>
                </button>
              </div>
            </div>

            {/* Simulated VietQR preview */}
            {paymentMethod === 'VIETQR' && (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px dashed var(--secondary)',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px'
              }}>
                <div style={{
                  background: '#fff',
                  padding: '10px',
                  borderRadius: '10px',
                  width: '140px',
                  margin: '0 auto 10px auto',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=PLAYZONE_NAPTIEN_${amount}_USER_${user?.id || 999}`}
                    alt="VietQR Demo"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Quét mã QR bằng ứng dụng ngân hàng bất kỳ để nạp tự động 24/7 (Khớp lệnh sau 3s)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isSuccess && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={handleClose}>
              Hủy
            </button>
            <button
              className="btn btn-cyan"
              disabled={isProcessing}
              onClick={handleDeposit}
            >
              <ShieldCheck size={18} />
              <span>
                {isProcessing
                  ? 'Đang Xử Lý...'
                  : bonusAmount > 0
                    ? `Nạp ${amount.toLocaleString('vi-VN')} đ (Nhận ${totalReceived.toLocaleString('vi-VN')} đ)`
                    : `Nạp ${amount.toLocaleString('vi-VN')} đ`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositModal;
