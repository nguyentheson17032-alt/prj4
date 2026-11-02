import React, { useMemo } from 'react';
import { Percent, ShoppingBag, Users, Award, CheckCircle2 } from 'lucide-react';
import { parseDateToDateObj, MetricCard } from './adminHelpers';
import { useLanguage } from '../../context/LanguageContext';

export const OverviewTab = ({ ordersList, usersList, playersList, reportsList, commissionStats, commissionTransactions, loading }) => {
  const { t, language } = useLanguage();
  const pendingCount = playersList.filter(p => p.status === 'PENDING' || p.adminStatus === 'PENDING').length;
  const completedCount = ordersList.filter(o => o.status === 'COMPLETED').length;
  const completionRate = ordersList.length ? `${Math.round((completedCount / ordersList.length) * 100)}%` : '100%';

  // Tổng doanh thu sàn là số tiền sàn ăn được từ chiết khấu (15%) từ cả đơn thuê và donate quà tặng
  const totalPlatformRevenue = commissionStats?.totalCommissionRevenue != null
    ? commissionStats.totalCommissionRevenue
    : (commissionStats?.hireCommissionRevenue || 0) + (commissionStats?.donateCommissionRevenue || 0);

  const hireFee = commissionStats?.hireCommissionRevenue != null ? commissionStats.hireCommissionRevenue : 0;
  const donateFee = commissionStats?.donateCommissionRevenue || 0;
  const hireCount = commissionStats?.hireTransactions != null ? commissionStats.hireTransactions : 0;
  const donateCount = commissionStats?.donateTransactions || 0;

  // Sơ đồ doanh thu sàn 7 ngày gần nhất (số tiền sàn ăn được 15% từng ngày từ thuê và donate)
  const weeklyData = useMemo(() => {
    const days = language === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const now = new Date();
    const result = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const targetDay = d.getDate();
      const targetMonth = d.getMonth();
      const targetYear = d.getFullYear();

      let dayPlatformFee = 0;
      let hirePart = 0;
      let donatePart = 0;

      if (commissionTransactions && commissionTransactions.length > 0) {
        commissionTransactions.forEach(t => {
          const st = (t.status || '').toUpperCase();
          if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED' || st === 'EXPIRED') return;
          const dateObj = parseDateToDateObj(t.createdAt);
          if (!dateObj) return;
          if (dateObj.getDate() === targetDay && dateObj.getMonth() === targetMonth && dateObj.getFullYear() === targetYear) {
            const fee = Number(t.platformFee) || 0;
            dayPlatformFee += fee;
            if (t.type === 'DONATE') donatePart += fee;
            else hirePart += fee;
          }
        });
      } else {
        ordersList.forEach(o => {
          const st = (o.status || '').toUpperCase();
          if (st === 'CANCELLED' || st === 'CANCELED' || st === 'REJECTED' || st === 'EXPIRED') return;
          const dateObj = parseDateToDateObj(o.startTime || o.createdAt || o.hireTime);
          if (!dateObj) return;
          if (dateObj.getDate() === targetDay && dateObj.getMonth() === targetMonth && dateObj.getFullYear() === targetYear) {
            let fee = o.platformFee != null ? o.platformFee : Math.round((o.totalPrice || o.price || 0) * 0.15);
            if (st === 'REFUNDED') {
              const refundPct = o.refundPercentage || 0;
              fee = Math.max(0, Math.round(fee * (1 - refundPct / 100)));
            }
            dayPlatformFee += fee;
            hirePart += fee;
          }
        });
      }

      return {
        day: days[d.getDay()],
        date: `${targetDay}/${targetMonth + 1}`,
        val: dayPlatformFee,
        hirePart,
        donatePart
      };
    });

    const maxVal = Math.max(...result.map(r => r.val), 1);
    return result.map(r => ({ ...r, height: r.val > 0 ? `${Math.max(15, Math.round((r.val / maxVal) * 90))}%` : '8px' }));
  }, [commissionTransactions, ordersList, language]);

  const weeklyTotalCommission = useMemo(() => {
    return weeklyData.reduce((acc, r) => acc + r.val, 0);
  }, [weeklyData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <MetricCard
          label={t('admin.platformRevenue15', 'Doanh Thu Sàn (15%)')}
          value={`${totalPlatformRevenue.toLocaleString('vi-VN')} đ`}
          sub={t('admin.hireAndDonateSub', 'Thuê: {hire} đ ({hireCount} đơn) • Donate: {donate} đ ({donateCount} lượt)')
            .replace('{hire}', hireFee.toLocaleString('vi-VN'))
            .replace('{hireCount}', hireCount)
            .replace('{donate}', donateFee.toLocaleString('vi-VN'))
            .replace('{donateCount}', donateCount)}
          icon={Percent}
          color="#10b981"
        />
        <MetricCard 
          label={t('admin.totalOrders', 'Tổng Đơn Thuê')} 
          value={`${ordersList.length} ${t('admin.ordersUnit', 'đơn')}`} 
          sub={t('admin.completionRateSub', 'Tỷ lệ hoàn thành: {rate}').replace('{rate}', completionRate)} 
          icon={ShoppingBag} 
          color="#6366f1" 
        />
        <MetricCard 
          label={t('admin.totalAccounts', 'Tổng Tài Khoản')} 
          value={usersList.length.toLocaleString()} 
          sub={t('admin.activePlayersSub', '{count} Game thủ hoạt động').replace('{count}', playersList.filter(p => p.status !== 'PENDING').length)} 
          icon={Users} 
          color="#06b6d4" 
        />
        <MetricCard 
          label={t('admin.pendingPlayers', 'Game Thủ Chờ Duyệt')} 
          value={`${pendingCount} ${t('admin.profilesUnit', 'hồ sơ')}`} 
          sub={t('admin.pendingReportsSub', '{count} khiếu nại chưa xử lý').replace('{count}', reportsList.filter(r => r.status === 'PENDING').length)} 
          icon={Award} 
          color="#f59e0b" 
        />
      </div>

      {/* Revenue Chart */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              {t('admin.revenueLast7Days', 'Doanh Thu Sàn 7 Ngày Gần Nhất (Chiết khấu 15%)')}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'inline-block' }}>
              {t('admin.platformCollectedDesc', 'Số tiền sàn thu về: {amount} đ (từ đơn thuê & donate)').replace('{amount}', weeklyTotalCommission.toLocaleString('vi-VN'))}
            </span>
          </div>
        </div>

        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
          {weeklyData.map((item, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {item.val > 0 ? (item.val >= 1000 ? `${(item.val / 1000).toFixed(0)}k` : `${item.val} đ`) : '0'}
              </span>
              <div
                title={`${item.day} (${item.date}): ${item.val.toLocaleString('vi-VN')} đ (${t('admin.hirePrefix', 'Thuê')}: ${item.hirePart.toLocaleString('vi-VN')} đ • Donate: ${item.donatePart.toLocaleString('vi-VN')} đ)`}
                style={{
                  width: '100%',
                  maxWidth: '32px',
                  height: item.height,
                  borderRadius: '6px 6px 0 0',
                  background: item.val > 0 ? 'linear-gradient(180deg, #10b981, #6366f1)' : 'rgba(255,255,255,0.06)',
                  transition: 'all 0.3s',
                  cursor: 'pointer'
                }}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{item.day}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px' }}>{t('admin.orderStatusDistribution', 'Phân Bổ Trạng Thái Đơn')}</h3>
          {[
            { key: 'COMPLETED', label: t('admin.statusCompleted', 'Hoàn thành'), color: '#10b981', matches: ['COMPLETED'] },
            { key: 'CONFIRMED', label: t('admin.statusConfirmed', 'Đã xác nhận'), color: '#06b6d4', matches: ['CONFIRMED', 'IN_PROGRESS'] },
            { key: 'PENDING', label: t('admin.statusPendingApproval', 'Chờ duyệt'), color: '#f59e0b', matches: ['PENDING'] },
            { key: 'CANCELLED', label: t('admin.statusCancelled', 'Đã hủy'), color: '#ef4444', matches: ['CANCELLED', 'CANCELED', 'REJECTED', 'EXPIRED'] },
            { key: 'REFUNDED', label: t('admin.statusRefunded', 'Đã hoàn tiền'), color: '#a855f7', matches: ['REFUNDED'] },
          ].map(item => {
            const cnt = ordersList.filter(o => item.matches.includes(o.status?.toUpperCase())).length;
            const pct = ordersList.length ? Math.round((cnt / ordersList.length) * 100) : 0;
            return (
              <div key={item.key} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.83rem', marginBottom: '4px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: `${item.color}22`,
                    color: item.color
                  }}>
                    {item.label}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: '3px', background: item.color, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px' }}>{t('admin.systemStatus', 'Trạng Thái Hệ Thống')}</h3>
          {[
            { label: t('admin.backendConnection', 'Kết nối Backend'), ok: true },
            { label: t('admin.database', 'Cơ sở dữ liệu'), ok: true },
            { label: t('admin.paymentService', 'Dịch vụ thanh toán'), ok: true },
            { label: t('admin.pushNotification', 'Thông báo push'), ok: true },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '6px' }}>Online</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
