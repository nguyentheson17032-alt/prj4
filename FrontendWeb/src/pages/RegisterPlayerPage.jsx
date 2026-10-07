import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const RegisterPlayerPage = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Info, 2: Games & Skills, 3: Media & Voice, 4: Success
  const [nickname, setNickname] = useState(user?.fullName || '');
  const [bio, setBio] = useState('Mình rất vui vẻ, nhiệt tình và thích leo rank cùng anh em!');
  const [gender, setGender] = useState('FEMALE');
  const [mainGame, setMainGame] = useState('Liên Quân Mobile');
  const [rank, setRank] = useState('Cao Thủ');
  const [pricePerHour, setPricePerHour] = useState(50000);
  const [voiceUrl, setVoiceUrl] = useState('https://actions.google.com/sounds/v1/water/rain_heavy.ogg');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setStep(4);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 }
      });
      addToast('Hồ sơ đăng ký Player của bạn đã được gửi xét duyệt thành công!', 'success');
    }, 1200);
  };

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
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Bước 1: Thông Tin Cá Nhân</h3>
            
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

            <div className="form-group">
              <label className="form-label">Giới Tính:</label>
              <select
                className="form-control"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="FEMALE">🎀 Nữ</option>
                <option value="MALE">🔥 Nam</option>
              </select>
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
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                <span>Tiếp Tục</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Bước 2: Game Sở Trường & Bảng Giá</h3>

            <div className="form-group">
              <label className="form-label">Tựa Game Chính:</label>
              <select
                className="form-control"
                value={mainGame}
                onChange={(e) => setMainGame(e.target.value)}
              >
                <option value="Liên Quân Mobile">Liên Quân Mobile</option>
                <option value="Liên Minh Huyền Thoại">Liên Minh Huyền Thoại (LOL)</option>
                <option value="Valorant">Valorant</option>
                <option value="PUBG Mobile & PC">PUBG Mobile & PC</option>
                <option value="Đấu Trường Chân Lý">Đấu Trường Chân Lý (DTCL)</option>
                <option value="Genshin Impact">Genshin Impact</option>
                <option value="Tâm Sự & Hát Hò">Tâm Sự & Hát Hò</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mức Rank / Cấp Độ Hiện Tại:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Cao Thủ 30 sao, Radiant, Kim Cương..."
                value={rank}
                onChange={(e) => setRank(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Giá Thuê Đề Xuất (VNĐ / 1 Giờ):</label>
              <input
                type="number"
                step="5000"
                min="20000"
                max="300000"
                className="form-control"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(Number(e.target.value))}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Mức giá khuyến nghị: 40.000 đ - 80.000 đ / giờ đối với thành viên mới.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Quay lại
              </button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                <span>Tiếp Tục</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Bước 3: Ảnh Đại Diện & Giọng Nói Mẫu</h3>

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
              <label className="form-label">Link Ghi Âm Giới Thiệu Giọng Nói (MP3/OGG):</label>
              <input
                type="url"
                className="form-control"
                placeholder="Dán link audio mẫu của bạn..."
                value={voiceUrl}
                onChange={(e) => setVoiceUrl(e.target.value)}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Player có file giọng nói thu hút sẽ nhận được gấp 3 lần lượt thuê!
              </span>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              ✓ Khi hoàn tất đăng ký, hồ sơ sẽ được admin phê duyệt tự động trong 5 - 15 phút.
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Quay lại
              </button>
              <button
                className="btn btn-primary"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                <ShieldCheck size={18} />
                <span>{isSubmitting ? 'Đang Nộp Hồ Sơ...' : 'Nộp Hồ Sơ Xét Duyệt'}</span>
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
              Nộp Hồ Sơ Thành Công!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
              Chúc mừng <strong>{nickname}</strong>! Hồ sơ đăng ký Idol Duo của bạn đã được tiếp nhận. Đội ngũ admin sẽ xem xét và kích hoạt trạng thái nhận đơn cho bạn sớm nhất.
            </p>

            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Về Trang Chủ PlayZone
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPlayerPage;
