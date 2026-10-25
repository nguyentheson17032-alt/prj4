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
  const isVip = Boolean(gp.isVip === true || (rating >= 4.8 && reviewCount > 0) || (orderCount >= 10 && rating >= 4.5));
  const isHot = Boolean(gp.isHot === true || (rating >= 4.5 && reviewCount > 0) || orderCount >= 5);

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
    payoutStatus: o.payoutStatus || 'PENDING',
    isPayoutFrozen: Boolean(o.isPayoutFrozen),
    isReportable: o.isReportable !== undefined ? Boolean(o.isReportable) : true,
    reportRemainingSeconds: o.reportRemainingSeconds !== undefined ? Number(o.reportRemainingSeconds) : null,
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

export const normalizeMoment = (m) => {
  if (!m) return null;
  const authorName = m.author?.name || m.authorName || m.gamePlayerUsername || m.author?.fullName || 'Idol PlayZone';
  const authorAvatar = m.author?.avatar || m.authorAvatar || getUserAvatar({ username: authorName });
  const rawImages = m.images || m.imageUrls || [];
  const images = (Array.isArray(rawImages) ? rawImages : []).map(img => {
    if (!img || typeof img !== 'string') return img;
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:') || img.startsWith('blob:')) return img;
    if (img.startsWith('/api/moments/moment-images/')) return `${BASE_URL}${img}`;
    if (img.startsWith('moment-images/')) {
      return `${BASE_URL}/api/moments/moment-images/${img.replace('moment-images/', '')}`;
    }
    return `${BASE_URL}/api/moments/moment-images/${img}`;
  }).filter(Boolean);

  let formattedDate = 'Vừa xong';
  if (m.createdAt) {
    try {
      const d = new Date(m.createdAt);
      if (!isNaN(d.getTime())) {
        const diffMs = Date.now() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMin < 1) formattedDate = 'Vừa xong';
        else if (diffMin < 60) formattedDate = `${diffMin} phút trước`;
        else if (diffHours < 24) formattedDate = `${diffHours} giờ trước`;
        else if (diffDays < 7) formattedDate = `${diffDays} ngày trước`;
        else formattedDate = d.toLocaleDateString('vi-VN');
      } else {
        formattedDate = m.createdAt;
      }
    } catch (_) {
      formattedDate = m.createdAt;
    }
  }

  const likedByUserIds = Array.isArray(m.likedByUserIds) ? m.likedByUserIds.map(Number) : [];
  const likedByUsers = Array.isArray(m.likedByUsers) ? m.likedByUsers : [];

  // Determine isLiked based on current logged-in user in localStorage
  let isLiked = false;
  try {
    const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
    if (rawUser) {
      const cur = JSON.parse(rawUser);
      const myId = cur?.id ? Number(cur.id) : null;
      const myName = (cur?.fullName || cur?.username || '').toLowerCase();
      if (myId && likedByUserIds.length > 0) {
        isLiked = likedByUserIds.includes(myId);
      } else if (myName && likedByUsers.length > 0) {
        isLiked = likedByUsers.some(u => (u || '').toLowerCase() === myName);
      } else if (m.isLiked !== undefined) {
        isLiked = Boolean(m.isLiked);
      }
    }
  } catch (_) {
    isLiked = Boolean(m.isLiked);
  }

  return {
    id: m.id || Date.now(),
    gamePlayerId: m.gamePlayerId,
    playerUserId: m.playerUserId || m.author?.userId,
    author: {
      id: m.author?.id || m.gamePlayerId || m.playerUserId || 1,
      userId: m.playerUserId || m.author?.userId,
      name: authorName,
      avatar: authorAvatar,
      isVip: m.isVip ?? m.author?.isVip ?? true,
    },
    gameName: m.gameName || 'Gaming',
    content: m.content || '',
    images: images,
    likeCount: Number(m.likeCount || 0),
    commentCount: Number(m.commentCount || 0),
    isLiked: isLiked,
    likedByUsers: likedByUsers,
    likedByUserIds: likedByUserIds,
    status: (m.status || 'ACTIVE').toUpperCase(),
    createdAt: formattedDate,
    rawCreatedAt: m.createdAt || new Date().toISOString()
  };
};

export const api = {
  // Auth
  async login(username, password) {
    try {
      const res = await client.post('/api/auth/login', { username, password });
      return { success: true, data: res.data };
    } catch (err) {
      const data = err.response?.data;
      if (data && (data.status === 'BANNED' || data.error === 'ACCOUNT_BANNED')) {
        return {
          success: false,
          isBanned: true,
          banDetails: data.banDetails,
          error: data.message || 'Tài khoản của bạn đã bị khóa.'
        };
      }
      const message = (typeof data === 'string' ? data : (data?.message || data?.error)) || err.message || 'Đăng nhập thất bại';
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
    let backendMoments = [];
    try {
      const res = await client.get('/api/moments/all', { params: { size: 100 } });
      if (res.data && Array.isArray(res.data.content)) {
        backendMoments = res.data.content;
      } else if (Array.isArray(res.data)) {
        backendMoments = res.data;
      }
    } catch (e) {
      console.warn('Backend getMoments error:', e.message);
    }

    // Load local stored moments
    let localMoments = [];
    try {
      const stored = localStorage.getItem('playzone_moments');
      if (stored) {
        localMoments = JSON.parse(stored);
      }
    } catch (_) {}

    // Combine by ID, keeping local likes and comments
    const map = new Map();
    localMoments.forEach(m => {
      if (m && m.id) {
        const norm = normalizeMoment(m);
        if (norm) map.set(m.id, norm);
      }
    });

    backendMoments.forEach(m => {
      if (m && m.id) {
        const norm = normalizeMoment(m);
        if (norm) {
          if (map.has(m.id)) {
            const existing = map.get(m.id);
            const mergedLikedByUsers = norm.likedByUsers && norm.likedByUsers.length > 0
              ? norm.likedByUsers
              : (existing.likedByUsers || []);
            const mergedLikedByUserIds = norm.likedByUserIds && norm.likedByUserIds.length > 0
              ? norm.likedByUserIds
              : (existing.likedByUserIds || []);

            let isLiked = norm.isLiked;
            try {
              const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
              if (rawUser) {
                const cur = JSON.parse(rawUser);
                const myId = cur?.id ? Number(cur.id) : null;
                const myName = (cur?.fullName || cur?.username || '').toLowerCase();
                if (myId && mergedLikedByUserIds.length > 0) {
                  isLiked = mergedLikedByUserIds.includes(myId);
                } else if (myName && mergedLikedByUsers.length > 0) {
                  isLiked = mergedLikedByUsers.some(u => (u || '').toLowerCase() === myName);
                }
              }
            } catch (_) {}

            map.set(m.id, {
              ...norm,
              isLiked,
              likedByUsers: mergedLikedByUsers,
              likedByUserIds: mergedLikedByUserIds,
              likeCount: Math.max(norm.likeCount, mergedLikedByUsers.length, existing.likeCount || 0)
            });
          } else {
            map.set(m.id, norm);
          }
        }
      }
    });

    const list = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.rawCreatedAt).getTime() || 0;
      const timeB = new Date(b.rawCreatedAt).getTime() || 0;
      return timeB - timeA;
    });

    return list;
  },

  async getMomentsByUser(userId) {
    if (!userId) return [];
    try {
      const res = await client.get(`/api/moments/user/${userId}`);
      if (res.data && Array.isArray(res.data.content)) {
        return res.data.content.map(normalizeMoment).filter(Boolean);
      }
    } catch (_) {}

    const all = await this.getMoments();
    return all.filter(m =>
      String(m.playerUserId) === String(userId) ||
      String(m.author?.userId) === String(userId) ||
      String(m.author?.id) === String(userId)
    );
  },

  async getMomentsByPlayer(playerId) {
    if (!playerId) return [];
    try {
      const res = await client.get(`/api/moments/player/${playerId}`);
      if (res.data && Array.isArray(res.data.content)) {
        return res.data.content.map(normalizeMoment).filter(Boolean);
      }
    } catch (_) {}

    const all = await this.getMoments();
    return all.filter(m =>
      String(m.gamePlayerId) === String(playerId) ||
      String(m.author?.id) === String(playerId)
    );
  },

  async uploadMomentFiles(files) {
    if (!files || files.length === 0) return [];
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      const res = await client.post('/api/moments/upload-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map(p => p.startsWith('http') ? p : `${BASE_URL}${p}`);
      }
    } catch (err) {
      console.warn('Backend uploadMomentFiles error, falling back to data URLs:', err.message);
    }

    // Fallback: convert files to Base64 data URLs
    const dataUrls = await Promise.all(
      Array.from(files).map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      }))
    );
    return dataUrls.filter(Boolean);
  },

  async createMoment(payload) {
    let result = null;
    try {
      const res = await client.post('/api/moments/create', {
        content: payload.content,
        gameName: payload.gameName,
        imageUrls: payload.images || payload.imageUrls || []
      });
      if (res.data) {
        result = normalizeMoment(res.data);
      }
    } catch (e) {
      console.warn('Backend createMoment/create error, using normalized local moment:', e.message);
    }

    if (!result) {
      result = normalizeMoment({
        id: Date.now(),
        authorName: payload.author?.name || 'Idol PlayZone',
        authorAvatar: payload.author?.avatar,
        isVip: true,
        gameName: payload.gameName || 'Gaming',
        content: payload.content,
        images: payload.images || payload.imageUrls || [],
        createdAt: new Date().toISOString(),
        playerUserId: payload.author?.userId || payload.author?.id
      });
    }

    // Save to localStorage for instant real-time feed update
    try {
      const stored = localStorage.getItem('playzone_moments');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(result);
      localStorage.setItem('playzone_moments', JSON.stringify(list));
    } catch (_) {}

    return result;
  },

  async deleteMoment(momentId) {
    try {
      await client.delete(`/api/moments/${momentId}`);
    } catch (e) {
      console.warn('Backend deleteMoment error:', e.message);
    }
    try {
      const stored = localStorage.getItem('playzone_moments');
      if (stored) {
        const list = JSON.parse(stored).filter(m => m.id !== momentId);
        localStorage.setItem('playzone_moments', JSON.stringify(list));
      }
    } catch (_) {}
    return { success: true };
  },

  async toggleLikeMoment(momentId, currentUserId, currentUserName) {
    let result = null;
    try {
      const res = await client.post(`/api/moments/${momentId}/like`);
      if (res.data) {
        result = res.data;
      }
    } catch (e) {
      console.warn('Backend toggleLikeMoment error, falling back to local toggle:', e.message);
    }

    // Local state fallback / synchronization
    try {
      const stored = localStorage.getItem('playzone_moments');
      const list = stored ? JSON.parse(stored) : [];
      let found = false;
      const updatedList = list.map(m => {
        if (m.id === momentId) {
          found = true;
          let likedUsers = Array.isArray(m.likedByUsers) ? [...m.likedByUsers] : [];
          let likedIds = Array.isArray(m.likedByUserIds) ? [...m.likedByUserIds].map(Number) : [];

          const userKey = currentUserName || `User_${currentUserId || 'guest'}`;
          const userIdNum = currentUserId ? Number(currentUserId) : null;

          if (result && Array.isArray(result.likedByUsers)) {
            likedUsers = result.likedByUsers;
          }
          if (result && Array.isArray(result.likedByUserIds)) {
            likedIds = result.likedByUserIds.map(Number);
          }

          if (!result) {
            const hasLiked = likedUsers.some(u => u.toLowerCase() === userKey.toLowerCase()) || (userIdNum && likedIds.includes(userIdNum));
            if (!hasLiked) {
              likedUsers.unshift(userKey);
              if (userIdNum) likedIds.unshift(userIdNum);
            } else {
              likedUsers = likedUsers.filter(u => u.toLowerCase() !== userKey.toLowerCase());
              if (userIdNum) likedIds = likedIds.filter(id => id !== userIdNum);
            }
          }

          const likeCount = result ? Number(result.likeCount) : likedUsers.length;
          return {
            ...m,
            likeCount,
            likedByUsers: likedUsers,
            likedByUserIds: likedIds
          };
        }
        return m;
      });
      if (found) {
        localStorage.setItem('playzone_moments', JSON.stringify(updatedList));
      }
    } catch (_) {}

    return result;
  },

  async getAllMomentsAdmin() {
    let backendMoments = [];
    try {
      const res = await client.get('/api/moments/admin/all', { params: { size: 200 } });
      if (res.data && Array.isArray(res.data.content)) {
        backendMoments = res.data.content;
      } else if (Array.isArray(res.data)) {
        backendMoments = res.data;
      }
    } catch (e) {
      console.warn('Backend getAllMomentsAdmin error:', e.message);
    }

    // Combine with local moments
    let localMoments = [];
    try {
      const stored = localStorage.getItem('playzone_moments');
      if (stored) {
        localMoments = JSON.parse(stored);
      }
    } catch (_) {}

    const map = new Map();
    localMoments.forEach(m => {
      if (m && m.id) {
        const norm = normalizeMoment(m);
        if (norm) map.set(m.id, norm);
      }
    });

    backendMoments.forEach(m => {
      if (m && m.id) {
        const norm = normalizeMoment(m);
        if (norm) {
          if (map.has(m.id)) {
            const existing = map.get(m.id);
            map.set(m.id, {
              ...norm,
              isLiked: existing.isLiked,
              likeCount: Math.max(norm.likeCount, existing.likeCount || 0),
              status: existing.status || norm.status
            });
          } else {
            map.set(m.id, norm);
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.rawCreatedAt).getTime() || 0;
      const timeB = new Date(b.rawCreatedAt).getTime() || 0;
      return timeB - timeA;
    });
  },

  async updateMomentStatusAdmin(momentId, status) {
    try {
      await client.patch(`/api/moments/admin/${momentId}/status`, { status });
    } catch (e) {
      console.warn('Backend updateMomentStatusAdmin error:', e.message);
    }
    try {
      const stored = localStorage.getItem('playzone_moments');
      if (stored) {
        const list = JSON.parse(stored).map(m => m.id === momentId ? { ...m, status } : m);
        localStorage.setItem('playzone_moments', JSON.stringify(list));
      }
    } catch (_) {}
    return { success: true, status };
  },

  async deleteMomentAdmin(momentId) {
    try {
      await client.delete(`/api/moments/admin/${momentId}`);
    } catch (e) {
      console.warn('Backend deleteMomentAdmin error:', e.message);
    }
    try {
      const stored = localStorage.getItem('playzone_moments');
      if (stored) {
        const list = JSON.parse(stored).map(m => m.id === momentId ? { ...m, status: 'DELETED' } : m);
        localStorage.setItem('playzone_moments', JSON.stringify(list));
      }
    } catch (_) {}
    return { success: true };
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

  async banUser(userId, options = {}) {
    if (options.days && Number(options.days) > 0) {
      return this.banUserTemporarily({
        userId,
        reason: options.reason || 'Vi phạm tiêu chuẩn cộng đồng',
        description: options.description || '',
        days: Number(options.days)
      });
    } else {
      return this.banUserPermanently({
        userId,
        reason: options.reason || 'Vi phạm tiêu chuẩn cộng đồng',
        description: options.description || ''
      });
    }
  },

  async banUserTemporarily({ userId, reason, description, days, banExpiresAt }) {
    const res = await client.post('/api/user-bans/ban-temporary', {
      userId,
      reason,
      description,
      days,
      banExpiresAt
    });
    return res.data;
  },

  async banUserPermanently({ userId, reason, description }) {
    const res = await client.post('/api/user-bans/ban-permanent', {
      userId,
      reason,
      description
    });
    return res.data;
  },

  async unbanUser(userId, unbanReason) {
    const res = await client.post('/api/user-bans/unban', {
      userId,
      unbanReason: unbanReason || 'Mở khóa bởi Admin'
    });
    return res.data;
  },

  async getUserActiveBan(userId) {
    try {
      const res = await client.get(`/api/user-bans/check/${userId}`);
      return res.data;
    } catch (e) {
      return null;
    }
  },

  async getActiveBans() {
    try {
      const res = await client.get('/api/user-bans/active');
      return res.data || [];
    } catch (e) {
      return [];
    }
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

  // Withdraw
  async withdraw({ coin, bankAccountNumber, bankAccountName, bankName }) {
    const res = await client.post('/api/payments/withdraw', {
      coin: Number(coin),
      bankAccountNumber: String(bankAccountNumber || '').trim(),
      bankAccountName: String(bankAccountName || '').trim(),
      bankName: String(bankName || '').trim()
    });
    return res.data;
  },

  async getWithdrawHistory() {
    try {
      const res = await client.get('/api/payments/withdraw-history');
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
  },

  // Notification APIs
  async getNotifications() {
    try {
      const res = await client.get('/api/notifications/user');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('getNotifications error:', err.message);
      return [];
    }
  },

  async getUnreadNotifications() {
    try {
      const res = await client.get('/api/notifications/unread');
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.warn('getUnreadNotifications error:', err.message);
      return [];
    }
  },

  async getUnreadNotificationCount() {
    try {
      const res = await client.get('/api/notifications/unread/count');
      if (res.data && res.data.count !== undefined) {
        return Number(res.data.count) || 0;
      }
    } catch (_) {}
    // Robust fallback: fetch /api/notifications/unread and count length
    try {
      const res2 = await client.get('/api/notifications/unread');
      return Array.isArray(res2.data) ? res2.data.length : 0;
    } catch (_) {
      return 0;
    }
  },

  async markNotificationAsRead(id) {
    if (!id) return false;
    try {
      await client.put(`/api/notifications/${id}/read`);
      return true;
    } catch (err) {
      console.warn(`markNotificationAsRead(${id}) error:`, err.message);
      return false;
    }
  },

  async markAllNotificationsAsRead(unreadIds = []) {
    let success = false;
    try {
      const res = await client.put('/api/notifications/read-all');
      if (res.status === 200) success = true;
    } catch (_) {
      try {
        const resPost = await client.post('/api/notifications/read-all');
        if (resPost.status === 200) success = true;
      } catch (_) {}
    }

    // Fail-safe: fallback to individual mark as read
    if (!success && Array.isArray(unreadIds) && unreadIds.length > 0) {
      try {
        await Promise.all(
          unreadIds.map((id) => client.put(`/api/notifications/${id}/read`).catch(() => {}))
        );
        success = true;
      } catch (_) {}
    }
    return success;
  },

  async deleteNotification(id) {
    if (!id) return false;
    try {
      await client.delete(`/api/notifications/${id}`);
      return true;
    } catch (err) {
      console.warn(`deleteNotification(${id}) error:`, err.message);
      return false;
    }
  },

  async deleteAllReadNotifications(readIds = []) {
    let success = false;
    try {
      const res = await client.delete('/api/notifications/clear-read');
      if (res.status === 200) success = true;
    } catch (_) {
      try {
        const resPost = await client.post('/api/notifications/clear-read');
        if (resPost.status === 200) success = true;
      } catch (_) {}
    }

    // Fail-safe: If bulk delete endpoints are not yet loaded, delete individually by id
    if (!success && Array.isArray(readIds) && readIds.length > 0) {
      try {
        await Promise.all(
          readIds.map((id) => client.delete(`/api/notifications/${id}`).catch(() => {}))
        );
        success = true;
      } catch (_) {}
    }
    return success;
  }
};

export default api;
