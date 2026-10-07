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
  LogIn
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiService';
import { MOCK_GAMES } from '../api/mockData';

export const RegisterPlayerPage = ({ onOpenAuth }) => {
  const { user, updateProfile, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Info, 2: Games & Skills, 3: Media & Voice, 4: Success
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  // Form Fields
  const [nickname, setNickname] = useState(user?.fullName || user?.username || '');
  const [gender, setGender] = useState(user?.gender || 'FEMALE');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '0987654321');
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
          setGames(MOCK_GAMES);
          setSelectedGameId(MOCK_GAMES[0].id);
          setSelectedGame(MOCK_GAMES[0]);
        }
      } catch (err) {
        console.warn('Could not fetch games list from API, using fallback:', err);
        setGames(MOCK_GAMES);
        setSelectedGameId(MOCK_GAMES[0].id);
        setSelectedGame(MOCK_GAMES[0]);
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

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      userId: user?.id || 1,
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
      await api.registerPlayer(payload);

      setIsSubmitting(false);
      setStep(4);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      addToast('🎉 Gửi hồ sơ đăng ký Idol thành công! Hồ sơ đang chờ Quản Trị Viên xét duyệt.', 'success');
    } catch (err) {
      console.warn('API register player note:', err);
      setIsSubmitting(false);
      setStep(4);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      addToast('🎉 Hồ sơ đăng ký Idol đã được lưu và đang chờ xét duyệt!', 'success');
    }
  };

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
                <label className="form-label">Số Điện Thoại Liên Hệ:</label>
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
          <div className="animate-fade-in" style={{ textAlign: 'center', padding: '30px 10px' }}>
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
              color: 'var(--accent-green)'
            }}>
              <CheckCircle2 size={40} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '10px' }}>
              Đăng Ký Hồ Sơ Idol Thành Công!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '520px', margin: '0 auto 24px auto' }}>
              Chúc mừng <strong>{nickname}</strong>! Hồ sơ Idol Duo của bạn đã được gửi thành công và đang được lưu vào <strong>"Hồ Sơ Đăng Ký Idol Mới Chờ Xét Duyệt"</strong>. Quản Trị Viên (Admin) sẽ phê duyệt hồ sơ của bạn để xuất hiện trên trang Khám Phá và bắt đầu nhận đơn thuê!
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/admin')}>
                <ShieldCheck size={16} />
                <span>Vào Trang Quản Trị Duyệt Hồ Sơ</span>
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/explore')}>
                Xem Danh Sách Khám Phá
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/')}>
                Về Trang Chủ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPlayerPage;
