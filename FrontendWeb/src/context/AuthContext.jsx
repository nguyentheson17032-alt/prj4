import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/apiService';
import { getUserAvatar } from '../utils/avatarUtils';

const AuthContext = createContext(null);

const normalizeUser = (userData) => {
  if (!userData) return null;
  let finalBalance = 0;
  // Hệ thống dùng coin làm đơn vị tiền tệ thực tế cho mọi giao dịch (thuê, hoàn thành, nạp, donate)
  if (userData.coin !== undefined && userData.coin !== null) {
    finalBalance = Number(userData.coin);
  } else if (userData.balance !== undefined && userData.balance !== null) {
    finalBalance = Number(userData.balance);
  } else if (userData.walletBalance !== undefined && userData.walletBalance !== null) {
    finalBalance = Number(userData.walletBalance);
  }

  const phoneValue = userData.phoneNumber || userData.phone || '';

  return {
    ...userData,
    phone: phoneValue,
    phoneNumber: phoneValue,
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
    if (!user) throw new Error('Vui lòng đăng nhập để rút tiền');
    const numericAmount = Number(amount);
    const currentBalance = Number(user.balance || user.walletBalance || user.coin || 0);

    if (!numericAmount || numericAmount <= 0) throw new Error('Số tiền rút không hợp lệ');
    if (numericAmount > currentBalance) {
      throw new Error(`Số tiền rút không được vượt quá số dư khả dụng (${currentBalance.toLocaleString('vi-VN')} đ)`);
    }
    if (!bankAccountNumber?.trim()) throw new Error('Vui lòng nhập số tài khoản ngân hàng');
    if (!bankAccountName?.trim()) throw new Error('Vui lòng nhập tên chủ tài khoản');
    if (!bankName?.trim()) throw new Error('Vui lòng chọn hoặc nhập tên ngân hàng');

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
        refreshUser,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext) || {};
