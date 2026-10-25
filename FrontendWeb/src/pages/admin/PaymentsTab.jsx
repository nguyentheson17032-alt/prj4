import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Search, RefreshCw, Clock, Check, X,
  ArrowUpCircle, ArrowDownCircle, Eye, Copy, Download, RotateCcw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { MetricCard, StatusBadge, parseDateToDateObj } from './adminHelpers';
import { getUserAvatar } from '../../utils/avatarUtils';

export const PaymentsTab = () => {
  const { addToast } = useToast();
  const [tab, setTab] = useState('deposit');
  const [depositList, setDepositList] = useState([]);
  const [withdrawList, setWithdrawList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc nâng cao
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amountFilter, setAmountFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Modals thao tác
  const [selectedItem, setSelectedItem] = useState(null);
  const [approveItem, setApproveItem] = useState(null);
  const [approveTxId, setApproveTxId] = useState('');
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('Thông tin tài khoản ngân hàng không chính xác');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([api.getAdminTopupPayments(), api.getAdminWithdrawPayments()])
      .then(([dep, wit]) => {
        setDepositList(Array.isArray(dep) ? dep : []);
        setWithdrawList(Array.isArray(wit) ? wit : []);
      })
      .catch(() => addToast('Không thể tải danh sách nạp/rút tiền', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const currentList = tab === 'deposit' ? depositList : withdrawList;
  const setCurrentList = tab === 'deposit' ? setDepositList : setWithdrawList;

  const mapStatus = s => (s === 'COMPLETED' ? 'processed' : s === 'PENDING' ? 'pending' : 'rejected');

  // Thống kê tổng quan
  const totalDepositSuccess = depositList
    .filter(d => d.status === 'COMPLETED')
    .reduce((sum, d) => sum + (Number(d.coin) || 0), 0);

  const totalWithdrawSuccess = withdrawList
    .filter(w => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (Number(w.coin) || 0), 0);

  const netFlow = totalDepositSuccess - totalWithdrawSuccess;

  const pendingWithdrawList = withdrawList.filter(w => w.status === 'PENDING');
  const pendingDepositList = depositList.filter(d => d.status === 'PENDING');
  const pendingWithdrawCount = pendingWithdrawList.length;
  const pendingDepositCount = pendingDepositList.length;
  const pendingWithdrawAmount = pendingWithdrawList.reduce((sum, w) => sum + (Number(w.coin) || 0), 0);
  const pendingDepositAmount = pendingDepositList.reduce((sum, d) => sum + (Number(d.coin) || 0), 0);

  // Danh sách các phương thức / ngân hàng để lọc
  const uniqueMethods = useMemo(() => {
    const set = new Set();
    currentList.forEach(item => {
      if (tab === 'withdraw') {
        if (item.bankName) set.add(item.bankName.trim());
      } else {
        if (item.method) set.add(item.method.trim());
      }
    });
    return Array.from(set);
  }, [currentList, tab]);

  // Bộ lọc dữ liệu
  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return currentList.filter(item => {
      // 1. Trạng thái
      const ms = mapStatus(item.status);
      if (statusFilter !== 'all' && ms !== statusFilter) return false;

      // 2. Tìm kiếm (ID, Tên, SĐT, STK, Ngân hàng)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const idMatch = String(item.id).includes(q);
        const nameMatch = item.fullName?.toLowerCase().includes(q);
        const phoneMatch = item.phoneNumber?.includes(q);
        const accMatch = item.bankAccountNumber?.toLowerCase().includes(q);
        const bankMatch = item.bankName?.toLowerCase().includes(q);
        const methodMatch = item.method?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !phoneMatch && !accMatch && !bankMatch && !methodMatch) {
          return false;
        }
      }

      // 3. Khoảng tiền
      const coin = Number(item.coin) || 0;
      if (amountFilter === '<100k' && coin >= 100000) return false;
      if (amountFilter === '100k-500k' && (coin < 100000 || coin > 500000)) return false;
      if (amountFilter === '500k-2m' && (coin <= 500000 || coin > 2000000)) return false;
      if (amountFilter === '>2m' && coin <= 2000000) return false;

      // 4. Ngân hàng / Phương thức
      if (methodFilter !== 'all') {
        if (tab === 'withdraw') {
          if (item.bankName?.trim() !== methodFilter) return false;
        } else {
          if (item.method?.trim() !== methodFilter) return false;
        }
      }

      // 5. Thời gian
      if (dateFilter !== 'all') {
        const itemDateObj = parseDateToDateObj(item.createdAt);
        const itemTime = itemDateObj ? itemDateObj.getTime() : 0;
        if (!itemTime) return false;

        if (dateFilter === 'today' && itemTime < todayStart) return false;
        if (dateFilter === 'yesterday' && (itemTime < yesterdayStart || itemTime >= todayStart)) return false;
        if (dateFilter === 'last7days' && itemTime < sevenDaysAgo) return false;
        if (dateFilter === 'last30days' && itemTime < thirtyDaysAgo) return false;
        if (dateFilter === 'thisMonth' && itemTime < thisMonthStart) return false;
        if (dateFilter === 'custom') {
          if (startDate) {
            const startLimit = new Date(startDate).getTime();
            if (itemTime < startLimit) return false;
          }
          if (endDate) {
            const endLimit = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
            if (itemTime >= endLimit) return false;
          }
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'amount-desc') return (Number(b.coin) || 0) - (Number(a.coin) || 0);
      if (sortBy === 'amount-asc') return (Number(a.coin) || 0) - (Number(b.coin) || 0);

      const timeA = parseDateToDateObj(a.createdAt)?.getTime() || 0;
      const timeB = parseDateToDateObj(b.createdAt)?.getTime() || 0;
      if (sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA; // newest default
    });
  }, [currentList, search, statusFilter, dateFilter, startDate, endDate, amountFilter, methodFilter, sortBy, tab]);

  // Tổng tiền trong danh sách sau lọc
  const filteredTotalAmount = useMemo(() => {
    return filtered.reduce((sum, item) => sum + (Number(item.coin) || 0), 0);
  }, [filtered]);

  const hasActiveFilters = search || statusFilter !== 'all' || dateFilter !== 'all' || amountFilter !== 'all' || methodFilter !== 'all' || sortBy !== 'newest';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setAmountFilter('all');
    setMethodFilter('all');
    setSortBy('newest');
  };

  // Sao chép nhanh STK
  const handleCopy = (text, label = 'nội dung') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    addToast(`Đã sao chép ${label}: ${text}`, 'success');
  };

  // Duyệt thanh toán / Rút tiền
  const handleConfirmApprove = async () => {
    if (!approveItem) return;
    setIsSubmitting(true);
    try {
      const txId = approveTxId.trim() || `ADM_${Date.now()}`;
      await api.processPayment(approveItem.id, txId);
      setCurrentList(prev => prev.map(p => p.id === approveItem.id ? { ...p, status: 'COMPLETED' } : p));
      addToast(`Đã duyệt đơn #${approveItem.id} thành công!`, 'success');
      setApproveItem(null);
      setApproveTxId('');
    } catch {
      addToast('Duyệt thanh toán thất bại, vui lòng thử lại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Từ chối giao dịch & Hoàn tiền
  const handleConfirmReject = async () => {
    if (!rejectItem) return;
    setIsSubmitting(true);
    try {
      const reason = rejectReason.trim() || 'Admin từ chối giao dịch';
      await api.refundPayment(rejectItem.id, reason);
      setCurrentList(prev => prev.map(p => p.id === rejectItem.id ? { ...p, status: 'REFUNDED' } : p));
      addToast(`Đã từ chối đơn #${rejectItem.id} và hoàn tiền cho người dùng!`, 'info');
      setRejectItem(null);
      setRejectReason('Thông tin tài khoản ngân hàng không chính xác');
    } catch {
      addToast('Thao tác từ chối thất bại', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xuất file CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      addToast('Không có dữ liệu để xuất file', 'warning');
      return;
    }
    const headers = tab === 'withdraw'
      ? ['ID', 'Tên người dùng', 'Số điện thoại', 'Số tiền (VNĐ)', 'Ngân hàng', 'Số tài khoản', 'Chủ tài khoản', 'Ngày tạo', 'Trạng thái']
      : ['ID', 'Tên người dùng', 'Số điện thoại', 'Số tiền (VNĐ)', 'Phương thức', 'Ngày tạo', 'Trạng thái'];

    const rows = filtered.map(item => {
      const statusText = item.status === 'COMPLETED' ? 'Thành công' : item.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối / Hoàn tiền';
      const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—';
      if (tab === 'withdraw') {
        return [
          item.id,
          `"${item.fullName || '—'}"`,
          `"${item.phoneNumber || '—'}"`,
          item.coin || 0,
          `"${item.bankName || '—'}"`,
          `'${item.bankAccountNumber || '—'}`,
          `"${item.bankAccountName || '—'}"`,
          `"${dateStr}"`,
          `"${statusText}"`
        ];
      }
      return [
        item.id,
        `"${item.fullName || '—'}"`,
        `"${item.phoneNumber || '—'}"`,
        item.coin || 0,
        `"${item.method || 'MANUAL'}"`,
        `"${dateStr}"`,
        `"${statusText}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh_sach_${tab === 'withdraw' ? 'rut_tien' : 'nap_tien'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Đã xuất file CSV thành công!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 4 Cards Thống Kê Tổng Quan */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <MetricCard
          label="Tổng Tiền Đã Nạp"
          value={`${totalDepositSuccess.toLocaleString('vi-VN')} đ`}
          sub={`${depositList.filter(d => d.status === 'COMPLETED').length} đơn nạp thành công`}
          icon={ArrowDownCircle}
          color="#10b981"
        />
        <MetricCard
          label="Tổng Tiền Đã Rút"
          value={`${totalWithdrawSuccess.toLocaleString('vi-VN')} đ`}
          sub={`${withdrawList.filter(w => w.status === 'COMPLETED').length} đơn rút thành công`}
          icon={ArrowUpCircle}
          color="#f59e0b"
        />
        <MetricCard
          label="Chênh Lệch Nạp - Rút"
          value={`${netFlow >= 0 ? '+' : ''}${netFlow.toLocaleString('vi-VN')} đ`}
          sub="Dòng tiền ròng hệ thống"
          icon={DollarSign}
          color={netFlow >= 0 ? '#6366f1' : '#f43f5e'}
        />
        <MetricCard
          label="Chờ Xử Lý Duyệt"
          value={`${pendingWithdrawCount + pendingDepositCount} đơn`}
          sub={`Rút: ${pendingWithdrawCount} (${pendingWithdrawAmount.toLocaleString('vi-VN')}đ) | Nạp: ${pendingDepositCount}`}
          icon={Clock}
          color="#f43f5e"
        />
      </div>

      {/* Main Container */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Header Tabs: Nạp Tiền & Rút Tiền */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { id: 'deposit', label: '⬇ Quản Lý Nạp Tiền', count: depositList.length, pendingCount: pendingDepositCount },
              { id: 'withdraw', label: '⬆ Quản Lý Rút Tiền', count: withdrawList.length, pendingCount: pendingWithdrawCount },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setMethodFilter('all');
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  background: tab === t.id ? (t.id === 'withdraw' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--primary)') : 'rgba(255,255,255,0.05)',
                  color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: tab === t.id ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <span>{t.label}</span>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>({t.count})</span>
                {t.pendingCount > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '2px 7px', borderRadius: '10px', fontWeight: 900 }}>
                    {t.pendingCount} chờ
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Góc phải trên cùng: Ô tìm kiếm + Nút Xuất CSV & Nút Làm Mới */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="form-control"
                style={{ paddingLeft: '34px', paddingRight: search ? '30px' : '12px', height: '38px', fontSize: '0.85rem', width: '100%', borderRadius: '10px' }}
                placeholder={tab === 'withdraw' ? "Tìm theo tên, SĐT, STK, mã #ID..." : "Tìm theo tên, SĐT, mã #ID..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              className="btn btn-outline"
              style={{ height: '38px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
              onClick={handleExportCSV}
              title="Xuất danh sách đang lọc ra file CSV Excel"
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>
            <button
              className="btn btn-outline"
              style={{ height: '38px', width: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
              onClick={fetchData}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Hệ Thống Bộ Lọc Responsive - Giống Đơn Hàng */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            width: '100%',
            marginBottom: '16px'
          }}
        >
          {/* 1. Trạng thái */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">⏳ Chờ duyệt (Pending)</option>
              <option value="processed">✅ Đã xử lý (Completed)</option>
              <option value="rejected">❌ Từ chối / Hoàn tiền</option>
            </select>
          </div>

          {/* 2. Khoảng thời gian */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            >
              <option value="all">📅 Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="last7days">7 ngày qua</option>
              <option value="last30days">30 ngày qua</option>
              <option value="thisMonth">Tháng này</option>
              <option value="custom">Tùy chọn khoảng ngày...</option>
            </select>
          </div>

          {/* 3. Mệnh giá */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
              value={amountFilter}
              onChange={e => setAmountFilter(e.target.value)}
            >
              <option value="all">💰 Tất cả mệnh giá</option>
              <option value="<100k">Dưới 100.000 đ</option>
              <option value="100k-500k">100.000 đ - 500.000 đ</option>
              <option value="500k-2m">500.000 đ - 2.000.000 đ</option>
              <option value=">2m">Trên 2.000.000 đ</option>
            </select>
          </div>

          {/* 4. Phương thức / Ngân hàng */}
          {uniqueMethods.length > 0 && (
            <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
              <select
                className="form-control"
                style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
              >
                <option value="all">{tab === 'withdraw' ? '🏦 Tất cả ngân hàng' : '💳 Tất cả phương thức'}</option>
                {uniqueMethods.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* 5. Sắp xếp */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="amount-desc">Số tiền: Cao → Thấp</option>
              <option value="amount-asc">Số tiền: Thấp → Cao</option>
            </select>
          </div>

          {/* Nút reset nếu có filter hoạt động */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '40px', padding: '0 12px', fontSize: '0.82rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={handleResetFilters}
            >
              <RotateCcw size={13} />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* Ngày tùy chỉnh nếu chọn custom */}
        {dateFilter === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Từ ngày:</span>
            <input
              type="date"
              className="form-control"
              style={{ height: '36px', fontSize: '0.82rem', width: 'auto', borderRadius: '8px' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Đến ngày:</span>
            <input
              type="date"
              className="form-control"
              style={{ height: '36px', fontSize: '0.82rem', width: 'auto', borderRadius: '8px' }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        )}

        {/* Thanh tóm tắt kết quả theo bộ lọc */}
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Đang hiển thị <strong>{filtered.length}</strong> / {currentList.length} giao dịch
          <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
          Tổng tiền lọc được: <strong style={{ color: tab === 'withdraw' ? '#f59e0b' : '#10b981' }}>{filteredTotalAmount.toLocaleString('vi-VN')} đ</strong>
        </div>

        {/* Bảng Dữ Liệu Giao Dịch */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Mã Đơn</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Người Dùng</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Số Tiền</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>{tab === 'withdraw' ? 'Ngân Hàng' : 'Phương Thức'}</th>
                {tab === 'withdraw' && <th style={{ padding: '12px 14px', textAlign: 'left' }}>Tài Khoản Nhận Tiền</th>}
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Ngày Tạo</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Trạng Thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {hasActiveFilters ? 'Không tìm thấy giao dịch nào phù hợp với bộ lọc' : 'Không có giao dịch nào'}
                  </td>
                </tr>
              ) : filtered.map(item => {
                const ms = mapStatus(item.status);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                    {/* ID */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--primary)' }}>
                      #{item.id}
                    </td>

                    {/* Người dùng */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img
                          src={item.avatarUrl || getUserAvatar({ username: item.fullName || item.phoneNumber || `user_${item.id}` })}
                          alt=""
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.fullName || '—'}</div>
                          {item.phoneNumber && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.phoneNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Số tiền */}
                    <td style={{ padding: '12px 14px', fontWeight: 800, fontSize: '0.95rem', color: tab === 'deposit' ? '#10b981' : '#f59e0b' }}>
                      {(item.coin || 0).toLocaleString('vi-VN')} đ
                    </td>

                    {/* Phương thức / Ngân hàng */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {tab === 'withdraw' ? (item.bankName || 'Ngân hàng') : (item.method || 'VIETQR')}
                    </td>

                    {/* Cột tài khoản nhận (cho tab rút tiền) */}
                    {tab === 'withdraw' && (
                      <td style={{ padding: '12px 14px', fontSize: '0.82rem' }}>
                        {item.bankAccountNumber ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>{item.bankAccountNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.bankAccountNumber, 'số tài khoản')}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                title="Sao chép STK"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', textTransform: 'uppercase' }}>
                              {item.bankAccountName || '—'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )}

                    {/* Ngày tạo */}
                    <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={ms} />
                    </td>

                    {/* Hành động */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '6px 8px', fontSize: '0.75rem', height: 'auto' }}
                          onClick={() => setSelectedItem(item)}
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>

                        {ms === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'auto', background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                setApproveItem(item);
                                setApproveTxId(`TX_${Date.now()}`);
                              }}
                              title="Duyệt giao dịch"
                            >
                              <Check size={14} /> <span>Duyệt</span>
                            </button>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '6px 8px', fontSize: '0.75rem', height: 'auto', borderColor: '#ef4444', color: '#ef4444' }}
                              onClick={() => setRejectItem(item)}
                              title="Từ chối & Hoàn tiền"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chi Tiết Giao Dịch */}
      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '460px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Chi Tiết Giao Dịch #{selectedItem.id}</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedItem(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                ['Người dùng', selectedItem.fullName || '—'],
                ['Số điện thoại', selectedItem.phoneNumber || '—'],
                ['Số tiền', `${(selectedItem.coin || 0).toLocaleString('vi-VN')} đ`],
                ['Phương thức / Loại', tab === 'withdraw' ? 'Rút Tiền Về Ngân Hàng' : (selectedItem.method || 'VIETQR')],
                ['Ngày tạo', selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleString('vi-VN') : '—'],
                ['Trạng thái', selectedItem.status === 'COMPLETED' ? 'Đã duyệt thành công' : selectedItem.status === 'PENDING' ? 'Chờ duyệt' : 'Đã từ chối / Hoàn tiền'],
                ...(tab === 'withdraw' ? [
                  ['Ngân hàng thụ hưởng', selectedItem.bankName || '—'],
                  ['Số tài khoản', selectedItem.bankAccountNumber || '—'],
                  ['Tên chủ tài khoản', selectedItem.bankAccountName || '—'],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v}</span>
                </div>
              ))}
            </div>

            {mapStatus(selectedItem.status) === 'pending' && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#10b981', borderColor: '#10b981', height: '42px', fontWeight: 700 }}
                  onClick={() => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    setApproveItem(item);
                    setApproveTxId(`TX_${Date.now()}`);
                  }}
                >
                  <Check size={16} /> <span>Duyệt Thanh Toán</span>
                </button>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444', height: '42px', fontWeight: 700 }}
                  onClick={() => {
                    const item = selectedItem;
                    setSelectedItem(null);
                    setRejectItem(item);
                  }}
                >
                  <X size={16} /> <span>Từ Chối & Hoàn Tiền</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Duyệt Đơn */}
      {approveItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setApproveItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#10b981' }}>
                Xác Nhận Duyệt Đơn #{approveItem.id}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setApproveItem(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {tab === 'withdraw'
                ? `Bạn đang xác nhận đã chuyển khoản ngân hàng thành công số tiền ${(approveItem.coin || 0).toLocaleString('vi-VN')} đ cho người dùng.`
                : `Xác nhận đã nhận được tiền nạp ${(approveItem.coin || 0).toLocaleString('vi-VN')} đ của người dùng.`}
            </p>

            {tab === 'withdraw' && (
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border-color)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span>
                  <span style={{ fontWeight: 700 }}>{approveItem.bankName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 800 }}>{approveItem.bankAccountNumber}</span>
                    <button type="button" onClick={() => handleCopy(approveItem.bankAccountNumber, 'STK')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span>
                  <span style={{ fontWeight: 700 }}>{approveItem.bankAccountName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số tiền cần chuyển:</span>
                  <span style={{ fontWeight: 900, color: '#f59e0b', fontSize: '1rem' }}>{(approveItem.coin || 0).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                Mã tham chiếu / Mã giao dịch ngân hàng (Tùy chọn)
              </label>
              <input
                type="text"
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                placeholder="VD: MB_123456789..."
                value={approveTxId}
                onChange={e => setApproveTxId(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setApproveItem(null)} disabled={isSubmitting}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                onClick={handleConfirmApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ Chối & Hoàn Tiền */}
      {rejectItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRejectItem(null)}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ef4444' }}>
                Từ Chối Giao Dịch #{rejectItem.id}
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setRejectItem(null)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Khi từ chối, số tiền <strong>{(rejectItem.coin || 0).toLocaleString('vi-VN')} đ</strong> sẽ được <strong style={{ color: '#10b981' }}>tự động hoàn lại vào ví</strong> của người dùng <strong>{rejectItem.fullName}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                Chọn nhanh lý do từ chối:
              </label>
              <select
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem', marginBottom: '8px' }}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              >
                <option value="Thông tin tài khoản ngân hàng không chính xác">Thông tin tài khoản ngân hàng không chính xác</option>
                <option value="Tên chủ tài khoản không khớp với số tài khoản">Tên chủ tài khoản không khớp với số tài khoản</option>
                <option value="Số tài khoản ngân hàng không tồn tại">Số tài khoản ngân hàng không tồn tại</option>
                <option value="Tài khoản có dấu hiệu vi phạm chính sách giao dịch">Tài khoản có dấu hiệu vi phạm chính sách giao dịch</option>
                <option value="Khác">Lý do khác (tự nhập bên dưới)</option>
              </select>

              <input
                type="text"
                className="form-control"
                style={{ height: '38px', fontSize: '0.85rem' }}
                placeholder="Nhập chi tiết lý do gửi cho người dùng..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setRejectItem(null)} disabled={isSubmitting}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: '#ef4444', borderColor: '#ef4444', fontWeight: 700 }}
                onClick={handleConfirmReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Từ Chối & Hoàn Tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTab;
