import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, Gamepad2, Sparkles, RefreshCw } from 'lucide-react';
import PlayerCard from '../components/player/PlayerCard';
import api from '../api/apiService';

export const ExplorePage = ({ onHirePlayer }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedGame, setSelectedGame] = useState(searchParams.get('game') || 'ALL');
  const [gender, setGender] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('RATING'); // RATING, PRICE_ASC, PRICE_DESC, POPULAR
  const [priceMax, setPriceMax] = useState(300000);

  useEffect(() => {
    const queryParam = searchParams.get('q');
    const gameParam = searchParams.get('game');
    if (queryParam) setQuery(queryParam);
    if (gameParam) setSelectedGame(gameParam);
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pData, gData] = await Promise.all([
          api.getPlayers(),
          api.getGames()
        ]);
        setPlayers(Array.isArray(pData) ? pData : []);
        setGames(Array.isArray(gData) ? gData : []);
      } catch (err) {
        console.error('Error fetching explore data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and Sort logic
  const filteredPlayers = players
    .filter((p) => {
      // Exclude pending and banned players
      if (p.status === 'PENDING' || p.status === 'BANNED' || p.adminStatus === 'PENDING') return false;

      // Query
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchName = (p.fullName || p.name || p.username || '').toLowerCase().includes(q);
        const matchGame = (p.primaryGame || '').toLowerCase().includes(q) || p.games?.some(g => (g.name || '').toLowerCase().includes(q));
        const matchBio = (p.bio || '').toLowerCase().includes(q);
        const matchRank = (p.rank || '').toLowerCase().includes(q);
        if (!matchName && !matchGame && !matchBio && !matchRank) return false;
      }
      // Game
      if (selectedGame !== 'ALL') {
        const sg = selectedGame.toLowerCase();
        const matchGame = (p.primaryGame || '').toLowerCase().includes(sg) ||
                          p.games?.some(g => (g.name || '').toLowerCase().includes(sg));
        if (!matchGame) return false;
      }
      // Gender
      if (gender !== 'ALL') {
        const pGender = (p.gender || 'FEMALE').toUpperCase();
        if (pGender !== gender.toUpperCase()) return false;
      }
      // Status
      if (status === 'ONLINE') {
        const isOnline = p.status === 'ONLINE' || p.status === 'AVAILABLE' || p.status === 'ACTIVE' || !p.status;
        if (!isOnline) return false;
      }
      // Price
      const playerPrice = Number(p.pricePerHour || p.price || 50000);
      if (playerPrice > priceMax) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'RATING') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'PRICE_ASC') return (a.pricePerHour || 0) - (b.pricePerHour || 0);
      if (sortBy === 'PRICE_DESC') return (b.pricePerHour || 0) - (a.pricePerHour || 0);
      if (sortBy === 'POPULAR') return (b.orderCount || b.reviewCount || 0) - (a.orderCount || a.reviewCount || 0);
      return 0;
    });

  const handleResetFilters = () => {
    setQuery('');
    setSelectedGame('ALL');
    setGender('ALL');
    setStatus('ALL');
    setSortBy('RATING');
    setPriceMax(300000);
    setSearchParams({});
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>
          Khám Phá <span className="gradient-text">Idol & Duo Player</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Tìm kiếm và chọn lọc theo Game, Kỹ năng, Giới tính, Giọng nói và Mức giá phù hợp.
        </p>
      </div>

      {/* Filter Control Bar */}
      <div style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center'
        }}>
          {/* Keyword Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Tìm theo tên, bio..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Game Selector */}
          <div>
            <select
              className="form-control"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
            >
              <option value="ALL">🎮 Tất Cả Các Game</option>
              {games.map((g) => (
                <option key={g.id} value={g.name}>{g.icon} {g.name}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <select
              className="form-control"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="ALL">🚻 Giới Tính: Tất Cả</option>
              <option value="FEMALE">🎀 Nữ (Idol Xinh)</option>
              <option value="MALE">🔥 Nam (Boy One Champ)</option>
            </select>
          </div>

          {/* Online Status */}
          <div>
            <select
              className="form-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">🟢 Trạng Thái: Tất Cả</option>
              <option value="ONLINE">⚡ Đang Online Sẵn Sàng</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              className="form-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="RATING">⭐ Đánh Giá Cao Nhất</option>
              <option value="POPULAR">🔥 Lượt Thuê Nhiều Nhất</option>
              <option value="PRICE_ASC">💰 Giá: Thấp Đến Cao</option>
              <option value="PRICE_DESC">💎 Giá: Cao Đến Thấp</option>
            </select>
          </div>
        </div>

        {/* Second Row: Price Slider & Reset */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Mức giá tối đa:</span>
            <input
              type="range"
              min="30000"
              max="200000"
              step="10000"
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              style={{ width: '140px', accentColor: 'var(--primary)' }}
            />
            <span style={{ fontWeight: 800, color: 'var(--accent-pink)', fontSize: '0.92rem' }}>
              ≤ {priceMax.toLocaleString('vi-VN')} đ/h
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Tìm thấy <strong style={{ color: 'var(--text-primary)' }}>{filteredPlayers.length}</strong> player phù hợp
            </span>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleResetFilters}
              title="Đặt lại bộ lọc"
            >
              <RefreshCw size={14} />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải danh sách player...
        </div>
      ) : filteredPlayers.length > 0 ? (
        <div className="grid-cards">
          {filteredPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onHire={onHirePlayer}
            />
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <Gamepad2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Không Tìm Thấy Player Nào Phù Hợp</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Hãy thử tìm với từ khóa khác hoặc điều chỉnh lại bộ lọc giá và thể loại game.
          </p>
          <button className="btn btn-primary" onClick={handleResetFilters}>
            Xóa Toàn Bộ Bộ Lọc
          </button>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
