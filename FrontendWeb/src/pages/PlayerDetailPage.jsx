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
  ArrowLeft
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import AudioWave from '../components/common/AudioWave';
import api from '../api/apiService';
import { useToast } from '../context/ToastContext';

export const PlayerDetailPage = ({ onHirePlayer, onDonatePlayer }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [player, setPlayer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('SERVICES'); // SERVICES, ALBUM, REVIEWS
  const [isFavorited, setIsFavorited] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const [pData, rData] = await Promise.all([
        api.getPlayerById(id),
        api.getReviewsByPlayerId(id)
      ]);
      setPlayer(pData);
      setReviews(rData || []);
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
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>@{player.username}</span>
                  <span>•</span>
                  <span>Server: {player.server || 'VN'}</span>
                  <span>•</span>
                  <span>Đơn hoàn tất: <strong style={{ color: 'var(--accent-green)' }}>{player.orderCount || 0} đơn</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Action CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/chat?player=${player.id}`)}
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
              ⭐ Đánh Giá ({player.reviewCount || reviews.length})
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
                  {player.games?.map((game, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: 'rgba(139, 92, 246, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)'
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
                          onClick={() => onHirePlayer(player)}
                        >
                          Thuê Game Này
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Album */}
          {activeTab === 'ALBUM' && (
            <div className="animate-fade-in">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '16px'
              }}>
                {player.album?.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '240px',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.2s'
                    }}
                    onClick={() => setPreviewImage(imgUrl)}
                  >
                    <img
                      src={imgUrl}
                      alt={`Album ${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
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
                {reviews.map((rev) => (
                  <div key={rev.id} className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={rev.user?.avatar} alt={rev.user?.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{rev.user?.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rev.createdAt} • Đã thuê {rev.hours}h ({rev.gameName})</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(rev.rating || 5)].map((_, i) => (
                          <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                        ))}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      "{rev.comment}"
                    </p>
                  </div>
                ))}
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
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent-pink)', marginTop: '2px' }}>
                {(player.pricePerHour || 50000).toLocaleString('vi-VN')} đ
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
                onClick={() => onHirePlayer(player)}
              >
                <Gamepad2 size={20} />
                <span>Thuê Ngay Bây Giờ</span>
              </button>

              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => navigate(`/chat?player=${player.id}`)}
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
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerDetailPage;
