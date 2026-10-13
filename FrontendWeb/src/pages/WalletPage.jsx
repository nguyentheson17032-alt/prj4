import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  Clock,
  Sparkles,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiService';
import '../styles/wallet.css';

const parseToTimestamp = (dateVal) => {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') return dateVal;
  if (dateVal instanceof Date) return dateVal.getTime();

  const str = String(dateVal).trim();

  // Dạng "HH:mm dd/MM/yyyy" hoặc "HH:mm:ss dd/MM/yyyy" (ví dụ từ backend: "18:03 12/10/2026")
  const timeDateMatch = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (timeDateMatch) {
    const [, hours, minutes, seconds = 0, day, month, year] = timeDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)).getTime();
  }

  // Dạng "dd/MM/yyyy HH:mm" hoặc "dd/MM/yyyy" (ví dụ: "12/10/2026 18:03" hoặc "12/10/2026")
  const dateTimeMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dateTimeMatch) {
    const [, day, month, year, hours = 0, minutes = 0, seconds = 0] = dateTimeMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)).getTime();
  }

  // Dạng ISO chuẩn từ LocalDateTime: "2026-10-13T09:59:12" hoặc tương tự
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const formatTransactionDate = (dateVal) => {
  if (!dateVal) return 'Hôm nay';
  const ts = parseToTimestamp(dateVal);
  if (!ts) return String(dateVal);
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

export const WalletPage = ({ onOpenDeposit }) => {
  const { user, refreshUser } = useAuth();
  const [filterType, setFilterType] = useState('ALL');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof refreshUser === 'function') {
      refreshUser();
    }
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const [ordersData, topupsData, donatesData] = await Promise.allSettled([
          api.getOrders(),
          api.getTopupHistory(),
          api.getDonateHistory()
        ]);

        const list = [];
        const currentUserId = user?.id ? String(user.id) : (localStorage.getItem('userId') || null);
        const currentUsername = (user?.username || localStorage.getItem('username') || '').toLowerCase().trim();

        // 1. Giao dịch Thuê / Nhận tiền thuê (Orders)
        if (ordersData.status === 'fulfilled' && Array.isArray(ordersData.value)) {
          ordersData.value.forEach(o => {
            const orderPlayerUserId = o.playerUserId || o.player?.userId || o.player?.user?.id;
            const orderPlayerId = o.playerId || o.player?.id;
            const orderPlayerName = (o.playerName || o.player?.username || o.player?.fullName || '').toLowerCase().trim();

            const isPlayer = Boolean(
              (currentUserId && (String(orderPlayerUserId) === currentUserId || String(orderPlayerId) === currentUserId)) ||
              (currentUsername && orderPlayerName === currentUsername)
            );

            const orderRenterId = o.renterId || o.renter?.id;
            const orderRenterName = (o.renterName || o.renter?.username || o.renter?.fullName || '').toLowerCase().trim();

            const isRenter = Boolean(
              (currentUserId && String(orderRenterId) === currentUserId) ||
              (currentUsername && orderRenterName === currentUsername)
            );

            const orderDateStr = o.startTime || o.createdAt;
            const orderRawDate = parseToTimestamp(orderDateStr);

            // Nếu là người được thuê (Player/Idol)
            if (isPlayer && !isRenter) {
              let earnedAmount = Math.round((o.totalPrice || 0) * 0.9);
              if (o.status === 'CONFIRMED') {
                earnedAmount = Math.round((o.totalPrice || 0) * 0.5);
              } else if (o.status === 'CANCELED' || o.status === 'REJECTED') {
                earnedAmount = 0;
              }

              list.push({
                id: `ORD-${o.id}`,
                type: 'RECEIVE',
                amount: +earnedAmount,
                description: `Nhận tiền thuê từ ${o.renterName || 'Khách'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: o.status || 'COMPLETED',
                rawDate: orderRawDate
              });
            } else if (isRenter && !isPlayer) {
              // Nếu là người thuê (Renter)
              list.push({
                id: `ORD-${o.id}`,
                type: 'PAYMENT',
                amount: -(o.totalPrice || 0),
                description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: o.status || 'COMPLETED',
                rawDate: orderRawDate
              });
            } else if (isPlayer && isRenter) {
              // Trường hợp tự thuê bản thân trong thử nghiệm
              let earnedAmount = Math.round((o.totalPrice || 0) * 0.9);
              list.push({
                id: `ORD-${o.id}-IN`,
                type: 'RECEIVE',
                amount: +earnedAmount,
                description: `Nhận tiền thuê từ ${o.renterName || 'Khách'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: o.status || 'COMPLETED',
                rawDate: orderRawDate
              });
              list.push({
                id: `ORD-${o.id}-OUT`,
                type: 'PAYMENT',
                amount: -(o.totalPrice || 0),
                description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: o.status || 'COMPLETED',
                rawDate: orderRawDate
              });
            } else {
              list.push({
                id: `ORD-${o.id}`,
                type: 'PAYMENT',
                amount: -(o.totalPrice || 0),
                description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: o.status || 'COMPLETED',
                rawDate: orderRawDate
              });
            }
          });
        }

        // 2. Giao dịch Nạp tiền (Topups)
        if (topupsData.status === 'fulfilled' && Array.isArray(topupsData.value)) {
          topupsData.value.forEach(t => {
            const topupDateStr = t.dateTime || t.createdAt;
            const topupRawDate = parseToTimestamp(topupDateStr);

            list.push({
              id: `TOPUP-${t.id}`,
              type: 'DEPOSIT',
              amount: +(t.coin || 0),
              description: `Nạp tiền vào ví (${t.method || 'VIETQR'})`,
              date: formatTransactionDate(topupDateStr),
              status: t.status || 'COMPLETED',
              rawDate: topupRawDate
            });
          });
        }

        // 3. Giao dịch Tặng quà & Nhận quà (Donates)
        if (donatesData.status === 'fulfilled' && Array.isArray(donatesData.value)) {
          donatesData.value.forEach(d => {
            const desc = (d.description || '').toLowerCase();
            const isReceive = Boolean(
              d.isReceive ||
              desc.startsWith('nhận') ||
              desc.includes('nhận quà') ||
              desc.includes('nhận donate')
            );

            const coinAmount = Number(d.coin || d.amount || 0);
            const donateDateStr = d.createdAt;
            const donateRawDate = parseToTimestamp(donateDateStr);

            list.push({
              id: `GIFT-${d.id}`,
              type: 'DONATE',
              subType: isReceive ? 'DONATE_RECEIVE' : 'DONATE_SENT',
              amount: isReceive ? +coinAmount : -coinAmount,
              description: d.description || (isReceive ? 'Nhận quà tặng từ fan' : 'Tặng quà Idol'),
              date: formatTransactionDate(donateDateStr),
              status: d.status || 'COMPLETED',
              rawDate: donateRawDate
            });
          });
        }

        list.sort((a, b) => b.rawDate - a.rawDate);
        setTransactions(list);
      } catch (err) {
        console.error('Lỗi khi tải lịch sử giao dịch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user?.id, user?.username]);

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Ví PlayZone & <span className="gradient-text">Lịch Sử Giao Dịch</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Quản lý số dư, nạp coin tự động và theo dõi minh bạch mọi biến động số dư.
        </p>
      </div>

      <div className="wallet-grid">
        {/* Left: Balance Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="balance-card-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="balance-title">Số Dư Khả Dụng</span>
              <Wallet size={24} color="#06b6d4" />
            </div>

            <div className="balance-amount">
              {(user?.balance || user?.coin || 0).toLocaleString('vi-VN')} đ
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={onOpenDeposit}
              >
                <PlusCircle size={18} />
                <span>Nạp Tiền Ngay</span>
              </button>
            </div>
          </div>

          {/* Quick info card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--accent-green)" />
              <span>Cam Kết Bảo Mật Tài Chính</span>
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <li>• Khớp lệnh nạp tiền tức thì qua mã VietQR 24/7.</li>
              <li>• Tiền được giữ an toàn trung gian và chỉ trừ khi bạn xác nhận hài lòng.</li>
              <li>• Hỗ trợ tra soát đối soát giao dịch trong 5 phút.</li>
            </ul>
          </div>
        </div>

        {/* Right: Transaction History */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Lịch Sử Biến Động Số Dư</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`order-tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('ALL')}
              >
                Tất Cả
              </button>
              <button
                className={`order-tab-btn ${filterType === 'DEPOSIT' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('DEPOSIT')}
              >
                Nạp Tiền
              </button>
              <button
                className={`order-tab-btn ${filterType === 'PAYMENT' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('PAYMENT')}
              >
                Thuê Player
              </button>
              <button
                className={`order-tab-btn ${filterType === 'RECEIVE' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('RECEIVE')}
              >
                Nhận Tiền Thuê
              </button>
              <button
                className={`order-tab-btn ${filterType === 'DONATE' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('DONATE')}
              >
                Tặng / Nhận Quà
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Mã Giao Dịch</th>
                  <th>Loại</th>
                  <th>Nội Dung</th>
                  <th>Số Tiền</th>
                  <th>Thời Gian</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{tx.id}</td>
                      <td>
                        {tx.type === 'DEPOSIT' && <span className="badge badge-online">+ Nạp Tiền</span>}
                        {tx.type === 'PAYMENT' && <span className="badge badge-primary">- Thuê Duo</span>}
                        {tx.type === 'RECEIVE' && (
                          <span className="badge badge-online" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            + Nhận Tiền Thuê
                          </span>
                        )}
                        {tx.type === 'DONATE' && (
                          tx.amount > 0 ? (
                            <span className="badge badge-online" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                              🎁 + Nhận Quà
                            </span>
                          ) : (
                            <span className="badge badge-vip" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                              🎁 - Tặng Quà
                            </span>
                          )
                        )}
                        {tx.type === 'REFUND' && <span className="badge badge-online">↺ Hoàn Tiền</span>}
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{tx.description}</td>
                      <td style={{
                        fontWeight: 800,
                        color: tx.amount > 0 ? 'var(--accent-green)' : 'var(--accent-pink)'
                      }}>
                        {tx.amount > 0 ? `+${tx.amount.toLocaleString('vi-VN')} đ` : `${tx.amount.toLocaleString('vi-VN')} đ`}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.date}</td>
                      <td>
                        {tx.status === 'COMPLETED' ? (
                          <span className="badge badge-online">Thành Công</span>
                        ) : tx.status === 'CONFIRMED' ? (
                          <span className="badge badge-primary">Đã Xác Nhận</span>
                        ) : tx.status === 'PENDING' ? (
                          <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>Chờ Xử Lý</span>
                        ) : tx.status === 'CANCELED' || tx.status === 'REJECTED' ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Đã Hủy</span>
                        ) : (
                          <span className="badge badge-online">{tx.status}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Chưa có lịch sử giao dịch nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
