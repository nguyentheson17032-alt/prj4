import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Crown,
  ShieldCheck,
  Clock,
  CheckCircle2,
  MessageSquare,
  Gift,
  Gamepad2,
  Sparkles,
  Heart,
  Share2,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import AudioWave from '../components/common/AudioWave';
import api from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar } from '../utils/avatarUtils';

export const PlayerDetailPage = ({ onHirePlayer, onDonatePlayer }) => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [player, setPlayer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SERVICES'); // SERVICES, ALBUM, REVIEWS
  const [isFavorited, setIsFavorited] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const [pData, rData] = await Promise.all([
        api.getPlayerById(id),
        api.getReviewsByPlayerId(id)
      ]);
      const reviewList = Array.isArray(rData) ? rData : [];
      let finalRating = pData?.rating || 0;
      if (!finalRating && reviewList.length > 0) {
        const sum = reviewList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
        finalRating = Math.round((sum / reviewList.length) * 10) / 10;
      }
      const finalReviewCount = Math.max(pData?.reviewCount || 0, reviewList.length);
      if (pData) {
        // Fetch all game registrations for this user to build the full games list
        let allGames = pData.games;
        try {
          const allRecords = await api.getGamePlayersByUser(pData.userId);
          if (Array.isArray(allRecords) && allRecords.length > 0) {
            allGames = allRecords
              .filter(p => (p.status || '').toUpperCase() !== 'REJECTED')
              .map(p => ({
                name: p.game?.name || p.gameName || 'Game',
                rank: p.rank || 'Cao Thủ',
                role: p.role || 'Không có',
                price: Number(p.pricePerHour || 50000),
              }));
          }
        } catch (_) {}

        // Fetch moments of this player to build the full album
        let playerMoments = [];
        try {
          const targetUserId = pData.userId || id;
          playerMoments = await api.getMomentsByUser(targetUserId);
          if (!playerMoments || playerMoments.length === 0) {
            playerMoments = await api.getMomentsByPlayer(id);
          }
        } catch (_) {}

        const albumList = [];
        const seenUrls = new Set();

        // 1. Photos from player's posted moments
        if (Array.isArray(playerMoments)) {
          playerMoments.forEach(m => {
            if (Array.isArray(m.images)) {
              m.images.forEach(img => {
                if (img && !seenUrls.has(img)) {
                  seenUrls.add(img);
                  albumList.push({
                    url: img,
                    gameName: m.gameName || pData.primaryGame || 'Gaming',
                    createdAt: m.createdAt,
                    caption: m.content
                  });
                }
              });
            }
          });
        }

        // 2. Existing player album if any
        if (Array.isArray(pData.album)) {
          pData.album.forEach(item => {
            const url = typeof item === 'string' ? item : item?.url;
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              albumList.push(typeof item === 'string' ? { url, gameName: pData.primaryGame || 'PlayZone' } : item);
            }
          });
        }

        const finalPlayer = {
          ...pData,
          rating: finalRating,
          reviewCount: finalReviewCount,
          games: allGames,
          album: albumList
        };
        setPlayer(finalPlayer);
        setSelectedGame(allGames?.[0] || null);
      }
      setReviews(reviewList);
      setLoading(false);
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
        Đang tải thông tin player...
      </div>
    );
  }

  if (!player) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2>Không tìm thấy thông tin Player</h2>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/explore')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép liên kết trang player vào bộ nhớ tạm!', 'success');
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    addToast(isFavorited ? 'Đã bỏ yêu thích player' : 'Đã thêm player vào danh sách yêu thích ❤️', 'success');
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="btn btn-outline btn-sm"
        style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        <ArrowLeft size={16} />
        <span>Quay lại</span>
      </button>

      {/* 1. Header Banner & Profile Info */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-md)'
      }}>
        {/* Cover Image */}
        <div style={{ position: 'relative', height: '240px' }}>
          <img
            src={player.coverImage || player.avatar}
            alt="Cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(11,15,25,0.95) 100%)'
          }} />

          {/* Action buttons Top Right */}
          <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '10px', zIndex: 3 }}>
            <button
              className="nav-icon-btn"
              onClick={handleToggleFavorite}
              title="Yêu thích"
              style={{ color: isFavorited ? 'var(--accent-pink)' : 'inherit' }}
            >
              <Heart size={18} fill={isFavorited ? 'var(--accent-pink)' : 'transparent'} />
            </button>
            <button className="nav-icon-btn" onClick={handleShare} title="Chia sẻ">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Profile Content Bar */}
        <div style={{ padding: '0 32px 28px 32px', position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: '-50px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            {/* Avatar & Name */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={player.avatar}
                  alt={player.fullName}
                  style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid var(--bg-card)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{player.fullName}</h1>
                  {player.isVip && (
                    <span className="badge badge-vip">
                      <Crown size={14} /> VIP IDOL
                    </span>
                  )}
                  <StatusBadge status={player.status} />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>@{player.username}</span>
                  <span>•</span>
                  <span>Server: {player.server || 'VN'}</span>
                  <span>•</span>
                  <span>Đơn hoàn tất: <strong style={{ color: 'var(--accent-green)' }}>{player.orderCount || 0} đơn</strong></span>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontWeight: 700 }}>
                    <Star size={16} fill="#f59e0b" color="#f59e0b" />
                    <span>{player.rating > 0 ? Number(player.rating).toFixed(1) : (reviews.length > 0 ? '5.0' : 'Chưa có')}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({reviews.length || player.reviewCount || 0} đánh giá)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const targetPartnerId = player.userId || player.id;
                  const query = new URLSearchParams({
                    partnerId: targetPartnerId,
                    player: player.id,
                    name: player.fullName || player.name || player.username || 'Idol PlayZone',
                    username: player.username || '',
                    avatar: player.avatar || '',
                    role: player.primaryGame || 'Idol Duo',
                    isPlayer: 'true'
                  });
                  navigate(`/chat?${query.toString()}`);
                }}
              >
                <MessageSquare size={18} />
                <span>Nhắn Tin</span>
              </button>
              <button
                className="btn btn-accent"
                onClick={() => onDonatePlayer(player)}
              >
                <Gift size={18} />
                <span>Tặng Quà</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onHirePlayer(player)}
              >
                <Gamepad2 size={18} />
                <span>Thuê Ngay</span>
              </button>
            </div>
          </div>

          {/* Voice Preview Bar if available */}
          {player.voiceIntroUrl && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '12px 18px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              width: 'fit-content'
            }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Giọng nói giới thiệu:</span>
              <AudioWave playerId={player.id} audioUrl={player.voiceIntroUrl} duration={player.voiceDuration || '0:15'} />
            </div>
          )}
        </div>
      </div>

      {/* 2. Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px' }}>
        {/* Left Column: Tabs & Details */}
        <div>
          {/* Tabs header */}
          <div style={{
            display: 'flex',
            gap: '12px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '24px'
          }}>
            <button
              className={`nav-link ${activeTab === 'SERVICES' ? 'active' : ''}`}
              style={{ fontSize: '1rem', padding: '10px 18px' }}
              onClick={() => setActiveTab('SERVICES')}
            >
              🎮 Dịch Vụ & Kỹ Năng
            </button>
            <button
              className={`nav-link ${activeTab === 'ALBUM' ? 'active' : ''}`}
              style={{ fontSize: '1rem', padding: '10px 18px' }}
              onClick={() => setActiveTab('ALBUM')}
            >
              📸 Album Ảnh ({player.album?.length || 0})
            </button>
            <button
              className={`nav-link ${activeTab === 'REVIEWS' ? 'active' : ''}`}
              style={{ fontSize: '1rem', padding: '10px 18px' }}
              onClick={() => setActiveTab('REVIEWS')}
            >
              ⭐ Đánh Giá ({reviews.length || player.reviewCount || 0})
            </button>
          </div>

          {/* Tab 1: Services */}
          {activeTab === 'SERVICES' && (
            <div className="animate-fade-in">
              {/* Bio Card */}
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>Giới Thiệu Bản Thân</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-line' }}>
                  {player.bio}
                </p>

                {/* Tags */}
                {player.tags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                    {player.tags.map((t, idx) => (
                      <span key={idx} className="badge badge-primary">✨ {t}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Games List */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Các Game Nhận Duo & Bảng Giá</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {player.games?.map((game, idx) => {
                    const isSelected = selectedGame?.name === game.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedGame(game)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px',
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isSelected ? '#6366f1' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '10px',
                            background: isSelected ? 'rgba(99,102,241,0.3)' : 'rgba(139, 92, 246, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected ? '#a5b4fc' : 'var(--primary)'
                          }}>
                            <Gamepad2 size={22} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{game.name}</div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              Rank: <strong style={{ color: 'var(--secondary)' }}>{game.rank}</strong> • Vị trí: {game.role}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: 'var(--accent-pink)', fontSize: '1.1rem' }}>
                              {game.price.toLocaleString('vi-VN')} đ
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 1 giờ</div>
                          </div>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={(e) => { e.stopPropagation(); setSelectedGame(game); onHirePlayer({ ...player, pricePerHour: game.price, primaryGame: game.name }); }}
                          >
                            Thuê Game Này
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Album */}
          {activeTab === 'ALBUM' && (
            <div className="animate-fade-in">
              {/* Header inside Tab */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0', color: '#fff' }}>
                    📸 Album Khoảnh Khắc &amp; Highlight
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Tất cả hình ảnh highlight, chiến tích leo rank Idol đã đăng tải trong "Khoảnh Khắc"
                  </p>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {player.album?.length || 0} Ảnh
                </span>
              </div>

              {(!player.album || player.album.length === 0) ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                }}>
                  <ImageIcon size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
                  <h4 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '8px' }}>Chưa Có Ảnh Nào Trong Album</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
                    Idol chưa chia sẻ hình ảnh khoảnh khắc nào. Khi Idol đăng bài viết mới kèm ảnh từ mục "Khoảnh Khắc", tất cả ảnh sẽ tự động hiển thị trong Album này!
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '16px'
                }}>
                  {player.album.map((item, idx) => {
                    const imgUrl = typeof item === 'string' ? item : item.url;
                    const gameName = item.gameName || player.primaryGame || 'Gaming';
                    return (
                      <div
                        key={idx}
                        style={{
                          height: '240px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)',
                          position: 'relative',
                          background: '#090a10',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                          transition: 'all 0.25s ease'
                        }}
                        onClick={() => setPreviewImage(imgUrl)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.boxShadow = '0 10px 25px rgba(99, 102, 241, 0.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Album ${idx}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {/* Game tag overlay */}
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(4px)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          color: '#e2e8f0',
                          fontWeight: 600,
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}>
                          🎮 {gameName}
                        </div>
                        {/* Hover zoom pill */}
                        <div style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          background: 'rgba(99, 102, 241, 0.85)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          color: '#fff',
                          fontWeight: 700
                        }}>
                          Phóng to
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'REVIEWS' && (
            <div className="animate-fade-in">
              {/* Rating Summary */}
              <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: player.rating > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                    {player.rating > 0 ? Number(player.rating).toFixed(1) : '0.0'}
                  </div>
                  <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', margin: '6px 0' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={16} fill={s <= Math.round(player.rating || 0) && player.rating > 0 ? "#f59e0b" : "none"} color="#f59e0b" />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {reviews.length || player.reviewCount || 0} lượt đánh giá
                  </div>
                </div>

                <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '28px' }}>
                  {reviews.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Idol chưa có lượt đánh giá nào từ khách hàng thuê.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = reviews.filter(r => Math.round(r.rating || 5) === star).length;
                        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                        return (
                          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                            <span style={{ minWidth: '35px' }}>{star} ⭐</span>
                            <div style={{ flex: 1, height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-amber)', borderRadius: '4px' }} />
                            </div>
                            <span style={{ minWidth: '35px', textAlign: 'right', color: 'var(--text-muted)' }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Reviews List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map((rev) => {
                  const revName = rev.user?.name || rev.reviewerName || 'Khách Hàng';
                  const revAvatar = rev.user?.avatar || rev.reviewerAvatar || getUserAvatar({ username: revName });
                  return (
                    <div key={rev.id} className="glass-panel" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={revAvatar} alt={revName} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{revName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {rev.createdAt} • Đã thuê {rev.hours || 1}h ({rev.gameName || player.primaryGame || 'Game Duo'})
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[...Array(Math.round(rev.rating || 5))].map((_, i) => (
                            <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                          ))}
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        "{rev.comment}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Quick Booking Box */}
        <div>
          <div style={{
            position: 'sticky',
            top: '100px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            border: '1px solid var(--border-glow)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mức giá thuê</span>
              {selectedGame && (
                <div style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 600, marginTop: '4px' }}>
                  {selectedGame.name}
                </div>
              )}
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-pink)', marginTop: '2px' }}>
                {(selectedGame?.price || player.pricePerHour || 50000).toLocaleString('vi-VN')} đ
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>trên 1 giờ trải nghiệm</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="var(--accent-green)" />
                <span>Bật mic giao tiếp qua Discord / In-game</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="var(--accent-green)" />
                <span>Phản hồi trong vòng {player.responseSpeed || '< 1 phút'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="var(--accent-green)" />
                <span>Cam kết không toxic, đúng giờ 100%</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => onHirePlayer(selectedGame ? { ...player, pricePerHour: selectedGame.price, primaryGame: selectedGame.name } : player)}
              >
                <Gamepad2 size={20} />
                <span>Thuê Ngay Bây Giờ</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => {
                  const targetPartnerId = player.userId || player.id;
                  const query = new URLSearchParams({
                    partnerId: targetPartnerId,
                    player: player.id,
                    name: player.fullName || player.name || player.username || 'Idol PlayZone',
                    username: player.username || '',
                    avatar: player.avatar || '',
                    role: player.primaryGame || 'Idol Duo',
                    isPlayer: 'true'
                  });
                  navigate(`/chat?${query.toString()}`);
                }}
              >
                <MessageSquare size={18} />
                <span>Trò Chuyện Trước Khi Thuê</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox image preview modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)} style={{ backdropFilter: 'blur(8px)', zIndex: 99999 }}>
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#fff',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100000
            }}
          >
            ✕
          </button>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetailPage;
