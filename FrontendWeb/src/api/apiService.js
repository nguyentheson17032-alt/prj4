import axios from 'axios';
import { getUserAvatar } from '../utils/avatarUtils';

const BASE_URL = 'http://localhost:8080';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Attach JWT token from localStorage
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const normalizeGamePlayer = (gp) => {
  if (!gp) return null;
  const user = gp.user || {};
  const game = gp.game || {};
  const fullName = gp.username || user.fullName || user.username || 'Idol PlayZone';
  const avatar = gp.avatarUrl || user.avatarUrl || gp.avatar || getUserAvatar(user || { username: fullName });
  const price = Number(gp.pricePerHour || gp.price || 50000);
  const status = (gp.status || 'PENDING').toUpperCase();

  const reviewCount = Number(gp.reviewCount ?? gp.ratingCount ?? gp.totalReviews ?? 0);
  const rawRating = (gp.rating !== null && gp.rating !== undefined) ? Number(gp.rating) : 0;
  const rating = reviewCount > 0 ? rawRating : 0;
  const totalGames = Number(gp.totalGames || 0);
  const orderCount = Number(gp.orderCount || gp.totalOrders || totalGames || 0);
  const isVip = Boolean(gp.isVip === true || (orderCount >= 50 && rating >= 4.8));
  const isHot = Boolean(gp.isHot === true || (orderCount >= 20 && rating >= 4.5));

  return {
    id: gp.id,
    userId: user.id || gp.userId || gp.id,
    username: gp.username || user.username || 'player',
    fullName: fullName,
    name: fullName,
    avatar: avatar,
    avatarUrl: avatar,
    coverImage: user.coverImageUrl || gp.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    bio: gp.description || user.bio || gp.bio || 'Sẵn sàng duo leo rank cùng anh em!',
    pricePerHour: price,
    rating: rating,
    reviewCount: reviewCount,
    orderCount: orderCount,
    status: status,
    adminStatus: gp.adminStatus || (status === 'PENDING' ? 'PENDING' : 'APPROVED'),
    gender: user.gender || gp.gender || 'FEMALE',
    isVip: isVip,
    isHot: isHot,
    voiceIntroUrl: gp.voiceIntroUrl || 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
    voiceDuration: gp.voiceDuration || '0:15',
    rank: gp.rank || 'Cao Thủ',
    role: gp.role || 'ALL',
    server: gp.server || 'VN',
    primaryGame: game.name || gp.primaryGame || 'Liên Quân Mobile',
    games: gp.games || [
      {
        name: game.name || gp.primaryGame || 'Liên Quân Mobile',
        rank: gp.rank || 'Cao Thủ',
        role: gp.role || 'ALL',
        price: price
      }
    ],
    tags: gp.tags || ['Nhiệt tình', 'Leo rank', 'Voice mic'],
    submittedAt: gp.createdAt ? new Date(gp.createdAt).toLocaleString('vi-VN') : (gp.submittedAt || 'Mới đây')
  };
};

export const normalizeOrder = (o) => {
  if (!o) return null;
  const price = Number(o.price || o.finalPrice || o.totalPrice || 0);
  const playerName = o.playerName || o.player?.fullName || o.player?.username || 'Idol PlayZone';
  const renterName = o.renterName || o.renter?.username || 'Khách Hàng';
  const playerAvatar = o.playerAvatarUrl || o.player?.avatar || o.player?.avatarUrl || getUserAvatar({ username: playerName });
  const renterAvatar = o.renterAvatarUrl || o.renter?.avatar || o.renter?.avatarUrl || getUserAvatar({ username: renterName });
  const createdAt = o.createdAt || o.hireTime || o.startTime || 'Hôm nay';
  const game = o.game || o.player?.game || 'Duo Game';
  const hours = Number(o.hours || 1);
  const status = (o.status || 'PENDING').toUpperCase();

  const playerUserId = o.playerUserId || o.player?.userId || o.player?.user?.id;
  const renterId = o.renterId || o.renter?.id;
  const playerId = o.playerId || o.player?.id;

  return {
    ...o,
    id: o.id,
    renterId,
    playerId,
    playerUserId,
    playerName,
    renterName,
    playerAvatarUrl: playerAvatar,
    renterAvatarUrl: renterAvatar,
    price,
    finalPrice: price,
    totalPrice: price,
    createdAt,
    hireTime: o.hireTime || createdAt,
    game,
    hours,
    status,
    statusLabel: o.statusLabel,
    isReported: Boolean(o.isReported),
    reportStatus: o.reportStatus || null,
    player: {
      id: playerId,
      userId: playerUserId,
      fullName: playerName,
      username: playerName,
      avatar: playerAvatar,
      rank: o.playerRank || o.player?.rank || 'Cao Thủ',
    },
    renter: {
      id: renterId,
      fullName: renterName,
      username: renterName,
      avatar: renterAvatar,
    }
  };
};

export const api = {
  // Auth
  async login(username, password) {
    try {
      const res = await client.post('/api/auth/login', { username, password });
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || err.message || 'Đăng nhập thất bại';
      return { success: false, error: message };
    }
  },

  async register(userData) {
    try {
      const phoneValue = userData.phoneNumber || userData.phone || '';
      const payload = {
        ...userData,
        phoneNumber: phoneValue,
        phone: phoneValue
      };
      const res = await client.post('/api/auth/register', payload);
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || err.message || 'Đăng ký thất bại';
      return { success: false, error: message };
    }
  },

  async updateUser(updateData) {
    try {
      const phoneValue = updateData.phoneNumber || updateData.phone || '';
      const payload = {
        ...updateData,
        phoneNumber: phoneValue,
        phone: phoneValue
      };
      const res = await client.put('/api/auth/update', payload);
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || err.message || 'Cập nhật thất bại';
      return { success: false, error: message };
    }
  },

  async getCurrentUser() {
    try {
      const res = await client.get('/api/auth/me');
      return res.data;
    } catch (err) {
      const stored = localStorage.getItem('current_user');
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    }
  },

  async logout() {
    try {
      await client.post('/api/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
  },

  async changePassword(oldPassword, newPassword) {
    const res = await client.post('/api/auth/change-password', {
      oldPassword,
      newPassword
    });
    return res.data;
  },

  // Games
  async getGames() {
    try {
      const res = await client.get('/api/games');
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      }
      return list;
    } catch (err) {
      return [];
    }
  },

  async createGame(gameData) {
    const res = await client.post('/api/games', gameData);
    return res.data;
  },

  async hirePlayer(gamePlayerId, hireData) {
    const res = await client.post(`/api/game-players/${gamePlayerId}/hire`, hireData);
    return res.data;
  },

  // Players
  async getPlayers(params = {}) {
    let backendPlayers = [];
    try {
      const res = await client.get('/api/game-players', { params });
      let rawList = [];
      if (Array.isArray(res.data)) {
        rawList = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        rawList = res.data.data;
      }
      backendPlayers = rawList.map(normalizeGamePlayer).filter(Boolean);
    } catch (err) {
      console.warn('Backend getPlayers error:', err.message);
    }

    // Lấy danh sách player đăng ký local
    let localPlayers = [];
    try {
      const stored = localStorage.getItem('local_registered_players');
      if (stored) {
        localPlayers = JSON.parse(stored).map(normalizeGamePlayer).filter(Boolean);
      }
    } catch (e) {
      console.error('Error reading local_registered_players:', e);
    }

    // Gộp theo userId — mỗi user chỉ hiển thị 1 card, games[] chứa tất cả game đã đăng ký
    const byUser = new Map();
    const allPlayers = [...localPlayers, ...backendPlayers];
    allPlayers.forEach(p => {
      const key = String(p.userId || p.id);
      if (!byUser.has(key)) {
        byUser.set(key, { ...p });
      } else {
        const existing = byUser.get(key);
        // Merge games array
        const newGames = p.games || [];
        const mergedGames = [...(existing.games || [])];
        newGames.forEach(g => {
          if (!mergedGames.some(eg => eg.name === g.name)) mergedGames.push(g);
        });
        existing.games = mergedGames;
        // Keep lowest price as display price
        if (p.pricePerHour < existing.pricePerHour) existing.pricePerHour = p.pricePerHour;
        // Use AVAILABLE status if any registration is available
        if (p.status === 'AVAILABLE') existing.status = 'AVAILABLE';
      }
    });

    return Array.from(byUser.values());
  },

  async getPlayerById(id) {
    try {
      const res = await client.get(`/api/game-players/${id}`);
      const raw = res.data?.data || res.data;
      if (raw) return normalizeGamePlayer(raw);
    } catch (e) {
      // Fallback local
    }
    const all = await this.getPlayers();
    return all.find(p => String(p.id) === String(id)) || null;
  },

  async getGamePlayersByUser(userId) {
    if (!userId) return [];
    try {
      const res = await client.get(`/api/game-players/user/${userId}`);
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
    } catch (err) {
      console.warn('Backend getGamePlayersByUser error:', err.message);
    }
    return [];
  },

  async registerPlayer(playerData) {
    const res = await client.post('/api/game-players', playerData);
    return res.data;
  },

  async approvePlayer(playerId) {
    // Cập nhật local storage
    try {
      const stored = localStorage.getItem('local_registered_players');
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.map(p => {
          if (String(p.id) === String(playerId) || String(p.userId) === String(playerId)) {
            return { ...p, status: 'AVAILABLE', adminStatus: 'APPROVED' };
          }
          return p;
        });
        localStorage.setItem('local_registered_players', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    // Cập nhật backend DB
    try {
      const res = await client.post(`/api/game-players/${playerId}/approve`);
      return res.data;
    } catch (err) {
      try {
        const res = await client.put(`/api/game-players/${playerId}/status?status=AVAILABLE`);
        return res.data;
      } catch (e) {
        return { success: true, message: 'Đã phê duyệt' };
      }
    }
  },

  async rejectPlayer(playerId) {
    try {
      const stored = localStorage.getItem('local_registered_players');
      if (stored) {
        const list = JSON.parse(stored);
        const updated = list.filter(p => String(p.id) !== String(playerId) && String(p.userId) !== String(playerId));
        localStorage.setItem('local_registered_players', JSON.stringify(updated));
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await client.delete(`/api/game-players/${playerId}`);
      return res.data;
    } catch (err) {
      return { success: true, message: 'Đã từ chối hồ sơ' };
    }
  },

  // Moments
  async getMoments() {
    try {
      const res = await client.get('/api/moments/all');
      if (res.data && Array.isArray(res.data.content)) return res.data.content;
      if (Array.isArray(res.data)) return res.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  async createMoment(gamePlayerId, data) {
    const res = await client.post(`/api/moments/${gamePlayerId}`, data);
    return res.data;
  },

  // Orders
  async getOrders(params = {}) {
    try {
      const res = await client.get('/api/orders', { params });
      let rawList = [];
      if (Array.isArray(res.data)) rawList = res.data;
      else if (res.data && Array.isArray(res.data.data)) rawList = res.data.data;
      return rawList.map(normalizeOrder).filter(Boolean);
    } catch (e) {
      console.warn('Backend getOrders error:', e.message);
      return [];
    }
  },

  async getAllOrdersAdmin() {
    try {
      const res = await client.get('/api/orders', { params: { all: true } });
      let rawList = [];
      if (Array.isArray(res.data)) rawList = res.data;
      else if (res.data && Array.isArray(res.data.data)) rawList = res.data.data;
      return rawList.map(normalizeOrder).filter(Boolean);
    } catch (e) {
      console.warn('Backend getAllOrdersAdmin error:', e.message);
      return [];
    }
  },

  async createOrder(orderData) {
    const res = await client.post('/api/orders', orderData);
    return res.data;
  },

  async confirmOrder(orderId) {
    const res = await client.post(`/api/game-players/order/${orderId}/confirm`);
    return res.data;
  },

  async cancelOrder(orderId) {
    const res = await client.post(`/api/game-players/order/${orderId}/cancel`);
    return res.data;
  },

  async rejectOrder(orderId) {
    const res = await client.post(`/api/game-players/order/${orderId}/reject`);
    return res.data;
  },

  async completeOrder(orderId) {
    const res = await client.post(`/api/game-players/order/${orderId}/complete`);
    return res.data;
  },

  async reviewOrder(orderId, rating, comment) {
    const res = await client.post(`/api/game-players/order/${orderId}/review`, { rating, comment });
    return res.data;
  },

  // Chat / Messages
  async getConversations() {
    try {
      const res = await client.get('/api/messages/conversations');
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  // Vouchers / Promotions
  async getVouchers() {
    try {
      const res = await client.get('/api/promotions');
      const list = Array.isArray(res.data) ? res.data
        : (res.data && Array.isArray(res.data.data)) ? res.data.data : [];
      // Normalize backend fields to what BookingModal expects
      return list.map(v => ({
        ...v,
        discountPercent: v.discountType === 'PERCENTAGE' ? Number(v.discountAmount) : 100,
        maxDiscount: v.discountType === 'FIXED_AMOUNT' ? Number(v.discountAmount) : 99999999,
      }));
    } catch (e) {
      return [];
    }
  },

  async getPlayerStats(gamePlayerId) {
    try {
      const res = await client.get(`/api/game-players/${gamePlayerId}/stats`);
      return res.data?.data || res.data || null;
    } catch (e) {
      console.warn('getPlayerStats error:', e.message);
      return null;
    }
  },

  async updatePlayerPrice(gamePlayerId, pricePerHour) {
    const res = await client.patch(`/api/game-players/${gamePlayerId}/price`, { pricePerHour });
    return res.data;
  },

  async updatePlayerInfo(gamePlayerId, info) {
    const res = await client.patch(`/api/game-players/${gamePlayerId}/info`, info);
    return res.data;
  },

  // Reviews
  async getReviewsByPlayerId(playerId) {
    try {
      const res = await client.get(`/api/order-reviews/player/${playerId}`);
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data.reviews)) return data.reviews;
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('Backend getReviewsByPlayerId error:', e.message);
    }
    try {
      const res2 = await client.get(`/api/reviews/player/${playerId}`);
      const data2 = res2.data?.data || res2.data;
      if (data2 && Array.isArray(data2.reviews)) return data2.reviews;
      if (Array.isArray(data2)) return data2;
    } catch (e2) {}
    return [];
  },

  // Users & Admin Management
  async getUsers() {
    try {
      const res = await client.get('/api/users');
      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        list = res.data.data;
      }
      return list;
    } catch (e) {
      return [];
    }
  },

  async banUser(userId) {
    const res = await client.put(`/api/users/${userId}/ban`);
    return res.data;
  },

  async unbanUser(userId) {
    const res = await client.put(`/api/users/${userId}/unban`);
    return res.data;
  },

  async getReports() {
    try {
      const res = await client.get('/api/reports');
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  async createReport({ reportedPlayerId, orderId, reason, description, video, imageUrls, evidenceUrl }) {
    const proof = evidenceUrl || video || imageUrls || null;
    const res = await client.post('/api/reports', {
      reportedPlayerId: Number(reportedPlayerId),
      orderId: orderId ? Number(orderId) : null,
      reason,
      description,
      video: proof,
      evidenceUrl: proof,
      imageUrls: proof,
    });
    return res.data;
  },

  async updateReportStatus(reportId, status, resolution = '', refundPercentage = 100) {
    const res = await client.put(`/api/reports/${reportId}/status`, { status, resolution, refundPercentage });
    return res.data;
  },

  async getMyReports() {
    try {
      const res = await client.get('/api/reports/reporter');
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  // Payments & Topup
  async topUp(coinAmount) {
    const res = await client.post('/api/payments/topup', { coin: Number(coinAmount) });
    return res.data;
  },

  async getTopupHistory() {
    try {
      const res = await client.get('/api/payments/topup-history');
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  // Donate / Gift
  async donateToPlayer(playerId, coin, message = '') {
    const res = await client.post('/api/payments/donate', {
      playerId: Number(playerId),
      coin: Number(coin),
      message: message || ''
    });
    return res.data;
  },

  async getDonateHistory() {
    try {
      const res = await client.get('/api/payments/donate-history');
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  async getLeaderboard() {
    try {
      const res = await client.get('/api/payments/leaderboard');
      return res.data;
    } catch (e) {
      return null;
    }
  },

  // Admin Payment Management
  async getAdminTopupPayments() {
    try {
      const res = await client.get('/api/payments/topup-users');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      return [];
    }
  },

  async getAdminWithdrawPayments() {
    try {
      const res = await client.get('/api/payments/withdraw-users');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      return [];
    }
  },

  async processPayment(id, transactionId = 'ADMIN_MANUAL') {
    const res = await client.post(`/api/payments/${id}/process`, { transactionId });
    return res.data;
  },

  async refundPayment(id, reason = 'Admin từ chối') {
    const res = await client.post(`/api/payments/${id}/refund`, { reason });
    return res.data;
  },

  // Admin Commission Management (Chiết khấu 15%)
  async getAdminCommissionStats() {
    try {
      const res = await client.get('/api/admin/commissions/stats');
      return res.data;
    } catch (e) {
      console.error('getAdminCommissionStats error:', e);
      return null;
    }
  },

  async getAdminCommissionTransactions(params = {}) {
    try {
      const res = await client.get('/api/admin/commissions/transactions', { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      console.error('getAdminCommissionTransactions error:', e);
      return [];
    }
  },

  // Admin Game Players Summary
  async getPlayersSummary() {
    try {
      const res = await client.get('/api/game-players/summary');
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      if (Array.isArray(res.data)) return res.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  // Chat & Message APIs
  async getConversations() {
    try {
      const res = await client.get('/api/messages/all-conversations');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('getConversations error:', err.message);
      return [];
    }
  },

  async getConversation(userId) {
    if (!userId) return null;
    try {
      const res = await client.get(`/api/messages/conversation/${userId}`);
      return res.data || null;
    } catch (err) {
      console.warn(`getConversation(${userId}) error:`, err.message);
      return null;
    }
  },

  async sendMessage(userId, content) {
    if (!userId || !content) return null;
    const res = await client.post(`/api/messages/send/${userId}`, { content });
    return res.data;
  },

  async markAllMessagesAsRead(userId) {
    if (!userId) return;
    try {
      await client.post(`/api/messages/read-all/${userId}`);
    } catch (err) {
      console.warn(`markAllMessagesAsRead(${userId}) error:`, err.message);
    }
  },

  async getUnreadMessageCount() {
    try {
      const res = await client.get('/api/messages/unread/count');
      return Number(res.data) || 0;
    } catch (err) {
      return 0;
    }
  }
};

export default api;
