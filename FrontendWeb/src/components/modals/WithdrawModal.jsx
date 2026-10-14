import React, { useState, useEffect } from 'react';
import { X, Landmark, ArrowUpRight, ShieldCheck, Check, AlertCircle, Sparkles, Building, CreditCard, User, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/modals.css';

const POPULAR_BANKS = [
  { code: 'VCB', name: 'Vietcombank', shortName: 'Vietcombank' },
  { code: 'MB', name: 'MB Bank (Quân Đội)', shortName: 'MBBank' },
  { code: 'TCB', name: 'Techcombank', shortName: 'Techcombank' },
  { code: 'CTG', name: 'VietinBank', shortName: 'VietinBank' },
  { code: 'BIDV', name: 'BIDV', shortName: 'BIDV' },
  { code: 'ACB', name: 'ACB (Á Châu)', shortName: 'ACB' },
  { code: 'VPB', name: 'VPBank', shortName: 'VPBank' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)', shortName: 'TPBank' },
  { code: 'STB', name: 'Sacombank', shortName: 'Sacombank' },
  { code: 'HDB', name: 'HDBank', shortName: 'HDBank' },
  { code: 'VIB', name: 'VIB (Quốc Tế)', shortName: 'VIB' },
  { code: 'MOMO', name: 'Ví Điện Tử MoMo', shortName: 'MoMo' }
];

export const WithdrawModal = ({ isOpen, onClose, onNavigateWallet }) => {
  const { withdrawMoney, user } = useAuth();
  const { addToast } = useToast();

  const currentBalance = Number(user?.balance || user?.walletBalance || user?.coin || 0);

  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('MB Bank (Quân Đội)');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  // Khôi phục thông tin ngân hàng đã lưu gần nhất
  useEffect(() => {
    try {
      const savedBank = localStorage.getItem('last_withdraw_bank_info');
      if (savedBank) {
        const parsed = JSON.parse(savedBank);
        if (parsed.bankName) setBankName(parsed.bankName);
        if (parsed.bankAccountNumber) setBankAccountNumber(parsed.bankAccountNumber);
        if (parsed.bankAccountName) setBankAccountName(parsed.bankAccountName);
      } else if (user?.fullName) {
        setBankAccountName(user.fullName.toUpperCase());
      }
    } catch (e) {
      // ignore
    }
  }, [user]);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;
  const isOverBalance = numAmount > currentBalance;
  const isZeroOrNegative = numAmount <= 0;
  const isInsufficient = currentBalance <= 0;

  // Xử lý chọn rút tối đa
  const handleSetMax = () => {
    setAmount(currentBalance > 0 ? String(currentBalance) : '0');
  };

  // Chọn mốc tiền gợi ý
  const handleSelectPreset = (val) => {
    if (val <= currentBalance) {
      setAmount(String(val));
    }
  };

  const handleAmountChange = (e) => {
    // Chỉ cho phép nhập số
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (currentBalance <= 0) {
      addToast('Số dư khả dụng của bạn hiện là 0 đ, không thể rút tiền.', 'error');
      return;
    }

    if (!numAmount || numAmount <= 0) {
      addToast('Vui lòng nhập số tiền hợp lệ muốn rút', 'error');
      return;
    }

    if (numAmount > currentBalance) {
      addToast(`Số tiền rút không được vượt quá số dư khả dụng (${currentBalance.toLocaleString('vi-VN')} đ)`, 'error');
      return;
    }

    if (!bankAccountNumber.trim()) {
      addToast('Vui lòng nhập số tài khoản ngân hàng', 'error');
      return;
    }

    if (!bankAccountName.trim()) {
      addToast('Vui lòng nhập tên chủ tài khoản nhận', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const formattedAccountName = bankAccountName.trim().toUpperCase();
      const res = await withdrawMoney({
        amount: numAmount,
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: formattedAccountName,
        bankName: bankName.trim()
      });

      // Lưu lại thông tin ngân hàng cho lần sau
      try {
        localStorage.setItem('last_withdraw_bank_info', JSON.stringify({
          bankName: bankName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountName: formattedAccountName
        }));
      } catch (err) {
        // ignore
      }

      setSuccessInfo({
        amount: numAmount,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: formattedAccountName,
        paymentId: res?.data?.paymentId || Date.now(),
        newBalance: res?.newBalance ?? (currentBalance - numAmount)
      });

      setIsProcessing(false);
      setIsSuccess(true);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      addToast(`Tạo yêu cầu rút ${numAmount.toLocaleString('vi-VN')} đ thành công!`, 'success');
    } catch (err) {
      setIsProcessing(false);
      addToast(err.message || 'Rút tiền thất bại, vui lòng thử lại', 'error');
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setSuccessInfo(null);
    setAmount('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content animate-fade-in" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <Landmark size={20} />
            </div>
            <div>
              <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>Rút Tiền Về Ngân Hàng</span>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                Chuyển coin về tài khoản ngân hàng cá nhân
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="modal-body animate-fade-in" style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--accent-green, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-green, #10b981)'
            }}>
              <Check size={36} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
              Yêu Cầu Rút Tiền Đã Gửi!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Hệ thống đã tiếp nhận yêu cầu rút tiền của bạn. Admin sẽ kiểm tra và chuyển khoản trong vòng 5 - 30 phút.
            </p>

            {/* Chi tiết biên nhận */}
            <div style={{
              background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '16px 18px',
              marginBottom: '20px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <span>Mã giao dịch:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary, #6366f1)' }}>#{successInfo?.paymentId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <span>Số tiền rút:</span>
                <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.05rem' }}>
                  {(successInfo?.amount || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <span>Ngân hàng nhận:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{successInfo?.bankName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <span>Số tài khoản:</span>
                <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{successInfo?.bankAccountNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                <span>Chủ tài khoản:</span>
                <span style={{ fontWeight: 700 }}>{successInfo?.bankAccountName}</span>
              </div>
              <div style={{
                borderTop: '1px dashed var(--border-color)',
                paddingTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.88rem'
              }}>
                <span style={{ color: 'var(--text-muted)' }}>Số dư khả dụng còn lại:</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>
                  {(successInfo?.newBalance || 0).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px 16px', fontWeight: 600 }}
                onClick={handleClose}
              >
                Đóng
              </button>
              {onNavigateWallet && (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px 16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => {
                    handleClose();
                    onNavigateWallet();
                  }}
                >
                  <History size={16} />
                  <span>Xem Lịch Sử</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Box Hiển Thị Số Dư Khả Dụng */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                  Số Dư Khả Dụng Có Thể Rút
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                  {currentBalance.toLocaleString('vi-VN')} <span style={{ fontSize: '0.95rem' }}>đ</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSetMax}
                disabled={currentBalance <= 0}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: currentBalance > 0 ? 'pointer' : 'not-allowed',
                  opacity: currentBalance > 0 ? 1 : 0.5,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                RÚT TẤT CẢ (MAX)
              </button>
            </div>

            {/* Ô Nhập Số Tiền Muốn Rút */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Số tiền muốn rút <span style={{ color: 'var(--accent-red, #ef4444)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Tối đa: <strong style={{ color: '#10b981' }}>{currentBalance.toLocaleString('vi-VN')} đ</strong>
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    height: '46px',
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    paddingRight: '60px',
                    borderColor: isOverBalance ? 'var(--accent-red, #ef4444)' : undefined,
                    boxShadow: isOverBalance ? '0 0 0 2px rgba(239, 68, 68, 0.2)' : undefined
                  }}
                  placeholder="Nhập số tiền..."
                  value={amount ? Number(amount).toLocaleString('vi-VN') : ''}
                  onChange={handleAmountChange}
                  autoFocus
                />
                <span style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  fontSize: '0.95rem'
                }}>
                  VNĐ
                </span>
              </div>

              {/* Cảnh báo vượt quá số dư */}
              {isOverBalance && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--accent-red, #ef4444)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginTop: '6px'
                }}>
                  <AlertCircle size={14} />
                  <span>Số tiền rút không thể vượt quá số dư khả dụng ({currentBalance.toLocaleString('vi-VN')} đ)</span>
                </div>
              )}

              {/* Các mốc tiền gợi ý nhanh */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                {[50000, 100000, 200000, 500000].map(val => {
                  const disabled = val > currentBalance;
                  const isSelected = numAmount === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelectPreset(val)}
                      style={{
                        padding: '6px 4px',
                        borderRadius: '8px',
                        border: isSelected ? '1px solid #10b981' : '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: disabled ? 'var(--text-muted)' : isSelected ? '#10b981' : 'var(--text-secondary)',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.35 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thông Tin Ngân Hàng Nhận Tiền */}
            <div style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={16} color="var(--primary, #6366f1)" />
                <span>Tài Khoản Ngân Hàng Nhận Tiền</span>
              </div>

              {/* Chọn ngân hàng */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                  Ngân hàng thụ hưởng <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <select
                  className="form-control"
                  style={{ height: '40px', fontSize: '0.88rem' }}
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.code} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  <option value="Khác">Ngân hàng khác (Tự nhập)</option>
                </select>
                {bankName === 'Khác' && (
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '38px', marginTop: '6px', fontSize: '0.85rem' }}
                    placeholder="Nhập tên ngân hàng của bạn..."
                    onChange={(e) => setBankName(e.target.value)}
                  />
                )}
              </div>

              {/* Số tài khoản */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                  Số tài khoản ngân hàng <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '40px', fontSize: '0.92rem', fontWeight: 700, paddingLeft: '36px' }}
                    placeholder="VD: 0987654321..."
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\s+/g, ''))}
                  />
                  <CreditCard size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Tên chủ tài khoản */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                  Tên chủ tài khoản (Không dấu hoặc có dấu) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '40px', fontSize: '0.92rem', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '36px' }}
                    placeholder="VD: NGUYEN VAN A"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                  />
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            {/* Tóm tắt thanh toán */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              padding: '12px 14px',
              border: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Phí xử lý giao dịch:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>0 đ (Miễn phí)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Số dư còn lại dự kiến:</span>
                <span style={{ fontWeight: 700, color: numAmount > currentBalance ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                  {Math.max(0, currentBalance - numAmount).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: '0 0 100px' }}
                onClick={handleClose}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isProcessing || isInsufficient || isZeroOrNegative || isOverBalance || !bankAccountNumber.trim() || !bankAccountName.trim()}
                style={{
                  flex: 1,
                  height: '44px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: isOverBalance || isInsufficient ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  borderColor: isOverBalance || isInsufficient ? 'var(--border-color)' : '#f59e0b',
                  cursor: isProcessing || isInsufficient || isZeroOrNegative || isOverBalance ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isProcessing ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <ArrowUpRight size={18} />
                    <span>Xác Nhận Rút Tiền</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WithdrawModal;
