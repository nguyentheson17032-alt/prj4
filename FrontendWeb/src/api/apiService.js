import axios from 'axios';
import { getUserAvatar } from '../utils/avatarUtils';
import { MOCK_GAMES } from './mockData';

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

  const rating = gp.rating !== null && gp.rating !== undefined ? Number(gp.rating) : 0;
  const reviewCount = Number(gp.reviewCount || gp.totalReviews || 0);
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
      const res = await client.post('/api/auth/register', userData);
      return { success: true, data: res.data };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data || err.message || 'Đăng ký thất bại';
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
      if (list.length > 0) return list;
      return MOCK_GAMES;
    } catch (err) {
      return MOCK_GAMES;
    }
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

    // Gộp backend + local (không mock data)
    const map = new Map();
    // 1. Thêm từ local
    localPlayers.forEach(p => {
      map.set(String(p.id), p);
      if (p.username) map.set(`user_${p.username}`, p);
    });
    // 2. Thêm từ backend (ghi đè đồng bộ chính xác từ DB)
    backendPlayers.forEach(p => {
      map.set(String(p.id), p);
      if (p.username) map.set(`user_${p.username}`, p);
    });

    return Array.from(new Set(map.values()));
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
  async getOrders() {
    try {
      const res = await client.get('/api/orders');
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  async createOrder(orderData) {
    const res = await client.post('/api/orders', orderData);
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
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
  },

  // Reviews
  async getReviewsByPlayerId(playerId) {
    try {
      const res = await client.get(`/api/reviews/player/${playerId}`);
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.data)) return res.data.data;
      return [];
    } catch (e) {
      return [];
    }
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
  }
};

export default api;
