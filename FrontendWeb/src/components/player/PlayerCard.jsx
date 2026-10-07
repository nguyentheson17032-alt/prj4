import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, Crown, MessageSquare, Gamepad2, Heart } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import AudioWave from '../common/AudioWave';
import '../../styles/player.css';

export const PlayerCard = ({ player, onHire, onDonate }) => {
  const navigate = useNavigate();

  const handleChat = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/chat?player=${player.id}`);
  };

  const handleHireClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onHire(player);
  };

  return (
    <div className="player-card">
      <Link to={`/player/${player.id}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Card Header & Cover */}
        <div className="player-cover-wrap">
          <img src={player.coverImage || player.avatar} alt={player.fullName} className="player-cover-img" />
          <div className="player-cover-overlay" />

          {/* VIP Badge */}
          {player.isVip && (
            <div className="player-vip-badge">
              <span className="badge badge-vip">
                <Crown size={12} />
                <span>VIP IDOL</span>
              </span>
            </div>
          )}

          {/* Status Badge */}
          <div className="player-status-badge">
            <StatusBadge status={player.status} />
          </div>

          {/* Avatar with offset */}
          <div className="player-avatar-wrap">
            <img src={player.avatar} alt={player.fullName} className="player-avatar-img" />
          </div>
        </div>

        {/* Card Body */}
        <div className="player-card-body">
          {/* Name & Rating */}
          <div className="player-name-row">
            <h3 className="player-name">{player.fullName || player.username}</h3>
            <div className="player-rating">
              <Star size={14} fill={player.rating > 0 ? "#f59e0b" : "none"} color="#f59e0b" />
              <span>{player.rating > 0 ? Number(player.rating).toFixed(1) : 'Chưa có'}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>({player.reviewCount || 0})</span>
            </div>
          </div>

          {/* Main Game & Rank */}
          <div className="player-game-tag">
            <Gamepad2 size={14} />
            <span>{player.primaryGame}</span>
            {player.rank && (
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'rgba(6,182,212,0.15)', borderRadius: '4px', border: '1px solid rgba(6,182,212,0.3)' }}>
                {player.rank}
              </span>
            )}
          </div>

          {/* Bio snippet */}
          <p className="player-bio-snippet">{player.bio}</p>

          {/* Voice Preview */}
          {player.voiceIntroUrl && (
            <AudioWave playerId={player.id} audioUrl={player.voiceIntroUrl} duration={player.voiceDuration || '0:15'} />
          )}

          {/* Footer with Price & Quick actions */}
          <div className="player-card-footer">
            <div>
              <div className="player-price">{(player.pricePerHour || 50000).toLocaleString('vi-VN')} đ</div>
              <span className="player-price-unit">/ giờ</span>
            </div>

            <div className="player-actions-row">
              <button
                className="btn-icon nav-icon-btn"
                onClick={handleChat}
                title="Nhắn tin với player"
              >
                <MessageSquare size={16} />
              </button>

              <button
                className="btn btn-sm btn-primary"
                onClick={handleHireClick}
              >
                <span>Thuê Ngay</span>
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default PlayerCard;
