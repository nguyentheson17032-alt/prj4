import React, { useState } from 'react';
import { X, Wallet, QrCode, CreditCard, ShieldCheck, Check, Sparkles, Smartphone, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../api/apiService';
import '../../styles/modals.css';

export const DepositModal = ({ isOpen, onClose }) => {
  const { deposit, user } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [amount, setAmount] = useState(100000);
  const [paymentMethod, setPaymentMethod] = useState('VIETQR'); // VIETQR, VNPAY, MOMO, ZALOPAY
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
      if (paymentMethod === 'VNPAY') {
        const gatewayResult = await api.createVnPayPayment(amount, `Nạp coin PlayZone ${amount} đ qua VNPay`);
        const targetUrl = gatewayResult?.paymentUrl || gatewayResult?.payUrl;
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
        throw new Error('Không nhận được liên kết thanh toán từ cổng VNPay');
      }

      if (paymentMethod === 'MOMO') {
        const gatewayResult = await api.createMomoPayment(amount, `Nạp coin PlayZone ${amount} đ qua MoMo`);
        const targetUrl = gatewayResult?.payUrl || gatewayResult?.paymentUrl;
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
        throw new Error('Không nhận được liên kết thanh toán từ cổng MoMo');
      }

      if (paymentMethod === 'ZALOPAY') {
        const gatewayResult = await api.createZaloPayPayment(amount, `Nạp coin PlayZone ${amount} đ qua ZaloPay`);
        const targetUrl = gatewayResult?.payUrl || gatewayResult?.paymentUrl || gatewayResult?.orderUrl;
        if (targetUrl) {
          window.location.href = targetUrl;
          return;
        }
        throw new Error('Không nhận được liên kết thanh toán từ cổng ZaloPay');
      }

      if (paymentMethod === 'VIETQR') {
        setIsProcessing(false);
        addToast('Vui lòng quét mã VietQR và chuyển khoản đúng số tiền để hệ thống tự động cộng coin.', 'info');
        return;
      }
    } catch (err) {
      setIsProcessing(false);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message || 'Nạp tiền thất bại, vui lòng thử lại';
      addToast(typeof errorMsg === 'string' ? errorMsg : 'Nạp tiền thất bại, vui lòng thử lại', 'error');
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
            <span>{t('deposit.title', 'Nạp Coin Vào Ví PlayZone')}</span>
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
              Coin đã được cộng tự động vào ví PlayZone qua {lastDepositInfo?.method || paymentMethod}.
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
                <span>Phương thức thanh toán:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {lastDepositInfo?.method === 'MOMO' ? 'Ví MoMo' :
                   lastDepositInfo?.method === 'ZALOPAY' ? 'Ví ZaloPay' :
                   lastDepositInfo?.method === 'VNPAY' ? 'Cổng VNPay' : 'VietQR Quét Mã'}
                </span>
              </div>
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
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('deposit.currentBalance', 'Số dư ví hiện tại:')}</span>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-amber)' }}>
                {(user?.balance || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Select Amount Presets */}
            <div className="form-group">
              <label className="form-label">{t('deposit.chooseAmount', 'Chọn Mệnh Giá Nạp:')}</label>
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
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t('deposit.receive', 'Thực nhận vào ví:')}</span>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--accent-green)' }}>
                  +{totalReceived.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Select Method (VietQR, VNPay, MoMo, ZaloPay) */}
            <div className="form-group">
              <label className="form-label">{t('deposit.chooseMethod', 'Chọn Kênh Thanh Toán:')}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'VIETQR' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('VIETQR')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px' }}
                >
                  <QrCode size={20} color="#06b6d4" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>VietQR</span>
                </button>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'VNPAY' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('VNPAY')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px' }}
                >
                  <CreditCard size={20} color="#3b82f6" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>VNPay</span>
                </button>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'MOMO' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('MOMO')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px' }}
                >
                  <Sparkles size={20} color="#ec4899" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>Ví MoMo</span>
                </button>
                <button
                  type="button"
                  className={`preset-chip ${paymentMethod === 'ZALOPAY' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('ZALOPAY')}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '10px 4px' }}
                >
                  <Smartphone size={20} color="#0068ff" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 600 }}>ZaloPay</span>
                </button>
              </div>
            </div>

            {/* Gateway Previews */}
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
                  {t('deposit.vietqrDesc', 'Quét mã QR bằng ứng dụng ngân hàng bất kỳ để nạp tự động 24/7 (Khớp lệnh sau 3s)')}
                </div>
              </div>
            )}

            {paymentMethod === 'MOMO' && (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1px dashed #ec4899',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ec4899', marginBottom: '6px' }}>
                  Cổng Thanh Toán Ví MoMo
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {t('deposit.momoDesc', 'Thanh toán siêu tốc qua ứng dụng MoMo bằng mã QR hoặc tài khoản ví MoMo.')}
                </p>
              </div>
            )}

            {paymentMethod === 'ZALOPAY' && (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(0, 104, 255, 0.08)',
                border: '1px dashed #0068ff',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0068ff', marginBottom: '6px' }}>
                  Cổng Thanh Toán Ví ZaloPay
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {t('deposit.zalopayDesc', 'Thanh toán qua ví ZaloPay hoặc quét mã QR trong app Zalo bảo mật 100%.')}
                </p>
              </div>
            )}

            {paymentMethod === 'VNPAY' && (
              <div style={{
                textAlign: 'center',
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px dashed #3b82f6',
                borderRadius: 'var(--radius-md)',
                marginTop: '16px'
              }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6', marginBottom: '6px' }}>
                  Cổng Quốc Gia VNPay-QR
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {t('deposit.vnpayDesc', 'Hỗ trợ hơn 40 ngân hàng nội địa Việt Nam và thẻ quốc tế Visa / Mastercard.')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!isSuccess && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={handleClose}>
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              className="btn btn-cyan"
              disabled={isProcessing}
              onClick={handleDeposit}
            >
              <ShieldCheck size={18} />
              <span>
                {isProcessing
                  ? t('deposit.processing', 'Đang Xử Lý...')
                  : bonusAmount > 0
                    ? `${t('deposit.submit', 'Nạp')} ${amount.toLocaleString('vi-VN')} đ (${t('deposit.receive', 'Nhận')} ${totalReceived.toLocaleString('vi-VN')} đ)`
                    : `${t('deposit.submit', 'Nạp')} ${amount.toLocaleString('vi-VN')} đ`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositModal;
