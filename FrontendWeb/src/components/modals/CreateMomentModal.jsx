import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  Sparkles,
  Send,
  Gamepad2,
  UploadCloud,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Link as LinkIcon,
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { GAME_TOPICS_20 } from '../../constants/gamesList';
import { useNavigate } from 'react-router-dom';
import '../../styles/modals.css';

export const CreateMomentModal = ({ isOpen, onClose, onCreated, hasPostedToday = false }) => {
  const { user, isPlayer } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [content, setContent] = useState('');
  const [selectedGame, setSelectedGame] = useState('Liên Quân Mobile');
  const [games, setGames] = useState(GAME_TOPICS_20);
  const [selectedFiles, setSelectedFiles] = useState([]); // File objects
  const [previews, setPreviews] = useState([]); // { id, url, isLocal, name, size }
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Load games from backend, or fallback to the 20 games list
  useEffect(() => {
    const loadGames = async () => {
      try {
        const list = await api.getGames();
        if (Array.isArray(list) && list.length > 0) {
          // Merge names with our 20 games to keep icons
          const merged = list.slice(0, 20).map((g, idx) => {
            const fallback = GAME_TOPICS_20.find(f => f.name.toLowerCase() === (g.name || '').toLowerCase());
            return {
              id: g.id || idx + 1,
              name: g.name,
              category: g.category || fallback?.category || 'GAMING',
              icon: fallback?.icon || '🎮'
            };
          });
          if (merged.length > 0) {
            setGames(merged);
            setSelectedGame(merged[0].name);
            return;
          }
        }
      } catch (_) {}
      setGames(GAME_TOPICS_20);
      setSelectedGame(GAME_TOPICS_20[0].name);
    };

    if (isOpen) {
      loadGames();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle local files selection
  const handleFilesChosen = (files) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validImageFiles = fileList.filter(f => f.type.startsWith('image/'));

    if (validImageFiles.length === 0) {
      addToast('Vui lòng chọn tệp định dạng ảnh (JPG, PNG, WEBP, GIF)!', 'error');
      return;
    }

    if (previews.length + validImageFiles.length > 10) {
      addToast('Tối đa 10 ảnh cho mỗi bài viết khoảnh khắc!', 'warning');
    }

    const availableSlots = 10 - previews.length;
    const toAdd = validImageFiles.slice(0, availableSlots);

    const newPreviews = toAdd.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file),
      file: file,
      isLocal: true,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB'
    }));

    setSelectedFiles(prev => [...prev, ...toAdd]);
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesChosen(e.dataTransfer.files);
    }
  };

  const handleAddUrlImage = () => {
    if (!urlInput.trim()) return;
    if (previews.length >= 10) {
      addToast('Tối đa 10 ảnh cho mỗi bài viết!', 'warning');
      return;
    }

    setPreviews(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        url: urlInput.trim(),
        isLocal: false,
        name: 'Đường dẫn liên kết',
        size: 'URL Web'
      }
    ]);
    setUrlInput('');
  };

  const handleRemoveImage = (idToRemove) => {
    setPreviews(prev => {
      const target = prev.find(p => p.id === idToRemove);
      if (target?.file) {
        setSelectedFiles(fList => fList.filter(f => f !== target.file));
      }
      return prev.filter(p => p.id !== idToRemove);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (hasPostedToday) {
      addToast('Hôm nay bạn đã đăng 1 khoảnh khắc rồi. Vui lòng quay lại vào ngày mai!', 'warning');
      return;
    }
    if (!content.trim()) {
      addToast('Vui lòng nhập nội dung khoảnh khắc!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload local files if any
      const localFiles = previews.filter(p => p.isLocal && p.file).map(p => p.file);
      let uploadedUrls = [];
      if (localFiles.length > 0) {
        uploadedUrls = await api.uploadMomentFiles(localFiles);
      }

      // 2. Combine with URL images
      const directUrls = previews.filter(p => !p.isLocal).map(p => p.url);
      const allImageUrls = [...uploadedUrls, ...directUrls];

      // 3. Create moment
      const newMoment = await api.createMoment({
        content: content.trim(),
        gameName: selectedGame,
        images: allImageUrls,
        author: {
          id: user?.id || 1,
          userId: user?.id,
          name: user?.fullName || user?.username || 'Idol PlayZone',
          avatar: user?.avatarUrl || user?.avatar,
          isVip: true
        }
      });

      addToast('🎉 Đã chia sẻ khoảnh khắc thành công!', 'success');
      if (onCreated) {
        onCreated(newMoment);
      }
      // Reset form & close
      setContent('');
      setPreviews([]);
      setSelectedFiles([]);
      onClose();
    } catch (err) {
      console.error('Error creating moment:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi đăng khoảnh khắc. Vui lòng thử lại!';
      addToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickTags = ['#LeoRank', '#Highlight', '#PentaKill', '#TìmDuo', '#TamSu'];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, backdropFilter: 'blur(8px)' }}>
      <div
        className="modal-content animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '640px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #181926 0%, #12131d 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(236,72,153,0.2) 100%)',
                border: '1px solid rgba(165,180,252,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles className="gradient-text" size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Đăng Khoảnh Khắc <span className="gradient-text">Gaming</span>
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Chia sẻ chiến tích, highlight leo rank cùng người hâm mộ
              </p>
            </div>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#cbd5e1'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Check player role: If NOT a player, show block message */}
        {!isPlayer ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#f87171'
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              Dành Riêng Cho Idol & Player
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
              Tính năng <strong>Đăng Khoảnh Khắc</strong> và tải ảnh Album chỉ dành cho tài khoản <strong>Player / Idol</strong>. Thành viên thông thường có thể xem ảnh trong hồ sơ của Idol!
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Đã Hiểu
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onClose();
                  navigate('/register-player');
                }}
              >
                <Crown size={16} />
                <span>Đăng Ký Làm Idol Ngay</span>
              </button>
            </div>
          </div>
        ) : (
          /* Player Form */
          <form
            onSubmit={handleSubmit}
            style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Player Info Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              <img
                src={user?.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                alt="Avatar"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary)'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff' }}>
                    {user?.fullName || user?.username || 'Player Idol'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      fontWeight: 700,
                      border: '1px solid rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    ⭐ IDOL
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Khoảnh khắc sẽ tự động xuất hiện trong <strong style={{ color: '#cbd5e1' }}>Album Ảnh</strong> cá nhân &amp; Feed Cộng Đồng
                </div>
              </div>
            </div>

            {/* Daily Quota / Rule Notice */}
            {hasPostedToday ? (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '12px',
                  color: '#fbbf24',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <AlertCircle size={22} style={{ flexShrink: 0, color: '#f59e0b' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#fcd34d' }}>Hôm nay bạn đã hoàn thành đăng khoảnh khắc!</div>
                  <div style={{ fontSize: '0.78rem', color: '#fef3c7', marginTop: '2px' }}>
                    Quy định: Mỗi Idol được đăng 1 khoảnh khắc mỗi ngày (hạn ngạch: 1/1). Hãy chuẩn bị hình ảnh thật đẹp để đăng vào ngày mai nhé!
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.18)',
                  fontSize: '0.8rem',
                  color: '#c7d2fe'
                }}
              >
                <Sparkles size={14} color="var(--primary)" />
                <span><strong>Quy định:</strong> Mỗi Idol được đăng 1 khoảnh khắc mỗi ngày (hạn ngạch: 1 bài / 1 ngày).</span>
              </div>
            )}

            {/* Game Selection (1 out of 20 games) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label
                className="form-label"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  marginBottom: '8px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gamepad2 size={16} color="var(--primary)" />
                  <span>Chủ Đề Game:</span>
                </span>
                <span style={{ fontSize: '0.76rem', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>
                  Chọn 1 trong 20 game
                </span>
              </label>

              <select
                className="form-control"
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(15, 16, 26, 0.85)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                {games.map((g) => (
                  <option key={g.name} value={g.name} style={{ background: '#181926', color: '#fff' }}>
                    {g.icon ? `${g.icon} ` : ''}{g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>
                  Nội Dung Bài Đăng:
                </label>
                <span style={{ fontSize: '0.78rem', color: content.length > 900 ? '#f87171' : 'var(--text-muted)' }}>
                  {content.length}/1000 ký tự
                </span>
              </div>
              <textarea
                className="form-control"
                rows="4"
                maxLength={1000}
                placeholder="Hôm nay leo rank thế nào? Chia sẻ highlight penta-kill, tìm bạn duo, hay khoảnh khắc gaming đáng nhớ cùng mọi người nào!..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                style={{
                  padding: '12px 14px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  fontSize: '0.92rem',
                  borderRadius: '12px'
                }}
              />

              {/* Quick tags */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (!content.includes(tag)) {
                        setContent(prev => (prev ? `${prev} ${tag}` : tag));
                      }
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--primary)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Local Image Upload Section (Lấy ảnh từ trong máy) */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>
                  <ImageIcon size={16} color="var(--primary)" />
                  <span>Thêm Ảnh Từ Máy Tính ({previews.length}/10):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
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
                  <LinkIcon size={12} />
                  <span>{showUrlInput ? 'Ẩn nhập link ảnh' : '+ Dán link ảnh URL'}</span>
                </button>
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                multiple
                onChange={(e) => handleFilesChosen(e.target.files)}
              />

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: isDragging ? '2px dashed var(--primary)' : '2px dashed rgba(255, 255, 255, 0.15)',
                  backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '14px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px auto',
                    color: 'var(--primary)'
                  }}
                >
                  <UploadCloud size={24} />
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
                  Kéo thả ảnh vào đây hoặc <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>bấm để chọn từ máy</span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Hỗ trợ JPG, PNG, WEBP, GIF. Tối đa 10 ảnh chất lượng cao.
                </div>
              </div>

              {/* Optional URL input */}
              {showUrlInput && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }} className="animate-fade-in">
                  <input
                    type="url"
                    className="form-control"
                    placeholder="Dán link ảnh (https://...)..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrlImage())}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddUrlImage}
                    style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
                  >
                    Thêm
                  </button>
                </div>
              )}

              {/* Previews Grid */}
              {previews.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                    gap: '12px',
                    marginTop: '14px',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {previews.map((p, idx) => (
                    <div
                      key={p.id}
                      style={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: '#0b0c13'
                      }}
                    >
                      <img
                        src={p.url}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {idx === 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            fontSize: '0.62rem',
                            padding: '1px 5px',
                            background: 'rgba(99, 102, 241, 0.85)',
                            color: '#fff',
                            borderRadius: '4px',
                            fontWeight: 700
                          }}
                        >
                          Ảnh chính
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(p.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.75)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'; }}
                        title="Xóa ảnh này"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add more photo slot */}
                  {previews.length < 10 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '10px',
                        border: '1px dashed rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        transition: 'all 0.2s',
                        background: 'rgba(255,255,255,0.02)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                    >
                      <Plus size={20} />
                      <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Thêm ảnh</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
                style={{ padding: '10px 20px', borderRadius: '12px' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || hasPostedToday}
                title={hasPostedToday ? 'Bạn đã đăng 1 khoảnh khắc hôm nay. Hạn ngạch: 1/1 ngày.' : ''}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 700,
                  opacity: hasPostedToday ? 0.6 : 1,
                  cursor: hasPostedToday ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Đang Đăng Khoảnh Khắc...</span>
                  </>
                ) : hasPostedToday ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Đã Đăng Hôm Nay (1/1)</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Đăng Khoảnh Khắc</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateMomentModal;
