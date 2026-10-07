import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, User, Mail, Phone, Gamepad2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import '../../styles/modals.css';

export const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState('LOGIN'); // LOGIN, REGISTER, FORGOT
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      addToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'error');
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
        addToast('Đăng nhập Quản Trị Viên thành công! Đang chuyển vào Admin Dashboard...', 'success');
        onClose();
        navigate('/admin');
      } else {
        addToast(`Đăng nhập thành công! Chào mừng ${loggedUser.fullName || loggedUser.username}.`, 'success');
        onClose();
      }
    } else {
      addToast(res.error || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin.', 'error');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !email.trim()) {
      addToast('Vui lòng điền đủ các thông tin bắt buộc!', 'error');
      return;
    }

    setIsLoading(true);
    const res = await register({ username, password, fullName, email, phone });
    setIsLoading(false);

    if (res.success) {
      addToast('Đăng ký tài khoản thành công! Vui lòng đăng nhập.', 'success');
      setMode('LOGIN');
    } else {
      addToast(res.error || 'Đăng ký thất bại.', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Gamepad2 className="gradient-text" size={24} />
            <span>{mode === 'LOGIN' ? 'Đăng Nhập PlayZone' : mode === 'REGISTER' ? 'Đăng Ký Tài Khoản' : 'Quên Mật Khẩu'}</span>
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
              flex: 1,
              padding: '12px 0',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: mode === 'LOGIN' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: mode === 'LOGIN' ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => setMode('LOGIN')}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '12px 0',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: mode === 'REGISTER' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: mode === 'REGISTER' ? '2px solid var(--primary)' : 'none'
            }}
            onClick={() => setMode('REGISTER')}
          >
            Tạo Tài Khoản
          </button>
        </div>

        <div className="modal-body">
          {mode === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label className="form-label">Tên Đăng Nhập hoặc Email:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhập username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <User size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mật Khẩu:</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Nhập mật khẩu..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock size={16} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
                <button
                  type="button"
                  style={{ fontSize: '0.82rem', color: 'var(--secondary)' }}
                  onClick={() => setMode('FORGOT')}
                >
                  Quên mật khẩu?
                </button>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '6px' }}
                disabled={isLoading}
              >
                <span>{isLoading ? 'Đang Đăng Nhập...' : 'Đăng Nhập'}</span>
                <ArrowRight size={18} />
              </button>

              {/* Quick account suggestions */}
              <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center', fontWeight: 600 }}>
                  ⚡ Gợi ý tài khoản đăng nhập nhanh:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#f43f5e',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setUsername('admin');
                      setPassword('Admin@123456');
                    }}
                    title="Bấm để tự động điền tài khoản Quản Trị Viên"
                  >
                    <span>🛡️ Quản Trị Viên (Admin)</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 500 }}>admin / Admin@123456</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      padding: '8px 10px',
                      fontSize: '0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(6, 182, 212, 0.12)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      color: '#06b6d4',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setUsername('user123');
                      setPassword('User@123456');
                    }}
                    title="Bấm để tự động điền tài khoản Thành Viên"
                  >
                    <span>🎮 Thành Viên (User)</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.8, fontWeight: 500 }}>user123 / User@123456</span>
                  </button>
                </div>
              </div>
            </form>
          ) : mode === 'REGISTER' ? (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label className="form-label">Họ và Tên:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ví dụ: Nguyễn Thành Nam"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tên Đăng Nhập *:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Chọn username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email *:</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số Điện Thoại:</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mật Khẩu *:</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Tạo mật khẩu an toàn..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-cyan"
                style={{ width: '100%', padding: '12px', marginTop: '10px' }}
                disabled={isLoading}
              >
                <span>{isLoading ? 'Đang Tạo Tài Khoản...' : 'Đăng Ký Ngay'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          ) : (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Nhập địa chỉ email đăng ký để nhận liên kết đặt lại mật khẩu:
              </p>
              <div className="form-group">
                <label className="form-label">Email:</label>
                <input type="email" className="form-control" placeholder="Email của bạn..." />
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  addToast('Đã gửi liên kết khôi phục mật khẩu vào email của bạn!', 'success');
                  setMode('LOGIN');
                }}
              >
                Gửi Mã Khôi Phục
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
