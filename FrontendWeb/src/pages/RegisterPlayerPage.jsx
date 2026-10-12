import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Gamepad2,
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

const initGameForm = (game) => ({
  gameId: game.id,
  gameName: game.name,
  rankMin: game.availableRanks?.[0] || '',
  rankMax: game.availableRanks?.[0] || '',
  roles: game.availableRoles?.length > 0 ? [game.availableRoles[0]] : [],
  servers: ['VN'],
  pricePerHour: 50000,
  availableRanks: game.availableRanks || [],
  availableRoles: game.availableRoles || [],
});

export const RegisterPlayerPage = ({ onOpenAuth }) => {
  const { user, updateProfile, isAuthenticated, isAdmin, isPlayer, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // 1: Info, 2: Chọn game, 3: Form từng game, 4: Media, 5: Thành công
  const [step, setStep] = useState(1);
  const [games, setGames] = useState([]);

  const [existingPlayers, setExistingPlayers] = useState([]);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Step 1
  const [nickname, setNickname] = useState(user?.fullName || user?.username || '');
  const [gender, setGender] = useState(user?.gender || 'FEMALE');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || user?.phone || '');
  const [bio, setBio] = useState(user?.bio || 'Mình rất vui vẻ, nhiệt tình và thích leo rank cùng anh em!');

  // Step 2
  const [selectedGames, setSelectedGames] = useState([]);

  // Step 3
  const [gameFormData, setGameFormData] = useState([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  // Step 4
  const [voiceUrl, setVoiceUrl] = useState('https://actions.google.com/sounds/v1/water/rain_heavy.ogg');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
  const [isPolicyAccepted, setIsPolicyAccepted] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successCount, setSuccessCount] = useState(0);
  const [succeededForms, setSucceededForms] = useState([]);

  useEffect(() => {
    if (user) {
      if (!nickname) setNickname(user.fullName || user.username || '');
      const userPhone = user.phoneNumber || user.phone || '';
      if (userPhone && (!phoneNumber || phoneNumber === '0987654321')) setPhoneNumber(userPhone);
      if (user.gender) setGender(user.gender);
      if (user.avatar) setAvatarUrl(user.avatar);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const checkUserPlayer = async () => {
      if (!user?.id) { setCheckingExisting(false); return; }
      try {
        const players = await api.getGamePlayersByUser(user.id);
        if (isMounted && Array.isArray(players)) setExistingPlayers(players);
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

  useEffect(() => {
    const loadGames = async () => {
      try {
        const list = await api.getGames();
        setGames(Array.isArray(list) ? list : []);
      } catch (err) {
        console.warn('Could not fetch games list from API:', err);
        setGames([]);
      }
    };
    loadGames();
  }, []);

  const existingGameIds = new Set(existingPlayers.map(p => p.game?.id || p.gameId));

  const toggleGameSelection = (game) => {
    if (existingGameIds.has(game.id)) return;
    setSelectedGames(prev => {
      const isSelected = prev.some(g => g.id === game.id);
      if (isSelected) return prev.filter(g => g.id !== game.id);
      if (prev.length >= 10) {
        addToast('Bạn chỉ có thể chọn tối đa 10 game', 'warning');
        return prev;
      }
      return [...prev, game];
    });
  };

  const handleNextToStep2 = () => {
    if (!nickname.trim()) {
      addToast('Vui lòng nhập tên hiển thị / biệt danh Idol', 'warning');
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (selectedGames.length === 0) {
      addToast('Vui lòng chọn ít nhất 1 game để đăng ký', 'warning');
      return;
    }
    setGameFormData(selectedGames.map(g => initGameForm(g)));
    setCurrentGameIndex(0);
    setStep(3);
  };

  const updateCurrentForm = (field, value) => {
    setGameFormData(prev => prev.map((item, idx) =>
      idx === currentGameIndex ? { ...item, [field]: value } : item
    ));
  };

  const handleNextGame = () => {
    const form = gameFormData[currentGameIndex];
    if (!form.rankMin.trim()) {
      addToast('Vui lòng chọn hoặc nhập mức rank', 'warning');
      return;
    }
    if (form.pricePerHour < 10000) {
      addToast('Giá thuê tối thiểu là 10.000 đ/giờ', 'warning');
      return;
    }
    if (currentGameIndex < gameFormData.length - 1) {
      setCurrentGameIndex(prev => prev + 1);
    } else {
      setStep(4);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isPolicyAccepted) {
      addToast('Vui lòng tích đồng ý với Điều khoản & Chính sách PlayZone', 'warning');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    let count = 0;
    let lastError = null;
    const saved = [];

    for (const form of gameFormData) {
      const payload = {
        userId: user?.id,
        gameId: form.gameId,
        username: nickname.trim(),
        rank: (() => {
          const rMin = form.rankMin.trim();
          const rMax = form.rankMax.trim();
          if (!rMin) return 'Cao Thủ';
          if (!rMax || rMin === rMax) return rMin;
          return `${rMin} - ${rMax}`;
        })(),
        role: form.roles.length > 0 ? form.roles.join(' / ') : 'Không có',
        server: form.servers.length > 0 ? form.servers.join(' / ') : 'VN',
        pricePerHour: Number(form.pricePerHour) || 50000,
        description: bio.trim(),
      };
      try {
        await api.registerPlayer(payload);
        count++;
        saved.push(form);
      } catch (err) {
        const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Đăng ký thất bại';
        const errStr = typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg);
        console.error('[RegisterPlayer] payload:', payload, 'error:', err.response?.status, errMsg);
        lastError = errStr;
      }
    }

    if (phoneNumber && phoneNumber !== (user?.phoneNumber || user?.phone)) {
      updateProfile({ phoneNumber, phone: phoneNumber });
    }

    setIsSubmitting(false);
    setSuccessCount(count);
    setSucceededForms(saved);

    if (count > 0) {
      try {
        const players = await api.getGamePlayersByUser(user?.id);
        if (Array.isArray(players)) setExistingPlayers(players);
      } catch (_) {}

      setStep(5);
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      if (count === gameFormData.length) {
        addToast(`🎉 Đăng ký ${count} game thành công! Hồ sơ đang chờ Quản Trị Viên xét duyệt.`, 'success');
      } else {
        addToast(`✅ Đăng ký thành công ${count}/${gameFormData.length} game. Một số game bị lỗi.`, 'warning');
        setErrorMessage(lastError || '');
      }
    } else {
      setErrorMessage(lastError || 'Có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại.');
      addToast('Đăng ký thất bại: ' + (lastError || 'Lỗi không xác định'), 'error');
    }
  };

  if (authLoading || checkingExisting) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '640px', padding: '100px 20px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Đang kiểm tra thông tin hồ sơ...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container animate-fade-in" style={{ maxWidth: '640px', padding: '60px 20px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '40px 30px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.15)', border: '2px solid var(--accent-pink)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--accent-pink)' }}>
            <Crown size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>Yêu Cầu Đăng Nhập</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Bạn cần đăng nhập hoặc tạo tài khoản PlayZone trước khi thực hiện đăng ký làm Idol / Duo Player.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={() => onOpenAuth ? onOpenAuth('login') : navigate('/')}>
            <LogIn size={18} />
            <span>Đăng Nhập Ngay</span>
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = [
    { num: 1, label: 'Thông tin cơ bản' },
    { num: 2, label: 'Chọn Game' },
    { num: 3, label: 'Chi tiết game' },
    { num: 4, label: 'Hình ảnh & Giọng nói' },
  ];

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
      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', position: 'relative' }}>
          {stepLabels.map((s) => (
            <div
              key={s.num}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, cursor: s.num < step ? 'pointer' : 'default' }}
              onClick={() => {
                if (s.num < step) {
                  if (s.num < 3) setCurrentGameIndex(0);
                  setStep(s.num);
                }
              }}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: step === s.num
                  ? 'linear-gradient(135deg, var(--primary), #06b6d4)'
                  : step > s.num ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.9rem', border: '2px solid var(--border-color)',
                boxShadow: step === s.num ? '0 0 15px var(--primary-glow)' : 'none'
              }}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: step >= s.num ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Form Card */}
      <div className="glass-panel" style={{ padding: '32px' }}>

        {/* ── BƯỚC 1: THÔNG TIN CÁ NHÂN ── */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 800 }}>Bước 1: Thông Tin Cá Nhân</h3>

            <div className="form-group">
              <label className="form-label">Tên Hiển Thị / Biệt Danh Idol *:</label>
              <input type="text" className="form-control" placeholder="Ví dụ: Bé Miu Cute" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Giới Tính:</label>
                <select className="form-control" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="FEMALE">🎀 Nữ</option>
                  <option value="MALE">🔥 Nam</option>
                  <option value="OTHER">✨ Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Số Điện Thoại Liên Hệ:</span>
                  {(user?.phoneNumber || user?.phone) && (
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>✓ Đã tự động điền từ hồ sơ</span>
                  )}
                </label>
                <input type="tel" className="form-control" placeholder="0912345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Lời Giới Thiệu Bản Thân (Bio):</label>
              <textarea className="form-control" rows="4" placeholder="Chia sẻ tính cách, phong cách chơi game, sở trường của bạn..." value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-primary" onClick={handleNextToStep2}>
                <span>Tiếp Tục</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── BƯỚC 2: CHỌN GAME ── */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '6px', fontWeight: 800 }}>Bước 2: Danh Sách Game Đăng Ký</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '20px' }}>
              Chọn các game bạn muốn nhận thuê (tối đa 10 game). Bạn sẽ điền thông tin chi tiết cho từng game ở bước tiếp theo.
            </p>

            {existingPlayers.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem', color: '#a5b4fc' }}>
                Bạn đã đăng ký {existingPlayers.length} game trước đó. Các game đó được đánh dấu bên dưới và không thể chọn lại.
              </div>
            )}

            {games.length === 0 ? (
              <div style={{ padding: '20px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--accent-red)', fontSize: '0.9rem' }}>
                ⚠️ Hiện chưa có game nào trong hệ thống. Admin cần thêm game tại <strong>Trang Quản Trị → Danh Mục Game</strong>.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {games.map((game) => {
                  const alreadyRegistered = existingGameIds.has(game.id);
                  const isSelected = selectedGames.some(g => g.id === game.id);
                  return (
                    <div
                      key={game.id}
                      onClick={() => toggleGameSelection(game)}
                      style={{
                        position: 'relative',
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${alreadyRegistered ? 'rgba(16,185,129,0.4)' : isSelected ? '#6366f1' : 'var(--border-color)'}`,
                        background: alreadyRegistered
                          ? 'rgba(16,185,129,0.06)'
                          : isSelected
                          ? 'rgba(99,102,241,0.12)'
                          : 'var(--bg-secondary)',
                        cursor: alreadyRegistered ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                        opacity: alreadyRegistered ? 0.75 : 1,
                      }}
                    >
                      {/* Cover image */}
                      {game.coverImage && (
                        <img
                          src={game.coverImage}
                          alt={game.name}
                          style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}

                      {/* Checkmark or "already registered" badge */}
                      <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                        {alreadyRegistered ? (
                          <div style={{ background: 'rgba(16,185,129,0.9)', borderRadius: '12px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
                            Đã đăng ký
                          </div>
                        ) : isSelected ? (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={14} color="#fff" />
                          </div>
                        ) : (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid var(--border-color)', background: 'var(--bg-tertiary)' }} />
                        )}
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: isSelected ? '#a5b4fc' : 'var(--text-primary)', paddingRight: '28px' }}>
                        {game.name}
                      </div>
                      {game.category && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{game.category}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedGames.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Đã chọn <strong style={{ color: '#a5b4fc' }}>{selectedGames.length}</strong> game:{' '}
                {selectedGames.map(g => g.name).join(', ')}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Quay lại</button>
              <button className="btn btn-primary" onClick={handleNextToStep3}>
                <span>Tiếp Tục</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── BƯỚC 3: FORM TỪNG GAME ── */}
        {step === 3 && gameFormData.length > 0 && (() => {
          const form = gameFormData[currentGameIndex];
          const game = selectedGames[currentGameIndex];
          const isLast = currentGameIndex === gameFormData.length - 1;

          return (
            <div className="animate-fade-in">
              {/* Game progress indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Game {currentGameIndex + 1}/{gameFormData.length}: <span style={{ color: '#a5b4fc' }}>{form.gameName}</span>
                </h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {gameFormData.map((_, idx) => (
                    <div key={idx} style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: idx < currentGameIndex ? 'var(--accent-green)' : idx === currentGameIndex ? '#6366f1' : 'var(--bg-tertiary)',
                      border: `1px solid ${idx <= currentGameIndex ? 'transparent' : 'var(--border-color)'}`,
                    }} />
                  ))}
                </div>
              </div>

              {/* Rank range */}
              {form.availableRanks.length > 0 ? (
                <div className="form-group">
                  <label className="form-label">Chấp Nhận Rank Từ - Đến *:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
                    <select
                      className="form-control"
                      value={form.rankMin}
                      onChange={(e) => {
                        const newMin = e.target.value;
                        const minIdx = form.availableRanks.indexOf(newMin);
                        const maxIdx = form.availableRanks.indexOf(form.rankMax);
                        updateCurrentForm('rankMin', newMin);
                        if (maxIdx < minIdx) updateCurrentForm('rankMax', newMin);
                      }}
                    >
                      {form.availableRanks.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>→</span>
                    <select
                      className="form-control"
                      value={form.rankMax}
                      onChange={(e) => updateCurrentForm('rankMax', e.target.value)}
                    >
                      {form.availableRanks.slice(form.availableRanks.indexOf(form.rankMin)).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {form.rankMin === form.rankMax ? `Hiển thị: ${form.rankMin}` : `Hiển thị: ${form.rankMin} - ${form.rankMax}`}
                  </span>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Mức Rank / Cấp Độ *:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Cao Thủ 30 sao, Radiant..."
                    value={form.rankMin}
                    onChange={(e) => { updateCurrentForm('rankMin', e.target.value); updateCurrentForm('rankMax', e.target.value); }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Role checkboxes */}
                <div className="form-group">
                  <label className="form-label">Vị Trí / Role:</label>
                  {form.availableRoles.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      {form.availableRoles.map((ro) => {
                        const checked = form.roles.includes(ro);
                        return (
                          <label key={ro} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', background: checked ? 'rgba(99,102,241,0.2)' : 'var(--bg-secondary)', border: `1px solid ${checked ? '#6366f1' : 'var(--border-color)'}`, color: checked ? '#a5b4fc' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: checked ? 600 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
                            <input type="checkbox" checked={checked} onChange={() => updateCurrentForm('roles', checked ? form.roles.filter(r => r !== ro) : [...form.roles, ro])} style={{ display: 'none' }} />
                            {ro}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <input type="text" className="form-control" value="Không có" readOnly style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                  )}
                </div>

                {/* Server checkboxes */}
                <div className="form-group">
                  <label className="form-label">Server Khu Vực:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    {[
                      { value: 'VN', label: 'Việt Nam' },
                      { value: 'Asia', label: 'Châu Á' },
                      { value: 'KR', label: 'Hàn Quốc' },
                      { value: 'NA', label: 'Bắc Mỹ' },
                      { value: 'EU', label: 'Châu Âu' },
                    ].map(({ value, label }) => {
                      const checked = form.servers.includes(value);
                      return (
                        <label key={value} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', background: checked ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)', border: `1px solid ${checked ? '#10b981' : 'var(--border-color)'}`, color: checked ? '#6ee7b7' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: checked ? 600 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
                          <input type="checkbox" checked={checked} onChange={() => updateCurrentForm('servers', checked ? form.servers.filter(s => s !== value) : [...form.servers, value])} style={{ display: 'none' }} />
                          {label} ({value})
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Giá Thuê Đề Xuất (VNĐ / Giờ) *:</label>
                <input type="number" step="5000" min="10000" max="500000" className="form-control" value={form.pricePerHour} onChange={(e) => updateCurrentForm('pricePerHour', Number(e.target.value))} />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'block' }}>
                💡 <em>Mức giá khuyến nghị: 40.000 đ - 80.000 đ / giờ đối với Idol mới bắt đầu.</em>
              </span>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button className="btn btn-secondary" onClick={() => {
                  if (currentGameIndex > 0) setCurrentGameIndex(prev => prev - 1);
                  else setStep(2);
                }}>
                  Quay lại
                </button>
                <button className="btn btn-primary" onClick={handleNextGame}>
                  <span>{isLast ? 'Tiếp Tục' : `Game tiếp theo →`}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── BƯỚC 4: HÌNH ẢNH & GIỌNG NÓI ── */}
        {step === 4 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', fontWeight: 800 }}>Bước 4: Ảnh Đại Diện & Giọng Nói Mẫu</h3>

            <div className="form-group">
              <label className="form-label">Link Ảnh Đại Diện (Avatar Rõ Nét) *:</label>
              <input type="url" className="form-control" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Link Ghi Âm Giọng Nói Mẫu (Audio MP3/OGG):</label>
              <input type="url" className="form-control" placeholder="https://..." value={voiceUrl} onChange={(e) => setVoiceUrl(e.target.value)} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                🎙️ <em>Player có giọng nói thu hút sẽ nhận được gấp 3 lần lượt thuê từ khách hàng!</em>
              </span>
            </div>

            <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <input type="checkbox" id="policyCheck" checked={isPolicyAccepted} onChange={(e) => setIsPolicyAccepted(e.target.checked)} style={{ marginTop: '3px', cursor: 'pointer' }} />
              <label htmlFor="policyCheck" style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.5 }}>
                Tôi cam kết thông tin cung cấp là chính xác, tuân thủ <strong>Quy tắc ứng xử và Tiêu chuẩn cộng đồng PlayZone</strong>, không vi phạm pháp luật và không gian lận giao dịch.
              </label>
            </div>

            {errorMessage && (
              <div style={{ color: 'var(--accent-red)', fontSize: '0.88rem', marginBottom: '16px' }}>⚠️ {errorMessage}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => { setCurrentGameIndex(gameFormData.length - 1); setStep(3); }}>
                Quay lại
              </button>
              <button className="btn btn-primary" disabled={isSubmitting || !isPolicyAccepted} onClick={handleSubmit}>
                <ShieldCheck size={18} />
                <span>{isSubmitting ? 'Đang Đăng Ký...' : `Hoàn Tất Đăng Ký ${gameFormData.length} Game`}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── BƯỚC 5: THÀNH CÔNG ── */}
        {step === 5 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '2px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--accent-green)', boxShadow: '0 0 24px rgba(16, 185, 129, 0.25)' }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '10px' }}>Gửi Hồ Sơ Idol Thành Công!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '540px', margin: '0 auto 16px auto' }}>
              Chúc mừng <strong>{nickname}</strong>! Đã đăng ký thành công <strong style={{ color: '#a5b4fc' }}>{successCount}/{gameFormData.length} game</strong>.
              {successCount < gameFormData.length && <span style={{ color: '#f59e0b' }}> {gameFormData.length - successCount} game bị lỗi (có thể đã đăng ký trước đó).</span>}
              {' '}Đội ngũ Quản Trị Viên sẽ xét duyệt hồ sơ trong thời gian sớm nhất.
            </p>

            {/* Danh sách game đã đăng ký thành công */}
            {succeededForms.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 20px', maxWidth: '460px', margin: '0 auto 20px auto', textAlign: 'left' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Game đã đăng ký thành công</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {succeededForms.map((form) => (
                    <div key={form.gameId} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
                      <CheckCircle2 size={15} color="var(--accent-green)" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{form.gameName}</span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span style={{ color: 'var(--text-muted)' }}>{form.rankMin === form.rankMax ? form.rankMin : `${form.rankMin} - ${form.rankMax}`}</span>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600, marginLeft: 'auto' }}>
                        {Number(form.pricePerHour).toLocaleString('vi-VN')}đ/h
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '20px', maxWidth: '540px', margin: '0 auto 28px auto', textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến trình xử lý hồ sơ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CheckCircle2 size={16} /></div>
                  <div><div style={{ fontSize: '0.9rem', fontWeight: 600 }}>1. Tiếp nhận hồ sơ</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Thông tin và hình ảnh đăng ký đã được lưu vào hệ thống</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Clock size={16} /></div>
                  <div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f59e0b' }}>2. Đang chờ xét duyệt (Dự kiến 15 - 30 phút)</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Quản trị viên sẽ kiểm tra nội dung giới thiệu và hình ảnh</div></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.7 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={16} /></div>
                  <div><div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>3. Kích hoạt & Nhận đơn thuê</div><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Xuất hiện trên bảng Khám Phá và sẵn sàng nhận đơn từ người thuê</div></div>
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
                <button className="btn btn-outline" onClick={() => navigate('/admin')} style={{ fontSize: '0.82rem', padding: '6px 14px', opacity: 0.8 }}>
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
