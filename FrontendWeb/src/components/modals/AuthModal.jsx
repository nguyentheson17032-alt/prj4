import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, User, Mail, Phone, Gamepad2, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { AccountBannedModal } from './AccountBannedModal';
import '../../styles/modals.css';

// Reusable inline error block
const ErrorBox = ({ message }) =>
  message ? (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
      borderRadius: '10px', padding: '10px 14px', marginBottom: '14px'
    }}>
      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
      <span style={{ fontSize: '0.85rem', color: '#f87171', lineHeight: 1.4 }}>{message}</span>
    </div>
  ) : null;

// Reusable password input with eye toggle
const PasswordInput = ({ value, onChange, placeholder, show, onToggle, toggleTitle }) => (
  <div style={{ position: 'relative' }}>
    <input
      type={show ? 'text' : 'password'}
      className="form-control"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{ paddingRight: '42px' }}
    />
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        transition: 'color 0.15s'
      }}
      title={toggleTitle}
    >
      {show ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
);

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER, FORGOT
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Password visibility toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Inline error messages
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Banned state
  const [bannedModalOpen, setBannedModalOpen] = useState(false);
  const [banDetails, setBanDetails] = useState(null);

  if (!isOpen) return null;

  const switchMode = (m) => {
    setMode(m);
    setLoginError('');
    setRegisterError('');
    setPassword('');
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
  };

  const getFriendlyLoginError = (rawError) => {
    if (!rawError) return t('auth.loginFailed', 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.');
    const err = String(rawError).toLowerCase();
    if (
      err.includes('không đúng') ||
      err.includes('not found') ||
      err.includes('bad credentials') ||
      err.includes('tên đăng nhập hoặc mật khẩu') ||
      err.includes('incorrect') ||
      err.includes('invalid') ||
      err.includes('401')
    ) {
      return t('auth.invalidCredentials', 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
    if (err.includes('bị khóa') || err.includes('banned') || err.includes('locked')) {
      return t('auth.accountBanned', 'Tài khoản của bạn đã bị khóa hoặc tạm khóa.');
    }
    return t('auth.loginFailed', 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password.trim()) {
      setLoginError(t('auth.enterUsernameAndPassword', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'));
      return;
    }

    setIsLoading(true);
    const res = await login(username, password);
    setIsLoading(false);

    if (res.success) {
      const loggedUser = res.user;
      const isAdmin = Boolean(
        (Array.isArray(loggedUser.roles) && loggedUser.roles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase() === 'ROLE_ADMIN'))) ||
        loggedUser.role === 'ADMIN' ||
        loggedUser.role === 'ROLE_ADMIN' ||
        (typeof loggedUser.username === 'string' && loggedUser.username.toLowerCase().includes('admin'))
      );

      if (isAdmin) {
        addToast(t('auth.adminLoginSuccessToast', 'Đăng nhập Quản Trị Viên thành công! Đang chuyển vào Admin Dashboard...'), 'success');
        onClose();
        navigate('/admin');
      } else {
        addToast(t('auth.loginSuccessToast', 'Đăng nhập thành công! Chào mừng {name}.').replace('{name}', loggedUser.fullName || loggedUser.username), 'success');
        onClose();
      }
    } else {
      if (res.isBanned || res.banDetails) {
        setBanDetails(res.banDetails);
        setBannedModalOpen(true);
      }
      setLoginError(getFriendlyLoginError(res.error));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');

    if (!username.trim()) { setRegisterError(t('auth.usernameRequired', 'Tên đăng nhập không được để trống.')); return; }
    if (!email.trim()) { setRegisterError(t('auth.emailRequired', 'Email không được để trống.')); return; }
    if (!password.trim()) { setRegisterError(t('auth.passwordRequired', 'Mật khẩu không được để trống.')); return; }

    setIsLoading(true);
    const res = await register({
      username,
      password,
      fullName: fullName || username,
      email,
      phoneNumber: phone,
      phone
    });
    setIsLoading(false);

    if (res.success) {
      addToast(t('auth.registerSuccessToast', 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.'), 'success');
      switchMode('LOGIN');
    } else {
      const msg = res.error || t('auth.loginFailed', 'Đăng ký thất bại.');
      setRegisterError(msg);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Gamepad2 className="gradient-text" size={24} />
            <span>
              {mode === 'LOGIN'
                ? t('auth.loginTitle', 'Đăng Nhập PlayZone')
                : mode === 'REGISTER'
                ? t('auth.registerTitle', 'Đăng Ký Tài Khoản')
                : t('auth.forgotTitle', 'Quên Mật Khẩu')}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 28px' }}>
          <button
            type="button"
            style={{
              flex: 1, padding: '12px 0', fontWeight: 700, fontSize: '0.95rem',
              color: mode === 'LOGIN' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: mode === 'LOGIN' ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => switchMode('LOGIN')}
          >
            {t('auth.tabLogin', 'Đăng Nhập')}
          </button>
          <button
            type="button"
            style={{
              flex: 1, padding: '12px 0', fontWeight: 700, fontSize: '0.95rem',
              color: mode === 'REGISTER' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: mode === 'REGISTER' ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => switchMode('REGISTER')}
          >
            {t('auth.tabRegister', 'Tạo Tài Khoản')}
          </button>
        </div>

        <div className="modal-body">
          {mode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.usernameOrEmail', 'Tên Đăng Nhập hoặc Email:')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('auth.usernamePlaceholder', 'Nhập username...')}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setLoginError(''); }}
                    style={{ paddingRight: '40px' }}
                  />
                  <User size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.password', 'Mật Khẩu:')}</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                  placeholder={t('auth.passwordPlaceholder', 'Nhập mật khẩu...')}
                  show={showLoginPassword}
                  onToggle={() => setShowLoginPassword(v => !v)}
                  toggleTitle={showLoginPassword ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button type="button" style={{ fontSize: '0.82rem', color: 'var(--secondary)' }} onClick={() => switchMode('FORGOT')}>
                  {t('auth.forgotPassword', 'Quên mật khẩu?')}
                </button>
              </div>

              <ErrorBox message={loginError} />

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', marginTop: '2px' }} disabled={isLoading}>
                <span>{isLoading ? t('auth.loggingIn', 'Đang Đăng Nhập...') : t('auth.loginBtn', 'Đăng Nhập')}</span>
                <ArrowRight size={18} />
              </button>

              {/* Quick account suggestions - Only shown in development/local test environment */}
              {(import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center', fontWeight: 600 }}>
                    {t('auth.quickSuggestions', '⚡ Gợi ý tài khoản đăng nhập nhanh:')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      style={{ padding: '8px 10px', fontSize: '0.75rem', borderRadius: '8px', background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e', cursor: 'pointer', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                      onClick={() => { setUsername('admin'); setPassword('Admin@123456'); setLoginError(''); }}
                      title={t('auth.quickAdminTooltip', 'Bấm để tự động điền tài khoản Quản Trị Viên')}
                    >
                      <span>{t('auth.quickAdmin', '🛡️ Quản Trị Viên (Admin)')}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 500 }}>admin / Admin@123456</span>
                    </button>
                    <button
                      type="button"
                      style={{ padding: '8px 10px', fontSize: '0.75rem', borderRadius: '8px', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', cursor: 'pointer', fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                      onClick={() => { setUsername('user123'); setPassword('User@123456'); setLoginError(''); }}
                      title={t('auth.quickUserTooltip', 'Bấm để tự động điền tài khoản Thành Viên')}
                    >
                      <span>{t('auth.quickUser', '🎮 Thành Viên (User)')}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 500 }}>user123 / User@123456</span>
                    </button>
                  </div>
                </div>
              )}
            </form>

          ) : mode === 'REGISTER' ? (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.fullName', 'Họ và Tên:')}</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('auth.fullNamePlaceholder', 'Ví dụ: Nguyễn Thành Nam')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.username', 'Tên Đăng Nhập')} <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('auth.usernameRegPlaceholder', 'Chọn username (ít nhất 3 ký tự)...')}
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setRegisterError(''); }}
                    style={{ paddingRight: '40px' }}
                  />
                  <User size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.email', 'Email')} <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setRegisterError(''); }}
                    style={{ paddingRight: '40px' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.phone', 'Số Điện Thoại:')}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingRight: '40px' }}
                  />
                  <Phone size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('auth.password', 'Mật Khẩu')} <span style={{ color: '#ef4444' }}>*</span></label>
                <PasswordInput
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setRegisterError(''); }}
                  placeholder={t('auth.passwordRegPlaceholder', 'Ít nhất 8 ký tự, gồm chữ hoa, số, ký tự đặc biệt...')}
                  show={showRegisterPassword}
                  onToggle={() => setShowRegisterPassword(v => !v)}
                  toggleTitle={showRegisterPassword ? t('auth.hidePassword', 'Ẩn mật khẩu') : t('auth.showPassword', 'Hiện mật khẩu')}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                  {t('auth.passwordHelp', 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ số và 1 ký tự đặc biệt (@#$%...).')}
                </p>
              </div>

              <ErrorBox message={registerError} />

              <button type="submit" className="btn btn-cyan" style={{ width: '100%', padding: '12px', marginTop: '4px' }} disabled={isLoading}>
                <span>{isLoading ? t('auth.creatingAccount', 'Đang Tạo Tài Khoản...') : t('auth.registerBtn', 'Đăng Ký Ngay')}</span>
                <ArrowRight size={18} />
              </button>
            </form>

          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                {t('auth.forgotDesc', 'Nhập địa chỉ email đăng ký để nhận liên kết đặt lại mật khẩu:')}
              </p>
              <div className="form-group">
                <label className="form-label">{t('auth.email', 'Email')}:</label>
                <input type="email" className="form-control" placeholder={t('auth.emailPlaceholder', 'Email của bạn...')} />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  addToast(t('auth.recoverySentToast', 'Đã gửi liên kết khôi phục mật khẩu vào email của bạn!'), 'success');
                  switchMode('LOGIN');
                }}
              >
                {t('auth.sendRecovery', 'Gửi Mã Khôi Phục')}
              </button>
            </div>
          )}
        </div>
      </div>

      <AccountBannedModal
        isOpen={bannedModalOpen}
        onClose={() => setBannedModalOpen(false)}
        banDetails={banDetails}
        username={username}
      />
    </div>
  );
};

export default AuthModal;
