import axios from 'axios';

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
    const res = await client.get('/api/games');
    return Array.isArray(res.data) ? res.data : [];
  },

  // Players
  async getPlayers(params = {}) {
    const res = await client.get('/api/game-players', { params });
    return Array.isArray(res.data) ? res.data : [];
  },

  async getPlayerById(id) {
    const res = await client.get(`/api/game-players/${id}`);
    return res.data;
  },

  // Moments
  async getMoments() {
    const res = await client.get('/api/moments');
    return Array.isArray(res.data) ? res.data : [];
  },

  async createMoment(data) {
    const res = await client.post('/api/moments', data);
    return res.data;
  },

  // Orders
  async getOrders() {
    const res = await client.get('/api/orders');
    return Array.isArray(res.data) ? res.data : [];
  },

  async createOrder(orderData) {
    const res = await client.post('/api/orders', orderData);
    return res.data;
  },

  // Chat / Messages
  async getConversations() {
    const res = await client.get('/api/messages/conversations');
    return Array.isArray(res.data) ? res.data : [];
  },

  // Vouchers / Promotions
  async getVouchers() {
    const res = await client.get('/api/promotions');
    return Array.isArray(res.data) ? res.data : [];
  },

  // Reviews
  async getReviewsByPlayerId(playerId) {
    const res = await client.get(`/api/reviews/player/${playerId}`);
    return Array.isArray(res.data) ? res.data : [];
  },

  // Users & Admin Management
  async getUsers() {
    const res = await client.get('/api/users');
    return Array.isArray(res.data) ? res.data : [];
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
    const res = await client.get('/api/reports');
    return Array.isArray(res.data) ? res.data : [];
  },

  // Payments & Topup
  async topUp(coinAmount) {
    const res = await client.post('/api/payments/topup', { coin: Number(coinAmount) });
    return res.data;
  },

  async getTopupHistory() {
    try {
      const res = await client.get('/api/payments/topup-history');
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      return [];
    }
  }
};

export default api;
