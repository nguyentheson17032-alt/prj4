import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/apiService';
import { getUserAvatar } from '../utils/avatarUtils';

const AuthContext = createContext(null);

const normalizeUser = (userData) => {
  if (!userData) return null;
  const bVal = Number(userData.balance) || 0;
  const wbVal = Number(userData.walletBalance) || 0;
  const cVal = Number(userData.coin) || 0;
  const finalBalance = Math.max(bVal, wbVal, cVal);

  return {
    ...userData,
    balance: finalBalance,
    walletBalance: finalBalance,
    coin: finalBalance,
    avatar: getUserAvatar(userData)
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize user
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('jwt_token') || localStorage.getItem('token');
        const storedUser = localStorage.getItem('current_user');
        let localUser = null;
        if (storedUser) {
          try {
            localUser = normalizeUser(JSON.parse(storedUser));
            setUser(localUser);
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }
        if (storedToken) {
          setToken(storedToken);
          // Fetch latest profile from backend
          try {
            const freshUser = await api.getCurrentUser();
            if (freshUser) {
              const normalized = normalizeUser(freshUser);
              // Bảo toàn số dư nếu local có số dư mới hơn backend chưa kịp cập nhật
              if (localUser && localUser.balance > 0 && normalized.balance === 0) {
                normalized.balance = localUser.balance;
                normalized.walletBalance = localUser.balance;
                normalized.coin = localUser.balance;
              }
              setUser(normalized);
              localStorage.setItem('current_user', JSON.stringify(normalized));
            }
          } catch (e) {
            console.warn('Could not sync current user from server:', e.message);
          }
        }
      } catch (err) {
        console.error('Init auth error:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res.success) {
      const userData = normalizeUser(res.data);
      setUser(userData);
      const userToken = userData.token || '';
      setToken(userToken);
      localStorage.setItem('current_user', JSON.stringify(userData));
      localStorage.setItem('jwt_token', userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('roles', JSON.stringify(userData.roles || ['ROLE_USER']));
      localStorage.setItem('userId', userData.id || '');
      localStorage.setItem('username', userData.username || '');
      localStorage.setItem('userEmail', userData.email || '');
      localStorage.setItem('email', userData.email || '');
      return { success: true, user: userData };
    }
    return { success: false, error: res.error || 'Đăng nhập thất bại, vui lòng kiểm tra lại' };
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Đăng ký thất bại' };
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('current_user');
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('email');
  };

  const deposit = async (amount) => {
    if (!user) throw new Error('Vui lòng đăng nhập để nạp tiền');
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) throw new Error('Số tiền nạp không hợp lệ');

    const currentBalance = Number(user.balance || user.walletBalance || user.coin || 0);
    const newBalance = currentBalance + numericAmount;
    const updated = {
      ...user,
      balance: newBalance,
      walletBalance: newBalance,
      coin: newBalance
    };

    // Luôn cập nhật giao diện và localStorage ngay lập tức
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));

    // Gọi API Backend lưu vào CSDL
    try {
      await api.topUp(numericAmount);
    } catch (err) {
      console.warn('Ghi chú: Lỗi khi đồng bộ nạp tiền lên backend (local đã lưu):', err);
    }

    return { success: true, newBalance };
  };

  const deductBalance = (amount) => {
    const current = Number(user?.balance || 0);
    const cost = Number(amount);
    if (!user || current < cost) return false;
    const newBalance = current - cost;
    const updated = {
      ...user,
      balance: newBalance,
      walletBalance: newBalance,
      coin: newBalance
    };
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));
    return true;
  };

  const updateProfile = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));
  };

  const isAdmin = Boolean(
    user && (
      (Array.isArray(user.roles) && user.roles.some(r => typeof r === 'string' && (r.toUpperCase().includes('ADMIN') || r.toUpperCase() === 'ROLE_ADMIN'))) ||
      user.role === 'ADMIN' ||
      user.role === 'ROLE_ADMIN' ||
      (typeof user.username === 'string' && user.username.toLowerCase().includes('admin'))
    )
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        login,
        register,
        logout,
        deposit,
        deductBalance,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
