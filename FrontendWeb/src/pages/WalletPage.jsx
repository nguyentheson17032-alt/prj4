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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiService';
import '../styles/wallet.css';

export const WalletPage = ({ onOpenDeposit }) => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState('ALL');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const [ordersData, topupsData] = await Promise.allSettled([
          api.getOrders(),
          api.getTopupHistory()
        ]);

        const list = [];

        if (ordersData.status === 'fulfilled' && Array.isArray(ordersData.value)) {
          ordersData.value.forEach(o => {
            list.push({
              id: `ORD-${o.id}`,
              type: 'PAYMENT',
              amount: -(o.totalPrice || 0),
              description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
              date: o.createdAt || 'Hôm nay',
              status: o.status || 'COMPLETED',
              rawDate: o.createdAt ? new Date(o.createdAt).getTime() : 0
            });
          });
        }

        if (topupsData.status === 'fulfilled' && Array.isArray(topupsData.value)) {
          topupsData.value.forEach(t => {
            list.push({
              id: `TOPUP-${t.id}`,
              type: 'DEPOSIT',
              amount: +(t.coin || 0),
              description: `Nạp tiền vào ví (${t.method || 'VIETQR'})`,
              date: t.dateTime || 'Hôm nay',
              status: t.status || 'COMPLETED',
              rawDate: t.dateTime ? new Date(t.dateTime).getTime() : 0
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
  }, []);

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
              {(user?.balance || 0).toLocaleString('vi-VN')} đ
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
            <div style={{ display: 'flex', gap: '8px' }}>
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
                        {tx.type === 'DONATE' && <span className="badge badge-vip">🎁 Tặng Quà</span>}
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
                        <span className="badge badge-online">Thành Công</span>
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
