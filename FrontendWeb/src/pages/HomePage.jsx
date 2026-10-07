import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Flame,
  Sparkles,
  ShieldCheck,
  Trophy,
  ArrowRight,
  Headphones,
  Gamepad2,
  Crown,
  HeartHandshake,
  Star,
  Users
} from 'lucide-react';
import PlayerCard from '../components/player/PlayerCard';
import api from '../api/apiService';
import '../styles/home.css';

export const HomePage = ({ onHirePlayer, onOpenDeposit }) => {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [playersData, gamesData, usersData] = await Promise.allSettled([
          api.getPlayers(),
          api.getGames(),
          api.getUsers()
        ]);
        setPlayers(playersData.status === 'fulfilled' ? playersData.value || [] : []);
        setGames(gamesData.status === 'fulfilled' ? gamesData.value || [] : []);
        setUsers(usersData.status === 'fulfilled' ? usersData.value || [] : []);
      } catch (e) {
        console.error('Error fetching homepage data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activePlayers = players.filter(p => p.status !== 'PENDING' && p.status !== 'BANNED' && p.adminStatus !== 'PENDING');

  const filteredPlayers = selectedCategory === 'ALL'
    ? activePlayers
    : activePlayers.filter(p => p.primaryGame?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                          p.games?.some(g => g.name.toLowerCase().includes(selectedCategory.toLowerCase())));

  const vipPlayers = activePlayers.filter(p => p.isVip);
  const hotPlayers = activePlayers.filter(p => p.isHot);

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="hero-banner" style={{
          backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.25) 0%, transparent 60%), linear-gradient(180deg, rgba(11,15,25,0.4) 0%, rgba(11,15,25,0.95) 100%)'
        }}>
          <div className="hero-content">
            <div className="hero-tag">
              <Sparkles size={16} />
              <span>Nền Tảng Thuê Duo Số 1 Việt Nam</span>
            </div>
            <h1 className="hero-title">
              Tìm Bạn Chơi Cùng & <br />
              <span className="gradient-text">Leo Rank Đỉnh Cao</span>
            </h1>
            <p className="hero-subtitle">
              Kết nối hơn 5,000+ Idol, Player chuyên nghiệp kỹ năng cao, giọng nói ngọt ngào, hỗ trợ mic Discord 24/7.
            </p>
            <div className="hero-actions">
              <Link to="/explore" className="btn btn-primary btn-lg">
                <Gamepad2 size={20} />
                <span>Khám Phá Player Ngay</span>
              </Link>
              <Link to="/register-player" className="btn btn-secondary btn-lg">
                <Crown size={18} color="#fbbf24" />
                <span>Đăng Ký Làm Duo</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Story Avatars Strip */}
      <div className="section-header" style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#ec4899" />
          <span>Khoảnh Khắc Đang Hoạt Động</span>
        </h3>
        <Link to="/moments" style={{ fontSize: '0.88rem', color: 'var(--primary)', fontWeight: 600 }}>
          Xem tất cả ›
        </Link>
      </div>

      <div className="stories-strip">
        {players.map((p) => (
          <div key={p.id} className="story-item" onClick={() => navigate(`/player/${p.id}`)}>
            <div className="story-ring">
              <img src={p.avatar} alt={p.fullName} className="story-avatar" />
            </div>
            <span className="story-name">{p.fullName.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* 3. Game Categories Navigation Pills */}
      <div className="category-pills">
        <button
          className={`category-pill ${selectedCategory === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('ALL')}
        >
          <span>🔥 Tất Cả Game</span>
        </button>
        {games.map((g) => (
          <button
            key={g.id}
            className={`category-pill ${selectedCategory === g.name ? 'active' : ''}`}
            onClick={() => setSelectedCategory(g.name)}
          >
            <span>{g.icon}</span>
            <span>{g.name}</span>
          </button>
        ))}
      </div>

      {/* 4. Hot VIP Idols Section */}
      <section style={{ marginBottom: '48px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Crown size={24} color="#fbbf24" />
              <span>Idol & Duo Nổi Bật Tuần Này</span>
            </h2>
            <div className="section-subtitle">Top game thủ được đánh giá 5 sao cao nhất và nhiều lượt thuê nhất</div>
          </div>
          <Link to="/explore" className="btn btn-outline btn-sm">
            <span>Xem thêm</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid-cards">
          {vipPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onHire={onHirePlayer}
            />
          ))}
        </div>
      </section>

      {/* 5. Recommended Players List */}
      <section style={{ marginBottom: '48px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Flame size={24} color="#ef4444" />
              <span>Đang Online Sẵn Sàng Chơi</span>
            </h2>
            <div className="section-subtitle">Nhận đơn ngay sau 30 giây, kết nối mic discord trực tiếp</div>
          </div>
        </div>

        <div className="grid-cards">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onHire={onHirePlayer}
            />
          ))}
        </div>
      </section>

      {/* 6. Leaderboards & Top Rankings */}
      <section style={{ marginBottom: '48px' }}>
        <div className="section-header">
          <div>
            <h2 className="section-title">
              <Trophy size={24} color="#f59e0b" />
              <span>Bảng Xếp Hạng Tháng</span>
            </h2>
            <div className="section-subtitle">Vinh danh các Player xuất sắc và Đại Gia Donate tích cực nhất</div>
          </div>
        </div>

        <div className="leaderboard-grid">
          {/* Top Players */}
          <div className="leaderboard-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crown size={20} color="#fbbf24" />
              <span>Top Player Yêu Thích</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {players.slice(0, 4).map((p, idx) => (
                <div key={p.id} className="leaderboard-item" onClick={() => navigate(`/player/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <div className={`rank-badge-num ${idx === 0 ? 'rank-top1' : idx === 1 ? 'rank-top2' : idx === 2 ? 'rank-top3' : 'rank-topother'}`}>
                    {idx + 1}
                  </div>
                  <img src={p.avatar} alt={p.fullName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{p.fullName}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.orderCount || 100}+ đơn • ⭐ {p.rating}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-pink)' }}>
                    {((p.orderCount || 100) * 1.5).toFixed(0)}k Exp
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Donators */}
          <div className="leaderboard-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={20} color="#ec4899" fill="#ec4899" />
              <span>Top Phú Hộ Donate</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.length > 0 ? (
                users
                  .slice()
                  .sort((a, b) => (Number(b.coin || b.walletBalance || b.balance || 0)) - (Number(a.coin || a.walletBalance || a.balance || 0)))
                  .slice(0, 4)
                  .map((u, idx) => {
                    const balanceVal = Number(u.coin || u.walletBalance || u.balance || 0);
                    const avatarUrl = u.avatar || u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.username || 'User')}&background=random`;
                    return (
                      <div key={u.id || idx} className="leaderboard-item">
                        <div className={`rank-badge-num ${idx === 0 ? 'rank-top1' : idx === 1 ? 'rank-top2' : idx === 2 ? 'rank-top3' : 'rank-topother'}`}>
                          {idx + 1}
                        </div>
                        <img src={avatarUrl} alt={u.fullName || u.username} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {u.fullName || u.username}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {u.roles?.includes('ROLE_ADMIN') ? 'Quản Trị Viên' : 'Thành Viên'}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                          {balanceVal.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    );
                  })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu người dùng nạp/donate
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Guarantees & Features */}
      <div className="guarantee-banner">
        <div className="guarantee-item">
          <div className="guarantee-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>Bảo Vệ Người Dùng 100%</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tiền chỉ chuyển cho player sau khi bạn bấm hoàn thành đơn hàng.</p>
          </div>
        </div>

        <div className="guarantee-item">
          <div className="guarantee-icon">
            <HeartHandshake size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>Hài Lòng Hoặc Hoàn Tiền</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Hỗ trợ đổi player hoặc hoàn 100% tiền nếu player có thái độ không tốt.</p>
          </div>
        </div>

        <div className="guarantee-item">
          <div className="guarantee-icon">
            <Headphones size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>Hỗ Trợ Nhanh 24/7</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Đội ngũ admin túc trực hỗ trợ giải quyết mọi thắc mắc trong 2 phút.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
