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
import { useAuth } from '../context/AuthContext';
import { getUserAvatar } from '../utils/avatarUtils';
import '../styles/orders.css';

export const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, IN_PROGRESS, COMPLETED, CANCELLED
  const [selectedOrderForReview, setSelectedOrderForReview] = useState(null);
  const [, setTick] = useState(0);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleChatWithPartner = (order, isPlayer) => {
    const params = new URLSearchParams();
    if (isPlayer) {
      // Tôi là người được thuê (Player/Idol) -> Nhắn tin cho người thuê (Renter)
      const partnerId = order.renter?.id || order.renterId || '';
      const partnerName = order.renter?.fullName || order.renterName || 'Khách Hàng';
      const partnerUsername = order.renter?.username || order.renterName || '';
      const partnerAvatar = order.renter?.avatar || order.renterAvatarUrl || getUserAvatar({ username: partnerUsername || partnerName });
      
      if (partnerId) params.set('partnerId', partnerId);
      if (partnerName) params.set('name', partnerName);
      if (partnerUsername) params.set('username', partnerUsername);
      if (partnerAvatar) params.set('avatar', partnerAvatar);
      params.set('role', `Khách hàng thuê đơn #${order.id}`);
      params.set('isPlayer', 'false');
    } else {
      // Tôi là người đi thuê (Customer) -> Nhắn tin cho người mình thuê (Idol/Player)
      const partnerId = order.playerUserId || order.player?.userId || order.player?.user?.id || order.player?.id || order.playerId || '';
      const partnerName = order.player?.fullName || order.playerName || 'Idol Duo';
      const partnerUsername = order.player?.username || order.playerName || '';
      const partnerAvatar = order.player?.avatar || order.playerAvatarUrl || getUserAvatar({ username: partnerUsername || partnerName });
      
      if (partnerId) {
        params.set('partnerId', partnerId);
        params.set('player', order.playerId || order.player?.id || partnerId);
      }
      if (partnerName) params.set('name', partnerName);
      if (partnerUsername) params.set('username', partnerUsername);
      if (partnerAvatar) params.set('avatar', partnerAvatar);
      params.set('role', order.game || 'Idol Duo');
      params.set('isPlayer', 'true');
    }
    navigate(`/chat?${params.toString()}`);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const data = await api.getOrders();
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Cập nhật lại thời gian đếm ngược mỗi 15 giây
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Kiểm tra xem đơn đã hết thời gian thuê hay chưa
  const isOrderFinished = (order) => {
    if (!order.endTime) return true;
    try {
      const end = new Date(typeof order.endTime === 'string' ? order.endTime.replace(' ', 'T') : order.endTime);
      if (isNaN(end.getTime())) return true;
      return new Date() >= end;
    } catch (e) {
      return true;
    }
  };

  // Tính chuỗi thời gian còn lại
  const getRemainingTimeText = (endTime) => {
    if (!endTime) return null;
    try {
      const end = new Date(typeof endTime === 'string' ? endTime.replace(' ', 'T') : endTime);
      if (isNaN(end.getTime())) return null;
      const now = new Date();
      const diffMs = end - now;
      if (diffMs <= 0) return 'Đã hết giờ chơi';
      const totalMins = Math.ceil(diffMs / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      if (hours > 0) return `Còn ${hours}h ${mins}m`;
      return `Còn ${mins} phút`;
    } catch (e) {
      return null;
    }
  };

  const handleConfirmOrder = async (orderId) => {
    try {
      await api.confirmOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CONFIRMED' } : o));
      addToast('Đã xác nhận đơn thuê thành công!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi xác nhận đơn!';
      addToast(typeof msg === 'string' ? msg : 'Lỗi khi xác nhận đơn!', 'error');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không? Tiền sẽ được hoàn lại vào ví 100%.')) return;
    try {
      await api.cancelOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELED' } : o));
      addToast('Đã hủy đơn hàng thành công và hoàn tiền vào ví!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi hủy đơn hàng!';
      addToast(typeof msg === 'string' ? msg : 'Lỗi khi hủy đơn hàng!', 'error');
    }
  };

  const handleCompleteOrder = async (order) => {
    const finished = isOrderFinished(order);
    if (!finished) {
      const remaining = getRemainingTimeText(order.endTime);
      addToast(`Thời gian thuê chưa kết thúc (${remaining})! Chỉ có thể bấm hoàn thành khi đã hết giờ chơi.`, 'warning');
      return;
    }

    if (!window.confirm('Xác nhận hoàn tất đơn thuê này? Idol sẽ nhận nốt phần tiền còn lại.')) return;

    try {
      await api.completeOrder(order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'COMPLETED' } : o));
      addToast('Đơn hàng đã được đánh dấu hoàn tất thành công!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi hoàn thành đơn!';
      addToast(typeof msg === 'string' ? msg : 'Lỗi khi hoàn thành đơn!', 'error');
    }
  };

  const handleReviewed = async (orderId, rating, comment) => {
    try {
      await api.reviewOrder(orderId, rating, comment);
      addToast('Cảm ơn bạn đã gửi đánh giá cho Player!', 'success');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isReviewed: true, reviewRating: rating } : o));
    } catch (e) {
      console.warn('Backend review order warning:', e.message);
      const errMsg = e.response?.data?.message || e.message || 'Lỗi khi gửi đánh giá!';
      addToast(typeof errMsg === 'string' ? errMsg : 'Lỗi khi gửi đánh giá!', 'error');
    }
  };

  const filteredOrders = orders.filter(o => {
    // Chỉ hiển thị đơn thuộc về chính người dùng (người thuê hoặc người được thuê)
    const isRenter = Boolean(
      (user?.id && (
        String(user.id) === String(o.renterId) ||
        String(user.id) === String(o.renter?.id)
      )) ||
      (user?.username && (
        user.username.toLowerCase() === (o.renterName || '').toLowerCase() ||
        user.username.toLowerCase() === (o.renter?.username || '').toLowerCase()
      ))
    );

    const isPlayer = Boolean(
      (user?.id && (
        String(user.id) === String(o.playerUserId) ||
        String(user.id) === String(o.player?.userId) ||
        String(user.id) === String(o.player?.user?.id)
      )) ||
      (user?.username && (
        user.username.toLowerCase() === (o.playerName || '').toLowerCase() ||
        user.username.toLowerCase() === (o.player?.username || '').toLowerCase()
      ))
    );

    if (!isRenter && !isPlayer) return false;

    const s = o.status?.toUpperCase();
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'IN_PROGRESS') return s === 'IN_PROGRESS' || s === 'PENDING' || s === 'CONFIRMED';
    if (activeFilter === 'COMPLETED') return s === 'COMPLETED';
    if (activeFilter === 'CANCELLED') return s === 'CANCELLED' || s === 'CANCELED' || s === 'REJECTED';
    return true;
  });

  const getStatusBadge = (order) => {
    const status = order.status?.toUpperCase();
    switch (status) {
      case 'IN_PROGRESS':
      case 'CONFIRMED': {
        const finished = isOrderFinished(order);
        if (finished) {
          return <span className="badge badge-busy">⏰ Đã Hết Giờ (Chờ Hoàn Tất)</span>;
        }
        const remaining = getRemainingTimeText(order.endTime);
        return <span className="badge badge-online">🎮 Đang Trong Trận ({remaining || 'Đang chơi'})</span>;
      }
      case 'PENDING':
        return <span className="badge badge-busy">⏳ Chờ Bắt Đầu</span>;
      case 'COMPLETED':
        return <span className="badge badge-primary">✅ Đã Hoàn Tất</span>;
      case 'CANCELLED':
      case 'CANCELED':
        return <span className="badge badge-offline">❌ Đã Hủy</span>;
      case 'REJECTED':
        return <span className="badge badge-offline">🚫 Bị Từ Chối</span>;
      default:
        return <span className="badge badge-offline">{order.status || 'Chờ Xử Lý'}</span>;
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
          Đang Thực Hiện / Chờ ({orders.filter(o => ['IN_PROGRESS', 'PENDING', 'CONFIRMED'].includes(o.status?.toUpperCase())).length})
        </button>
        <button
          className={`order-tab-btn ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          Đã Hoàn Tất ({orders.filter(o => o.status?.toUpperCase() === 'COMPLETED').length})
        </button>
        <button
          className={`order-tab-btn ${activeFilter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('CANCELLED')}
        >
          Đã Hủy ({orders.filter(o => ['CANCELLED', 'CANCELED', 'REJECTED'].includes(o.status?.toUpperCase())).length})
        </button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Đang tải danh sách đơn thuê...
        </div>
      ) : filteredOrders.length > 0 ? (
        <div>
          {filteredOrders.map((order) => {
            const statusUpper = order.status?.toUpperCase();

            // Kiểm tra xem người dùng hiện tại có phải là người đi thuê (Renter) của đơn này hay không
            const isCurrentRenter = Boolean(
              (user?.id && (
                String(user.id) === String(order.renterId) ||
                String(user.id) === String(order.renter?.id)
              )) ||
              (user?.username && (
                user.username.toLowerCase() === (order.renterName || '').toLowerCase() ||
                user.username.toLowerCase() === (order.renter?.username || '').toLowerCase()
              ))
            );

            // Kiểm tra xem người dùng hiện tại có phải là người được thuê (Player/Idol) của đơn này hay không
            const isCurrentPlayer = Boolean(
              (user?.id && (
                String(user.id) === String(order.playerUserId) ||
                String(user.id) === String(order.player?.userId) ||
                String(user.id) === String(order.player?.user?.id)
              )) ||
              (user?.username && (
                user.username.toLowerCase() === (order.playerName || '').toLowerCase() ||
                user.username.toLowerCase() === (order.player?.username || '').toLowerCase()
              ))
            );

            const displayName = order.player?.fullName || order.playerName || 'Idol PlayZone';
            const displayAvatar = order.player?.avatar || order.playerAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${displayName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
            const renterDisplayName = order.renter?.fullName || order.renterName || 'Khách Hàng';
            const renterDisplayAvatar = order.renter?.avatar || order.renterAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${renterDisplayName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

            const displayTime = order.hireTime || order.createdAt || 'Hôm nay';
            const displayPrice = order.price || order.finalPrice || order.totalPrice || 0;

            return (
              <div key={order.id} className="order-card">
                {/* Card Header */}
                <div className="order-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      Mã đơn: #{order.id}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      • Ngày tạo: {displayTime}
                    </span>
                  </div>
                  <div>{getStatusBadge(order)}</div>
                </div>

                {/* Card Body */}
                <div className="order-body">
                  <div className="order-player-info">
                    <img
                      src={isCurrentPlayer ? renterDisplayAvatar : displayAvatar}
                      alt={isCurrentPlayer ? renterDisplayName : displayName}
                      style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${isCurrentPlayer ? renterDisplayName : displayName}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {isCurrentPlayer ? (
                          <>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                              {renterDisplayName}
                            </span>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: 'var(--primary)',
                              fontWeight: 700
                            }}>
                              Khách Hàng Thuê Bạn
                            </span>
                          </>
                        ) : (
                          <>
                            <Link to={order.player?.id ? `/player/${order.player.id}` : '#'} style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                              {displayName}
                            </Link>
                            {order.renterName && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                (Người thuê: <strong style={{ color: 'var(--text-secondary)' }}>{order.renterName}</strong>)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Game: <strong style={{ color: 'var(--secondary)' }}>{order.game || 'Duo Game'}</strong> • Thời lượng: <strong>{order.hours || 1} Giờ</strong>
                      </div>
                      {order.note && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                          Ghi chú: "{order.note}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price and Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-pink)' }}>
                        {displayPrice.toLocaleString('vi-VN')} đ
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
                        onClick={() => handleChatWithPartner(order, isCurrentPlayer)}
                        title={isCurrentPlayer ? `Nhắn tin cho khách hàng ${renterDisplayName}` : `Nhắn tin cho Idol ${displayName}`}
                      >
                        <MessageSquare size={16} />
                        <span>Nhắn Tin</span>
                      </button>

                      {/* Trạng thái PENDING: Có nút Đồng Ý / Xác Nhận và nút Hủy Đơn */}
                      {statusUpper === 'PENDING' && (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleConfirmOrder(order.id)}
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff' }}
                            title="Xác nhận nhận đơn thuê"
                          >
                            <CheckCircle2 size={16} />
                            <span>Đồng Ý</span>
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                            onClick={() => handleCancelOrder(order.id)}
                            title="Hủy đơn và hoàn coin"
                          >
                            <XCircle size={16} />
                            <span>Hủy Đơn</span>
                          </button>
                        </>
                      )}

                      {/* Trạng thái CONFIRMED hoặc IN_PROGRESS: Chỉ bấm được Hoàn Thành khi đã hết giờ thuê */}
                      {(statusUpper === 'CONFIRMED' || statusUpper === 'IN_PROGRESS') && (
                        (() => {
                          const finished = isOrderFinished(order);
                          const remainingText = getRemainingTimeText(order.endTime);
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {!finished && remainingText && (
                                <span
                                  className="badge badge-busy"
                                  style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
                                  title={`Thời gian kết thúc: ${order.endTime || order.hireTime}`}
                                >
                                  <Clock size={13} />
                                  <span>{remainingText}</span>
                                </span>
                              )}

                              <button
                                className={`btn ${finished ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => handleCompleteOrder(order)}
                                disabled={!finished}
                                style={!finished
                                  ? { opacity: 0.55, cursor: 'not-allowed', filter: 'grayscale(0.5)' }
                                  : { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff' }
                                }
                                title={finished
                                  ? "Đã hết giờ chơi, bấm để hoàn tất đơn thuê"
                                  : `Chưa hết giờ thuê (${remainingText}). Chỉ có thể hoàn tất khi hết giờ chơi!`
                                }
                              >
                                <CheckCircle2 size={16} />
                                <span>{finished ? 'Hoàn Thành' : 'Chưa Hết Giờ'}</span>
                              </button>

                              <button
                                className="btn btn-outline btn-sm"
                                style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={() => handleCancelOrder(order.id)}
                                title="Hủy đơn"
                              >
                                <span>Hủy Đơn</span>
                              </button>
                            </div>
                          );
                        })()
                      )}

                      {/* Trạng thái COMPLETED: Chỉ người thuê mới được đánh giá */}
                      {statusUpper === 'COMPLETED' && (
                        isCurrentRenter ? (
                          order.isReviewed ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontSize: '0.88rem', fontWeight: 700 }}>
                              <Star size={16} fill="#f59e0b" color="#f59e0b" />
                              <span>Đã Đánh Giá {order.reviewRating || 5} ⭐</span>
                            </div>
                          ) : (
                            <button
                              className="btn btn-cyan btn-sm"
                              onClick={() => setSelectedOrderForReview(order)}
                              title="Chỉ người thuê mới được đánh giá dịch vụ"
                            >
                              <Star size={16} />
                              <span>Đánh Giá Player</span>
                            </button>
                          )
                        ) : (
                          // Người được thuê (Idol / Player) chỉ xem kết quả đánh giá từ khách
                          order.isReviewed ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 600 }}>
                              <Star size={15} fill="#f59e0b" color="#f59e0b" />
                              <span>Khách đã đánh giá {order.reviewRating || 5} ⭐</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                              Chờ khách đánh giá
                            </span>
                          )
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
