import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Save, Camera, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar, getFunAvatar, FUN_AVATAR_STYLES } from '../utils/avatarUtils';

export const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(getUserAvatar(user));
  const [gender, setGender] = useState(user?.gender || 'MALE');

  // Random fun avatar generator
  const handleRandomAvatar = () => {
    const randomStyle = FUN_AVATAR_STYLES[Math.floor(Math.random() * FUN_AVATAR_STYLES.length)];
    const randomSeed = Math.random().toString(36).substring(7);
    const newFunAvatar = getFunAvatar(randomSeed, randomStyle);
    setAvatar(newFunAvatar);
    addToast('Đã đổi avatar vui nhộn mới! Nhớ bấm Lưu Thay Đổi nhé.', 'success');
  };

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({ fullName, email, phone, bio, avatar, gender });
    addToast('Đã lưu thông tin hồ sơ thành công!', 'success');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      addToast('Vui lòng điền đầy đủ thông tin mật khẩu!', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Mật khẩu xác nhận không khớp!', 'error');
      return;
    }
    addToast('Đã đổi mật khẩu thành công!', 'success');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '800px', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Hồ Sơ Cá Nhân & <span className="gradient-text">Cài Đặt Tài Khoản</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Quản lý thông tin bảo mật, số điện thoại và thông tin hiển thị của bạn.
        </p>
      </div>

      {/* Profile Info Form */}
      <form onSubmit={handleSaveProfile} className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--primary)" />
          <span>Thông Tin Cá Nhân</span>
        </h3>

        {/* Avatar change */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={avatar}
              alt="Avatar"
              style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', background: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Ảnh Đại Diện (Avatar Vui Nhộn):</label>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '6px', height: 'auto', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                onClick={handleRandomAvatar}
              >
                <Sparkles size={14} />
                <span>Đổi Avatar Vui Nhộn</span>
              </button>
            </div>
            <input
              type="url"
              className="form-control"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Họ và Tên:</label>
            <input
              type="text"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tên Đăng Nhập:</label>
            <input
              type="text"
              className="form-control"
              value={user?.username || 'game_master'}
              disabled
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email:</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Số Điện Thoại:</label>
            <input
              type="tel"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Giới Tính:</label>
          <select
            className="form-control"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="MALE">Nam</option>
            <option value="FEMALE">Nữ</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Tiểu Sử (Bio):</label>
          <textarea
            className="form-control"
            rows="3"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Viết đôi dòng về bạn..."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            <span>Lưu Thay Đổi</span>
          </button>
        </div>
      </form>

      {/* Security & Password */}
      <form onSubmit={handleChangePassword} className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={20} color="var(--secondary)" />
          <span>Đổi Mật Khẩu Bảo Mật</span>
        </h3>

        <div className="form-group">
          <label className="form-label">Mật Khẩu Hiện Tại:</label>
          <input
            type="password"
            className="form-control"
            placeholder="••••••••"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Mật Khẩu Mới:</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Xác Nhận Mật Khẩu Mới:</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn btn-cyan">
            <ShieldCheck size={16} />
            <span>Cập Nhật Mật Khẩu</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
