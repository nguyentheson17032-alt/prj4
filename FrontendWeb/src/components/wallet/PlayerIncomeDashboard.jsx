import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Download,
  Award,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Loader2,
  BarChart2,
  Clock
} from 'lucide-react';
import api from '../../api/apiService';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export const PlayerIncomeDashboard = () => {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('DAILY'); // 'DAILY' | 'WEEKLY'
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await api.getPlayerIncomeReport();
        if (isMounted && data) {
          setReport(data);
        }
      } catch (err) {
        console.error('Fetch player income report error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.exportPlayerStatement();
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sao_ke_thu_nhap_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(t('wallet.statementDownloaded', 'Đã xuất và tải file sao kê CSV thành công!'), 'success');
    } catch (err) {
      console.error('Export CSV error:', err);
      addToast('Xuất sao kê thất bại, vui lòng thử lại', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <Loader2 className="animate-spin" size={36} style={{ margin: '0 auto 12px auto' }} />
        <p>Đang tải báo cáo thu nhập Idol...</p>
      </div>
    );
  }

  const todayIncome = report?.todayIncome || 0;
  const thisWeekIncome = report?.thisWeekIncome || 0;
  const thisMonthIncome = report?.thisMonthIncome || 0;
  const totalIncome = report?.totalIncome || 0;
  const completedOrders = report?.completedOrdersCount || 0;

  const currentList = viewMode === 'DAILY' ? (report?.dailyBreakdown || []) : (report?.weeklyBreakdown || []);
  const maxIncome = Math.max(...currentList.map(item => item.totalIncome || 0), 100000);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Title and CSV Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 className="gradient-text" size={26} />
            <span>Dashboard Báo Cáo Thu Nhập Idol</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Theo dõi chi tiết doanh thu đơn thuê và quà tặng người hâm mộ theo ngày và tuần
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={exporting}
          onClick={handleExportCsv}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
        >
          {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
          <span>{t('wallet.exportStatement', 'Xuất Sao Kê Giao Dịch (CSV)')}</span>
        </button>
      </div>

      {/* 4 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
        {/* Today */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.25)', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('wallet.todayIncome', 'Thu Nhập Hôm Nay')}</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-green)' }}>
            +{todayIncome.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* This Week */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.25)', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('wallet.weekIncome', 'Thu Nhập Tuần Này')}</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>
            +{thisWeekIncome.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* This Month */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('wallet.monthIncome', 'Thu Nhập Tháng Này')}</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
            +{thisMonthIncome.toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Total Lifetime */}
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(236, 72, 153, 0.25)', background: 'linear-gradient(135deg, rgba(236,72,153,0.08), transparent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('wallet.totalIncome', 'Tổng Thực Nhận')}</span>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899' }}>
              <Award size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899' }}>
            +{totalIncome.toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {completedOrders} {t('wallet.completedOrders', 'đơn thuê hoàn tất')}
          </div>
        </div>
      </div>

      {report?.frozenIncome > 0 && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.35)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700 }}>
            <Clock size={18} />
            <span>{t('wallet.frozenIncome', 'Đang Tạm Giữ (Escrow)')}:</span>
          </div>
          <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '1.1rem' }}>
            +{report.frozenIncome.toLocaleString('vi-VN')} đ
          </span>
        </div>
      )}

      {/* Breakdown Section: Toggle By Day / By Week */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800 }}>
              Biểu Đồ & Thống Kê Chi Tiết
            </h3>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {viewMode === 'DAILY' ? 'Thống kê theo từng ngày trong 14 ngày qua' : 'Thống kê tổng hợp theo từng tuần (8 tuần gần nhất)'}
            </span>
          </div>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '4px', gap: '4px' }}>
            <button
              className={`order-tab-btn ${viewMode === 'DAILY' ? 'active' : ''}`}
              onClick={() => setViewMode('DAILY')}
              style={{ padding: '6px 14px', fontSize: '0.84rem' }}
            >
              {t('wallet.byDay', 'Theo Ngày')}
            </button>
            <button
              className={`order-tab-btn ${viewMode === 'WEEKLY' ? 'active' : ''}`}
              onClick={() => setViewMode('WEEKLY')}
              style={{ padding: '6px 14px', fontSize: '0.84rem' }}
            >
              {t('wallet.byWeek', 'Theo Tuần')}
            </button>
          </div>
        </div>

        {/* Visual progress bar list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
          {currentList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </div>
          ) : (
            currentList.map((item, idx) => {
              const label = item.date || item.weekLabel || `Mục ${idx + 1}`;
              const amount = item.totalIncome || 0;
              const percent = Math.min(100, Math.max(6, Math.round((amount / maxIncome) * 100)));

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                    <span style={{ fontWeight: 700, color: amount > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                      +{amount.toLocaleString('vi-VN')} đ
                      {item.orderCount > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem', marginLeft: '6px' }}>
                          ({item.orderCount} đơn)
                        </span>
                      )}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: amount > 0 ? 'linear-gradient(90deg, #8b5cf6, #10b981)' : 'transparent',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Data Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>{viewMode === 'DAILY' ? 'Ngày' : 'Khoảng Thời Gian'}</th>
                <th>Thu Nhập Thuê (VNĐ)</th>
                <th>Quà Tặng / Donate (VNĐ)</th>
                <th>Số Đơn</th>
                <th>Tổng Thực Nhận</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.date || item.weekLabel}</td>
                  <td style={{ color: item.orderIncome > 0 ? 'var(--accent-cyan)' : 'inherit' }}>
                    +{(item.orderIncome || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ color: item.donationIncome > 0 ? 'var(--accent-pink)' : 'inherit' }}>
                    +{(item.donationIncome || 0).toLocaleString('vi-VN')} đ
                  </td>
                  <td>{item.orderCount || 0}</td>
                  <td style={{ fontWeight: 800, color: item.totalIncome > 0 ? 'var(--accent-green)' : 'inherit' }}>
                    +{(item.totalIncome || 0).toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlayerIncomeDashboard;

