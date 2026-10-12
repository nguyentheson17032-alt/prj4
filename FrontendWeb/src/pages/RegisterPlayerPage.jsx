import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Gamepad2,
  Image,
  Mic,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  LogIn,
  Clock,
  Compass,
  Home
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiService';

export const RegisterPlayerPage = ({ onOpenAuth }) => {
  const { user, updateProfile, isAuthenticated, isAdmin, isPlayer, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Info, 2: Games & Skills, 3: Media & Voice, 4: Success
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  // Kiểm tra hồ sơ Idol hiện tại của user (mỗi user chỉ được đăng ký 1 lần)
  const [existingPlayer, setExistingPlayer] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Form Fields
  const [nickname, setNickname] = useState(user?.fullName || user?.username || '');
  const [gender, setGender] = useState(user?.gender || 'FEMALE');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || user?.phone || '');
  const [bio, setBio] = useState(user?.bio || 'Mình rất vui vẻ, nhiệt tình và thích leo rank cùng anh em!');
  const [rank, setRank] = useState('Cao Thủ');
  const [role, setRole] = useState('Xạ Thủ / AD');
  const [server, setServer] = useState('VN');
  const [pricePerHour, setPricePerHour] = useState(50000);
  const [voiceUrl, setVoiceUrl] = useState('https://actions.google.com/sounds/v1/water/rain_heavy.ogg');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Tự động đồng bộ số điện thoại và thông tin từ tài khoản cá nhân khi user tải xong
  useEffect(() => {
    if (user) {
      if (!nickname) setNickname(user.fullName || user.username || '');
      const userPhone = user.phoneNumber || user.phone || '';
      if (userPhone && (!phoneNumber || phoneNumber === '0987654321')) {
        setPhoneNumber(userPhone);
      }
      if (user.gender) setGender(user.gender);
      if (user.avatar) setAvatarUrl(user.avatar);
    }
  }, [user]);

  // Kiểm tra xem tài khoản này đã có hồ sơ Player chưa
  useEffect(() => {
    let isMounted = true;
    const checkUserPlayer = async () => {
      if (!user?.id) {
        setCheckingExisting(false);
        return;
      }
      try {
        const players = await api.getGamePlayersByUser(user.id);
        if (isMounted && Array.isArray(players) && players.length > 0) {
          setExistingPlayer(players[0]);
        }
      } catch (e) {
        console.warn('Lỗi khi kiểm tra hồ sơ player:', e);
      } finally {
        if (isMounted) setCheckingExisting(false);
      }
    };

    if (isAuthenticated && user?.id) {
      checkUserPlayer();
    } else if (!authLoading) {
      setCheckingExisting(false);
    }

    return () => { isMounted = false; };
  }, [user?.id, isAuthenticated, authLoading]);

  // Fetch games list
  useEffect(() => {
    const loadGames = async () => {
      try {
        const list = await api.getGames();
        if (Array.isArray(list) && list.length > 0) {
          setGames(list);
          setSelectedGameId(list[0].id);
          setSelectedGame(list[0]);
        } else {
          setGames([]);
          setSelectedGameId(null);
          setSelectedGame(null);
        }
      } catch (err) {
        console.warn('Could not fetch games list from API:', err);
        setGames([]);
        setSelectedGameId(null);
        setSelectedGame(null);
      }
    };
    loadGames();
  }, []);

  // Update game selection
  const handleGameChange = (gameId) => {
    const id = Number(gameId);
    setSelectedGameId(id);
    const found = games.find((g) => g.id === id);
    setSelectedGame(found || null);
    if (found?.availableRanks && found.availableRanks.length > 0) {
      setRank(found.availableRanks[0]);
    }
    if (found?.availableRoles && found.availableRoles.length > 0) {
      setRole(found.availableRoles[0]);
    }
  };

  const handleNextToStep2 = () => {
    if (!nickname.trim()) {
      addToast('Vui lòng nhập tên hiển thị / biệt danh Idol', 'warning');
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (!selectedGameId) {
      addToast('Chưa có game trong hệ thống. Admin cần thêm game trước.', 'error');
      return;
    }
    if (!rank.trim()) {
      addToast('Vui lòng chọn hoặc nhập mức rank', 'warning');
      return;
    }
    if (pricePerHour < 10000) {
      addToast('Giá thuê tối thiểu là 10.000 đ/giờ', 'warning');
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isPolicyAccepted) {
      addToast('Vui lòng tích đồng ý với Điều khoản & Chính sách PlayZone', 'warning');
      return;
    }

    // Chặn nếu tài khoản đã đăng ký Idol trước đó
    if (isPlayer || existingPlayer) {
      addToast('Tài khoản của bạn đã gửi hồ sơ đăng ký Idol rồi. Mỗi tài khoản chỉ được đăng ký 1 lần!', 'warning');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      userId: user?.id,
      gameId: selectedGameId || (games[0] ? games[0].id : 1),
      username: nickname.trim(),
      rank: rank.trim() || 'Cao Thủ',
      role: role ? role.trim() : 'ALL',
      server: server.trim() || 'VN',
      pricePerHour: Number(pricePerHour) || 50000,
      description: bio.trim()
    };

    try {
      // Call Backend API
      const res = await api.registerPlayer(payload);
      const created = res?.data || payload;
      setExistingPlayer(created);

      // Đồng bộ số điện thoại vào hồ sơ cá nhân nếu có thay đổi hoặc chưa có
      if (phoneNumber && phoneNumber !== (user?.phoneNumber || user?.phone)) {
        updateProfile({ phoneNumber, phone: phoneNumber });
      }

      setIsSubmitting(false);
      setStep(4);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      addToast('🎉 Gửi hồ sơ đăng ký Idol thành công! Hồ sơ đang chờ Quản Trị Viên xét duyệt.', 'success');
    } catch (err) {
      setIsSubmitting(false);
      const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Đăng ký thất bại';
      const isGameNotFound = typeof errMsg === 'string' && errMsg.toLowerCase().includes('game');
      if (isGameNotFound) {
        setErrorMessage('Game được chọn chưa tồn tại trong hệ thống. Admin cần thêm game trước khi bạn có thể đăng ký.');
      } else {
        setErrorMessage(typeof errMsg === 'string' ? errMsg : 'Có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại.');
      }
      addToast('Đăng ký thất bại: ' + (isGameNotFound ? 'Game chưa được thêm vào hệ thống.' : errMsg), 'error');

      // Nếu hệ thống báo tài khoản đã đăng ký rồi, đồng bộ lại hồ sơ ngay lập tức
      if (typeof errMsg === 'string' && (errMsg.includes('đăng ký') || errMsg.includes('Idol'))) {
        try {
          const players = await api.getGamePlayersByUser(user?.id);
          if (Array.isArray(players) && players.length > 0) {
            setExistingPlayer(players[0]);
          }
        } catch (_) {}
      }
    }
  };

  if (authLoading || checkingExisting) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '640px', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          Đang kiểm tra thông tin hồ sơ...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '640px', padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px 30px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(236, 72, 153, 0.15)',
            border: '2px solid var(--accent-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: 'var(--accent-pink)'
          }}>
            <Crown size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>
            Yêu Cầu Đăng Nhập
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Bạn cần đăng nhập hoặc tạo tài khoản PlayZone trước khi thực hiện đăng ký làm Idol / Duo Player.
          </p>
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
            onClick={() => onOpenAuth ? onOpenAuth('login') : navigate('/')}
          >
            <LogIn size={18} />
            <span>Đăng Nhập Ngay</span>
          </button>
        </div>
      </div>
    );
  }

  // TRƯỜNG HỢP 1: Tài khoản đã là Idol Duo chính thức (AVAILABLE / ROLE_PLAYER)
  if (isPlayer || existingPlayer?.status === 'AVAILABLE') {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '680px', padding: '60px 20px' }}>
        <div className="glass-panel" style={{ padding: '40px 30px', textAlign: 'center' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'rgba(236, 72, 153, 0.15)',
            border: '2px solid var(--accent-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: 'var(--accent-pink)',
            boxShadow: '0 0 24px rgba(236, 72, 153, 0.25)'
          }}>
            <Crown size={40} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            borderRadius: '20px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-green)',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={15} />
            <span>IDOL DUO CHÍNH THỨC</span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>
            Bạn Đã Là Idol Trên PlayZone!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '520px', margin: '0 auto 24px auto' }}>
            Tài khoản <strong>{user?.fullName || user?.username}</strong> của bạn đã là Idol Duo chính thức. Mỗi tài khoản chỉ cần đăng ký <strong>1 lần duy nhất</strong> và hồ sơ của bạn đã sẵn sàng nhận đơn thuê.
          </p>

          {existingPlayer && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              maxWidth: '460px',
              margin: '0 auto 28px auto',
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Biệt danh</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{existingPlayer.username || user?.username}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tựa game</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{existingPlayer.game?.name || existingPlayer.gameName || 'Duo Game'}</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border-color)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Giá thuê</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-green)' }}>
                  {(existingPlayer.pricePerHour || 50000).toLocaleString('vi-VN')} đ/h
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/explore')}>
              <Compass size={18} />
              <span>Xem Danh Sách Khám Phá</span>
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              <Home size={18} />
              <span>Về Trang Chủ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TRƯỜNG HỢP 2: Tài khoản đã nộp hồ sơ trước đó và đang chờ Quản Trị Viên xét duyệt
  if (existingPlayer && step !== 4) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '680px', padding: '60px 20px' }}>
        <div className="glass-panel" style={{ padding: '40px 30px', textAlign: 'center' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '2px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#f59e0b',
            boxShadow: '0 0 24px rgba(245, 158, 11, 0.25)'
          }}>
            <Clock size={40} />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 14px',
            borderRadius: '20px',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            <AlertCircle size={15} />
            <span>HỒ SƠ ĐANG CHỜ XÉT DUYỆT</span>
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>
            Hồ Sơ Đăng Ký Đang Được Xử Lý!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '520px', margin: '0 auto 24px auto' }}>
            Tài khoản <strong>{user?.fullName || user?.username}</strong> đã gửi hồ sơ đăng ký Idol Duo. Mỗi tài khoản chỉ được nộp hồ sơ <strong>1 lần duy nhất</strong>. Ban quản trị đang trong quá trình xét duyệt hồ sơ của bạn.
          </p>

          {/* Quy trình tiến độ */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            maxWidth: '540px',
            margin: '0 auto 28px auto',
            textAlign: 'left'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Trạng thái xét duyệt hiện tại
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: 'var(--accent-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <CheckCircle2 size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>1. Tiếp nhận hồ sơ</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Biệt danh: <strong>{existingPlayer.username || nickname}</strong> • Game: <strong>{existingPlayer.game?.name || existingPlayer.gameName || 'Game'}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Clock size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>2. Đang chờ xét duyệt (Dự kiến 15 - 30 phút)</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quản trị viên đang kiểm tra thông tin và hồ sơ</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.7 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Sparkles size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>3. Kích hoạt & Nhận đơn thuê</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Xuất hiện trên bảng Khám Phá sau khi hoàn tất xét duyệt</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/explore')}>
              <Compass size={18} />
              <span>Khám Phá PlayZone</span>
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              <Home size={18} />
              <span>Về Trang Chủ</span>
            </button>
          </div>

          {isAdmin && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)', display: 'inline-block' }}>
              <button
                className="btn btn-outline"
                onClick={() => navigate('/admin')}
                style={{ fontSize: '0.82rem', padding: '6px 14px', opacity: 0.8 }}
              >
                <ShieldCheck size={14} />
                <span>[Admin Test] Vào Trang Quản Trị Duyệt Hồ Sơ</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '780px', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="hero-tag" style={{ margin: '0 auto 12px auto' }}>
          <Crown size={16} color="#fbbf24" />
          <span>Kiếm Thu Nhập Từ Đam Mê Chơi Game</span>
        </div>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '8px' }}>
          Đăng Ký Trở Thành <span className="gradient-text">Idol & Duo Player</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Gia nhập cộng đồng hơn 5,000+ Idol, nhận thu nhập hấp dẫn từ 10.000.000đ - 30.000.000đ/tháng.
        </p>
      </div>

      {/* Step Progress Bar */}
      {step < 4 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          position: 'relative'
        }}>
          {[
            { num: 1, label: 'Thông tin cơ bản' },
            { num: 2, label: 'Game & Bảng giá' },
            { num: 3, label: 'Hình ảnh & Giọng nói' }
          ].map((s) => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                zIndex: 2,
                cursor: 'pointer'
              }}
              onClick={() => s.num < step && setStep(s.num)}
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: step === s.num
                  ? 'linear-gradient(135deg, var(--primary), #06b6d4)'
                  : step > s.num
                  ? 'var(--accent-green)'
                  : 'var(--bg-tertiary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem',
                border: '2px solid var(--border-color)',
                boxShadow: step === s.num ? '0 0 15px var(--primary-glow)' : 'none'
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: step >= s.num ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Form Card */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 800 }}>
              Bước 1: Thông Tin Cá Nhân
            </h3>

            <div className="form-group">
              <label className="form-label">Tên Hiển Thị / Biệt Danh Idol *:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Bé Miu Cute"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Giới Tính:</label>
                <select
                  className="form-control"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="FEMALE">🎀 Nữ</option>
                  <option value="MALE">🔥 Nam</option>
                  <option value="OTHER">✨ Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Số Điện Thoại Liên Hệ:</span>
                  {(user?.phoneNumber || user?.phone) && (
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                      ✓ Đã tự động điền từ hồ sơ
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="0912345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lời Giới Thiệu Bản Thân (Bio):</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Chia sẻ tính cách, phong cách chơi game, sở trường của bạn để thu hút người thuê..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={handleNextToStep2}>
                <span>Tiếp Tục</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 800 }}>
              Bước 2: Game Sở Trường & Bảng Giá
            </h3>

            {games.length === 0 ? (
              <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '20px', color: 'var(--accent-red)', fontSize: '0.9rem' }}>
                ⚠️ Hiện chưa có game nào trong hệ thống. Admin cần thêm game tại <strong>Trang Quản Trị → Danh Mục Game</strong> trước khi bạn có thể đăng ký.
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Tựa Game Đăng Ký Chính *:</label>
                <select
                  className="form-control"
                  value={selectedGameId || ''}
                  onChange={(e) => handleGameChange(e.target.value)}
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.category || 'Game'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Mức Rank / Cấp Độ Hiện Tại *:</label>
                {selectedGame?.availableRanks && selectedGame.availableRanks.length > 0 ? (
                  <select
                    className="form-control"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                  >
                    {selectedGame.availableRanks.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Cao Thủ 30 sao, Radiant..."
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Vị Trí / Sở Trường (Role):</label>
                {selectedGame?.availableRoles && selectedGame.availableRoles.length > 0 ? (
                  <select
                    className="form-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {selectedGame.availableRoles.map((ro) => (
                      <option key={ro} value={ro}>{ro}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Mid / Support / AD..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Server Khu Vực:</label>
                <select
                  className="form-control"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                >
                  <option value="VN">Việt Nam (VN)</option>
                  <option value="Asia">Châu Á (Asia)</option>
                  <option value="KR">Hàn Quốc (KR)</option>
                  <option value="NA">Bắc Mỹ (NA)</option>
                  <option value="EU">Châu Âu (EU)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Giá Thuê Đề Xuất (VNĐ / Giờ) *:</label>
                <input
                  type="number"
                  step="5000"
                  min="10000"
                  max="500000"
                  className="form-control"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(Number(e.target.value))}
                />
              </div>
            </div>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'block' }}>
              💡 <em>Mức giá khuyến nghị: 40.000 đ - 80.000 đ / giờ đối với Idol mới bắt đầu để thu hút nhiều đơn đầu tiên.</em>
            </span>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Quay lại
              </button>
              <button className="btn btn-primary" onClick={handleNextToStep3}>
                <span>Tiếp Tục</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 800 }}>
              Bước 3: Ảnh Đại Diện & Giọng Nói Mẫu
            </h3>

            <div className="form-group">
              <label className="form-label">Link Ảnh Đại Diện (Avatar Rõ Nét) *:</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Link Ghi Âm Giọng Nói Mẫu (Audio MP3/OGG):</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://..."
                value={voiceUrl}
                onChange={(e) => setVoiceUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                🎙️ <em>Player có giọng nói thu hút sẽ nhận được gấp 3 lần lượt thuê từ khách hàng!</em>
              </span>
            </div>

            <div style={{
              padding: '16px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <input
                type="checkbox"
                id="policyCheck"
                checked={isPolicyAccepted}
                onChange={(e) => setIsPolicyAccepted(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="policyCheck" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.5 }}>
                Tôi cam kết thông tin cung cấp là chính xác, tuân thủ <strong>Quy tắc ứng xử và Tiêu chuẩn cộng đồng PlayZone</strong>, không vi phạm pháp luật và không gian lận giao dịch.
              </label>
            </div>

            {errorMessage && (
              <div style={{ color: 'var(--accent-red)', fontSize: '0.88rem', marginBottom: '16px' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Quay lại
              </button>
              <button
                className="btn btn-primary"
                disabled={isSubmitting || !isPolicyAccepted}
                onClick={handleSubmit}
              >
                <ShieldCheck size={18} />
                <span>{isSubmitting ? 'Đang Đăng Ký...' : 'Hoàn Tất Đăng Ký Player'}</span>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              color: 'var(--accent-green)',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '10px' }}>
              Gửi Hồ Sơ Idol Thành Công!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '540px', margin: '0 auto 24px auto' }}>
              Chúc mừng <strong>{nickname}</strong>! Hồ sơ đăng ký trở thành Idol Duo của bạn đã được gửi thành công. Đội ngũ Quản Trị Viên sẽ xét duyệt hồ sơ trong thời gian sớm nhất.
            </p>

            {/* Tiến trình phê duyệt trực quan cho người dùng */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              maxWidth: '540px',
              margin: '0 auto 28px auto',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tiến trình xử lý hồ sơ
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: 'var(--accent-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>1. Tiếp nhận hồ sơ</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thông tin và hình ảnh đăng ký đã được lưu vào hệ thống</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Clock size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>2. Đang chờ xét duyệt (Dự kiến 15 - 30 phút)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quản trị viên sẽ kiểm tra nội dung giới thiệu, hình ảnh và âm thanh</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.7 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Sparkles size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>3. Kích hoạt & Nhận đơn thuê</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Xuất hiện trên bảng Khám Phá và sẵn sàng nhận đơn từ người thuê</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Các nút hành động chính cho người dùng */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/explore')}>
                <Compass size={18} />
                <span>Khám Phá PlayZone</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                <Home size={18} />
                <span>Về Trang Chủ</span>
              </button>
            </div>

            {/* Chỉ hiển thị cho Admin để tiện kiểm thử */}
            {isAdmin && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px dashed var(--border-color)', display: 'inline-block' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => navigate('/admin')}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', opacity: 0.8 }}
                >
                  <ShieldCheck size={14} />
                  <span>[Admin Test] Vào Trang Quản Trị Duyệt Hồ Sơ</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPlayerPage;
