import React, { useState } from 'react';
import { X, Image, Sparkles, Send, Gamepad2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import '../../styles/modals.css';

export const CreateMomentModal = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [content, setContent] = useState('');
  const [gameName, setGameName] = useState('Liên Quân Mobile');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const sampleGames = [
    'Liên Quân Mobile',
    'Liên Minh Huyền Thoại',
    'Valorant',
    'PUBG Mobile & PC',
    'Đấu Trường Chân Lý',
    'Genshin Impact',
    'Tâm Sự & Hát Hò'
  ];

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      addToast('Vui lòng nhập nội dung bài viết!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPost = await api.createMoment({
        content,
        gameName,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80']
      });

      addToast('Đã đăng bài viết khoảnh khắc thành công!', 'success');
      if (onCreated) onCreated(newPost);
      onClose();
    } catch (err) {
      addToast('Có lỗi xảy ra khi đăng bài.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles className="gradient-text" size={22} />
            <span>Chia Sẻ Khoảnh Khắc Mới</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
              alt="Avatar"
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{user?.fullName || 'Game Master'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đăng công khai cho cộng đồng</div>
            </div>
          </div>

          {/* Select Game */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gamepad2 size={16} />
              <span>Chủ đề Game:</span>
            </label>
            <select
              className="form-control"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            >
              {sampleGames.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="form-group">
            <label className="form-label">Nội Dung Bài Đăng:</label>
            <textarea
              className="form-control"
              rows="4"
              placeholder="Hôm nay leo rank thế nào? Bạn muốn tìm duo hay chia sẻ chiến tích gì không?..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Image URL input */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Image size={16} />
              <span>Thêm Link Ảnh Chiến Tích / Highlight:</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="url"
                className="form-control"
                placeholder="Dán link ảnh (URL)..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddImage}
              >
                Thêm
              </button>
            </div>
          </div>

          {/* Image preview list */}
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px' }}
                    onClick={() => setImages(images.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="modal-footer" style={{ padding: '16px 0 0 0', borderTop: 'none' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Send size={16} />
              <span>{isSubmitting ? 'Đang Đăng...' : 'Đăng Khoảnh Khắc'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMomentModal;
