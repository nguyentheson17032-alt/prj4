import React, { useState, useEffect, useMemo } from 'react';
import {
  Percent, ShoppingBag, Sparkles, DollarSign, Search,
  RefreshCw, Eye, X
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { getUserAvatar } from '../../utils/avatarUtils';
import { MetricCard, StatusBadge } from './adminHelpers';

export const CommissionTab = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchCommissionData = async () => {
    setLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        api.getAdminCommissionStats(),
        api.getAdminCommissionTransactions({ type: typeFilter, search })
      ]);
      setStats(sData);
      setTransactions(tData);
    } catch (err) {
      console.error('Lỗi tải dữ liệu chiết khấu:', err);
      addToast('Không thể tải dữ liệu chiết khấu sàn', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommissionData();
  }, [typeFilter]);

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(t =>
      t.transactionCode?.toLowerCase().includes(q) ||
      t.senderFullName?.toLowerCase().includes(q) ||
      t.senderUsername?.toLowerCase().includes(q) ||
      t.receiverFullName?.toLowerCase().includes(q) ||
      t.receiverUsername?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Policy Card Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(236,72,153,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
        borderRadius: '16px',
        padding: '22px 26px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'var(--primary)', color: '#fff', display: 'flex' }}>
              <Percent size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Chính Sách Chiết Khấu Sàn: 15% Cố Định</h3>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Áp dụng tự động cho <strong>toàn bộ giao dịch Thuê Player và Donate quà tặng</strong>.
            Người dùng chi trả 100%, <strong>Game thủ (Idol) thực nhận 85%</strong> và <strong>Nền tảng thu 15%</strong> làm phí vận hành và dịch vụ.
          </p>
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '12px 18px',
          minWidth: '240px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
            💡 Ví dụ minh họa
          </div>
          <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>Tổng giao dịch: <strong>1.000.000 đ</strong></div>
            <div style={{ color: '#10b981', fontWeight: 700 }}>→ Sàn thu (15%): +150.000 đ</div>
            <div style={{ color: '#38bdf8', fontWeight: 700 }}>→ Idol nhận (85%): +850.000 đ</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <MetricCard
          label="Tổng Chiết Khấu Thu Được (15%)"
          value={`${(stats?.totalCommissionRevenue || 0).toLocaleString('vi-VN')} đ`}
          sub={`Từ ${stats?.totalTransactions || 0} giao dịch hoàn tất`}
          icon={Percent}
          color="#10b981"
        />
        <MetricCard
          label="Chiết Khấu Thuê Player (15%)"
          value={`${(stats?.hireCommissionRevenue || 0).toLocaleString('vi-VN')} đ`}
          sub={`${stats?.hireTransactions || 0} đơn thuê hoàn thành`}
          icon={ShoppingBag}
          color="#6366f1"
        />
        <MetricCard
          label="Chiết Khấu Donate Tặng Quà (15%)"
          value={`${(stats?.donateCommissionRevenue || 0).toLocaleString('vi-VN')} đ`}
          sub={`${stats?.donateTransactions || 0} lượt tặng quà thành công`}
          icon={Sparkles}
          color="#ec4899"
        />
        <MetricCard
          label="Tổng Giá Trị Giao Dịch (GMV)"
          value={`${(stats?.totalTransactionVolume || 0).toLocaleString('vi-VN')} đ`}
          sub={`Idol đã nhận 85%: ${(stats?.totalPlayerEarnings || 0).toLocaleString('vi-VN')} đ`}
          icon={DollarSign}
          color="#06b6d4"
        />
      </div>

      {/* Transactions Container */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Controls Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'Tất Cả Giao Dịch' },
              { id: 'HIRE', label: '🎮 Thuê Player' },
              { id: 'DONATE', label: '🎁 Donate Quà Tặng' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTypeFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: typeFilter === tab.id ? 'var(--primary)' : 'transparent',
                  color: typeFilter === tab.id ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '220px' }}
                placeholder="Tìm mã GD, người gửi, Idol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={fetchCommissionData}
              className="btn btn-outline"
              style={{ height: '36px', padding: '0 12px', fontSize: '0.82rem' }}
              title="Làm mới"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span style={{ marginLeft: '6px' }}>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Mã GD</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Thời Gian</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Loại Giao Dịch</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Người Chi Trả</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Game Thủ (Idol)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Giá Gốc (100%)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Phí Sàn (15%)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Idol Nhận (85%)</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu chiết khấu...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Không tìm thấy giao dịch chiết khấu nào phù hợp
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(t => {
                  const isHire = t.type === 'HIRE';
                  return (
                    <tr
                      key={t.transactionCode || t.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px', fontWeight: 800, color: 'var(--primary)' }}>
                        #{t.transactionCode || t.id}
                      </td>
                      <td style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {t.createdAt || '—'}
                      </td>
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isHire ? 'rgba(99,102,241,0.15)' : 'rgba(236,72,153,0.15)',
                          color: isHire ? '#818cf8' : '#f472b6',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          {isHire ? <ShoppingBag size={12} /> : <Sparkles size={12} />}
                          {t.typeLabel || (isHire ? 'Thuê Player' : 'Donate')}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={getUserAvatar({ avatar: t.senderAvatar, username: t.senderUsername })}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{t.senderFullName || t.senderUsername || 'Khách'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{t.senderUsername || 'user'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={getUserAvatar({ avatar: t.receiverAvatar, username: t.receiverUsername })}
                            alt=""
                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#fbbf24' }}>{t.receiverFullName || t.receiverUsername || 'Player'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{t.receiverUsername || 'player'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600 }}>
                        {(t.originalAmount || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>
                        +{(t.platformFee || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right', fontWeight: 800, color: '#38bdf8' }}>
                        {(t.playerReceived || 0).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <StatusBadge status={t.status || 'COMPLETED'} />
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedTx(t)}
                          style={{
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            borderRadius: '8px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--primary)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
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

      {/* Transaction Detail Breakdown Modal */}
      {selectedTx && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            borderRadius: '18px', padding: '26px', maxWidth: '520px', width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>
                  <Percent size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Chi Tiết Chiết Khấu #{selectedTx.transactionCode}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedTx.createdAt || 'Hôm nay'}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Parties Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Người Trả / Khách</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={getUserAvatar({ avatar: selectedTx.senderAvatar, username: selectedTx.senderUsername })} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{selectedTx.senderFullName || selectedTx.senderUsername}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{selectedTx.senderUsername}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Game Thủ (Idol)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={getUserAvatar({ avatar: selectedTx.receiverAvatar, username: selectedTx.receiverUsername })} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>{selectedTx.receiverFullName || selectedTx.receiverUsername}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{selectedTx.receiverUsername}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Formula Breakdown Box */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.08) 100%)',
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px' }}>
                Hạch Toán Chiết Khấu (Tỷ lệ 15%)
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Tổng giá trị giao dịch gốc (100%):</span>
                <span style={{ fontWeight: 700 }}>{(selectedTx.originalAmount || 0).toLocaleString('vi-VN')} đ</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.88rem', color: '#10b981' }}>
                <span>Phí chiết khấu sàn thu (15%):</span>
                <span style={{ fontWeight: 800 }}>-{(selectedTx.platformFee || 0).toLocaleString('vi-VN')} đ</span>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '1rem', color: '#38bdf8' }}>
                <span style={{ fontWeight: 700 }}>Idol thực nhận vào ví (85%):</span>
                <span style={{ fontWeight: 900 }}>{(selectedTx.playerReceived || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Note & Description */}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              <strong>Mô tả:</strong> {selectedTx.description || 'Giao dịch qua cổng PlayZone'}
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="btn btn-primary"
              style={{ width: '100%', height: '40px', fontSize: '0.88rem' }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionTab;
