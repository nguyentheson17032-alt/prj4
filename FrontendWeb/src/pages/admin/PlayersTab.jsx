import React, { useState, useEffect, useMemo } from 'react';
import { Search, RotateCcw, Eye, Check, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { getUserAvatar } from '../../utils/avatarUtils';
import { StatusBadge } from './adminHelpers';
import { PlayerDetailModal, getPrimaryGame } from '../../components/modals/PlayerDetailModal';

export const PlayersTab = ({ playersList, setPlayersList, loading }) => {
  const { addToast } = useToast();
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gameFilter, setGameFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('REVENUE_DESC');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    api.getPlayersSummary().then(d => { setSummaryData(d); setSummaryLoading(false); });
  }, []);

  const pendingPlayers = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING');
  const activePlayers = playersList.filter(p => p.status !== 'PENDING' && p.adminStatus !== 'PENDING');

  // Danh sách các tựa game có trong hệ thống để đưa vào dropdown bộ lọc
  const availableGameNames = useMemo(() => {
    const set = new Set();
    summaryData.forEach(p => {
      const g = p.gameName || p.game;
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [summaryData]);

  // Gộp các hồ sơ game theo từng Game thủ duy nhất
  const groupedPlayers = useMemo(() => {
    const map = new Map();
    summaryData.forEach(p => {
      const key = p.userId ? String(p.userId) : (p.email || p.name || p.playerName || p.id);
      if (!map.has(key)) {
        map.set(key, {
          key,
          id: p.id,
          userId: p.userId,
          name: p.name || p.fullName || p.playerName,
          playerName: p.playerName || p.username || '',
          email: p.email,
          avatarUrl: p.avatarUrl,
          games: [],
          totalOrders: 0,
          totalReviews: 0,
          totalRevenue: 0,
          status: p.status || 'AVAILABLE',
          ratings: []
        });
      }
      const group = map.get(key);
      const gName = p.gameName || p.game;
      if (gName && !group.games.some(g => g.name === gName)) {
        group.games.push({
          id: p.id,
          name: gName,
          rank: p.rankLabel || '',
          status: p.status,
          totalOrders: p.totalOrders || 0,
          rating: p.rating || 0,
          totalRevenue: p.totalRevenue || 0,
          pricePerHour: p.pricePerHour || p.price || 0,
          server: p.server || '',
          role: p.role || '',
          bio: p.bio || p.description || '',
          totalReviews: p.totalReviews || 0
        });
      }
      group.totalOrders += (p.totalOrders || 0);
      group.totalReviews += (p.totalReviews || 0);
      group.totalRevenue += (p.totalRevenue || 0);
      if (p.rating > 0) {
        group.ratings.push(p.rating);
      }
      if (p.status === 'AVAILABLE') {
        group.status = 'AVAILABLE';
      }
    });

    return Array.from(map.values()).map(g => ({
      ...g,
      avgRating: g.ratings.length ? (g.ratings.reduce((a, b) => a + b, 0) / g.ratings.length) : 0
    }));
  }, [summaryData]);

  const filteredGrouped = useMemo(() => {
    return groupedPlayers
      .filter(p => {
        // Search
        if (search.trim()) {
          const s = search.toLowerCase().trim();
          const matchName = (p.name || '').toLowerCase().includes(s);
          const matchUsername = (p.playerName || '').toLowerCase().includes(s);
          const matchGame = p.games.some(g => (g.name || '').toLowerCase().includes(s));
          if (!matchName && !matchUsername && !matchGame) return false;
        }
        // Game filter
        if (gameFilter !== 'ALL') {
          const hasGame = p.games.some(g => g.name === gameFilter);
          if (!hasGame) return false;
        }
        // Status filter
        if (statusFilter !== 'ALL' && p.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'REVENUE_DESC') return (b.totalRevenue || 0) - (a.totalRevenue || 0);
        if (sortBy === 'ORDERS_DESC') return (b.totalOrders || 0) - (a.totalOrders || 0);
        if (sortBy === 'RATING_DESC') return (b.avgRating || 0) - (a.avgRating || 0);
        if (sortBy === 'NAME_ASC') return (a.name || '').localeCompare(b.name || '');
        return 0;
      });
  }, [groupedPlayers, search, gameFilter, statusFilter, sortBy]);

  const hasActiveFilters = Boolean(
    search || gameFilter !== 'ALL' || statusFilter !== 'ALL' || sortBy !== 'REVENUE_DESC'
  );

  const handleResetFilters = () => {
    setSearch('');
    setGameFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('REVENUE_DESC');
  };

  const handleApprove = async (pid) => {
    try {
      await api.approvePlayer(pid);
      setPlayersList(prev => prev.map(p => String(p.id) === String(pid) ? { ...p, status: 'AVAILABLE', adminStatus: 'APPROVED' } : p));
      addToast('Đã phê duyệt Game thủ!', 'success');
    } catch { addToast('Phê duyệt thất bại', 'error'); }
  };

  const handleReject = async (pid) => {
    try {
      await api.rejectPlayer(pid);
      setPlayersList(prev => prev.filter(p => String(p.id) !== String(pid)));
      addToast('Đã từ chối hồ sơ', 'info');
    } catch { addToast('Thao tác thất bại', 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Pending approvals */}
      {pendingPlayers.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Hồ Sơ Chờ Duyệt ({pendingPlayers.length})</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {pendingPlayers.map(p => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <img src={getUserAvatar(p)} alt="" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.fullName || p.name || p.username}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{p.primaryGame || p.game || '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{(p.pricePerHour || p.price || 0).toLocaleString('vi-VN')} đ/h</div>
                  </div>
                </div>
                {p.bio && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', margin: '0 0 12px' }}>"{p.bio}"</p>}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.82rem', background: '#10b981', borderColor: '#10b981' }} onClick={() => handleApprove(p.id)}>
                    <Check size={14} /> <span>Phê duyệt</span>
                  </button>
                  <button className="btn btn-outline" style={{ padding: '8px 12px', fontSize: '0.82rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => handleReject(p.id)}>
                    <X size={14} /> <span>Từ chối</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full player list with summary data */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Header Title & Top Right Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Danh Sách Game Thủ ({filteredGrouped.length})
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Đã tối ưu gộp {summaryData.length} hồ sơ theo {groupedPlayers.length} Game thủ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}
              />
              <input
                className="form-control"
                style={{
                  paddingLeft: '34px',
                  paddingRight: search ? '30px' : '12px',
                  height: '38px',
                  fontSize: '0.85rem',
                  width: '100%',
                  borderRadius: '10px'
                }}
                placeholder="Tìm game thủ, username, game..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Controls Toolbar: Responsive Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            width: '100%',
            marginBottom: '16px'
          }}
        >
          {/* Game Filter */}
          <div style={{ flex: '1 1 150px', minWidth: '135px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
            >
              <option value="ALL">🎮 Tất cả game</option>
              {availableGameNames.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="AVAILABLE">🟢 Đang sẵn sàng</option>
              <option value="BANNED">🔒 Đang bị khóa</option>
              <option value="PENDING">⏳ Chờ duyệt</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{
                height: '40px',
                fontSize: '0.85rem',
                width: '100%',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="REVENUE_DESC">Doanh thu cao nhất</option>
              <option value="ORDERS_DESC">Số đơn nhiều nhất</option>
              <option value="RATING_DESC">Đánh giá cao nhất</option>
              <option value="NAME_ASC">Tên game thủ (A-Z)</option>
            </select>
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '40px', padding: '0 12px', fontSize: '0.82rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={handleResetFilters}
            >
              <RotateCcw size={13} />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Thanh tóm tắt kết quả theo bộ lọc */}
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Đang hiển thị <strong>{filteredGrouped.length}</strong> / {groupedPlayers.length} game thủ
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game thủ</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Game đã đăng ký</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Đánh giá</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tổng đơn</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Doanh thu</th>
                <th style={{ padding: '10px 14px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {summaryLoading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
              ) : filteredGrouped.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không có game thủ nào phù hợp</td></tr>
              ) : (
                filteredGrouped.map(p => {
                  const primaryGame = getPrimaryGame(p.games);
                  const hasMultiple = p.games && p.games.length > 1;

                  return (
                    <tr key={p.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {/* Game thủ */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={getUserAvatar(p)} alt="" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{p.name || p.playerName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              @{p.playerName || 'player'} {p.email ? `• ${p.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Game đã đăng ký */}
                      <td style={{ padding: '14px' }}>
                        {primaryGame ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: '#a5b4fc',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <span>🎮 {primaryGame.name}</span>
                              {primaryGame.rank && <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({primaryGame.rank})</span>}
                            </span>
                            {hasMultiple && (
                              <span
                                title={`Đã đăng ký ${p.games.length} game. Nhấn "Xem chi tiết" để xem tất cả.`}
                                style={{
                                  color: 'var(--text-muted)',
                                  fontWeight: 800,
                                  fontSize: '0.95rem',
                                  letterSpacing: '1px',
                                  userSelect: 'none',
                                  cursor: 'pointer'
                                }}
                                onClick={() => setSelectedPlayer(p)}
                              >
                                .....
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Đánh giá */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        ⭐ {p.avgRating > 0 ? p.avgRating.toFixed(1) : '0.0'}
                      </td>

                      {/* Tổng đơn */}
                      <td style={{ padding: '14px', fontWeight: 600 }}>{p.totalOrders} đơn</td>

                      {/* Doanh thu */}
                      <td style={{ padding: '14px', color: '#10b981', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {(p.totalRevenue || 0).toLocaleString('vi-VN')} đ
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '14px' }}>
                        <StatusBadge status={p.status || 'AVAILABLE'} />
                      </td>

                      {/* Thao tác: Chi tiết */}
                      <td style={{ padding: '14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPlayer(p)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            gap: '6px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Xem toàn bộ thông tin chi tiết game thủ"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />
    </div>
  );
};

export default PlayersTab;
