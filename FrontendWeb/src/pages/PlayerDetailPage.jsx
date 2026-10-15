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
  ChevronLeft,
  ArrowLeft,
  AlertTriangle,
  Image as ImageIcon,
  X,
  UserCheck,
  Pencil
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import AudioWave from '../components/common/AudioWave';
import api from '../api/apiService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserAvatar } from '../utils/avatarUtils';
import '../styles/player.css';

export const PlayerDetailPage = ({ onHirePlayer, onDonatePlayer }) => {
  const { user, isAuthenticated } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [player, setPlayer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SERVICES'); // SERVICES, ALBUM, REVIEWS
  const [isFavorited, setIsFavorited] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);

  const previewItem = (player?.album && previewIndex !== null) ? player.album[previewIndex] : null;

  // Determine if the current authenticated user is the owner of this player profile
  const isOwner = Boolean(
    isAuthenticated &&
    user?.id != null &&
    player &&
    (
      player.userId != null
        ? String(player.userId) === String(user.id)
        : (player.user?.id != null
            ? String(player.user.id) === String(user.id)
            : String(player.id) === String(user.id))
    )
  );

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

        // Helper to check like status
        const myId = user?.id ? Number(user.id) : null;
        const myName = (user?.fullName || user?.username || '').trim().toLowerCase();
        const checkIsLiked = (m) => {
          if (!myId && !myName) return Boolean(m.isLiked);
          if (myId && Array.isArray(m.likedByUserIds) && m.likedByUserIds.length > 0) {
            if (m.likedByUserIds.map(Number).includes(myId)) return true;
          }
          if (myName && Array.isArray(m.likedByUsers) && m.likedByUsers.length > 0) {
            if (m.likedByUsers.some(u => (u || '').trim().toLowerCase() === myName)) return true;
          }
          return Boolean(m.isLiked);
        };

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
                    createdAt: m.createdAt || 'Vừa xong',
                    caption: m.content || '',
                    likeCount: Number(m.likeCount || 0),
                    likedByUsers: Array.isArray(m.likedByUsers) ? m.likedByUsers : [],
                    likedByUserIds: Array.isArray(m.likedByUserIds) ? m.likedByUserIds : [],
                    isLiked: checkIsLiked(m),
                    momentId: m.id,
                    author: m.author || {
                      name: pData.fullName || pData.name || pData.username || 'Idol PlayZone',
                      avatar: pData.avatar || getUserAvatar({ username: pData.name }),
                      isVip: true
                    }
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
              const matchedMoment = playerMoments.find(m => Array.isArray(m.images) && m.images.includes(url));
              if (matchedMoment) {
                albumList.push({
                  url,
                  gameName: matchedMoment.gameName || pData.primaryGame || 'Gaming',
                  createdAt: matchedMoment.createdAt || 'Vừa xong',
                  caption: matchedMoment.content || '',
                  likeCount: Number(matchedMoment.likeCount || 0),
                  likedByUsers: Array.isArray(matchedMoment.likedByUsers) ? matchedMoment.likedByUsers : [],
                  likedByUserIds: Array.isArray(matchedMoment.likedByUserIds) ? matchedMoment.likedByUserIds : [],
                  isLiked: checkIsLiked(matchedMoment),
                  momentId: matchedMoment.id,
                  author: matchedMoment.author || {
                    name: pData.fullName || pData.name || pData.username || 'Idol PlayZone',
                    avatar: pData.avatar || getUserAvatar({ username: pData.name }),
                    isVip: true
                  }
                });
              } else {
                albumList.push(typeof item === 'string' ? {
                  url,
                  gameName: pData.primaryGame || 'PlayZone',
                  createdAt: 'Ảnh hồ sơ',
                  caption: '',
                  likeCount: 0,
                  likedByUsers: [],
                  likedByUserIds: [],
                  isLiked: false,
                  momentId: null,
                  author: {
                    name: pData.fullName || pData.name || pData.username || 'Idol PlayZone',
                    avatar: pData.avatar || getUserAvatar({ username: pData.name }),
                    isVip: true
                  }
                } : {
                  url: item.url,
                  gameName: item.gameName || pData.primaryGame || 'PlayZone',
                  createdAt: item.createdAt || 'Ảnh hồ sơ',
                  caption: item.caption || item.content || '',
                  likeCount: Number(item.likeCount || 0),
                  likedByUsers: Array.isArray(item.likedByUsers) ? item.likedByUsers : [],
                  likedByUserIds: Array.isArray(item.likedByUserIds) ? item.likedByUserIds : [],
                  isLiked: Boolean(item.isLiked),
                  momentId: item.momentId || item.id || null,
                  author: item.author || {
                    name: pData.fullName || pData.name || pData.username || 'Idol PlayZone',
                    avatar: pData.avatar || getUserAvatar({ username: pData.name }),
                    isVip: true
                  }
                });
              }
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
  }, [id, user?.id]);

  // Keyboard navigation for album photo modal (Must be before any early returns to obey React hook rules!)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (previewIndex === null) return;
      if (e.key === 'Escape') setPreviewIndex(null);
      if (e.key === 'ArrowRight' && player?.album?.length > 1) {
        setPreviewIndex(prev => (prev + 1) % player.album.length);
      }
      if (e.key === 'ArrowLeft' && player?.album?.length > 1) {
        setPreviewIndex(prev => (prev - 1 + player.album.length) % player.album.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, player?.album]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Đã sao chép liên kết trang player vào bộ nhớ tạm!', 'success');
  };

  const handleToggleFavorite = () => {
    setIsFavorited(!isFavorited);
    addToast(isFavorited ? 'Đã bỏ yêu thích player' : 'Đã thêm player vào danh sách yêu thích ❤️', 'success');
  };

  const handleToggleLikePhoto = async (item) => {
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để thích khoảnh khắc!', 'warning');
      return;
    }

    const myId = user?.id ? Number(user.id) : null;
    const myName = user?.fullName || user?.username || 'Bạn';
    const nextLiked = !item.isLiked;
    const newCount = nextLiked ? (item.likeCount || 0) + 1 : Math.max(0, (item.likeCount || 0) - 1);

    const prevLikedUsers = Array.isArray(item.likedByUsers) ? item.likedByUsers : [];
    const prevLikedUserIds = Array.isArray(item.likedByUserIds) ? item.likedByUserIds.map(Number) : [];

    const newLikedUsers = nextLiked
      ? [myName, ...prevLikedUsers.filter(u => (u || '').trim().toLowerCase() !== myName.trim().toLowerCase())]
      : prevLikedUsers.filter(u => (u || '').trim().toLowerCase() !== myName.trim().toLowerCase());

    const newLikedUserIds = nextLiked
      ? (myId ? [myId, ...prevLikedUserIds.filter(uid => uid !== myId)] : prevLikedUserIds)
      : (myId ? prevLikedUserIds.filter(uid => uid !== myId) : prevLikedUserIds);

    // Optimistically update player.album so modal and grid reflect immediately
    setPlayer(prev => {
      if (!prev) return prev;
      const newAlbum = prev.album.map((a, idx) => {
        if (idx === previewIndex || a.url === item.url || (item.momentId && a.momentId === item.momentId)) {
          return {
            ...a,
            isLiked: nextLiked,
            likeCount: newCount,
            likedByUsers: newLikedUsers,
            likedByUserIds: newLikedUserIds
          };
        }
        return a;
      });
      return { ...prev, album: newAlbum };
    });

    addToast(nextLiked ? 'Đã thích khoảnh khắc ❤️' : 'Đã bỏ thích khoảnh khắc', 'success');

    if (item.momentId) {
      try {
        const res = await api.toggleLikeMoment(item.momentId, myId, myName);
        if (res) {
          setPlayer(prev => {
            if (!prev) return prev;
            const newAlbum = prev.album.map((a, idx) => {
              if (idx === previewIndex || a.url === item.url || a.momentId === item.momentId) {
                return {
                  ...a,
                  isLiked: res.isLiked ?? nextLiked,
                  likeCount: res.likeCount != null ? Number(res.likeCount) : newCount,
                  likedByUsers: res.likedByUsers || newLikedUsers,
                  likedByUserIds: res.likedByUserIds || newLikedUserIds
                };
              }
              return a;
            });
            return { ...prev, album: newAlbum };
          });
        }
      } catch (_) {}
    }
  };

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

            {/* Quick Action CTAs: Show Edit Profile if viewing own profile, otherwise show Chat, Gift & Hire */}
            {isOwner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#a5b4fc',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <UserCheck size={16} color="var(--primary)" />
                  <span>Hồ Sơ Của Bạn</span>
                </span>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate('/profile')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', borderRadius: '12px', fontWeight: 700 }}
                >
                  <Pencil size={16} />
                  <span>Chỉnh Sửa Hồ Sơ</span>
                </button>
              </div>
            ) : (
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
            )}
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
                          {isOwner ? (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={(e) => { e.stopPropagation(); navigate('/profile'); }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Pencil size={13} />
                              <span>Chỉnh sửa game</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={(e) => { e.stopPropagation(); setSelectedGame(game); onHirePlayer({ ...player, pricePerHour: game.price, primaryGame: game.name }); }}
                            >
                              Thuê Game Này
                            </button>
                          )}
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
                    const likeCount = item.likeCount || 0;
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
                        onClick={() => setPreviewIndex(idx)}
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

                        {/* Bottom overlay with Like count and Phóng to */}
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          padding: '10px',
                          background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.85))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(4px)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: item.isLiked ? '#ef4444' : '#fff',
                            fontWeight: 700
                          }}>
                            <Heart size={13} fill={item.isLiked ? '#ef4444' : 'none'} color="#ef4444" />
                            <span>{likeCount}</span>
                          </div>

                          <div style={{
                            background: 'rgba(99, 102, 241, 0.85)',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            color: '#fff',
                            fontWeight: 700
                          }}>
                            Phóng to
                          </div>
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

            {/* Booking Actions: If viewing own profile, show notice and manage button, otherwise show Hire & Chat */}
            {isOwner ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: '#a5b4fc',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <UserCheck size={18} />
                  <span>Bạn đang xem hồ sơ Idol của chính mình</span>
                </div>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => navigate('/profile')}
                >
                  <Pencil size={18} />
                  <span>Quản Lý & Chỉnh Sửa Hồ Sơ</span>
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      {/* Lightbox image preview modal with caption and likes */}
      {previewItem && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewIndex(null)}
          style={{
            backdropFilter: 'blur(12px)',
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setPreviewIndex(null)}
            style={{
              position: 'fixed',
              top: '20px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#fff',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 100001,
              transition: 'all 0.2s ease'
            }}
            title="Đóng (Esc)"
          >
            <X size={22} />
          </button>

          {/* Navigation buttons */}
          {player?.album?.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex((previewIndex - 1 + player.album.length) % player.album.length);
                }}
                style={{
                  position: 'fixed',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 100001,
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s'
                }}
                title="Ảnh trước (←)"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex((previewIndex + 1) % player.album.length);
                }}
                style={{
                  position: 'fixed',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 100001,
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s'
                }}
                title="Ảnh tiếp theo (→)"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Modal Card */}
          <div
            className="player-photo-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Image */}
            <div className="player-photo-modal-img-wrap">
              <img
                src={previewItem.url}
                alt="Highlight preview"
                className="player-photo-modal-img"
              />
            </div>

            {/* Right: Caption, Details & Likes */}
            <div className="player-photo-modal-side">
              <div>
                {/* Author Info & Game */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={previewItem.author?.avatar || player.avatar}
                      alt="Avatar"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        border: '2px solid var(--primary)',
                        objectFit: 'cover'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{previewItem.author?.name || player.fullName || player.name}</span>
                        <Crown size={14} color="#f59e0b" fill="#f59e0b" />
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                        {previewItem.createdAt || 'Khoảnh khắc gaming'}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      color: '#a5b4fc',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🎮 {previewItem.gameName || 'Gaming'}
                  </span>
                </div>

                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '14px 0' }} />

                {/* Content / Caption (Nội dung ảnh) */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
                    Nội dung ảnh / Khoảnh khắc
                  </div>
                  {previewItem.caption ? (
                    <div
                      style={{
                        fontSize: '0.96rem',
                        color: '#f8fafc',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      {previewItem.caption}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.88rem', padding: '10px 0' }}>
                      (Không có nội dung mô tả cho ảnh này)
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom: Likes & Actions */}
              <div>
                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '14px 0' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  {/* Like Button with like count */}
                  <button
                    onClick={() => handleToggleLikePhoto(previewItem)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: previewItem.isLiked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                      border: previewItem.isLiked ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: previewItem.isLiked ? '#ef4444' : '#fff',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      transition: 'all 0.2s ease',
                      flex: 1,
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Heart
                      size={20}
                      fill={previewItem.isLiked ? '#ef4444' : 'none'}
                      color={previewItem.isLiked ? '#ef4444' : '#fff'}
                    />
                    <span>{previewItem.likeCount || 0} lượt thích</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(previewItem.url);
                      addToast('Đã sao chép liên kết ảnh!', 'success');
                    }}
                    className="btn btn-outline"
                    style={{
                      padding: '10px 14px',
                      borderRadius: '12px',
                      color: 'var(--text-secondary)'
                    }}
                    title="Sao chép liên kết ảnh"
                  >
                    <Share2 size={18} />
                  </button>
                </div>

                {/* Likers Hint */}
                {Array.isArray(previewItem.likedByUsers) && previewItem.likedByUsers.length > 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={12} color="#ef4444" fill="#ef4444" />
                    <span>Được thích bởi <strong>{previewItem.likedByUsers.slice(0, 2).join(', ')}</strong> {previewItem.likedByUsers.length > 2 ? `và ${previewItem.likedByUsers.length - 2} người khác` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetailPage;
