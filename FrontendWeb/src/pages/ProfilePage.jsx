import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  User, Mail, Phone, Lock, Save, Sparkles, ShieldCheck,
  Star, MessageSquare, CheckCircle, XCircle, Clock, Coins,
  ChevronRight, X, Edit2, TrendingUp, Award, Gamepad2, Pencil,
  Gift, Zap, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar, getFunAvatar, FUN_AVATAR_STYLES } from '../utils/avatarUtils';
import api from '../api/apiService';

export const calculateExpFromCoin = (coin, desc = '') => {
  if (!coin || coin <= 0) return 0;
  if (coin % 1000000 === 0) return (coin / 1000000) * 8000;
  if (coin % 500000 === 0) return (coin / 500000) * 3500;
  if (coin % 200000 === 0) return (coin / 200000) * 1200;
  if (coin % 100000 === 0) return (coin / 100000) * 600;
  if (coin % 50000 === 0) return (coin / 50000) * 250;
  if (coin % 30000 === 0) return (coin / 30000) * 150;
  if (coin >= 1000000) return 8000;
  if (coin >= 500000) return 3500;
  if (coin >= 200000) return 1200;
  if (coin >= 100000) return 600;
  if (coin >= 50000) return 250;
  if (coin >= 30000) return 150;
  return Math.round(coin * 0.006);
};

const SERVERS = [
  { value: 'VN', label: 'Việt Nam' },
  { value: 'Asia', label: 'Châu Á' },
  { value: 'KR', label: 'Hàn Quốc' },
  { value: 'NA', label: 'Bắc Mỹ' },
  { value: 'EU', label: 'Châu Âu' },
];

const EditGameModal = ({ isOpen, onClose, gameName, form, onChange, onSave, saving }) => {
  if (!isOpen) return null;
  const { rankMin, rankMax, roles, servers, pricePerHour, availableRanks, availableRoles } = form;
  const toggleRole = (r) => onChange('roles', roles.includes(r) ? roles.filter(x => x !== r) : [...roles, r]);
  const toggleServer = (s) => onChange('servers', servers.includes(s) ? servers.filter(x => x !== s) : [...servers, s]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={onClose}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gamepad2 size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Cập nhật: <span style={{ color: '#a5b4fc' }}>{gameName}</span></h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Rank range */}
          {availableRanks && availableRanks.length > 0 ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Chấp Nhận Rank Từ - Đến *:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
                <select className="form-control" value={rankMin} onChange={e => {
                  const newMin = e.target.value;
                  const minIdx = availableRanks.indexOf(newMin);
                  const maxIdx = availableRanks.indexOf(rankMax);
                  onChange('rankMin', newMin);
                  if (maxIdx < minIdx) onChange('rankMax', newMin);
                }}>
                  {availableRanks.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>→</span>
                <select className="form-control" value={rankMax} onChange={e => onChange('rankMax', e.target.value)}>
                  {availableRanks.slice(availableRanks.indexOf(rankMin)).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                {rankMin === rankMax ? `Hiển thị: ${rankMin}` : `Hiển thị: ${rankMin} - ${rankMax}`}
              </span>
            </div>
          ) : (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mức Rank / Cấp Độ *:</label>
              <input type="text" className="form-control" placeholder="VD: Cao Thủ, Radiant..." value={rankMin} onChange={e => { onChange('rankMin', e.target.value); onChange('rankMax', e.target.value); }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Roles */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Vị Trí / Role:</label>
              {availableRoles && availableRoles.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', minHeight: '44px' }}>
                  {availableRoles.map(ro => {
                    const checked = roles.includes(ro);
                    return (
                      <span key={ro} onClick={() => toggleRole(ro)} style={{ padding: '4px 11px', borderRadius: '20px', cursor: 'pointer', background: checked ? 'rgba(99,102,241,0.2)' : 'var(--bg-secondary)', border: `1px solid ${checked ? '#6366f1' : 'var(--border-color)'}`, color: checked ? '#a5b4fc' : 'var(--text-secondary)', fontSize: '0.83rem', fontWeight: checked ? 600 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
                        {ro}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <input type="text" className="form-control" value="Không có" readOnly style={{ opacity: 0.5 }} />
              )}
            </div>

            {/* Servers */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Server Khu Vực:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', minHeight: '44px' }}>
                {SERVERS.map(({ value, label }) => {
                  const checked = servers.includes(value);
                  return (
                    <span key={value} onClick={() => toggleServer(value)} style={{ padding: '4px 11px', borderRadius: '20px', cursor: 'pointer', background: checked ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)', border: `1px solid ${checked ? '#10b981' : 'var(--border-color)'}`, color: checked ? '#6ee7b7' : 'var(--text-secondary)', fontSize: '0.83rem', fontWeight: checked ? 600 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
                      {label} ({value})
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Giá Thuê (VNĐ / Giờ) *:</label>
            <input type="number" step="5000" min="10000" max="500000" className="form-control" value={pricePerHour} onChange={e => onChange('pricePerHour', Number(e.target.value))} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              💡 Mức khuyến nghị: 40.000 đ - 80.000 đ / giờ
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Hủy</button>
            <button className="btn btn-primary" onClick={onSave} disabled={saving}>
              <Save size={14} />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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

// Modal hiển thị danh sách quà tặng đã nhận
const ReceivedGiftsModal = ({ isOpen, onClose, gifts, playerName, totalGifts, giftExp, giftCoin }) => {
  if (!isOpen) return null;

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
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gift size={20} color="#ec4899" />
              <span>Quà Tặng Của {playerName}</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>🎁 {totalGifts} món quà</span>
              <span>· ⚡ +{Number(giftExp || 0).toLocaleString('vi-VN')} Exp</span>
              {giftCoin > 0 && <span>· 💰 {Number(giftCoin).toLocaleString('vi-VN')} đ</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Gifts list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {gifts.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Gift size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Chưa có quà tặng nào từ người hâm mộ</p>
            </div>
          ) : (
            gifts.map((g, i) => {
              const origCoin = Number(g.originalAmount || g.coin || 0);
              const recv = Number(g.playerReceived || (origCoin * 0.85));
              const sender = g.partnerName || 'Người hâm mộ ẩn danh';
              const cleanDesc = (g.description || '')
                .replace(/^Nhận quà từ [^:]+:\s*/i, '')
                .replace(/^Tặng quà cho [^:]+:\s*/i, '')
                .replace(/\(Đã khấu trừ 15% phí hệ thống\):\s*/i, '');

              return (
                <div key={g.id || i} style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <img
                    src={g.partnerAvatar || getUserAvatar({ username: sender })}
                    alt=""
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{sender}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ec4899' }}>
                        +{recv.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                    {cleanDesc && (
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '4px 0', lineHeight: 1.4 }}>
                        💬 "{cleanDesc}"
                      </p>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>{g.createdAt || ''}</span>
                      {origCoin > 0 && <span>(Gốc: {origCoin.toLocaleString('vi-VN')} đ)</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color, suffix = '', sublabel = '', onClick }) => (
  <div
    className="glass-panel"
    onClick={onClick}
    style={{
      padding: '18px 14px',
      textAlign: 'center',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s ease',
      border: onClick ? '1px solid rgba(236,72,153,0.35)' : undefined,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '120px',
    }}
  >
    <div style={{ color: color || 'var(--primary)', marginBottom: '6px', display: 'flex', justifyContent: 'center' }}>{icon}</div>
    <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.2 }}>{value}<span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '3px' }}>{suffix}</span></div>
    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>{label}</div>
    {sublabel && (
      <div style={{
        fontSize: '0.74rem',
        color: 'var(--text-muted)',
        marginTop: '3px',
        lineHeight: 1.35,
        wordBreak: 'break-word',
      }}>
        {sublabel}
      </div>
    )}
  </div>
);

export const ProfilePage = () => {
  const { user, updateProfile, isPlayer } = useAuth();
  const { addToast } = useToast();

  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(getUserAvatar(user));
  const [gender, setGender] = useState(user?.gender || 'MALE');

  // Sync state when user object loads or updates
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.username || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || user.phone || '');
      setBio(user.bio || '');
      setAvatar(getUserAvatar(user));
      setGender(user.gender || 'MALE');
    }
  }, [user]);

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Player state
  const [playerProfile, setPlayerProfile] = useState(null);
  const [allGamePlayers, setAllGamePlayers] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [gameInfoInputs, setGameInfoInputs] = useState({});
  const [savingInfoId, setSavingInfoId] = useState(null);
  const [editingGame, setEditingGame] = useState(null); // { gpId, gameName, form }
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showGiftsModal, setShowGiftsModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load player data if user is player
  useEffect(() => {
    if (!isPlayer || !user?.id) return;
    const loadPlayerData = async () => {
      setLoadingStats(true);
      try {
        const players = await api.getGamePlayersByUser(user.id);
        if (!players || players.length === 0) return;
        setAllGamePlayers(players);
        setPlayerProfile(players[0]);
        const inputs = {};
        players.forEach(p => {
          inputs[p.id] = {
            rank: p.rank || '',
            role: p.role || '',
            server: p.server || 'VN',
            price: String(p.pricePerHour || p.price || ''),
          };
        });
        setGameInfoInputs(inputs);

        const stats = await api.getPlayerStats(players[0].id);
        if (stats) setPlayerStats(stats);

        const revData = await api.getReviewsByPlayerId(players[0].id);
        setReviews(Array.isArray(revData) ? revData : []);

        try {
          const donateRes = await api.getDonateHistory();
          const gifts = (donateRes || []).filter(d => d.isReceive || (d.description && d.description.toLowerCase().includes('nhận quà')));
          setReceivedGifts(gifts);
        } catch (err) {
          console.warn('Load donate history error:', err.message);
        }
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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await updateProfile({ fullName, email, phone, phoneNumber: phone, bio, avatar, gender });
    addToast('Đã lưu thông tin hồ sơ thành công!', 'success');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      addToast('Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      addToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('Mật khẩu xác nhận không khớp với mật khẩu mới!', 'error');
      return;
    }
    if (oldPassword === newPassword) {
      addToast('Mật khẩu mới không được trùng với mật khẩu hiện tại!', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword(oldPassword, newPassword);
      addToast(res?.message || 'Đã đổi mật khẩu thành công!', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || 'Đổi mật khẩu thất bại!';
      addToast(msg, 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const openEditModal = (gp) => {
    const availableRanks = gp.game?.availableRanks || [];
    const availableRoles = gp.game?.availableRoles || [];
    const rankStr = gp.rank || '';
    const parts = rankStr.split(' - ');
    const rankMin = parts[0]?.trim() || availableRanks[0] || rankStr;
    const rankMax = parts[1]?.trim() || rankMin;
    const roles = (gp.role || '').split('/').map(r => r.trim()).filter(Boolean);
    const servers = (gp.server || 'VN').split('/').map(s => s.trim()).filter(Boolean);
    setEditingGame({
      gpId: gp.id,
      gameName: gp.game?.name || gp.gameName || 'Game',
      form: { rankMin, rankMax, roles, servers, pricePerHour: Number(gp.pricePerHour || 50000), availableRanks, availableRoles },
    });
  };

  const updateEditField = (field, value) => {
    setEditingGame(prev => prev ? { ...prev, form: { ...prev.form, [field]: value } } : null);
  };

  const handleSaveGameInfo = async () => {
    if (!editingGame) return;
    const { gpId, form } = editingGame;
    const { rankMin, rankMax, roles, servers, pricePerHour } = form;
    if (!rankMin.trim()) { addToast('Rank không được để trống!', 'error'); return; }
    if (!pricePerHour || pricePerHour < 10000) { addToast('Giá thuê không hợp lệ (tối thiểu 10.000đ)!', 'error'); return; }
    const rank = rankMin === rankMax ? rankMin : `${rankMin} - ${rankMax}`;
    const role = roles.length > 0 ? roles.join(' / ') : '';
    const server = servers.length > 0 ? servers.join(' / ') : 'VN';
    setSavingInfoId(gpId);
    try {
      await api.updatePlayerInfo(gpId, { rank, role, server, pricePerHour });
      setAllGamePlayers(prev => prev.map(p => p.id === gpId ? { ...p, rank, role, server, pricePerHour } : p));
      addToast('Cập nhật thành công!', 'success');
      setEditingGame(null);
    } catch (e) {
      addToast('Cập nhật thất bại: ' + (e.response?.data?.message || e.message), 'error');
    } finally {
      setSavingInfoId(null);
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

  // Tính Exp và Quà tặng: kết hợp dữ liệu stats từ backend và lịch sử quà receivedGifts
  const localGiftExp = receivedGifts.reduce((sum, g) => {
    const origCoin = Number(g.originalAmount || g.coin || 0);
    return sum + calculateExpFromCoin(origCoin, g.description);
  }, 0);
  const localGiftCoin = receivedGifts.reduce((sum, g) => {
    return sum + Number(g.originalAmount || g.coin || 0);
  }, 0);

  const giftCount = stats.giftCount && stats.giftCount > 0
    ? stats.giftCount
    : (stats.receivedGiftsCount && stats.receivedGiftsCount > 0 ? stats.receivedGiftsCount : receivedGifts.length);

  const playExp = stats.playExp !== undefined && stats.playExp > 0 ? stats.playExp : (totalHours * 600);
  const giftExp = (stats.giftExp && stats.giftExp > 0) ? stats.giftExp : localGiftExp;
  const giftCoin = (stats.giftCoin && stats.giftCoin > 0) ? stats.giftCoin : localGiftCoin;
  const exp = (stats.exp && stats.exp > 0) ? stats.exp : (playExp + giftExp);

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
              {/* Stats cards - 3 ô 1 hàng */}
              <style>{`
                .idol-stats-grid {
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  gap: 14px;
                  margin-bottom: 20px;
                }
                @media (max-width: 680px) {
                  .idol-stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                  }
                }
                @media (max-width: 440px) {
                  .idol-stats-grid {
                    grid-template-columns: 1fr;
                  }
                }
              `}</style>
              <div className="idol-stats-grid">
                <StatCard
                  icon={<Zap size={22} color="#a855f7" />}
                  label="Điểm EXP"
                  value={exp != null ? Number(exp).toLocaleString('vi-VN') : '0'}
                  suffix="Exp"
                  sublabel={`Chơi: ${playExp.toLocaleString('vi-VN')} · Quà: ${giftExp.toLocaleString('vi-VN')}`}
                  color="#a855f7"
                />
                <StatCard
                  icon={<Gift size={22} color="#ec4899" />}
                  label="Số quà đã nhận"
                  value={giftCount}
                  suffix="quà"
                  sublabel={giftCoin > 0 ? `Trị giá: ${Number(giftCoin).toLocaleString('vi-VN')} đ` : (receivedGifts.length > 0 ? `${receivedGifts.length} lượt tặng` : 'Từ người hâm mộ')}
                  color="#ec4899"
                  onClick={receivedGifts.length > 0 || giftCount > 0 ? () => setShowGiftsModal(true) : undefined}
                />
                <StatCard
                  icon={<Star size={22} fill="#f59e0b" color="#f59e0b" />}
                  label="Đánh giá trung bình"
                  value={rating ? rating.toFixed(1) : '—'}
                  suffix="/ 5"
                  sublabel={reviewCount > 0 ? `${reviewCount} lượt đánh giá` : 'Chưa có đánh giá'}
                  color="#f59e0b"
                />
                <StatCard
                  icon={<CheckCircle size={22} color="#22c55e" />}
                  label="Đơn hoàn thành"
                  value={completedOrders}
                  suffix="đơn"
                  sublabel="Đã hoàn tất"
                  color="#22c55e"
                />
                <StatCard
                  icon={<XCircle size={22} color="#ef4444" />}
                  label="Đơn đã hủy"
                  value={canceledOrders}
                  suffix="đơn"
                  sublabel={canceledOrders === 0 ? 'Tỷ lệ hủy 0%' : 'Đơn bị hủy/từ chối'}
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

              {/* Summary bars: Reviews & Gifts */}
              <div style={{ display: 'grid', gridTemplateColumns: giftCount > 0 ? 'repeat(auto-fit, minmax(260px, 1fr))' : '1fr', gap: '12px', marginBottom: '24px' }}>
                {/* Reviews summary */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '14px 18px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <MessageSquare size={20} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{reviewCount} lượt đánh giá</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#f59e0b' }}>{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
                        <span>{rating ? `${rating.toFixed(1)} / 5` : 'Chưa có đánh giá'}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px', borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => setShowReviewsModal(true)}>
                    <span>Xem chi tiết</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Gifts summary (hiển thị khi có quà) */}
                {giftCount > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.18)', borderRadius: '12px', padding: '14px 18px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Gift size={20} color="#ec4899" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{giftCount} quà tặng từ Fan</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          +{Number(giftExp || 0).toLocaleString('vi-VN')} Exp tích lũy {giftCoin > 0 ? `· ${Number(giftCoin).toLocaleString('vi-VN')} đ` : ''}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.82rem', gap: '6px', borderColor: '#ec4899', color: '#ec4899' }} onClick={() => setShowGiftsModal(true)}>
                      <span>Xem quà nhận</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Per-game cards: 2-column grid */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--primary)" />
                  Game Đã Đăng Ký ({allGamePlayers.length})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {allGamePlayers.map(gp => {
                    const gpStatus = (gp.status || '').toUpperCase();
                    const statusColor = gpStatus === 'AVAILABLE' ? '#22c55e' : gpStatus === 'PENDING' ? '#fbbf24' : gpStatus === 'HIRED' ? '#06b6d4' : '#ef4444';
                    const statusLabel = gpStatus === 'AVAILABLE' ? 'Hoạt động' : gpStatus === 'PENDING' ? 'Chờ duyệt' : gpStatus === 'HIRED' ? 'Đang thuê' : gpStatus === 'REJECTED' ? 'Từ chối' : gpStatus;
                    const gameName = gp.game?.name || gp.gameName || gp.primaryGame || 'Game';
                    const rank = gp.rank || '—';
                    const roles = (gp.role || '').split('/').map(r => r.trim()).filter(Boolean);
                    const servers = (gp.server || 'VN').split('/').map(s => s.trim()).filter(Boolean);
                    const price = Number(gp.pricePerHour || 0);
                    return (
                      <div key={gp.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Edit button */}
                        <button
                          onClick={() => openEditModal(gp)}
                          title="Cập nhật thông tin"
                          style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '5px 7px', cursor: 'pointer', color: '#a5b4fc', display: 'flex', alignItems: 'center', lineHeight: 1 }}
                        >
                          <Pencil size={13} />
                        </button>

                        {/* Game name + status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '32px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Gamepad2 size={16} color="var(--primary)" />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.3 }}>{gameName}</span>
                        </div>

                        <span style={{ alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 600, padding: '2px 9px', borderRadius: '20px', background: `${statusColor}18`, color: statusColor }}>
                          {statusLabel}
                        </span>

                        {/* Info rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Rank:</span>{' '}
                            <strong style={{ color: 'var(--secondary)' }}>{rank}</strong>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Vị trí:</span>{' '}
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>
                              {roles.length > 0 ? roles.map(r => (
                                <span key={r} style={{ padding: '1px 8px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 600 }}>{r}</span>
                              )) : <span style={{ fontStyle: 'italic' }}>Không có</span>}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Server:</span>{' '}
                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>
                              {servers.map(s => (
                                <span key={s} style={{ padding: '1px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 600 }}>{s}</span>
                              ))}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Coins size={13} color="var(--primary)" />
                          <span style={{ fontWeight: 800, color: 'var(--accent-pink)', fontSize: '1rem' }}>{price.toLocaleString('vi-VN')} đ</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>/ giờ</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={20} color="var(--secondary)" />
          <span>Đổi Mật Khẩu Bảo Mật</span>
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
          Để bảo vệ tài khoản, vui lòng đặt mật khẩu mới có ít nhất 6 ký tự và không chia sẻ cho người khác.
        </p>

        <div className="form-group" style={{ marginBottom: '18px' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>Mật Khẩu Hiện Tại *:</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showOldPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="Nhập mật khẩu hiện tại"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              style={{ paddingRight: '44px' }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: showOldPassword ? 'var(--primary)' : 'var(--text-muted)',
                padding: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s'
              }}
              title={showOldPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '18px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Mật Khẩu Mới * (Tối thiểu 6 ký tự):</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Nhập mật khẩu mới"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ paddingRight: '44px' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: showNewPassword ? 'var(--primary)' : 'var(--text-muted)',
                  padding: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s'
                }}
                title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Xác Nhận Mật Khẩu Mới *:</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ paddingRight: '44px' }}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: showConfirmPassword ? 'var(--primary)' : 'var(--text-muted)',
                  padding: '6px', display: 'flex', alignItems: 'center', transition: 'color 0.15s'
                }}
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button type="submit" className="btn btn-cyan" disabled={changingPassword} style={{ minWidth: '170px', gap: '8px' }}>
            <ShieldCheck size={16} />
            <span>{changingPassword ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</span>
          </button>
        </div>
      </form>

      {editingGame && createPortal(
        <EditGameModal
          isOpen={!!editingGame}
          onClose={() => setEditingGame(null)}
          gameName={editingGame.gameName}
          form={editingGame.form}
          onChange={updateEditField}
          onSave={handleSaveGameInfo}
          saving={savingInfoId === editingGame.gpId}
        />,
        document.body
      )}

      {createPortal(
        <ReviewsModal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          reviews={reviews}
          playerName={playerProfile?.username || user?.username || 'Idol'}
          rating={rating}
          reviewCount={reviewCount}
        />,
        document.body
      )}

      {createPortal(
        <ReceivedGiftsModal
          isOpen={showGiftsModal}
          onClose={() => setShowGiftsModal(false)}
          gifts={receivedGifts}
          playerName={playerProfile?.username || user?.username || 'Idol'}
          totalGifts={giftCount}
          giftExp={giftExp}
          giftCoin={giftCoin}
        />,
        document.body
      )}
    </div>
  );
};

export default ProfilePage;
