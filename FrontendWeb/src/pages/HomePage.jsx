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
  const [leaderboard, setLeaderboard] = useState({ topPlayers: [], topDonators: [] });
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [playersData, gamesData, usersData, lbData] = await Promise.allSettled([
          api.getPlayers(),
          api.getGames(),
          api.getUsers(),
          api.getLeaderboard()
        ]);
        setPlayers(playersData.status === 'fulfilled' ? playersData.value || [] : []);
        setGames(gamesData.status === 'fulfilled' ? gamesData.value || [] : []);
        setUsers(usersData.status === 'fulfilled' ? usersData.value || [] : []);
        if (lbData.status === 'fulfilled' && lbData.value) {
          setLeaderboard({
            topPlayers: Array.isArray(lbData.value.topPlayers) ? lbData.value.topPlayers : [],
            topDonators: Array.isArray(lbData.value.topDonators) ? lbData.value.topDonators : []
          });
        }
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

  const vipList = activePlayers.filter(p => p.isVip);

  // Sắp xếp Idol & Duo nổi bật: Ưu tiên VIP, rating cao nhất (5 sao trước), nhiều lượt thuê nhất
  const sortedFeaturedPlayers = [...activePlayers].sort((a, b) => {
    if (b.isVip !== a.isVip) return (b.isVip ? 1 : 0) - (a.isVip ? 1 : 0);
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    const ordersB = b.orderCount || b.totalGames || 0;
    const ordersA = a.orderCount || a.totalGames || 0;
    if (ordersB !== ordersA) return ordersB - ordersA;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });

  const categoryFeatured = selectedCategory === 'ALL'
    ? sortedFeaturedPlayers
    : sortedFeaturedPlayers.filter(p =>
        p.primaryGame?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        p.games?.some(g => g.name.toLowerCase().includes(selectedCategory.toLowerCase()))
      );

  const vipPlayers = (categoryFeatured.length > 0 ? categoryFeatured : sortedFeaturedPlayers).slice(0, 4);
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
          {vipPlayers.length > 0 ? (
            vipPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onHire={onHirePlayer}
              />
            ))
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              padding: '36px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg, 16px)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              Chưa có Idol / Duo nổi bật nào
            </div>
          )}
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
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                onHire={onHirePlayer}
              />
            ))
          ) : (
            <div style={{
              gridColumn: '1 / -1',
              padding: '36px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg, 16px)',
              border: '1px dashed var(--border-color)',
              color: 'var(--text-muted)'
            }}>
              Không tìm thấy người chơi nào trong danh mục này
            </div>
          )}
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
              {(() => {
                const list = leaderboard.topPlayers.length > 0
                  ? leaderboard.topPlayers
                  : activePlayers
                      .slice()
                      .sort((a, b) => {
                        const hoursA = a.totalHours || a.hoursHired || a.orderCount || 0;
                        const hoursB = b.totalHours || b.hoursHired || b.orderCount || 0;
                        return ((hoursB * 600) + (b.rating || 0)) - ((hoursA * 600) + (a.rating || 0));
                      });

                if (list.length === 0) {
                  return (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                      Chưa có player nào
                    </div>
                  );
                }

                return list.slice(0, 4).map((p, idx) => {
                  const realOrders = p.orderCount || 0;
                  const realHours = p.totalHours !== undefined ? p.totalHours : (p.hoursHired || realOrders);
                  const totalExp = Number(p.exp !== undefined ? p.exp : (realHours * 600));
                  const expLabel = totalExp >= 1000 ? `${(totalExp / 1000).toFixed(1)}k Exp` : `${totalExp} Exp`;

                  const matchedPlayer = players.find(ap =>
                    (ap.id && String(ap.id) === String(p.id)) ||
                    (ap.userId && p.userId && String(ap.userId) === String(p.userId)) ||
                    (ap.username && p.username && ap.username.toLowerCase() === p.username.toLowerCase()) ||
                    (ap.fullName && p.fullName && ap.fullName.toLowerCase() === p.fullName.toLowerCase())
                  );
                  const revCount = Number(
                    (p.reviewCount !== undefined && p.reviewCount !== null)
                      ? p.reviewCount
                      : (matchedPlayer?.reviewCount ?? matchedPlayer?.totalReviews ?? p.ratingCount ?? p.totalReviews ?? 0)
                  );
                  const numRating = Number(
                    revCount > 0
                      ? (p.rating || matchedPlayer?.rating || 5.0)
                      : 0
                  );
                  const hasReview = revCount > 0 && numRating > 0;

                  return (
                    <div key={p.id || idx} className="leaderboard-item" onClick={() => navigate(`/player/${p.id}`)} style={{ cursor: 'pointer' }}>
                      <div className={`rank-badge-num ${idx === 0 ? 'rank-top1' : idx === 1 ? 'rank-top2' : idx === 2 ? 'rank-top3' : 'rank-topother'}`}>
                        {idx + 1}
                      </div>
                      <img src={p.avatar} alt={p.fullName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.fullName || p.username}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {realHours > 0 ? `${realHours}h chơi • ` : ''}{realOrders} đơn • {hasReview ? `⭐ ${numRating.toFixed(1)} (${revCount})` : '⭐ Chưa có (0)'}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-pink)' }}>
                        {expLabel}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Top Donators */}
          <div className="leaderboard-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={20} color="#ec4899" fill="#ec4899" />
              <span>Top Phú Hộ Donate</span>
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(() => {
                const rawList = leaderboard.topDonators.length > 0
                  ? leaderboard.topDonators
                  : users
                      .slice()
                      .sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));

                // Ưu tiên hiển thị những phú hộ thực sự đã ủng hộ donate hoặc thuê player
                const withSpending = rawList.filter(u => Number(u.totalSpent || 0) > 0);
                const list = withSpending.length > 0 ? withSpending : rawList;

                if (list.length === 0 || (withSpending.length === 0 && Number(list[0]?.totalSpent || 0) === 0)) {
                  return (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      Chưa có dữ liệu đóng góp donate / thuê player
                    </div>
                  );
                }

                return list.slice(0, 4).map((u, idx) => {
                  const spentVal = Number(u.totalSpent || 0);
                  const avatarUrl = u.avatar || u.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || u.username || 'User')}&background=random`;
                  const roleLabel = (u.roles?.includes('ROLE_ADMIN') || u.role === 'ADMIN') ? 'Quản Trị Viên' : 'Thành Viên';

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
                          {roleLabel}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                        {spentVal.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  );
                });
              })()}
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
