import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2, CheckCircle2, Search, RefreshCw, Clock, Sparkles,
  ChevronRight, X, Eye, ChevronLeft, RotateCcw,
  Heart, Trash2, EyeOff, Crown
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { GAME_TOPICS_20 } from '../../constants/gamesList';
import { MetricCard, StatusBadge, parseDateToDateObj, formatOrderDateTime } from './adminHelpers';

export const MomentsTab = () => {
  const { addToast } = useToast();
  const [momentsList, setMomentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Detail Modal & Lightbox
  const [selectedMoment, setSelectedMoment] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadMoments = async () => {
    setLoading(true);
    try {
      const data = await api.getAllMomentsAdmin();
      setMomentsList(data || []);
    } catch (e) {
      console.error('Error loading moments:', e);
      addToast('Không thể tải danh sách khoảnh khắc', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMoments();
  }, []);

  // Filter & Sort
  const filteredMoments = useMemo(() => {
    return momentsList.filter(m => {
      // 1. Search (ID, author name, content, game)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchId = String(m.id).includes(q);
        const matchContent = (m.content || '').toLowerCase().includes(q);
        const matchAuthor = (m.author?.name || '').toLowerCase().includes(q);
        const matchGame = (m.gameName || '').toLowerCase().includes(q);
        if (!matchId && !matchContent && !matchAuthor && !matchGame) return false;
      }

      // 2. Game filter
      if (gameFilter !== 'all') {
        if ((m.gameName || '').toLowerCase() !== gameFilter.toLowerCase()) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        const st = (m.status || 'ACTIVE').toUpperCase();
        if (st !== statusFilter.toUpperCase()) return false;
      }

      // 4. Date filter
      if (dateFilter !== 'all') {
        const itemDate = parseDateToDateObj(m.rawCreatedAt || m.createdAt);
        const itemTime = itemDate ? itemDate.getTime() : 0;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;

        if (dateFilter === 'today' && itemTime < todayStart) return false;
        if (dateFilter === 'last7days' && itemTime < sevenDaysAgo) return false;
        if (dateFilter === 'last30days' && itemTime < thirtyDaysAgo) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'most_liked') return (b.likeCount || 0) - (a.likeCount || 0);
      if (sortBy === 'least_liked') return (a.likeCount || 0) - (b.likeCount || 0);

      const timeA = parseDateToDateObj(a.rawCreatedAt || a.createdAt)?.getTime() || 0;
      const timeB = parseDateToDateObj(b.rawCreatedAt || b.createdAt)?.getTime() || 0;
      if (sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA; // newest default
    });
  }, [momentsList, search, gameFilter, statusFilter, dateFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredMoments.length / pageSize) || 1;
  const paginatedMoments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMoments.slice(start, start + pageSize);
  }, [filteredMoments, currentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const total = momentsList.length;
    const active = momentsList.filter(m => (m.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
    const hidden = momentsList.filter(m => (m.status || '').toUpperCase() === 'HIDDEN').length;
    const totalLikes = momentsList.reduce((sum, m) => sum + (Number(m.likeCount) || 0), 0);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayCount = momentsList.filter(m => {
      const t = parseDateToDateObj(m.rawCreatedAt || m.createdAt)?.getTime() || 0;
      return t >= todayStart;
    }).length;

    return { total, active, hidden, totalLikes, todayCount };
  }, [momentsList]);

  // Actions
  const handleToggleStatus = async (momentId, currentStatus) => {
    const newStatus = (currentStatus || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'HIDDEN' : 'ACTIVE';
    try {
      await api.updateMomentStatusAdmin(momentId, newStatus);
      setMomentsList(prev => prev.map(m => m.id === momentId ? { ...m, status: newStatus } : m));
      if (selectedMoment?.id === momentId) {
        setSelectedMoment(prev => ({ ...prev, status: newStatus }));
      }
      addToast(`Đã ${newStatus === 'ACTIVE' ? 'hiển thị' : 'ẩn'} bài viết #${momentId}!`, 'success');
    } catch {
      addToast('Cập nhật trạng thái thất bại. Vui lòng thử lại!', 'error');
    }
  };

  const handleDeleteMoment = async (momentId) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn bài đăng khoảnh khắc #${momentId}?`)) return;
    try {
      await api.deleteMomentAdmin(momentId);
      setMomentsList(prev => prev.filter(m => m.id !== momentId));
      if (selectedMoment?.id === momentId) {
        setSelectedMoment(null);
      }
      addToast(`Đã xóa khoảnh khắc #${momentId} thành công!`, 'success');
    } catch {
      addToast('Xóa khoảnh khắc thất bại. Vui lòng thử lại!', 'error');
    }
  };

  const hasActiveFilters = search || gameFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'newest';

  const resetFilters = () => {
    setSearch('');
    setGameFilter('all');
    setStatusFilter('all');
    setDateFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Quản Lý Khoảnh Khắc Idol
            </h2>
            <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>
              {momentsList.length} bài đăng
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Kiểm duyệt hình ảnh, theo dõi tương tác like và quản lý bài đăng khoảnh khắc trên nền tảng
          </p>
        </div>

        <button
          onClick={loadMoments}
          className="btn btn-outline"
          style={{ height: '38px', padding: '0 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <MetricCard label="Tổng Khoảnh Khắc" value={metrics.total} sub="Tổng bài đăng trên hệ thống" icon={Sparkles} color="#6366f1" />
        <MetricCard label="Đang Hiển Thị" value={metrics.active} sub="Khoảnh khắc công khai feed" icon={CheckCircle2} color="#10b981" />
        <MetricCard label="Đang Ẩn / Kiểm Duyệt" value={metrics.hidden} sub="Đã ẩn khỏi feed chung" icon={EyeOff} color="#f59e0b" />
        <MetricCard label="Tổng Lượt Thích" value={metrics.totalLikes} sub="= Tổng số người đã thả tim" icon={Heart} color="#ec4899" />
        <MetricCard label="Đăng Hôm Nay" value={metrics.todayCount} sub="Luật: 1 bài / Idol / ngày" icon={Clock} color="#06b6d4" />
      </div>

      {/* Search & Filters Toolbar */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tìm theo ID, tên idol, game, nội dung..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '36px', height: '38px', fontSize: '0.86rem' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Game filter */}
          <div style={{ minWidth: '170px' }}>
            <select
              className="form-control"
              value={gameFilter}
              onChange={e => { setGameFilter(e.target.value); setCurrentPage(1); }}
              style={{ height: '38px', fontSize: '0.86rem' }}
            >
              <option value="all">🎮 Tất Cả Game (20)</option>
              {GAME_TOPICS_20.map(g => (
                <option key={g.id} value={g.name}>{g.icon} {g.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ height: '38px', fontSize: '0.86rem' }}
            >
              <option value="all">Tất Cả Trạng Thái</option>
              <option value="ACTIVE">🟢 Đang hiển thị</option>
              <option value="HIDDEN">🟡 Đang ẩn</option>
              <option value="DELETED">🔴 Đã xóa</option>
            </select>
          </div>

          {/* Date filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              className="form-control"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
              style={{ height: '38px', fontSize: '0.86rem' }}
            >
              <option value="all">Mọi thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="last7days">7 ngày qua</option>
              <option value="last30days">30 ngày qua</option>
            </select>
          </div>

          {/* Sort */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="form-control"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ height: '38px', fontSize: '0.86rem' }}
            >
              <option value="newest">🕒 Mới nhất trước</option>
              <option value="oldest">🕒 Cũ nhất trước</option>
              <option value="most_liked">❤️ Nhiều like nhất</option>
              <option value="least_liked">🤍 Ít like nhất</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="btn btn-outline"
              style={{ height: '38px', padding: '0 12px', fontSize: '0.82rem', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              <RotateCcw size={14} style={{ marginRight: '4px' }} />
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Table Data */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 16px', width: '130px' }}>ID & Thời Gian</th>
                <th style={{ padding: '14px 16px' }}>Idol Đăng Bài</th>
                <th style={{ padding: '14px 16px' }}>Chủ Đề Game</th>
                <th style={{ padding: '14px 16px', maxWidth: '280px' }}>Nội Dung</th>
                <th style={{ padding: '14px 16px' }}>Hình Ảnh</th>
                <th style={{ padding: '14px 16px', width: '130px' }}>Lượt Thích</th>
                <th style={{ padding: '14px 16px', width: '120px' }}>Trạng Thái</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', width: '140px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ marginRight: '8px' }}></div>
                    Đang tải dữ liệu khoảnh khắc...
                  </td>
                </tr>
              ) : paginatedMoments.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Sparkles size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Không tìm thấy bài viết khoảnh khắc nào</div>
                    <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
                  </td>
                </tr>
              ) : (
                paginatedMoments.map((moment) => {
                  const images = moment.images || [];
                  const author = moment.author || {};
                  const isHidden = (moment.status || 'ACTIVE').toUpperCase() === 'HIDDEN';
                  const isDeleted = (moment.status || '').toUpperCase() === 'DELETED';

                  return (
                    <tr
                      key={moment.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s',
                        opacity: isDeleted ? 0.5 : 1
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* ID & Date */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>#{moment.id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatOrderDateTime(moment.rawCreatedAt || moment.createdAt)}
                        </div>
                      </td>

                      {/* Author */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                            alt={author.name}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)' }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontWeight: 700, color: '#fff' }}>{author.name || 'Idol'}</span>
                              {author.isVip && <Crown size={13} color="#fbbf24" fill="#fbbf24" />}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ID Idol: #{moment.playerUserId || author.userId || author.id || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Game */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          background: 'rgba(99,102,241,0.12)',
                          color: '#a5b4fc',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Gamepad2 size={13} />
                          {moment.gameName || 'Gaming'}
                        </span>
                      </td>

                      {/* Content snippet */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', maxWidth: '280px' }}>
                        <div
                          onClick={() => setSelectedMoment(moment)}
                          title="Bấm để xem đầy đủ nội dung"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.45,
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {moment.content || '—'}
                        </div>
                      </td>

                      {/* Images */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {images.length > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {images.slice(0, 3).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt="Thumb"
                                  onClick={() => setEnlargedImage(img)}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    objectFit: 'cover',
                                    cursor: 'pointer',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                  }}
                                />
                              ))}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {images.length} ảnh
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Không có ảnh</span>
                        )}
                      </td>

                      {/* Like Count */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div
                          onClick={() => setSelectedMoment(moment)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(236,72,153,0.12)',
                            color: '#ec4899',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                          title="Bấm để xem danh sách người đã thích"
                        >
                          <Heart size={14} fill="#ec4899" />
                          <span>{moment.likeCount || 0}</span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ={moment.likeCount || 0} người thích
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <StatusBadge status={moment.status || 'ACTIVE'} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {/* View Detail */}
                          <button
                            className="btn btn-outline"
                            onClick={() => setSelectedMoment(moment)}
                            title="Xem chi tiết khoảnh khắc"
                            style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Toggle Active / Hidden */}
                          <button
                            className="btn btn-outline"
                            onClick={() => handleToggleStatus(moment.id, moment.status)}
                            title={isHidden ? 'Hiển thị bài viết' : 'Tạm ẩn bài viết'}
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isHidden ? '#10b981' : '#f59e0b',
                              borderColor: isHidden ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'
                            }}
                          >
                            {isHidden ? <CheckCircle2 size={15} /> : <EyeOff size={15} />}
                          </button>

                          {/* Delete */}
                          <button
                            className="btn btn-outline"
                            onClick={() => handleDeleteMoment(moment.id)}
                            title="Xóa vĩnh viễn"
                            style={{
                              width: '32px',
                              height: '32px',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                              borderColor: 'rgba(239,68,68,0.3)'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Hiển thị {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredMoments.length)} trên tổng số {filteredMoments.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ height: '32px', padding: '0 10px' }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`btn ${p === currentPage ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setCurrentPage(p)}
                  style={{ height: '32px', width: '32px', padding: 0 }}
                >
                  {p}
                </button>
              ))}
              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{ height: '32px', padding: '0 10px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Moment Detail Admin Modal */}
      {selectedMoment && (
        <div className="modal-overlay" onClick={() => setSelectedMoment(null)} style={{ zIndex: 10000, backdropFilter: 'blur(8px)' }}>
          <div
            className="modal-content animate-scale-up"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '680px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#181926',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(236,72,153,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={18} className="gradient-text" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 800 }}>
                    Chi Tiết Khoảnh Khắc #{selectedMoment.id}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Đăng lúc: {formatOrderDateTime(selectedMoment.rawCreatedAt || selectedMoment.createdAt)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMoment(null)}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Author & Game Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={selectedMoment.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={selectedMoment.author?.name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                        {selectedMoment.author?.name || 'Idol PlayZone'}
                      </span>
                      {selectedMoment.author?.isVip && <Crown size={16} color="#fbbf24" fill="#fbbf24" />}
                      <span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        IDOL
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Mã tài khoản Idol: #{selectedMoment.playerUserId || selectedMoment.author?.userId || selectedMoment.author?.id || '—'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Gamepad2 size={14} />
                    {selectedMoment.gameName}
                  </span>
                  <StatusBadge status={selectedMoment.status || 'ACTIVE'} />
                </div>
              </div>

              {/* Content Text */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                  Nội Dung Bài Viết:
                </label>
                <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: '0.94rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {selectedMoment.content}
                </div>
              </div>

              {/* Photos Gallery */}
              {selectedMoment.images && selectedMoment.images.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                    Hình Ảnh Đính Kèm ({selectedMoment.images.length} ảnh):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                    {selectedMoment.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setEnlargedImage(img)}
                        style={{ position: 'relative', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <img
                          src={img}
                          alt={`Highlight ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Like Statistics & Likers List: Số lượt like = Số người đã like */}
              <div style={{ padding: '16px', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '14px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Heart size={18} fill="#ec4899" color="#ec4899" />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f472b6' }}>
                      Tổng Lượt Thích: {selectedMoment.likeCount || 0}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', background: 'rgba(236, 72, 153, 0.15)', color: '#fbcfe8', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Số lượt like = {selectedMoment.likeCount || 0} người đã like
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Danh sách tài khoản đã thích khoảnh khắc này:
                </div>

                {Array.isArray(selectedMoment.likedByUsers) && selectedMoment.likedByUsers.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedMoment.likedByUsers.map((liker, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <Heart size={12} fill="#ec4899" color="#ec4899" />
                        <strong>{liker}</strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {Number(selectedMoment.likeCount) > 0
                      ? `${selectedMoment.likeCount} thành viên cộng đồng đã thích bài đăng này`
                      : 'Chưa có thành viên nào thả tim cho bài viết này.'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Toggle Status */}
                <button
                  className="btn btn-outline"
                  onClick={() => handleToggleStatus(selectedMoment.id, selectedMoment.status)}
                  style={{
                    fontSize: '0.85rem',
                    color: (selectedMoment.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? '#10b981' : '#f59e0b',
                    borderColor: (selectedMoment.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? '#10b981' : '#f59e0b'
                  }}
                >
                  {(selectedMoment.status || 'ACTIVE').toUpperCase() === 'HIDDEN' ? (
                    <>
                      <CheckCircle2 size={15} style={{ marginRight: '6px' }} />
                      <span>Hiển Thị Khoảnh Khắc</span>
                    </>
                  ) : (
                    <>
                      <EyeOff size={15} style={{ marginRight: '6px' }} />
                      <span>Ẩn Khoảnh Khắc</span>
                    </>
                  )}
                </button>

                {/* Delete */}
                <button
                  className="btn btn-outline"
                  onClick={() => handleDeleteMoment(selectedMoment.id)}
                  style={{ fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444' }}
                >
                  <Trash2 size={15} style={{ marginRight: '6px' }} />
                  <span>Xóa Vĩnh Viễn</span>
                </button>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setSelectedMoment(null)}
                style={{ padding: '8px 20px', fontSize: '0.85rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Lightbox */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 20000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <button
            onClick={() => setEnlargedImage(null)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <X size={26} />
          </button>
          <img
            src={enlargedImage}
            alt="Enlarged"
            style={{ maxWidth: '90%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}
          />
        </div>
      )}
    </div>
  );
};

export default MomentsTab;
