import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/apiService';
import { getUserAvatar } from '../utils/avatarUtils';

const AuthContext = createContext(null);

const normalizeUser = (userData) => {
  if (!userData) return null;
  // Bỏ token và refreshToken trước khi lưu vào state/localStorage để tránh rò rỉ qua XSS
  const { token: _omitToken, refreshToken: _omitRefreshToken, ...rest } = userData;
  let finalBalance = 0;
  // Hệ thống dùng coin làm đơn vị tiền tệ thực tế cho mọi giao dịch (thuê, hoàn thành, nạp, donate)
  if (rest.coin !== undefined && rest.coin !== null) {
    finalBalance = Number(rest.coin);
  } else if (rest.balance !== undefined && rest.balance !== null) {
    finalBalance = Number(rest.balance);
  } else if (rest.walletBalance !== undefined && rest.walletBalance !== null) {
    finalBalance = Number(rest.walletBalance);
  }

  const phoneValue = rest.phoneNumber || rest.phone || '';

  return {
    ...rest,
    phone: phoneValue,
    phoneNumber: phoneValue,
    balance: finalBalance,
    walletBalance: finalBalance,
    coin: finalBalance,
    avatar: getUserAvatar(rest)
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const freshUser = await api.getCurrentUser();
      if (freshUser) {
        const normalized = normalizeUser(freshUser);
        setUser(normalized);
        localStorage.setItem('current_user', JSON.stringify(normalized));
        return normalized;
      }
    } catch (e) {
      console.warn('Could not refresh user from server:', e.message);
    }
    return user;
  };

  // Initialize user
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem('current_user');
        const legacyToken = localStorage.getItem('jwt_token') || localStorage.getItem('token');

        // Neu chua dang nhap (khong co stored user va khong co token), bo qua de tranh goi /api/auth/me gay loi 401 thua
        if (!storedUser && !legacyToken) {
          setUser(null);
          setToken(null);
          setLoading(false);
          return;
        }

        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            const cleaned = normalizeUser(parsed);
            // Sanitize existing storage if token/refreshToken were stored previously
            if (parsed.token || parsed.refreshToken) {
              localStorage.setItem('current_user', JSON.stringify(cleaned));
            }
            setUser(cleaned);
          } catch (e) {
            console.error('Error parsing stored user:', e);
          }
        }

        // Setup tokens in memory and API service for session persistence across reloads & panes
        if (legacyToken) {
          api.setAuthToken(legacyToken);
          setToken(legacyToken);
        }

        // Validate session with backend using HttpOnly cookie khi truoc do da co session
        try {
          const freshUser = await api.getCurrentUser();
          if (freshUser) {
            const normalized = normalizeUser(freshUser);
            setUser(normalized);
            localStorage.setItem('current_user', JSON.stringify(normalized));
          } else {
            // Not authenticated on backend
            setUser(null);
            setToken(null);
            localStorage.removeItem('current_user');
            localStorage.removeItem('roles');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('email');
          }
        } catch (e) {
          console.warn('Could not sync current user from server:', e.message);
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
      const userToken = res.data?.token || '';
      const userData = normalizeUser(res.data);
      setUser(userData);
      setToken(userToken);
      api.setAuthToken(userToken);
      if (userToken) {
        try {
          localStorage.setItem('jwt_token', userToken);
        } catch (e) {}
      }
      localStorage.setItem('current_user', JSON.stringify(userData));
      // NOTE: Token is stored securely via HttpOnly cookie set by Backend, NOT in localStorage to protect against XSS
      localStorage.setItem('roles', JSON.stringify(userData.roles || ['ROLE_USER']));
      localStorage.setItem('userId', userData.id || '');
      localStorage.setItem('username', userData.username || '');
      localStorage.setItem('userEmail', userData.email || '');
      localStorage.setItem('email', userData.email || '');
      return { success: true, user: userData };
    }
    return {
      success: false,
      isBanned: res.isBanned || false,
      banDetails: res.banDetails || null,
      error: res.error || 'Đăng nhập thất bại, vui lòng kiểm tra lại'
    };
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error || 'Đăng ký thất bại' };
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUser(null);
    setToken(null);
    api.setAuthToken(null);
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

    // Gọi API Backend trước, chỉ cập nhật UI sau khi thành công
    await api.topUp(numericAmount);

    const currentBalance = Number(user.balance || user.walletBalance || user.coin || 0);
    const newBalance = currentBalance + numericAmount;
    const updated = { ...user, balance: newBalance, walletBalance: newBalance, coin: newBalance };
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));

    return { success: true, newBalance };
  };

  const withdrawMoney = async ({ amount, bankAccountNumber, bankAccountName, bankName }) => {
    if (!user) throw new Error('LOGIN_REQUIRED');
    const numericAmount = Number(amount);
    const currentBalance = Number(user.balance || user.walletBalance || user.coin || 0);

    if (!numericAmount || numericAmount <= 0) throw new Error('INVALID_AMOUNT');
    if (numericAmount > currentBalance) {
      throw new Error('OVER_BALANCE');
    }
    if (!bankAccountNumber?.trim()) throw new Error('MISSING_ACCOUNT_NUMBER');
    if (!bankAccountName?.trim()) throw new Error('MISSING_ACCOUNT_NAME');
    if (!bankName?.trim()) throw new Error('MISSING_BANK_NAME');

    const res = await api.withdraw({
      coin: numericAmount,
      bankAccountNumber,
      bankAccountName,
      bankName
    });

    const newBalance = Math.max(0, currentBalance - numericAmount);
    const updated = {
      ...user,
      balance: newBalance,
      walletBalance: newBalance,
      coin: newBalance
    };
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));

    return { success: true, newBalance, data: res };
  };

  const deductBalance = (amount) => {
    const current = Number(user?.balance != null ? user.balance : (user?.coin != null ? user.coin : 0));
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

  const addBalance = (amount) => {
    if (!user) return false;
    const current = Number(user?.balance != null ? user.balance : (user?.coin != null ? user.coin : 0));
    const added = Number(amount || 0);
    const newBalance = current + added;
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

  const updateProfile = async (data) => {
    const phoneValue = data.phoneNumber || data.phone || user?.phone || user?.phoneNumber || '';
    const updated = {
      ...user,
      ...data,
      phone: phoneValue,
      phoneNumber: phoneValue
    };
    setUser(updated);
    localStorage.setItem('current_user', JSON.stringify(updated));

    try {
      await api.updateUser({
        fullName: updated.fullName || updated.username,
        phoneNumber: phoneValue,
        phone: phoneValue,
        bio: updated.bio || '',
        gender: updated.gender || 'MALE',
        address: updated.address || ''
      });
    } catch (e) {
      console.warn('Could not sync profile update to server:', e.message);
    }
    return updated;
  };

  const isAdmin = Boolean(
    user && (
      (Array.isArray(user.roles) && user.roles.some(r => typeof r === 'string' && (r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'ROLE_ADMIN'))) ||
      user.role === 'ADMIN' ||
      user.role === 'ROLE_ADMIN'
    )
  );

  const isPlayer = Boolean(
    user && (
      (Array.isArray(user.roles) && user.roles.some(r => typeof r === 'string' && (r.toUpperCase() === 'PLAYER' || r.toUpperCase() === 'ROLE_PLAYER'))) ||
      user.role === 'PLAYER' ||
      user.role === 'ROLE_PLAYER' ||
      user.isPlayer
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
        isPlayer,
        login,
        register,
        logout,
        deposit,
        withdrawMoney,
        deductBalance,
        addBalance,
        refreshUser,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || {};
