import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Share2,
  Sparkles,
  PlusCircle,
  Crown,
  Gamepad2,
  Image as ImageIcon,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Compass,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../api/apiService';
import CreateMomentModal from '../components/modals/CreateMomentModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { GAME_TOPICS_20 } from '../constants/gamesList';
import '../styles/moments.css';

export const MomentsPage = () => {
  const { user, isPlayer, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'MY_POSTS', 'TOP'
  const [selectedGameFilter, setSelectedGameFilter] = useState('ALL');

  // Modal to view users who liked a moment
  const [viewingLikersMoment, setViewingLikersMoment] = useState(null);

  // Lightbox modal state
  const [lightbox, setLightbox] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0
  });

  const fetchMoments = async () => {
    setLoading(true);
    const data = await api.getMoments();
    setMoments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMoments();
  }, [user?.id]);

  // Helper to accurately determine if CURRENT user has liked this moment
  const isMomentLikedByCurrentUser = (m) => {
    if (!isAuthenticated || !user) return false;
    const myId = user.id ? Number(user.id) : null;
    const myName = (user.fullName || user.username || '').trim().toLowerCase();

    // 1. Check by User ID
    if (myId && Array.isArray(m.likedByUserIds) && m.likedByUserIds.length > 0) {
      if (m.likedByUserIds.map(Number).includes(myId)) return true;
    }

    // 2. Check by Name
    if (myName && Array.isArray(m.likedByUsers) && m.likedByUsers.length > 0) {
      if (m.likedByUsers.some(u => (u || '').trim().toLowerCase() === myName)) return true;
    }

    // 3. Fallback only if liker lists are not populated yet
    if ((!m.likedByUserIds || m.likedByUserIds.length === 0) && (!m.likedByUsers || m.likedByUsers.length === 0)) {
      return Boolean(m.isLiked);
    }

    return false;
  };

  // Check if current player already posted a moment today (rule: 1 moment per day)
  const hasPostedToday = useMemo(() => {
    if (!user?.id || !isPlayer) return false;
    const todayStr = new Date().toDateString();
    return moments.some(m => {
      const isMyPost =
        String(m.playerUserId) === String(user.id) ||
        String(m.author?.userId) === String(user.id) ||
        String(m.author?.id) === String(user.id) ||
        m.author?.name === user.fullName ||
        m.author?.name === user.username;
      if (!isMyPost) return false;
      const d = new Date(m.rawCreatedAt || m.createdAt);
      return !isNaN(d.getTime()) && d.toDateString() === todayStr;
    });
  }, [moments, user, isPlayer]);

  // Filter moments
  const filteredMoments = useMemo(() => {
    return moments.filter(m => {
      // 1. Tab filter
      if (activeTab === 'MY_POSTS') {
        const isMyPost =
          String(m.playerUserId) === String(user?.id) ||
          String(m.author?.userId) === String(user?.id) ||
          String(m.author?.id) === String(user?.id) ||
          m.author?.name === user?.fullName ||
          m.author?.name === user?.username;
        if (!isMyPost) return false;
      }

      // 2. Game filter
      if (selectedGameFilter !== 'ALL') {
        const matchGame = (m.gameName || '').toLowerCase().includes(selectedGameFilter.toLowerCase());
        if (!matchGame) return false;
      }

      return true;
    }).sort((a, b) => {
      if (activeTab === 'TOP') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      return 0; // already sorted newest first
    });
  }, [moments, activeTab, selectedGameFilter, user]);

  const handleToggleLike = async (id) => {
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để thích khoảnh khắc!', 'warning');
      return;
    }

    const currentMoment = moments.find(m => m.id === id);
    if (!currentMoment) return;

    const myId = user?.id ? Number(user.id) : null;
    const myName = user?.fullName || user?.username || 'Bạn';
    const isLiked = !isMomentLikedByCurrentUser(currentMoment);

    const prevLikedUsers = Array.isArray(currentMoment.likedByUsers) ? currentMoment.likedByUsers : [];
    const prevLikedUserIds = Array.isArray(currentMoment.likedByUserIds) ? currentMoment.likedByUserIds.map(Number) : [];

    const newLikedUsers = isLiked
      ? [myName, ...prevLikedUsers.filter(u => (u || '').trim().toLowerCase() !== myName.trim().toLowerCase())]
      : prevLikedUsers.filter(u => (u || '').trim().toLowerCase() !== myName.trim().toLowerCase());

    const newLikedUserIds = isLiked
      ? (myId ? [myId, ...prevLikedUserIds.filter(uid => uid !== myId)] : prevLikedUserIds)
      : (myId ? prevLikedUserIds.filter(uid => uid !== myId) : prevLikedUserIds);

    const newCount = isLiked
      ? (currentMoment.likeCount || 0) + 1
      : Math.max((currentMoment.likeCount || 0) - 1, 0);

    // Optimistic UI update: likeCount = số người đã like
    setMoments(prev => prev.map(m => m.id === id ? {
      ...m,
      isLiked,
      likeCount: newCount,
      likedByUsers: newLikedUsers,
      likedByUserIds: newLikedUserIds
    } : m));

    try {
      const res = await api.toggleLikeMoment(id, myId, myName);
      if (res) {
        setMoments(prev => prev.map(m => m.id === id ? {
          ...m,
          isLiked: res.isLiked ?? isLiked,
          likeCount: res.likeCount != null ? Number(res.likeCount) : newCount,
          likedByUsers: res.likedByUsers || newLikedUsers,
          likedByUserIds: res.likedByUserIds || newLikedUserIds
        } : m));
      }
    } catch (_) {
      // rollback if needed
    }
  };

  const handleDeleteMoment = async (momentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết khoảnh khắc này?')) return;

    try {
      await api.deleteMoment(momentId);
      setMoments(prev => prev.filter(m => m.id !== momentId));
      addToast('Đã xóa khoảnh khắc thành công', 'success');
    } catch (_) {
      addToast('Không thể xóa bài viết. Vui lòng thử lại!', 'error');
    }
  };

  const handleMomentCreated = (newMoment) => {
    if (newMoment) {
      setMoments(prev => [newMoment, ...prev.filter(m => m.id !== newMoment.id)]);
      setActiveTab('ALL');
      setSelectedGameFilter('ALL');
    }
  };

  const openLightbox = (images, index) => {
    setLightbox({
      isOpen: true,
      images: images || [],
      currentIndex: index || 0
    });
  };

  const closeLightbox = () => {
    setLightbox({
      isOpen: false,
      images: [],
      currentIndex: 0
    });
  };

  const nextLightboxImage = () => {
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  };

  const prevLightboxImage = () => {
    setLightbox(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightbox.isOpen) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxImage();
      if (e.key === 'ArrowLeft') prevLightboxImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightbox.isOpen, lightbox.images.length]);

  return (
    <div className="container animate-fade-in">
      <div className="moments-container">
        {/* Header Hero */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={24} className="gradient-text" />
                <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Khoảnh Khắc <span className="gradient-text">Cộng Đồng</span>
                </h1>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontWeight: 700
                }}
              >
                📌 Luật Idol: 1 khoảnh khắc/ngày
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Chia sẻ chiến tích, highlight leo rank và thả tim khoảnh khắc cùng các Idol PlayZone.
            </p>
          </div>

          {/* Post button: ONLY show if isPlayer, with 1 post / day limit enforcement */}
          {isPlayer ? (
            hasPostedToday ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  disabled
                  style={{
                    padding: '10px 18px',
                    borderRadius: '14px',
                    fontWeight: 600,
                    opacity: 0.85,
                    cursor: 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    color: '#10b981'
                  }}
                  title="Hôm nay bạn đã đăng 1 khoảnh khắc. Mỗi Idol được đăng 1 khoảnh khắc mỗi ngày. Hãy quay lại vào ngày mai nhé!"
                >
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>Đã Đăng Hôm Nay (1/1)</span>
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                style={{
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                  padding: '10px 20px',
                  borderRadius: '14px',
                  fontWeight: 700
                }}
              >
                <PlusCircle size={18} />
                <span>Đăng Khoảnh Khắc</span>
              </button>
            )
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '8px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Compass size={16} color="var(--primary)" />
              <span>Khám phá & Thả tim Idol</span>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="moment-filter-bar">
          <div className="moment-tabs-row">
            {/* Tabs */}
            <div className="moment-nav-tabs">
              <button
                className={`moment-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setActiveTab('ALL')}
              >
                <Compass size={15} />
                <span>Tất Cả ({moments.length})</span>
              </button>

              {/* "Khoảnh Khắc Của Tôi" Tab: Only for logged-in players */}
              {isPlayer && (
                <button
                  className={`moment-tab-btn ${activeTab === 'MY_POSTS' ? 'active' : ''}`}
                  onClick={() => setActiveTab('MY_POSTS')}
                >
                  <UserCheck size={15} />
                  <span>Khoảnh Khắc Của Tôi</span>
                </button>
              )}

              <button
                className={`moment-tab-btn ${activeTab === 'TOP' ? 'active' : ''}`}
                onClick={() => setActiveTab('TOP')}
              >
                <TrendingUp size={15} />
                <span>Nổi Bật Nhất</span>
              </button>
            </div>

            {/* Clear game filter if active */}
            {selectedGameFilter !== 'ALL' && (
              <button
                onClick={() => setSelectedGameFilter('ALL')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={13} />
                <span>Bỏ lọc game</span>
              </button>
            )}
          </div>

          {/* Game Topics Horizontal Scroll Bar (20 games) */}
          <div className="moment-game-scroll">
            <button
              className={`moment-game-pill ${selectedGameFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedGameFilter('ALL')}
            >
              🎮 Tất Cả Game
            </button>
            {GAME_TOPICS_20.map((game) => (
              <button
                key={game.id}
                className={`moment-game-pill ${selectedGameFilter === game.name ? 'active' : ''}`}
                onClick={() => setSelectedGameFilter(game.name)}
              >
                <span>{game.icon}</span>
                <span>{game.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Feed Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div className="spinner-border text-primary" role="status" style={{ marginBottom: '12px' }}></div>
            <div>Đang tải khoảnh khắc gaming...</div>
          </div>
        ) : filteredMoments.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: 'var(--primary)'
              }}
            >
              <ImageIcon size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#fff', fontWeight: 700 }}>
              {activeTab === 'MY_POSTS'
                ? 'Bạn Chưa Đăng Khoảnh Khắc Nào'
                : selectedGameFilter !== 'ALL'
                ? `Chưa Có Khoảnh Khắc Cho Game ${selectedGameFilter}`
                : 'Chưa Có Khoảnh Khắc Nào'}
            </h3>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', maxWidth: '440px', margin: '0 auto 20px auto' }}>
              {activeTab === 'MY_POSTS'
                ? 'Hãy chia sẻ chiến tích leo rank hoặc hình ảnh highlight của bạn để người hâm mộ cùng chiêm ngưỡng!'
                : 'Hãy đón chờ những khoảnh khắc tiếp theo từ các Idol PlayZone nhé!'}
            </p>

            {isPlayer && !hasPostedToday ? (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
                style={{ padding: '10px 24px', borderRadius: '12px' }}
              >
                <PlusCircle size={16} />
                <span>Đăng Bài Đầu Tiên</span>
              </button>
            ) : selectedGameFilter !== 'ALL' ? (
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedGameFilter('ALL')}
                style={{ padding: '8px 20px', borderRadius: '10px' }}
              >
                Xem Tất Cả Game
              </button>
            ) : null}
          </div>
        ) : (
          filteredMoments.map((moment) => {
            const isAuthor =
              isAuthenticated &&
              (String(moment.playerUserId) === String(user?.id) ||
                String(moment.author?.userId) === String(user?.id) ||
                String(moment.author?.id) === String(user?.id) ||
                moment.author?.name === user?.fullName ||
                moment.author?.name === user?.username);

            const images = moment.images || [];
            const isLiked = isMomentLikedByCurrentUser(moment);

            return (
              <div key={moment.id} className="moment-card animate-fade-in">
                {/* Header */}
                <div className="moment-header">
                  <div className="moment-author">
                    <Link to={`/player/${moment.author?.id || 1}`} className="moment-avatar-wrap">
                      <img
                        src={moment.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={moment.author?.name}
                        className="moment-avatar"
                      />
                      <div className="moment-online-dot"></div>
                    </Link>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Link
                          to={`/player/${moment.author?.id || 1}`}
                          style={{
                            fontWeight: 700,
                            fontSize: '0.98rem',
                            color: '#fff',
                            textDecoration: 'none'
                          }}
                        >
                          {moment.author?.name}
                        </Link>
                        {moment.author?.isVip && (
                          <span title="Idol Đã Xác Thực">
                            <Crown size={15} color="#fbbf24" fill="#fbbf24" />
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span>{moment.createdAt}</span>
                        <span>•</span>
                        <span
                          style={{
                            color: '#a5b4fc',
                            background: 'rgba(99, 102, 241, 0.12)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Gamepad2 size={12} />
                          {moment.gameName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* If user is the author of this post, show Delete option */}
                  {isAuthor && (
                    <button
                      onClick={() => handleDeleteMoment(moment.id)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                      }}
                      title="Xóa bài viết này"
                    >
                      <Trash2 size={14} />
                      <span>Xóa</span>
                    </button>
                  )}
                </div>

                {/* Text Content */}
                <p className="moment-content">{moment.content}</p>

                {/* Adaptive Image Gallery */}
                {images.length === 1 && (
                  <div className="moment-gallery-grid-1" onClick={() => openLightbox(images, 0)}>
                    <img src={images[0]} alt="Highlight" />
                  </div>
                )}

                {images.length === 2 && (
                  <div className="moment-gallery-grid-2">
                    {images.map((img, idx) => (
                      <img key={idx} src={img} alt="Highlight" onClick={() => openLightbox(images, idx)} />
                    ))}
                  </div>
                )}

                {images.length === 3 && (
                  <div className="moment-gallery-grid-3">
                    <img src={images[0]} alt="Highlight" onClick={() => openLightbox(images, 0)} />
                    <div className="side-stack">
                      <img src={images[1]} alt="Highlight" onClick={() => openLightbox(images, 1)} />
                      <img src={images[2]} alt="Highlight" onClick={() => openLightbox(images, 2)} />
                    </div>
                  </div>
                )}

                {images.length >= 4 && (
                  <div className="moment-gallery-grid-multi">
                    {images.slice(0, 4).map((img, idx) => (
                      <div
                        key={idx}
                        className="moment-gallery-item"
                        onClick={() => openLightbox(images, idx)}
                      >
                        <img src={img} alt="Highlight" />
                        {idx === 3 && images.length > 4 && (
                          <div className="moment-more-overlay">
                            +{images.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions Row: ONLY Like & Share (no comments) */}
                <div className="moment-actions">
                  <div className="moment-action-left">
                    <button
                      className={`moment-action-btn ${isLiked ? 'liked' : ''}`}
                      onClick={() => handleToggleLike(moment.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        background: isLiked ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: isLiked ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isLiked ? '#ec4899' : 'var(--text-secondary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                      }}
                      title={isLiked ? 'Bỏ thích' : 'Thích khoảnh khắc'}
                    >
                      <Heart
                        size={19}
                        fill={isLiked ? '#ec4899' : 'transparent'}
                        color={isLiked ? '#ec4899' : 'currentColor'}
                      />
                      <span>{moment.likeCount || 0} Lượt thích</span>
                    </button>
                  </div>

                  <button
                    className="moment-action-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      addToast('Đã sao chép liên kết khoảnh khắc vào bộ nhớ tạm!', 'success');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <Share2 size={16} />
                    <span>Chia sẻ</span>
                  </button>
                </div>

                {/* Display Likers Summary (Số lượt like = số người đã like) */}
                {Number(moment.likeCount || 0) > 0 && (
                  <div
                    onClick={() => setViewingLikersMoment(moment)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '12px',
                      padding: '8px 14px',
                      background: 'rgba(236, 72, 153, 0.06)',
                      borderRadius: '10px',
                      border: '1px solid rgba(236, 72, 153, 0.15)',
                      fontSize: '0.82rem',
                      color: '#fbcfe8',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Bấm để xem danh sách người đã thích"
                  >
                    <Heart size={14} fill="#ec4899" color="#ec4899" />
                    <span style={{ flex: 1 }}>
                      {Array.isArray(moment.likedByUsers) && moment.likedByUsers.length > 0 ? (
                        <>
                          Được thích bởi <strong style={{ color: '#fff' }}>{moment.likedByUsers[0]}</strong>
                          {moment.likeCount > 1 && <> và <strong style={{ color: '#fff' }}>{moment.likeCount - 1} người khác</strong></>}
                        </>
                      ) : (
                        <><strong style={{ color: '#fff' }}>{moment.likeCount}</strong> người đã thích khoảnh khắc này</>
                      )}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#f472b6', textDecoration: 'underline' }}>
                      Xem ai đã thích
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Lightbox Modal */}
      {lightbox.isOpen && (
        <div className="moment-lightbox-overlay" onClick={closeLightbox}>
          <button className="moment-lightbox-close" onClick={closeLightbox}>
            <X size={20} />
          </button>

          {lightbox.images.length > 1 && (
            <>
              <button
                className="moment-lightbox-nav moment-lightbox-prev"
                onClick={(e) => { e.stopPropagation(); prevLightboxImage(); }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                className="moment-lightbox-nav moment-lightbox-next"
                onClick={(e) => { e.stopPropagation(); nextLightboxImage(); }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <img
            src={lightbox.images[lightbox.currentIndex]}
            alt="Full size highlight"
            className="moment-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox.images.length > 1 && (
            <div className="moment-lightbox-counter">
              {lightbox.currentIndex + 1} / {lightbox.images.length}
            </div>
          )}
        </div>
      )}

      {/* Modal View Likers: Danh sách người đã thích khoảnh khắc */}
      {viewingLikersMoment && (
        <div className="modal-overlay" onClick={() => setViewingLikersMoment(null)} style={{ zIndex: 10001, backdropFilter: 'blur(6px)' }}>
          <div
            className="modal-content animate-scale-up"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              width: '90%',
              background: '#181926',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Heart size={18} fill="#ec4899" color="#ec4899" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                  Người Đã Thích ({viewingLikersMoment.likeCount || 0})
                </h3>
              </div>
              <button
                onClick={() => setViewingLikersMoment(null)}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.isArray(viewingLikersMoment.likedByUsers) && viewingLikersMoment.likedByUsers.length > 0 ? (
                viewingLikersMoment.likedByUsers.map((likerName, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.06)'
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#fff',
                        fontSize: '0.86rem'
                      }}
                    >
                      {likerName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.92rem' }}>{likerName}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Thành viên PlayZone</div>
                    </div>
                    <Heart size={16} fill="#ec4899" color="#ec4899" />
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  {viewingLikersMoment.likeCount} lượt thích từ thành viên cộng đồng PlayZone
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal create moment */}
      <CreateMomentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleMomentCreated}
        hasPostedToday={hasPostedToday}
      />
    </div>
  );
};

export default MomentsPage;
