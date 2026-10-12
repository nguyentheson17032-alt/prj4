import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Lock, Save, Sparkles, ShieldCheck,
  Star, MessageSquare, CheckCircle, XCircle, Clock, Coins,
  ChevronRight, X, Edit2, TrendingUp, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar, getFunAvatar, FUN_AVATAR_STYLES } from '../utils/avatarUtils';
import api from '../api/apiService';

// Modal hiển thị danh sách đánh giá
const ReviewsModal = ({ isOpen, onClose, reviews, playerName, rating, reviewCount }) => {
  if (!isOpen) return null;

  const renderStars = (count) => (
    <span style={{ color: '#f59e0b', letterSpacing: '2px' }}>
      {'★'.repeat(Math.floor(count))}{'☆'.repeat(5 - Math.floor(count))}
    </span>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px' }}>
              Đánh giá của {playerName}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {renderStars(rating)}
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>{rating?.toFixed(1) || '0.0'}</span>
              <span>· {reviewCount} lượt đánh giá</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Rating distribution */}
        {reviews.length > 0 && (
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '0.8rem' }}>
                  <span style={{ width: '14px', color: 'var(--text-muted)', textAlign: 'right' }}>{star}</span>
                  <span style={{ color: '#f59e0b' }}>★</span>
                  <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fb923c)', borderRadius: '3px', transition: 'width 0.4s' }} />
                  </div>
                  <span style={{ width: '24px', color: 'var(--text-muted)', textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Reviews list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {reviews.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Chưa có đánh giá nào</p>
            </div>
          ) : (
            reviews.map((r, i) => (
              <div key={r.id || i} style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <img
                    src={r.reviewerAvatar || r.user?.avatar || getUserAvatar({ username: r.reviewerName || 'User' })}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.05)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.reviewerName || r.user?.name || 'Khách hàng'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.createdAt}</div>
                  </div>
                  <span style={{ color: '#f59e0b', fontSize: '1rem' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                {r.comment && (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, paddingLeft: '42px', lineHeight: 1.5 }}>
                    {r.comment}
                  </p>
                )}
                {r.gameName && (
                  <div style={{ paddingLeft: '42px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(139,92,246,0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px' }}>
                      {r.gameName} {r.hours ? `· ${r.hours} giờ` : ''}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, suffix = '', sublabel = '' }) => (
  <div className="glass-panel" style={{ padding: '16px 20px', flex: '1', minWidth: '130px', textAlign: 'center' }}>
    <div style={{ color: color || 'var(--primary)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>{value}<span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: '2px' }}>{suffix}</span></div>
    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
    {sublabel && <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{sublabel}</div>}
  </div>
);

export const ProfilePage = () => {
  const { user, updateProfile, isPlayer } = useAuth();
  const { addToast } = useToast();

  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(getUserAvatar(user));
  const [gender, setGender] = useState(user?.gender || 'MALE');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Player state
  const [playerProfile, setPlayerProfile] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [priceInput, setPriceInput] = useState('');
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  // Load player data if user is player
  useEffect(() => {
    if (!isPlayer || !user?.id) return;
    const loadPlayerData = async () => {
      setLoadingStats(true);
      try {
        const players = await api.getGamePlayersByUser(user.id);
        const raw = players?.[0] || null;
        if (!raw) return;
        setPlayerProfile(raw);
        setPriceInput(String(raw.pricePerHour || raw.price || ''));

        const stats = await api.getPlayerStats(raw.id);
        if (stats) setPlayerStats(stats);

        const revData = await api.getReviewsByPlayerId(raw.id);
        setReviews(Array.isArray(revData) ? revData : []);
      } catch (e) {
        console.warn('Load player data error:', e.message);
      } finally {
        setLoadingStats(false);
      }
    };
    loadPlayerData();
  }, [isPlayer, user?.id]);

  const handleRandomAvatar = () => {
    const randomStyle = FUN_AVATAR_STYLES[Math.floor(Math.random() * FUN_AVATAR_STYLES.length)];
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatar(getFunAvatar(randomSeed, randomStyle));
    addToast('Đã đổi avatar vui nhộn mới! Nhớ bấm Lưu Thay Đổi nhé.', 'success');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({ fullName, email, phone, bio, avatar, gender });
    addToast('Đã lưu thông tin hồ sơ thành công!', 'success');
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) { addToast('Vui lòng điền đầy đủ thông tin mật khẩu!', 'error'); return; }
    if (newPassword !== confirmPassword) { addToast('Mật khẩu xác nhận không khớp!', 'error'); return; }
    addToast('Đã đổi mật khẩu thành công!', 'success');
    setOldPassword(''); setNewPassword(''); setConfirmPassword('');
  };

  const handleUpdatePrice = async () => {
    if (!playerProfile?.id) return;
    const price = Number(priceInput);
    if (!price || price <= 0) { addToast('Giá thuê không hợp lệ!', 'error'); return; }
    setSavingPrice(true);
    try {
      await api.updatePlayerPrice(playerProfile.id, price);
      setPlayerProfile(prev => ({ ...prev, pricePerHour: price }));
      addToast('Cập nhật giá thuê thành công!', 'success');
    } catch (e) {
      addToast('Cập nhật giá thất bại: ' + (e.response?.data?.message || e.message), 'error');
    } finally {
      setSavingPrice(false);
    }
  };

  const stats = playerStats || playerProfile || {};
  const rating = stats.rating || 0;
  const reviewCount = stats.reviewCount || stats.totalReviews || reviews.length || 0;
  const completedOrders = stats.completedOrders ?? stats.orderCount ?? stats.totalGames ?? 0;
  const canceledOrders = stats.canceledOrders ?? 0;
  const totalHours = (stats.totalHours != null && stats.totalHours > 0)
    ? stats.totalHours
    : (stats.totalMinutesHired ? Math.round(stats.totalMinutesHired / 60) : (completedOrders > 0 ? completedOrders * 2 : 0));

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

      {/* ========== PLAYER STATS SECTION ========== */}
      {isPlayer && (
        <div className="glass-panel" style={{ padding: '28px 32px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Award size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
              Thông Tin <span className="gradient-text">Idol</span> Của Tôi
            </h3>
            {playerProfile?.status && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: '20px',
                background: playerProfile.status === 'AVAILABLE' ? 'rgba(34,197,94,0.15)' : playerProfile.status === 'PENDING' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                color: playerProfile.status === 'AVAILABLE' ? '#22c55e' : playerProfile.status === 'PENDING' ? '#fbbf24' : '#ef4444',
              }}>
                {playerProfile.status === 'AVAILABLE' ? 'Đang hoạt động' : playerProfile.status === 'PENDING' ? 'Chờ duyệt' : playerProfile.status === 'HIRED' ? 'Đang được thuê' : playerProfile.status}
              </span>
            )}
          </div>

          {loadingStats ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Đang tải thống kê...</div>
          ) : (
            <>
              {/* Stats cards */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <StatCard
                  icon={<Star size={22} fill="#f59e0b" color="#f59e0b" />}
                  label="Đánh giá trung bình"
                  value={rating ? rating.toFixed(1) : '—'}
                  suffix="/ 5"
                  color="#f59e0b"
                />
                <StatCard
                  icon={<CheckCircle size={22} color="#22c55e" />}
                  label="Đơn hoàn thành"
                  value={completedOrders}
                  suffix="đơn"
                  color="#22c55e"
                />
                <StatCard
                  icon={<XCircle size={22} color="#ef4444" />}
                  label="Đơn đã hủy"
                  value={canceledOrders}
                  suffix="đơn"
                  color="#ef4444"
                />
                <StatCard
                  icon={<Clock size={22} color="#06b6d4" />}
                  label="Tổng giờ chơi"
                  value={totalHours}
                  suffix="giờ"
                  sublabel="Từ đơn hoàn thành"
                  color="#06b6d4"
                />
              </div>

              {/* Reviews summary */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MessageSquare size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {reviewCount} lượt đánh giá
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
                      <span>{rating ? `${rating.toFixed(1)} / 5` : 'Chưa có đánh giá'}</span>
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-outline"
                  style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  onClick={() => setShowReviewsModal(true)}
                >
                  <span>Xem chi tiết</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Price editor */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                  <Coins size={16} color="var(--primary)" />
                  Giá Thuê (coin / giờ)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input
                      type="number"
                      className="form-control"
                      value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      min="1000"
                      step="1000"
                      placeholder="Ví dụ: 50000"
                      style={{ paddingRight: '60px' }}
                    />
                    <span style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      fontSize: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none'
                    }}>coin/h</span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', gap: '6px' }}
                    onClick={handleUpdatePrice}
                    disabled={savingPrice}
                  >
                    <Edit2 size={14} />
                    <span>{savingPrice ? 'Đang lưu...' : 'Cập nhật giá'}</span>
                  </button>
                </div>
                {priceInput && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    ≈ {Number(priceInput).toLocaleString('vi-VN')} coin / giờ
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== PROFILE INFO FORM ========== */}
      <form onSubmit={handleSaveProfile} className="glass-panel" style={{ padding: '32px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--primary)" />
          <span>Thông Tin Cá Nhân</span>
        </h3>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <img
            src={avatar}
            alt="Avatar"
            style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Ảnh Đại Diện:</label>
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
            <input type="text" className="form-control" value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tên Đăng Nhập:</label>
            <input type="text" className="form-control" value={user?.username || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Email:</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Số Điện Thoại:</label>
            <input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Giới Tính:</label>
          <select className="form-control" value={gender} onChange={e => setGender(e.target.value)}>
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
            onChange={e => setBio(e.target.value)}
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

      {/* ========== PASSWORD CHANGE ========== */}
      <form onSubmit={handleChangePassword} className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={20} color="var(--secondary)" />
          <span>Đổi Mật Khẩu Bảo Mật</span>
        </h3>

        <div className="form-group">
          <label className="form-label">Mật Khẩu Hiện Tại:</label>
          <input type="password" className="form-control" placeholder="••••••••" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Mật Khẩu Mới:</label>
            <input type="password" className="form-control" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Xác Nhận Mật Khẩu Mới:</label>
            <input type="password" className="form-control" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="submit" className="btn btn-cyan">
            <ShieldCheck size={16} />
            <span>Cập Nhật Mật Khẩu</span>
          </button>
        </div>
      </form>

      {/* Reviews Modal */}
      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        reviews={reviews}
        playerName={playerProfile?.username || user?.username || 'Idol'}
        rating={rating}
        reviewCount={reviewCount}
      />
    </div>
  );
};

export default ProfilePage;
