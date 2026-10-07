import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  PlusCircle,
  Crown,
  Gamepad2,
  Image,
  Send
} from 'lucide-react';
import api from '../api/apiService';
import CreateMomentModal from '../components/modals/CreateMomentModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/moments.css';

export const MomentsPage = () => {
  const { user } = useAuth();
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const { addToast } = useToast();

  useEffect(() => {
    const fetchMoments = async () => {
      setLoading(true);
      const data = await api.getMoments();
      setMoments(data || []);
      setLoading(false);
    };
    fetchMoments();
  }, []);

  const handleToggleLike = (id) => {
    setMoments(prev => prev.map(m => {
      if (m.id === id) {
        const isLiked = !m.isLiked;
        return {
          ...m,
          isLiked,
          likeCount: isLiked ? m.likeCount + 1 : m.likeCount - 1
        };
      }
      return m;
    }));
  };

  const handleAddComment = (momentId) => {
    const text = commentInputs[momentId];
    if (!text || !text.trim()) return;

    const newComment = {
      id: Date.now(),
      author: user?.fullName || user?.username || 'Thành viên',
      text: text.trim(),
      time: 'Vừa xong'
    };

    setCommentsMap(prev => ({
      ...prev,
      [momentId]: [...(prev[momentId] || []), newComment]
    }));

    setMoments(prev => prev.map(m => m.id === momentId ? { ...m, commentCount: m.commentCount + 1 } : m));
    setCommentInputs(prev => ({ ...prev, [momentId]: '' }));
    addToast('Đã gửi bình luận!', 'success');
  };

  const handleMomentCreated = (newMoment) => {
    setMoments([newMoment, ...moments]);
  };

  return (
    <div className="container animate-fade-in">
      <div className="moments-container">
        {/* Header & Post Creator Trigger */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>
              Khoảnh Khắc <span className="gradient-text">Cộng Đồng</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Chia sẻ chiến tích, hình ảnh và tâm sự giao lưu cùng các Idol.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusCircle size={18} />
            <span>Đăng Bài Mới</span>
          </button>
        </div>

        {/* Moments List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Đang tải khoảnh khắc...
          </div>
        ) : (
          moments.map((moment) => (
            <div key={moment.id} className="moment-card">
              {/* Header */}
              <div className="moment-header">
                <div className="moment-author">
                  <Link to={`/player/${moment.author?.id || 1}`}>
                    <img src={moment.author?.avatar} alt={moment.author?.name} className="moment-avatar" />
                  </Link>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Link to={`/player/${moment.author?.id || 1}`} style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {moment.author?.name}
                      </Link>
                      {moment.author?.isVip && (
                        <Crown size={14} color="#fbbf24" fill="#fbbf24" />
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {moment.createdAt} • <span style={{ color: 'var(--secondary)' }}>{moment.gameName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text content */}
              <p className="moment-content">{moment.content}</p>

              {/* Gallery images */}
              {moment.images && moment.images.length > 0 && (
                <div className="moment-gallery">
                  {moment.images.map((img, idx) => (
                    <img key={idx} src={img} alt="Post media" className="moment-img" />
                  ))}
                </div>
              )}

              {/* Actions row */}
              <div className="moment-actions">
                <button
                  className={`moment-action-btn ${moment.isLiked ? 'liked' : ''}`}
                  onClick={() => handleToggleLike(moment.id)}
                >
                  <Heart size={18} fill={moment.isLiked ? '#ec4899' : 'transparent'} />
                  <span>{moment.likeCount} Thích</span>
                </button>

                <div className="moment-action-btn">
                  <MessageCircle size={18} />
                  <span>{moment.commentCount} Bình luận</span>
                </div>

                <button
                  className="moment-action-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    addToast('Đã sao chép liên kết bài viết!', 'success');
                  }}
                >
                  <Share2 size={18} />
                  <span>Chia sẻ</span>
                </button>
              </div>

              {/* Comments Section */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {commentsMap[moment.id]?.map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '0.88rem' }}>
                    <strong style={{ color: 'var(--primary)' }}>{c.author}:</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{c.text}</span>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Viết bình luận..."
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                    value={commentInputs[moment.id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [moment.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(moment.id)}
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddComment(moment.id)}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal create moment */}
      <CreateMomentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleMomentCreated}
      />
    </div>
  );
};

export default MomentsPage;
