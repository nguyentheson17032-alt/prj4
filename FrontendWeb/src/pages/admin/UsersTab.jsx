import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, Ban, Gamepad2, Search,
  RotateCcw, RefreshCw, Lock, Unlock, Eye, X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getUserAvatar } from '../../utils/avatarUtils';
import { BanUserModal } from '../../components/modals/BanUserModal';
import { UnbanUserModal } from '../../components/modals/UnbanUserModal';
import { UserDetailModal } from '../../components/modals/UserDetailModal';

export const UsersTab = ({ usersList = [], setUsersList, loading, reloadUsers }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, BANNED
  const [sortBy, setSortBy] = useState('NEWEST'); // NEWEST, BALANCE_DESC, USERNAME_ASC
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [selectedUserToBan, setSelectedUserToBan] = useState(null);
  const [selectedUserUnban, setSelectedUserUnban] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);

  const { addToast } = useToast();

  // Metrics
  const totalUsers = usersList.length;
  const bannedCount = useMemo(() => {
    return usersList.filter(u => u.enabled === false || u.accountNonLocked === false || u.activeBan != null).length;
  }, [usersList]);
  const activeCount = totalUsers - bannedCount;
  const playerCount = useMemo(() => {
    return usersList.filter(u => u.roles && u.roles.some(r => r.includes('PLAYER'))).length;
  }, [usersList]);

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    return usersList
      .filter(u => {
        // Role filter
        if (roleFilter !== 'ALL') {
          const matchRole = u.roles && u.roles.some(r => r.includes(roleFilter));
          if (!matchRole) return false;
        }

        // Status filter
        const isBanned = u.enabled === false || u.accountNonLocked === false || u.activeBan != null;
        if (statusFilter === 'ACTIVE' && isBanned) return false;
        if (statusFilter === 'BANNED' && !isBanned) return false;

        // Search text
        if (search.trim()) {
          const term = search.toLowerCase().trim();
          const username = (u.username || '').toLowerCase();
          const fullName = (u.fullName || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const phone = (u.phoneNumber || u.phone || '').toLowerCase();
          return username.includes(term) || fullName.includes(term) || email.includes(term) || phone.includes(term);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'BALANCE_DESC') {
          const balA = Number(a.coin ?? a.walletBalance ?? a.balance ?? 0);
          const balB = Number(b.coin ?? b.walletBalance ?? b.balance ?? 0);
          return balB - balA;
        }
        if (sortBy === 'USERNAME_ASC') {
          return (a.username || '').localeCompare(b.username || '');
        }
        // Default NEWEST (by id desc)
        return (b.id || 0) - (a.id || 0);
      });
  }, [usersList, roleFilter, statusFilter, search, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter, sortBy]);

  const hasActiveFilters = Boolean(
    search || roleFilter !== 'ALL' || statusFilter !== 'ALL' || sortBy !== 'NEWEST'
  );

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('NEWEST');
  };

  const handleBanSuccess = (userId, banData) => {
    setUsersList?.(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          enabled: false,
          accountNonLocked: false,
          activeBan: {
            reason: banData.reason,
            description: banData.description,
            banType: banData.banType,
            banExpiresAt: banData.banExpiresAt,
            bannedAt: new Date().toISOString()
          }
        };
      }
      return u;
    }));
    addToast('Đã khóa tài khoản thành công!', 'success');
    reloadUsers?.();
  };

  const handleUnbanSuccess = (userId) => {
    setUsersList?.(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          enabled: true,
          accountNonLocked: true,
          activeBan: null
        };
      }
      return u;
    }));
    addToast('Đã mở khóa tài khoản thành công!', 'success');
    reloadUsers?.();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Summary Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tổng Người Dùng</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '2px' }}>{totalUsers}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Đang Hoạt Động</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{activeCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ban size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase' }}>Đang Bị Khóa</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{bannedCount}</div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gamepad2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Game Thủ / Idol</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4', marginTop: '2px' }}>{playerCount}</div>
          </div>
        </div>
      </div>

      {/* ── Main User Table Panel ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Header Title & Top Right Search / Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              Quản Lý Người Dùng & Phân Quyền ({filteredUsers.length})
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Kiểm soát tài khoản, áp dụng chế tài kỷ luật khóa/mở khóa tức thì
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
                placeholder="Tìm tên, username, email, SĐT..."
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

            {reloadUsers && (
              <button
                className="btn btn-outline"
                style={{ height: '38px', width: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                onClick={reloadUsers}
                title="Làm mới danh sách"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toolbar: Responsive Dropdowns */}
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
          {/* Role Filter */}
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
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="ADMIN">🛡️ Admin</option>
              <option value="PLAYER">🎮 Game thủ</option>
              <option value="USER">👤 Thành viên</option>
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
              <option value="ACTIVE">🟢 Đang hoạt động</option>
              <option value="BANNED">🔒 Đang bị khóa</option>
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
              <option value="NEWEST">Mới nhất trước</option>
              <option value="BALANCE_DESC">Số dư ví: Cao → Thấp</option>
              <option value="USERNAME_ASC">Tên đăng nhập (A-Z)</option>
            </select>
          </div>

          {/* Nút reset nếu có filter hoạt động */}
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
          Đang hiển thị <strong>{filteredUsers.length}</strong> / {totalUsers} người dùng
          <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
          Hoạt động: <strong style={{ color: '#10b981' }}>{activeCount}</strong> • Bị khóa: <strong style={{ color: '#ef4444' }}>{bannedCount}</strong> • Game thủ: <strong style={{ color: '#06b6d4' }}>{playerCount}</strong>
        </div>

        {/* User Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Thành viên</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Email & Liên Hệ</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Số dư ví</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Vai trò</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Đang tải danh sách tài khoản...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                paginatedUsers.map(u => {
                  const isAdmin = u.roles?.some(r => r.includes('ADMIN'));
                  const isPlayer = u.roles?.some(r => r.includes('PLAYER'));
                  const isBanned = u.enabled === false || u.accountNonLocked === false || u.activeBan != null;
                  const activeBan = u.activeBan;
                  const walletVal = Number(u.coin ?? u.walletBalance ?? u.balance ?? 0);

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s',
                        background: isBanned ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                      }}
                    >
                      {/* Member Info */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={getUserAvatar(u)}
                            alt=""
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: isBanned ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.08)'
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{u.fullName || u.username}</span>
                              <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                                #{u.id}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Phone */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{u.email || '—'}</div>
                        {(u.phoneNumber || u.phone) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            📞 {u.phoneNumber || u.phone}
                          </div>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td style={{ padding: '14px', fontWeight: 800, color: walletVal > 0 ? '#10b981' : 'var(--text-muted)' }}>
                        {walletVal.toLocaleString('vi-VN')} đ
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            background: isAdmin ? 'rgba(244,63,94,0.15)' : isPlayer ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.08)',
                            color: isAdmin ? '#f43f5e' : isPlayer ? '#06b6d4' : 'var(--text-muted)'
                          }}
                        >
                          {isAdmin ? '🛡️ Admin' : isPlayer ? '🎮 Game thủ' : '👤 Thành viên'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px' }}>
                        {isBanned ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                width: 'fit-content'
                              }}
                            >
                              <Lock size={11} />
                              Bị khóa
                            </span>
                            {activeBan && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  color: '#f87171',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={activeBan.reason}
                              >
                                {activeBan.banType === 'TEMPORARY' ? '⏳ Tạm thời' : '🛑 Vĩnh viễn'}
                                {activeBan.reason ? `: ${activeBan.reason}` : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            Sẵn sàng
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            className="btn btn-outline"
                            title="Xem chi tiết người dùng"
                            style={{ padding: '5px 8px', height: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}
                            onClick={() => setSelectedUserDetail(u)}
                          >
                            <Eye size={13} />
                          </button>

                          {isAdmin ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 8px' }}>
                              Bảo vệ
                            </span>
                          ) : isBanned ? (
                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                height: 'auto',
                                borderColor: '#10b981',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: 700
                              }}
                              onClick={() => setSelectedUserUnban(u)}
                            >
                              <Unlock size={13} />
                              <span>Mở khóa</span>
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.75rem',
                                height: 'auto',
                                borderColor: '#ef4444',
                                color: '#ef4444',
                                background: 'rgba(239, 68, 68, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontWeight: 700
                              }}
                              onClick={() => setSelectedUserToBan(u)}
                            >
                              <Lock size={13} />
                              <span>Khóa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        {!loading && filteredUsers.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Hiển thị <strong>{((currentPage - 1) * pageSize) + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> trên tổng số <strong>{filteredUsers.length}</strong> người dùng
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '5px 10px', height: 'auto', fontSize: '0.78rem' }}
              >
                Trước
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <React.Fragment key={page}>
                      {prev && page - prev > 1 && (
                        <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>
                      )}
                      <button
                        className={currentPage === page ? 'btn btn-primary' : 'btn btn-outline'}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: '5px 10px',
                          height: 'auto',
                          fontSize: '0.78rem',
                          minWidth: '32px'
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '5px 10px', height: 'auto', fontSize: '0.78rem' }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <BanUserModal
        isOpen={Boolean(selectedUserToBan)}
        onClose={() => setSelectedUserToBan(null)}
        user={selectedUserToBan}
        onSuccess={handleBanSuccess}
      />

      <UnbanUserModal
        isOpen={Boolean(selectedUserUnban)}
        onClose={() => setSelectedUserUnban(null)}
        user={selectedUserUnban}
        onSuccess={handleUnbanSuccess}
      />

      <UserDetailModal
        isOpen={Boolean(selectedUserDetail)}
        onClose={() => setSelectedUserDetail(null)}
        user={selectedUserDetail}
      />
    </div>
  );
};

export default UsersTab;
