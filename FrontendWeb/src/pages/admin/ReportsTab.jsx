import React, { useState, useMemo } from 'react';
import {
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Search,
  RefreshCw, Clock, X, Eye, Download, RotateCcw
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { getUserAvatar } from '../../utils/avatarUtils';
import { MetricCard, parseDateToDateObj } from './adminHelpers';

export const ReportsTab = ({ reportsList = [], setReportsList, loading, reloadReports, onStatsRefresh }) => {
  const { addToast } = useToast();
  const [expandedId, setExpandedId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [resolutionTexts, setResolutionTexts] = useState({});
  const [refundPercentages, setRefundPercentages] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, PENDING, INVESTIGATING, RESOLVED, REJECTED
  const [reasonFilter, setReasonFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // all, with_order, without_order
  const [dateFilter, setDateFilter] = useState('all'); // all, today, yesterday, last7days, last30days, thisMonth, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, order-price-desc, order-price-asc

  // Thống kê tổng quan
  const totalReports = reportsList.length;
  const pendingList = reportsList.filter(r => r.status === 'PENDING' || r.status === 'INVESTIGATING');
  const resolvedList = reportsList.filter(r => r.status === 'RESOLVED');
  const rejectedList = reportsList.filter(r => r.status === 'REJECTED');
  const withOrderList = reportsList.filter(r => r.order?.id);

  const pendingCount = pendingList.length;
  const resolvedCount = resolvedList.length;
  const rejectedCount = rejectedList.length;
  const withOrderCount = withOrderList.length;
  const withoutOrderCount = totalReports - withOrderCount;

  const totalRefundAmount = useMemo(() => {
    return resolvedList.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);
  }, [resolvedList]);

  const resolutionRate = totalReports > 0
    ? Math.round(((resolvedCount + rejectedCount) / totalReports) * 100)
    : 100;

  // Trích xuất danh sách lý do khiếu nại duy nhất để lọc
  const uniqueReasons = useMemo(() => {
    const set = new Set();
    reportsList.forEach(r => {
      if (r.reason && r.reason.trim()) set.add(r.reason.trim());
    });
    return Array.from(set);
  }, [reportsList]);

  const getReporterName = (r) => r.reporter?.username || r.reporter?.fullName || r.reportedBy || 'Khách hàng';
  const getTargetName = (r) => r.reportedPlayer?.username || r.reportedPlayer?.user?.username || r.targetUser || 'Game thủ';

  // Lọc dữ liệu khiếu nại
  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return reportsList.filter(r => {
      // 1. Trạng thái
      if (statusFilter !== 'all') {
        if (statusFilter === 'PENDING') {
          if (r.status !== 'PENDING' && r.status !== 'INVESTIGATING') return false;
        } else if (r.status !== statusFilter) {
          return false;
        }
      }

      // 2. Lý do khiếu nại
      if (reasonFilter !== 'all' && (r.reason || '').trim() !== reasonFilter) {
        return false;
      }

      // 3. Phân loại có đơn thuê / không có đơn thuê
      if (typeFilter === 'with_order' && !r.order?.id) return false;
      if (typeFilter === 'without_order' && r.order?.id) return false;

      // 4. Tìm kiếm từ khóa (Search)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const cleanQ = q.startsWith('#') ? q.slice(1) : q;
        const idMatch = String(r.id || '').toLowerCase().includes(cleanQ);
        const orderIdMatch = r.order?.id ? String(r.order.id).toLowerCase().includes(cleanQ) : false;
        const reporterName = getReporterName(r).toLowerCase();
        const targetName = getTargetName(r).toLowerCase();
        const reporterMatch = reporterName.includes(q);
        const targetMatch = targetName.includes(q);
        const reasonMatch = (r.reason || '').toLowerCase().includes(q);
        const descMatch = (r.description || '').toLowerCase().includes(q);
        const resMatch = (r.resolution || '').toLowerCase().includes(q);

        if (!idMatch && !orderIdMatch && !reporterMatch && !targetMatch && !reasonMatch && !descMatch && !resMatch) {
          return false;
        }
      }

      // 5. Thời gian
      if (dateFilter !== 'all') {
        const itemDateObj = parseDateToDateObj(r.createdAt);
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
      if (sortBy === 'order-price-desc') {
        return (Number(b.order?.price) || 0) - (Number(a.order?.price) || 0);
      }
      if (sortBy === 'order-price-asc') {
        return (Number(a.order?.price) || 0) - (Number(b.order?.price) || 0);
      }

      const timeA = parseDateToDateObj(a.createdAt)?.getTime() || 0;
      const timeB = parseDateToDateObj(b.createdAt)?.getTime() || 0;
      if (sortBy === 'oldest') return timeA - timeB;
      return timeB - timeA; // newest default
    });
  }, [reportsList, search, statusFilter, reasonFilter, typeFilter, dateFilter, startDate, endDate, sortBy]);

  const hasActiveFilters = Boolean(
    search || statusFilter !== 'all' || reasonFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' || sortBy !== 'newest'
  );

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setReasonFilter('all');
    setTypeFilter('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
  };

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (typeof reloadReports === 'function') {
        await reloadReports();
      } else if (onStatsRefresh) {
        await onStatsRefresh();
      }
      addToast('Đã làm mới danh sách khiếu nại', 'info');
    } catch (e) {
      console.error(e);
      addToast('Lỗi khi tải lại dữ liệu khiếu nại', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Xuất file CSV
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      addToast('Không có dữ liệu khiếu nại để xuất file', 'warning');
      return;
    }
    const headers = [
      'Mã Khiếu Nại',
      'Người Khiếu Nại',
      'Game Thủ Bị Tố Cáo',
      'Mã Đơn Thuê',
      'Giá Đơn (VNĐ)',
      'Lý Do',
      'Mô Tả',
      'Trạng Thái',
      'Tỷ Lệ Hoàn (%)',
      'Số Tiền Hoàn (VNĐ)',
      'Kết Quả Xử Lý',
      'Ngày Tạo'
    ];

    const rows = filtered.map(r => {
      const reporter = getReporterName(r);
      const target = getTargetName(r);
      const statusText = r.status === 'RESOLVED' ? 'Đã hoàn tiền' : r.status === 'REJECTED' ? 'Đã từ chối' : r.status === 'INVESTIGATING' ? 'Đang điều tra' : 'Chờ xử lý';
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—';
      return [
        r.id,
        '"' + String(reporter).replace(/"/g, '""') + '"',
        '"' + String(target).replace(/"/g, '""') + '"',
        r.order?.id || '—',
        Number(r.order?.price || 0),
        '"' + String(r.reason || '—').replace(/"/g, '""') + '"',
        '"' + String(r.description || '—').replace(/"/g, '""') + '"',
        '"' + statusText + '"',
        r.refundPercentage != null ? `${r.refundPercentage}%` : '—',
        Number(r.refundAmount || 0),
        '"' + String(r.resolution || '—').replace(/"/g, '""') + '"',
        '"' + dateStr + '"'
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_khieu_nai_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast(`Đã xuất file CSV cho ${filtered.length} khiếu nại!`, 'success');
  };

  const handleResolve = async (id) => {
    const report = reportsList.find(r => r.id === id);
    const percent = refundPercentages[id] !== undefined ? Number(refundPercentages[id]) : 100;
    const finalPercent = (percent > 0 && percent <= 100) ? percent : 100;
    const defaultResolution = report?.order
      ? `Admin chấp thuận khiếu nại (Hoàn tiền ${finalPercent}%)`
      : 'Admin đã chấp thuận khiếu nại';
    const resolution = resolutionTexts[id]?.trim() || defaultResolution;

    try {
      await api.updateReportStatus(id, 'RESOLVED', resolution, finalPercent);
      setReportsList(prev => prev.map(r => r.id === id ? {
        ...r,
        status: 'RESOLVED',
        resolution,
        refundPercentage: finalPercent,
        order: r.order ? { ...r.order, status: 'REFUNDED' } : r.order
      } : r));
      setExpandedId(null);
      setSelectedReport(null);
      if (onStatsRefresh) onStatsRefresh();
      addToast(`Đã chấp thuận khiếu nại & hoàn tiền ${finalPercent}% thành công (Số tiền còn lại đã chuyển vào số dư khả dụng của idol)!`, 'success');
    } catch (e) {
      addToast('Lỗi khi xử lý khiếu nại!', 'error');
    }
  };

  const handleReject = async (id) => {
    const resolution = resolutionTexts[id]?.trim() || 'Admin từ chối khiếu nại';
    try {
      await api.updateReportStatus(id, 'REJECTED', resolution);
      setReportsList(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED', resolution } : r));
      setExpandedId(null);
      setSelectedReport(null);
      if (onStatsRefresh) onStatsRefresh();
      addToast('Đã từ chối khiếu nại (Toàn bộ số tiền đóng băng đã chuyển vào số dư khả dụng của idol)!', 'success');
    } catch (e) {
      addToast('Lỗi khi từ chối khiếu nại!', 'error');
    }
  };

  const ReportStatusBadge = ({ status }) => {
    const map = {
      PENDING: { label: 'Chờ xử lý', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
      INVESTIGATING: { label: 'Đang điều tra', bg: 'rgba(99,102,241,0.15)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' },
      RESOLVED: { label: 'Đã hoàn tiền', bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
      REJECTED: { label: 'Từ chối', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    };
    const s = map[status?.toUpperCase()] || map.PENDING;
    return (
      <span style={{
        fontSize: '0.75rem',
        padding: '3px 10px',
        borderRadius: '20px',
        background: s.bg,
        color: s.color,
        fontWeight: 700,
        border: `1px solid ${s.border}`
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ─── CÁC Ô THỐNG KÊ (STATISTICS CARDS) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px'
      }}>
        <MetricCard
          label="Tổng Khiếu Nại"
          value={totalReports}
          sub={`${withOrderCount} gắn đơn • ${withoutOrderCount} tự do`}
          icon={AlertTriangle}
          color="#6366f1"
        />
        <MetricCard
          label="Chờ Xử Lý"
          value={pendingCount}
          sub={pendingCount > 0 ? "Cần admin xem xét ngay" : "Không có tồn đọng"}
          icon={Clock}
          color="#f59e0b"
        />
        <MetricCard
          label="Đã Hoàn Tiền"
          value={resolvedCount}
          sub={`Chiếm ${totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0}% tổng đơn`}
          icon={CheckCircle2}
          color="#10b981"
        />
        <MetricCard
          label="Đã Từ Chối"
          value={rejectedCount}
          sub="Tiền trả lại ví khả dụng idol"
          icon={XCircle}
          color="#ef4444"
        />
        <MetricCard
          label="Tổng Tiền Đã Hoàn"
          value={`${totalRefundAmount.toLocaleString('vi-VN')} đ`}
          sub="Tổng tiền đã hoàn trả khách"
          icon={RotateCcw}
          color="#0ea5e9"
        />
        {/* <MetricCard
          label="Tỷ Lệ Xử Lý"
          value={`${resolutionRate}%`}
          sub={`${resolvedCount + rejectedCount} / ${totalReports} khiếu nại`}
          icon={TrendingUp}
          color="#a855f7"
        /> */}
      </div>

      {/* ─── MAIN CONTAINER: BỘ LỌC, TÌM KIẾM VÀ DANH SÁCH ─── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        {/* Header hàng 1: Tiêu đề + Góc phải trên cùng: Ô tìm kiếm + Nút thao tác nhanh (Làm mới, Xuất CSV) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <span>Quản Lý Khiếu Nại & Vi Phạm</span>
              <span style={{ fontSize: '0.82rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                {filtered.length} / {totalReports}
              </span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Theo dõi, điều tra tranh chấp đơn thuê và phân xử tỷ lệ hoàn tiền giữa khách hàng và idol
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Ô tìm kiếm đưa lên góc phải trên cùng */}
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Tìm mã khiếu nại, đơn, idol..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '34px', paddingRight: search ? '30px' : '12px', height: '38px', fontSize: '0.85rem', width: '100%', borderRadius: '10px' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                  title="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '38px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              title="Xuất file CSV báo cáo"
            >
              <Download size={15} />
              <span>Xuất CSV</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '38px', width: '38px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Responsive Filter Toolbar - Giống Đơn Hàng */}
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
              <option value="PENDING">⏳ Chờ xử lý / Đang điều tra</option>
              <option value="RESOLVED">✅ Đã hoàn tiền</option>
              <option value="REJECTED">❌ Đã từ chối</option>
            </select>
          </div>

          {/* 2. Lý do vi phạm */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
            >
              <option value="all">⚡ Tất cả lý do ({uniqueReasons.length})</option>
              {uniqueReasons.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 3. Phân loại đơn */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select
              className="form-control"
              style={{ height: '40px', fontSize: '0.85rem', width: '100%', borderRadius: '10px', cursor: 'pointer' }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">📦 Tất cả ({totalReports})</option>
              <option value="with_order">📦 Có đơn thuê ({withOrderCount})</option>
              <option value="without_order">👤 Tố cáo tự do ({withoutOrderCount})</option>
            </select>
          </div>

          {/* 4. Thời gian */}
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
              <option value="custom">Tùy chọn ngày...</option>
            </select>
          </div>

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
              <option value="order-price-desc">Giá đơn cao nhất</option>
              <option value="order-price-asc">Giá đơn thấp nhất</option>
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
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

        {/* Dòng tóm tắt kết quả */}
        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Đang hiển thị <strong>{filtered.length}</strong> / {totalReports} khiếu nại
          <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>|</span>
          {pendingCount} chờ xử lý • {resolvedCount} đã hoàn tiền (<strong style={{ color: '#10b981' }}>{totalRefundAmount.toLocaleString('vi-VN')} đ</strong>) • {rejectedCount} đã từ chối
        </div>

        {/* ─── BẢNG DANH SÁCH KHIẾU NẠI (Giống Đơn Hàng) ─── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Mã KN</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Người tố cáo</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Bị tố cáo</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Lý do & Đơn thuê</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Tổng tiền</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Thời gian</th>
                <th style={{ padding: '12px 14px', textAlign: 'left' }}>Trạng thái</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Đang tải danh sách khiếu nại...
                  </td>
                </tr>
              ) : reportsList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Hiện không có khiếu nại hoặc báo cáo vi phạm nào trong hệ thống!
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Không tìm thấy khiếu nại nào phù hợp
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const reporterName = getReporterName(r);
                  const targetName = getTargetName(r);

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      {/* Mã KN */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>#{r.id}</span>
                      </td>

                      {/* Người tố cáo */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={r.reporter?.avatarUrl || getUserAvatar({ username: reporterName })}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ lineHeight: 1.25 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{reporterName}</div>
                            {r.reporter?.id && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: #{r.reporter.id}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Bị tố cáo */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={r.reportedPlayer?.avatarUrl || r.reportedPlayer?.user?.avatarUrl || getUserAvatar({ username: targetName })}
                            alt=""
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ lineHeight: 1.25 }}>
                            <div style={{ fontWeight: 600, color: '#f43f5e' }}>{targetName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                              {r.order?.game || 'Game thủ'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Lý do & Đơn thuê */}
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(244,63,94,0.12)',
                            color: '#f43f5e',
                            fontWeight: 700,
                            border: '1px solid rgba(244,63,94,0.25)'
                          }}>
                            {r.reason || 'Khiếu nại dịch vụ'}
                          </span>
                          {r.order?.id ? (
                            <span style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#0284c7',
                              fontWeight: 600
                            }}>
                              📦 Đơn #{r.order.id}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              👤 Tố cáo tự do
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số tiền */}
                      <td style={{ padding: '14px', fontWeight: 700, color: r.order ? '#10b981' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {r.order?.price ? `${Number(r.order.price).toLocaleString('vi-VN')} đ` : '—'}
                      </td>

                      {/* Thời gian */}
                      <td style={{ padding: '14px', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—'}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '14px', whiteSpace: 'nowrap' }}>
                        <ReportStatusBadge status={r.status || 'PENDING'} />
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedReport(r)}
                          className="btn btn-outline"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            gap: '6px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Xem chi tiết & xử lý khiếu nại"
                        >
                          <Eye size={13} />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Chi Tiết & Xử Lý Khiếu Nại */}
      {selectedReport && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                  Khiếu Nại #{selectedReport.id}
                </span>
                <span style={{
                  fontSize: '0.78rem',
                  padding: '2px 9px',
                  borderRadius: '6px',
                  background: 'rgba(244,63,94,0.15)',
                  color: '#f43f5e',
                  fontWeight: 700,
                  border: '1px solid rgba(244,63,94,0.3)'
                }}>
                  {selectedReport.reason || 'Khiếu nại dịch vụ'}
                </span>
                <ReportStatusBadge status={selectedReport.status || 'PENDING'} />
              </div>

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Thông tin 2 bên liên quan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px', background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  👤 Người tố cáo (Khách)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={selectedReport.reporter?.avatarUrl || getUserAvatar({ username: getReporterName(selectedReport) })}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      {getReporterName(selectedReport)}
                    </div>
                    {selectedReport.reporter?.phoneNumber && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedReport.reporter.phoneNumber}</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                  🎮 Bị tố cáo (Idol)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={selectedReport.reportedPlayer?.avatarUrl || selectedReport.reportedPlayer?.user?.avatarUrl || getUserAvatar({ username: getTargetName(selectedReport) })}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#f43f5e' }}>
                      {getTargetName(selectedReport)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedReport.order?.game || 'Game thủ'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thông tin đơn thuê & Slider hoàn tiền nếu có đơn */}
            {selectedReport.order && (
              <div style={{
                marginBottom: '18px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      📦 Đơn thuê #{selectedReport.order.id}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Giá đơn: <strong style={{ color: '#10b981' }}>{Number(selectedReport.order.price || 0).toLocaleString('vi-VN')} đ</strong>
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.76rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: selectedReport.order.status === 'REFUNDED' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    color: selectedReport.order.status === 'REFUNDED' ? '#ef4444' : '#10b981'
                  }}>
                    Đơn: {selectedReport.order.status === 'REFUNDED' ? 'Đã Hoàn Tiền' : selectedReport.order.status}
                  </span>
                </div>

                {/* Bộ điều chỉnh tỷ lệ hoàn tiền khi đang PENDING */}
                {selectedReport.status === 'PENDING' && (() => {
                  const orderPrice = Number(selectedReport.order.price || 0);
                  const curPercent = refundPercentages[selectedReport.id] !== undefined ? refundPercentages[selectedReport.id] : 100;
                  const numPercent = Number(curPercent) || 0;
                  const playerRecv = Number(selectedReport.order.playerReceived || Math.round(orderPrice * 0.85));
                  const renterRefundVal = Math.round(orderPrice * (numPercent / 100));
                  const playerDeductVal = Math.round(playerRecv * (numPercent / 100));

                  return (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0284c7' }}>
                          🎯 Tỷ lệ hoàn tiền cho khách: <span style={{ color: '#10b981' }}>{numPercent}%</span>
                        </label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[20, 40, 50, 70, 100].map(p => (
                            <button
                              key={p}
                              type="button"
                              className="btn btn-sm"
                              style={{
                                padding: '3px 8px',
                                fontSize: '0.75rem',
                                height: 'auto',
                                borderRadius: '6px',
                                background: numPercent === p ? '#0284c7' : 'rgba(255,255,255,0.06)',
                                color: numPercent === p ? '#fff' : 'var(--text-secondary)',
                                border: '1px solid ' + (numPercent === p ? '#0284c7' : 'var(--border-color)')
                              }}
                              onClick={() => setRefundPercentages(prev => ({ ...prev, [selectedReport.id]: p }))}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={numPercent}
                          onChange={e => setRefundPercentages(prev => ({ ...prev, [selectedReport.id]: Math.min(100, Math.max(1, Number(e.target.value))) }))}
                          style={{ flex: 1, accentColor: '#0284c7', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={curPercent}
                            onChange={e => {
                              const val = e.target.value === '' ? '' : Math.min(100, Math.max(1, Number(e.target.value)));
                              setRefundPercentages(prev => ({ ...prev, [selectedReport.id]: val }));
                            }}
                            style={{
                              width: '56px',
                              padding: '3px 6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              textAlign: 'center'
                            }}
                          />
                          <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>%</span>
                        </div>
                      </div>

                      {/* Hộp xem trước số tiền hoàn & phạt */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0,0,0,0.22)',
                        fontSize: '0.82rem'
                      }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Khách nhận lại ({numPercent}%):</div>
                          <div style={{ color: '#10b981', fontWeight: 800, fontSize: '0.95rem' }}>
                            +{renterRefundVal.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Idol bị thu hồi ({numPercent}%):</div>
                          <div style={{ color: '#ef4444', fontWeight: 800, fontSize: '0.95rem' }}>
                            -{playerDeductVal.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Chi tiết nội dung mô tả khiếu nại */}
            <div style={{ fontSize: '0.85rem', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>📝 Nội dung chi tiết:</div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {selectedReport.description || 'Không có mô tả chi tiết'}
              </div>
            </div>

            {/* Link bằng chứng */}
            {(selectedReport.videoUrl || selectedReport.imageUrls) && (
              <div style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                <strong>🔗 Link bằng chứng:</strong>{' '}
                <a
                  href={selectedReport.videoUrl || selectedReport.imageUrls}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all', marginLeft: '4px' }}
                >
                  {selectedReport.videoUrl || selectedReport.imageUrls}
                </a>
              </div>
            )}

            {/* Ảnh bằng chứng */}
            {(() => {
              const imageList = selectedReport.imageUrls ? selectedReport.imageUrls.split(',').map(s => s.trim()).filter(Boolean) : [];
              if (imageList.length <= 1) return null;
              return (
                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ fontSize: '0.85rem' }}>🖼 Ảnh bằng chứng ({imageList.length}):</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {imageList.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" title="Bấm để mở ảnh gốc">
                        <img
                          src={url}
                          alt={`Bằng chứng ${idx + 1}`}
                          style={{ width: '90px', height: '65px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Kết quả giải quyết nếu đã xong */}
            {selectedReport.resolution && (
              <div style={{
                fontSize: '0.85rem',
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: selectedReport.status === 'REJECTED' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${selectedReport.status === 'REJECTED' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
                color: selectedReport.status === 'REJECTED' ? '#ef4444' : '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <strong>Kết quả giải quyết:</strong>
                <span>{selectedReport.resolution}</span>
                {selectedReport.refundPercentage != null && (
                  <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                    Đã hoàn {selectedReport.refundPercentage}% ({Number(selectedReport.refundAmount || 0).toLocaleString('vi-VN')} đ)
                  </span>
                )}
              </div>
            )}

            {/* Form hành động cho Admin khi khiếu nại đang PENDING */}
            {selectedReport.status === 'PENDING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <textarea
                  placeholder="Ghi chú kết quả xử lý gửi cho người dùng (ví dụ: Chấp thuận hoàn tiền do idol vắng mặt không lý do)..."
                  value={resolutionTexts[selectedReport.id] || ''}
                  onChange={e => setResolutionTexts(prev => ({ ...prev, [selectedReport.id]: e.target.value }))}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '8px 18px', fontSize: '0.85rem', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={async () => {
                      await handleReject(selectedReport.id);
                      setSelectedReport(null);
                    }}
                  >
                    <X size={16} />
                    <span>Từ Chối Khiếu Nại</span>
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={async () => {
                      await handleResolve(selectedReport.id);
                      setSelectedReport(null);
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Chấp Thuận & Hoàn Tiền</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
