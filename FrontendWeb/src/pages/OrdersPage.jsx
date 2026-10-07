import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Star,
  Gamepad2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import api from '../api/apiService';
import RateOrderModal from '../components/modals/RateOrderModal';
import { useToast } from '../context/ToastContext';
import '../styles/orders.css';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, IN_PROGRESS, COMPLETED, CANCELLED
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const data = await api.getOrders();
      setOrders(data || []);
      setLoading(false);
    };
    fetchOrders();
  }, []);

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không? Tiền sẽ được hoàn lại vào ví 100%.')) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
      addToast('Đã hủy đơn hàng thành công và hoàn tiền vào ví!', 'success');
    }
  };

  const handleCompleteOrder = (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'COMPLETED' } : o));
    addToast('Đơn hàng đã được đánh dấu hoàn tất!', 'success');
  };

  const handleReviewed = (orderId, rating, comment) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isReviewed: true, reviewRating: rating } : o));
  };

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'ALL') return true;
    return o.status === activeFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="badge badge-online">⚡ Đang Thực Hiện</span>;
      case 'PENDING':
        return <span className="badge badge-busy">⏳ Chờ Bắt Đầu</span>;
      case 'COMPLETED':
        return <span className="badge badge-primary">✅ Đã Hoàn Tất</span>;
      case 'CANCELLED':
        return <span className="badge badge-offline">❌ Đã Hủy</span>;
      default:
        return <span className="badge badge-offline">{status}</span>;
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Quản Lý <span className="gradient-text">Đơn Thuê Của Bạn</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Theo dõi tiến độ thuê Duo, trò chuyện, chấm điểm và đánh giá dịch vụ.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="orders-tabs">
        <button
          className={`order-tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          Tất Cả ({orders.length})
        </button>
        <button
          className={`order-tab-btn ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IN_PROGRESS')}
        >
          Đang Thực Hiện ({orders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'PENDING').length})
        </button>
        <button
          className={`order-tab-btn ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          Đã Hoàn Tất ({orders.filter(o => o.status === 'COMPLETED').length})
        </button>
        <button
          className={`order-tab-btn ${activeFilter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('CANCELLED')}
        >
          Đã Hủy ({orders.filter(o => o.status === 'CANCELLED').length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải danh sách đơn thuê...
        </div>
      ) : filteredOrders.length > 0 ? (
        <div>
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              {/* Card Header */}
              <div className="order-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Mã đơn: #{order.id}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    • Ngày tạo: {order.createdAt}
                  </span>
                </div>
                <div>{getStatusBadge(order.status)}</div>
              </div>

              {/* Card Body */}
              <div className="order-body">
                <div className="order-player-info">
                  <img
                    src={order.player?.avatar}
                    alt={order.player?.fullName}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                  />
                  <div>
                    <Link to={`/player/${order.player?.id}`} style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                      {order.player?.fullName}
                    </Link>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Game: <strong style={{ color: 'var(--secondary)' }}>{order.game}</strong> • Thời lượng: <strong>{order.hours} Giờ</strong>
                    </div>
                    {order.note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                        Ghi chú: "{order.note}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Price and Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-pink)' }}>
                      {(order.finalPrice || order.totalPrice || 0).toLocaleString('vi-VN')} đ
                    </div>
                    {order.discount > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)' }}>
                        Đã giảm {(order.discount || 0).toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </div>

                  <div className="order-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/chat?player=${order.player?.id}`)}
                    >
                      <MessageSquare size={16} />
                      <span>Nhắn Tin</span>
                    </button>

                    {order.status === 'IN_PROGRESS' && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleCompleteOrder(order.id)}
                        >
                          <CheckCircle2 size={16} />
                          <span>Hoàn Thành</span>
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          Hủy Đơn
                        </button>
                      </>
                    )}

                    {order.status === 'COMPLETED' && (
                      order.isReviewed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontSize: '0.88rem', fontWeight: 700 }}>
                          <Star size={16} fill="#f59e0b" color="#f59e0b" />
                          <span>Đã Đánh Giá {order.reviewRating || 5} ⭐</span>
                        </div>
                      ) : (
                        <button
                          className="btn btn-cyan btn-sm"
                          onClick={() => setSelectedOrderForReview(order)}
                        >
                          <Star size={16} />
                          <span>Đánh Giá Player</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <ShoppingBag size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px auto' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Chưa Có Đơn Thuê Nào</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Hãy ghé thăm trang khám phá để tìm idol bạn yêu thích và bắt đầu trải nghiệm!
          </p>
          <Link to="/explore" className="btn btn-primary">
            Tìm Player Ngay
          </Link>
        </div>
      )}

      {/* Review Modal */}
      <RateOrderModal
        order={selectedOrderForReview}
        isOpen={!!selectedOrderForReview}
        onClose={() => setSelectedOrderForReview(null)}
        onReviewed={handleReviewed}
      />
    </div>
  );
};

export default OrdersPage;
