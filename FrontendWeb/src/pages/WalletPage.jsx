import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  Clock,
  Sparkles,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/apiService';
import { getRefundPercentage } from '../components/modals/OrderDetailModal';
import '../styles/wallet.css';

const parseToTimestamp = (dateVal) => {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') return dateVal;
  if (dateVal instanceof Date) return dateVal.getTime();

  const str = String(dateVal).trim();

  // Dạng "HH:mm dd/MM/yyyy" hoặc "HH:mm:ss dd/MM/yyyy" (ví dụ từ backend: "18:03 12/10/2026")
  const timeDateMatch = str.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (timeDateMatch) {
    const [, hours, minutes, seconds = 0, day, month, year] = timeDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)).getTime();
  }

  // Dạng "dd/MM/yyyy HH:mm" hoặc "dd/MM/yyyy" (ví dụ: "12/10/2026 18:03" hoặc "12/10/2026")
  const dateTimeMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dateTimeMatch) {
    const [, day, month, year, hours = 0, minutes = 0, seconds = 0] = dateTimeMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds)).getTime();
  }

  // Dạng ISO chuẩn từ LocalDateTime: "2026-10-13T09:59:12" hoặc tương tự
  const parsed = new Date(str).getTime();
  return isNaN(parsed) ? 0 : parsed;
};

const formatTransactionDate = (dateVal) => {
  if (!dateVal) return 'Hôm nay';
  const ts = parseToTimestamp(dateVal);
  if (!ts) return String(dateVal);
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

const renderStatusBadge = (tx) => {
  // 1. Giao dịch Rút Tiền
  if (tx.type === 'WITHDRAW') {
    if (tx.status === 'COMPLETED') {
      return <span className="badge badge-online">Thành Công</span>;
    }
    if (tx.status === 'REJECTED' || tx.status === 'REFUNDED') {
      return (
        <span
          className="badge"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            fontWeight: 700
          }}
        >
          Từ Chối
        </span>
      );
    }
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          fontWeight: 700
        }}
      >
        ⏳ Đang Chờ Duyệt
      </span>
    );
  }

  // 2. Giao dịch Nhận Tiền Hoàn (cộng lại tiền vào ví)
  if (tx.type === 'REFUND') {
    return <span className="badge badge-online">Thành Công</span>;
  }

  // 3. Giao dịch Nạp Tiền
  if (tx.type === 'DEPOSIT') {
    if (tx.status === 'COMPLETED') {
      return <span className="badge badge-online">Thành Công</span>;
    }
    if (tx.status === 'FAILED') {
      return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Thất Bại</span>;
    }
    return <span className="badge badge-warning">Đang Xử Lý</span>;
  }

  // 4. Giao dịch Thuê Duo (- Thuê Duo) hoặc Nhận tiền thuê (+ Nhận Tiền Thuê)
  // 4.1 Đơn tố cáo CHƯA ĐƯỢC DUYỆT -> Hiện "↺ Khiếu Nại & Xử Lý"
  if (tx.status === 'DISPUTED_PENDING' || tx.status === 'DISPUTED') {
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          fontWeight: 700
        }}
      >
        ↺ Khiếu Nại & Xử Lý
      </span>
    );
  }

  // 4.2 Đơn tố cáo ĐÃ ĐƯỢC DUYỆT RỒI -> Hiện rõ ràng trạng thái "Đã Hoàn Tiền" (kèm % nếu có)
  if (tx.status === 'REFUNDED') {
    const percentText = tx.refundPercent ? ` ${tx.refundPercent}%` : '';
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(168, 85, 247, 0.15)',
          color: '#a855f7',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          fontWeight: 700
        }}
      >
        {tx.type === 'PAYMENT' ? `Đã Hoàn Tiền${percentText}` : 'Khấu Trừ Khiếu Nại'}
      </span>
    );
  }

  // 4.3 Đơn tố cáo BỊ TỪ CHỐI / BÁC BỎ
  if (tx.status === 'REPORT_REJECTED') {
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          fontWeight: 700
        }}
      >
        Từ Chối Khiếu Nại
      </span>
    );
  }

  // 4.4 Các trạng thái đơn thuê thông thường
  if (tx.status === 'COMPLETED') {
    return <span className="badge badge-online">Thành Công</span>;
  }
  if (tx.status === 'FROZEN') {
    return (
      <span
        className="badge"
        style={{
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: '1px solid rgba(245, 158, 11, 0.3)'
        }}
      >
        ⏳ Đang Đóng Băng
      </span>
    );
  }
  if (tx.status === 'CONFIRMED') {
    return <span className="badge badge-primary">Đang Diễn Ra</span>;
  }
  if (tx.status === 'PENDING') {
    return (
      <span
        className="badge badge-warning"
        style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
      >
        Chờ Xác Nhận
      </span>
    );
  }
  if (tx.status === 'CANCELED' || tx.status === 'CANCELLED' || tx.status === 'REJECTED') {
    return (
      <span
        className="badge"
        style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
      >
        Đã Hủy
      </span>
    );
  }

  return <span className="badge badge-online">{tx.status}</span>;
};

export const WalletPage = ({ onOpenDeposit, onOpenWithdraw }) => {
  const { user, refreshUser } = useAuth();
  const [filterType, setFilterType] = useState('ALL');
  const [transactions, setTransactions] = useState([]);
  const [frozenAmount, setFrozenAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof refreshUser === 'function') {
      refreshUser();
    }
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const [ordersData, topupsData, donatesData, withdrawsData] = await Promise.allSettled([
          api.getOrders(),
          api.getTopupHistory(),
          api.getDonateHistory(),
          api.getWithdrawHistory()
        ]);

        const list = [];
        const currentUserId = user?.id ? String(user.id) : (localStorage.getItem('userId') || null);
        const currentUsername = (user?.username || localStorage.getItem('username') || '').toLowerCase().trim();

        let totalFrozen = 0;
        // 1. Giao dịch Thuê / Nhận tiền thuê (Orders)
        if (ordersData.status === 'fulfilled' && Array.isArray(ordersData.value)) {
          ordersData.value.forEach(o => {
            const orderPlayerUserId = o.playerUserId || o.player?.userId || o.player?.user?.id;
            const orderPlayerUsername = (o.player?.user?.username || o.player?.username || '').toLowerCase().trim();

            // Người dùng là Game thủ (Player) chỉ khi ID tài khoản User trùng khớp
            const isPlayer = Boolean(
              (currentUserId && orderPlayerUserId && String(orderPlayerUserId) === String(currentUserId)) ||
              (currentUsername && orderPlayerUsername && orderPlayerUsername === currentUsername)
            );

            if (isPlayer && o.status === 'COMPLETED' && o.payoutStatus === 'PENDING' && !(o.isReviewed && Number(o.reviewRating || 0) >= 4)) {
              const op = Number(o.totalPrice || o.price || 0);
              const fee = o.platformFee != null ? o.platformFee : Math.round(op * 0.15);
              totalFrozen += (o.playerReceived != null ? o.playerReceived : (op - fee));
            }

            const orderRenterId = o.renterId || o.renter?.id;
            const orderRenterUsername = (o.renterUsername || o.renter?.username || o.renterName || '').toLowerCase().trim();

            // Người dùng là Người thuê (Renter)
            const isRenter = Boolean(
              (currentUserId && orderRenterId && String(orderRenterId) === String(currentUserId)) ||
              (currentUsername && orderRenterUsername && orderRenterUsername === currentUsername)
            );

            const orderDateStr = o.startTime || o.createdAt;
            const orderRawDate = parseToTimestamp(orderDateStr);
            const origPrice = Number(o.totalPrice || o.price || 0);
            const refundPercent = getRefundPercentage(o);
            const refundAmount = o.refundAmount != null && o.refundAmount > 0
              ? Number(o.refundAmount)
              : (refundPercent ? Math.round(origPrice * (refundPercent / 100)) : 0);

            // Kiểm tra trạng thái khiếu nại của đơn hàng
            const isResolvedRefund = Boolean(
              o.status === 'REFUNDED' || o.reportStatus === 'RESOLVED' || refundPercent > 0
            );
            const isDisputedPending = Boolean(
              !isResolvedRefund && (
                o.status === 'DISPUTED' ||
                (o.isReported && (o.reportStatus === 'PENDING' || o.reportStatus === 'INVESTIGATING' || !o.reportStatus))
              )
            );
            const isReportRejected = Boolean(
              !isResolvedRefund && o.isReported && o.reportStatus === 'REJECTED'
            );

            // Trạng thái cho khoản tiền của người thuê (- Thuê Duo)
            let renterTxStatus = o.status || 'COMPLETED';
            if (isResolvedRefund) {
              renterTxStatus = 'REFUNDED'; // Đã duyệt khiếu nại & hoàn tiền -> "Đã Hoàn Tiền"
            } else if (isDisputedPending) {
              renterTxStatus = 'DISPUTED_PENDING'; // Chưa duyệt -> "↺ Khiếu Nại & Xử Lý"
            } else if (isReportRejected) {
              renterTxStatus = 'REPORT_REJECTED'; // Bác bỏ khiếu nại -> "Bác Bỏ Khiếu Nại"
            }

            // ─── Trường hợp 1: Là Người thuê (Renter) ───
            if (isRenter && !isPlayer) {
              // 1. Khoản trừ tiền thuê ban đầu
              list.push({
                id: `ORD-${o.id}-OUT`,
                type: 'PAYMENT',
                amount: -origPrice,
                description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: renterTxStatus,
                refundPercent: refundPercent,
                rawDate: orderRawDate
              });

              // 2. Nếu đơn hàng có hoàn tiền (REFUNDED hoặc có % hoàn)
              if (isResolvedRefund && refundAmount > 0) {
                list.push({
                  id: `ORD-${o.id}-REFUND`,
                  type: 'REFUND',
                  amount: +refundAmount,
                  description: `Nhận tiền hoàn đơn thuê #${o.id}${refundPercent ? ` (${refundPercent}%)` : ''} - ${o.playerName || 'Player'}`,
                  feeDetail: `Hoàn tiền ${refundPercent ? `${refundPercent}% ` : ''}từ đơn thuê #${o.id} do chấp thuận khiếu nại`,
                  date: formatTransactionDate(o.resolvedAt || o.endTime || orderDateStr),
                  status: 'COMPLETED',
                  rawDate: orderRawDate + 1000
                });
              }
            }
            // ─── Trường hợp 2: Là Game thủ được thuê (Player) ───
            else if (isPlayer && !isRenter) {
              const feeAmount = o.platformFee != null ? o.platformFee : Math.round(origPrice * 0.15);
              const playerFinal = o.playerReceived != null ? o.playerReceived : (origPrice - feeAmount);

              const isReleased = o.payoutStatus === 'RELEASED' || (o.isReviewed && Number(o.reviewRating || 0) >= 4);
              const isFrozen = o.status === 'COMPLETED' && !isReleased;

              let earnedAmount = playerFinal;
              let txStatus = o.status || 'COMPLETED';
              let stageText = '';
              let feeDetail = `Giá gốc: ${origPrice.toLocaleString('vi-VN')} đ | Chiết khấu sàn (15%): -${feeAmount.toLocaleString('vi-VN')} đ`;

              if (isResolvedRefund) {
                const actualRemaining = o.playerReceived != null ? Number(o.playerReceived) : 0;
                earnedAmount = actualRemaining;
                txStatus = 'REFUNDED';
                if (actualRemaining > 0) {
                  stageText = refundPercent ? ` (Sau khi trừ ${refundPercent}% hoàn tiền)` : ' (Sau khi trừ hoàn tiền)';
                  feeDetail = `Đã trừ ${refundPercent ? `${refundPercent}% ` : ''}khiếu nại | Thực nhận còn lại: +${actualRemaining.toLocaleString('vi-VN')} đ`;
                } else {
                  stageText = ' (Khấu trừ 100% do khiếu nại được chấp thuận)';
                  feeDetail = `Bị hoàn tiền 100% cho người thuê do khiếu nại`;
                }
              } else if (isDisputedPending) {
                txStatus = 'DISPUTED_PENDING';
                stageText = ' (Đang bị khiếu nại - Tạm giữ)';
                feeDetail = 'Đơn thuê đang có khiếu nại chờ Admin giải quyết';
              } else if (o.status === 'CONFIRMED') {
                txStatus = 'CONFIRMED';
                stageText = ' (Đang diễn ra - Tạm giữ)';
                feeDetail = 'Đang diễn ra | Tiền sẽ tự động vào số dư khả dụng sau 24h từ khi kết thúc hoặc khi khách đánh giá ≥4★';
              } else if (isFrozen) {
                txStatus = 'FROZEN';
                stageText = ' (Đang đóng băng)';
                feeDetail = `Tạm giữ 85%: ${playerFinal.toLocaleString('vi-VN')} đ (Tự động vào số dư khả dụng sau 24h hoặc khi khách đánh giá ≥4★)`;
              } else if (o.status === 'CANCELED' || o.status === 'REJECTED') {
                earnedAmount = 0;
                txStatus = 'CANCELED';
              } else if (isReleased) {
                txStatus = 'COMPLETED';
                stageText = ' (Đã vào số dư khả dụng)';
                feeDetail += ' | Đã cộng vào số dư khả dụng';
              }

              list.push({
                id: `ORD-${o.id}`,
                type: 'RECEIVE',
                amount: +earnedAmount,
                originalPrice: origPrice,
                feeAmount: feeAmount,
                feeDetail: feeDetail,
                description: `Nhận tiền thuê từ ${o.renterName || 'Khách'} (${o.hours || 1}h)${stageText}`,
                date: formatTransactionDate(orderDateStr),
                status: txStatus,
                refundPercent: refundPercent,
                isFrozen: isFrozen,
                rawDate: orderRawDate
              });
            }
            // ─── Trường hợp 3: Tự thuê chính mình (test mode) ───
            else if (isPlayer && isRenter) {
              const feeAmount = o.platformFee != null ? o.platformFee : Math.round(origPrice * 0.15);
              const playerFinal = o.playerReceived != null ? o.playerReceived : (origPrice - feeAmount);

              // Khoản trả tiền thuê
              list.push({
                id: `ORD-${o.id}-OUT`,
                type: 'PAYMENT',
                amount: -origPrice,
                description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: renterTxStatus,
                refundPercent: refundPercent,
                rawDate: orderRawDate
              });

              // Khoản nhận hoàn tiền nếu có
              if (isResolvedRefund && refundAmount > 0) {
                list.push({
                  id: `ORD-${o.id}-REFUND`,
                  type: 'REFUND',
                  amount: +refundAmount,
                  description: `Nhận tiền hoàn đơn thuê #${o.id}${refundPercent ? ` (${refundPercent}%)` : ''} - ${o.playerName || 'Player'}`,
                  feeDetail: `Hoàn tiền ${refundPercent ? `${refundPercent}% ` : ''}từ đơn thuê #${o.id} do chấp thuận khiếu nại`,
                  date: formatTransactionDate(o.resolvedAt || o.endTime || orderDateStr),
                  status: 'COMPLETED',
                  rawDate: orderRawDate + 1000
                });
              }

              // Khoản Idol nhận tiền
              list.push({
                id: `ORD-${o.id}-IN`,
                type: 'RECEIVE',
                amount: +playerFinal,
                originalPrice: origPrice,
                feeAmount: feeAmount,
                feeDetail: `Giá gốc: ${origPrice.toLocaleString('vi-VN')} đ | Chiết khấu sàn (15%): -${feeAmount.toLocaleString('vi-VN')} đ`,
                description: `Nhận tiền thuê từ ${o.renterName || 'Khách'} (${o.hours || 1}h)${refundPercent ? ` (Sau khi trừ ${refundPercent}% hoàn tiền)` : ''}`,
                date: formatTransactionDate(orderDateStr),
                status: isResolvedRefund ? 'REFUNDED' : o.status || 'COMPLETED',
                refundPercent: refundPercent,
                rawDate: orderRawDate
              });
            }
            // ─── Mặc định: Coi như người thuê ───
            else {
              list.push({
                id: `ORD-${o.id}`,
                type: 'PAYMENT',
                amount: -origPrice,
                description: `Thuê ${o.playerName || 'Player'} (${o.hours || 1}h)`,
                date: formatTransactionDate(orderDateStr),
                status: renterTxStatus,
                refundPercent: refundPercent,
                rawDate: orderRawDate
              });
              if (isResolvedRefund && refundAmount > 0) {
                list.push({
                  id: `ORD-${o.id}-REFUND`,
                  type: 'REFUND',
                  amount: +refundAmount,
                  description: `Nhận tiền hoàn đơn thuê #${o.id}${refundPercent ? ` (${refundPercent}%)` : ''} - ${o.playerName || 'Player'}`,
                  feeDetail: `Hoàn tiền ${refundPercent ? `${refundPercent}% ` : ''}từ đơn thuê #${o.id} do chấp thuận khiếu nại`,
                  date: formatTransactionDate(o.resolvedAt || o.endTime || orderDateStr),
                  status: 'COMPLETED',
                  rawDate: orderRawDate + 1000
                });
              }
            }
          });
        }

        // 2. Giao dịch Nạp tiền (Topups)
        if (topupsData.status === 'fulfilled' && Array.isArray(topupsData.value)) {
          topupsData.value.forEach(t => {
            const topupDateStr = t.dateTime || t.createdAt;
            const topupRawDate = parseToTimestamp(topupDateStr);

            list.push({
              id: `TOPUP-${t.id}`,
              type: 'DEPOSIT',
              amount: +(t.coin || 0),
              description: `Nạp tiền vào ví (${t.method || 'VIETQR'})`,
              date: formatTransactionDate(topupDateStr),
              status: t.status || 'COMPLETED',
              rawDate: topupRawDate
            });
          });
        }

        // 3. Giao dịch Tặng quà & Nhận quà (Donates)
        if (donatesData.status === 'fulfilled' && Array.isArray(donatesData.value)) {
          donatesData.value.forEach(d => {
            const desc = (d.description || '').toLowerCase();
            const isReceive = Boolean(
              d.isReceive ||
              desc.startsWith('nhận') ||
              desc.includes('nhận quà') ||
              desc.includes('nhận donate')
            );

            const origCoin = Number(d.originalAmount || d.coin || d.amount || 0);
            const fee = d.platformFee != null ? Number(d.platformFee) : Math.round(origCoin * 0.15);
            const recvCoin = d.playerReceived != null ? Number(d.playerReceived) : (origCoin - fee);
            const donateDateStr = d.createdAt;
            const donateRawDate = parseToTimestamp(donateDateStr);

            if (isReceive) {
              // Idol nhận quà: Thực nhận 85%
              const finalReceive = d.playerReceived != null ? Number(d.playerReceived) : (d.coin && Number(d.coin) <= recvCoin ? Number(d.coin) : recvCoin);
              list.push({
                id: `GIFT-${d.id}`,
                type: 'DONATE',
                subType: 'DONATE_RECEIVE',
                amount: +finalReceive,
                originalPrice: origCoin,
                feeAmount: fee,
                feeDetail: `Giá quà: ${origCoin.toLocaleString('vi-VN')} đ | Chiết khấu sàn (15%): -${fee.toLocaleString('vi-VN')} đ`,
                description: d.description || `Nhận quà tặng từ ${d.partnerName || 'Fan'}`,
                date: formatTransactionDate(donateDateStr),
                status: d.status || 'COMPLETED',
                rawDate: donateRawDate
              });
            } else {
              // Fan tặng quà: Trừ 100%
              list.push({
                id: `GIFT-${d.id}`,
                type: 'DONATE',
                subType: 'DONATE_SENT',
                amount: -origCoin,
                originalPrice: origCoin,
                feeDetail: `Idol nhận: ${recvCoin.toLocaleString('vi-VN')} đ (đã khấu trừ 15% phí hệ thống)`,
                description: d.description || `Tặng quà cho ${d.partnerName || 'Idol'}`,
                date: formatTransactionDate(donateDateStr),
                status: d.status || 'COMPLETED',
                rawDate: donateRawDate
              });
            }
          });
        }

        // 4. Giao dịch Rút tiền (Withdraws)
        if (withdrawsData.status === 'fulfilled' && Array.isArray(withdrawsData.value)) {
          withdrawsData.value.forEach(w => {
            const withdrawDateStr = w.createdAt || w.dateTime;
            const withdrawRawDate = parseToTimestamp(withdrawDateStr);
            const isRefunded = w.status === 'REFUNDED' || w.status === 'REJECTED';
            const isCompleted = w.status === 'COMPLETED';
            const statusText = isCompleted ? 'COMPLETED' : isRefunded ? 'REJECTED' : 'PENDING';
            const coinAmount = Number(w.coin || 0);

            // Giao dịch yêu cầu rút tiền ban đầu (- tiền)
            list.push({
              id: `RUT-${w.id}`,
              type: 'WITHDRAW',
              amount: -coinAmount,
              description: `Rút tiền về ${w.bankName || 'Ngân hàng'}`,
              feeDetail: `Số TK: ${w.bankAccountNumber || '—'} | Chủ TK: ${w.bankAccountName || '—'}${isCompleted ? ' (Đã chuyển khoản thành công)' : isRefunded ? ' (Đã bị từ chối & hoàn tiền về ví)' : ' (Đang chờ Admin duyệt)'}`,
              date: formatTransactionDate(withdrawDateStr),
              status: isRefunded ? 'REJECTED' : statusText,
              rawDate: withdrawRawDate
            });

            // Nếu bị từ chối & hoàn tiền -> Thêm bản ghi hoàn trả tiền cộng lại vào ví (+ tiền)
            if (isRefunded) {
              const refundDateStr = w.completedAt || withdrawDateStr;
              const refundRawDate = (w.completedAt ? parseToTimestamp(w.completedAt) : withdrawRawDate) + 1000;
              const reasonText = w.description ? ` | Lý do từ chối: ${w.description}` : '';
              list.push({
                id: `RUT-${w.id}-REFUND`,
                type: 'REFUND',
                subType: 'WITHDRAW_REFUND',
                amount: +coinAmount,
                description: `Hoàn tiền rút về ví (Yêu cầu rút #${w.id} bị từ chối)`,
                feeDetail: `Cộng lại ${coinAmount.toLocaleString('vi-VN')} đ vào số dư khả dụng do lệnh rút về ${w.bankName || 'ngân hàng'} bị từ chối${reasonText}`,
                date: formatTransactionDate(refundDateStr),
                status: 'COMPLETED',
                rawDate: refundRawDate
              });
            }
          });
        }

        list.sort((a, b) => b.rawDate - a.rawDate);
        setTransactions(list);
        setFrozenAmount(totalFrozen);
      } catch (err) {
        console.error('Lỗi khi tải lịch sử giao dịch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, [user?.id, user?.username]);

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'ALL') return true;
    if (filterType === 'WITHDRAW') return t.type === 'WITHDRAW' || t.subType === 'WITHDRAW_REFUND';
    return t.type === filterType;
  });

  const effectiveFrozen = Math.max(Number(frozenAmount || 0), Number(user?.frozenBalance || 0));

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>
          Ví PlayZone & <span className="gradient-text">Lịch Sử Giao Dịch</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Quản lý số dư khả dụng, theo dõi thu nhập tạm giữ và xem minh bạch mọi biến động số dư.
        </p>
      </div>

      <div className="wallet-grid">
        {/* Left: Balance Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="balance-card-hero">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="balance-title" style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.3px' }}>SỐ DƯ KHẢ DỤNG</span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid rgba(16,185,129,0.3)' }}>
                  Sẵn sàng sử dụng
                </span>
              </div>
              <Wallet size={24} color="#06b6d4" />
            </div>

            <div className="balance-amount" style={{ color: '#10b981', margin: '14px 0 6px 0', textShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
              {(user?.balance || user?.coin || 0).toLocaleString('vi-VN')} đ
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: effectiveFrozen > 0 ? '14px' : '20px' }}>
              Số dư có thể dùng ngay để thuê Idol, gửi tặng quà hoặc rút tiền.
            </p>

            {effectiveFrozen > 0 ? (
              <div style={{
                marginBottom: '18px',
                padding: '12px 14px',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.35)',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '0.88rem', fontWeight: 700 }}>
                    <Clock size={16} />
                    <span>Số Dư Đang Đóng Băng (Pending):</span>
                  </div>
                  <span style={{ color: '#f59e0b', fontWeight: 900, fontSize: '1.05rem' }}>
                    {effectiveFrozen.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '6px' }}>
                  ⚡ <strong>Cơ chế tự động:</strong> Tiền đơn thuê sẽ được tự động cộng vào <strong>Số Dư Khả Dụng</strong> sau 24h kể từ khi đơn kết thúc, hoặc ngay khi khách hàng đánh giá từ 4★ trở lên.
                </div>
              </div>
            ) : (
              <div style={{
                marginBottom: '18px',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  <span>Đang đóng băng:</span>
                </span>
                <span style={{ fontWeight: 600 }}>0 đ</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={onOpenDeposit}
              >
                <PlusCircle size={18} />
                <span>Nạp Tiền</span>
              </button>
              <button
                className="btn btn-outline"
                style={{
                  borderColor: 'rgba(245, 158, 11, 0.5)',
                  color: '#f59e0b',
                  background: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 700
                }}
                onClick={onOpenWithdraw}
              >
                <ArrowUpRight size={18} />
                <span>Rút Tiền</span>
              </button>
            </div>
          </div>

          {/* Quick info card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--accent-green)" />
              <span>Chính Sách & Bảo Vệ Tài Chính</span>
            </h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              <li>• <strong>Số dư khả dụng:</strong> Tiền sẵn sàng trong tài khoản dùng để thuê hoặc rút tiền bất cứ lúc nào.</li>
              <li>• <strong>Giải ngân tự động sau 24h:</strong> Sau khi hoàn thành đơn thuê, hệ thống tạm giữ thu nhập trong 24h để đảm bảo quyền lợi khiếu nại. Hết 24h, tiền tự động vào số dư khả dụng.</li>
              <li>• <strong>Giải ngân siêu tốc:</strong> Nếu khách hàng đánh giá đơn từ 4 sao trở lên, tiền lập tức vào số dư khả dụng mà không cần chờ 24h.</li>
              <li>• <strong>Nạp tiền VietQR:</strong> Khớp lệnh nạp tự động 24/7 chỉ trong vài giây.</li>
            </ul>
          </div>
        </div>

        {/* Right: Transaction History */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Lịch Sử Biến Động Số Dư</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`order-tab-btn ${filterType === 'ALL' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('ALL')}
              >
                Tất Cả
              </button>
              <button
                className={`order-tab-btn ${filterType === 'DEPOSIT' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('DEPOSIT')}
              >
                Nạp Tiền
              </button>
              <button
                className={`order-tab-btn ${filterType === 'WITHDRAW' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('WITHDRAW')}
              >
                Rút Tiền
              </button>
              <button
                className={`order-tab-btn ${filterType === 'PAYMENT' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('PAYMENT')}
              >
                Thuê Player
              </button>
              <button
                className={`order-tab-btn ${filterType === 'RECEIVE' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('RECEIVE')}
              >
                Nhận Tiền Thuê
              </button>
              <button
                className={`order-tab-btn ${filterType === 'DONATE' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('DONATE')}
              >
                Tặng / Nhận Quà
              </button>
              <button
                className={`order-tab-btn ${filterType === 'REFUND' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                onClick={() => setFilterType('REFUND')}
              >
                Tiền Hoàn
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Mã Giao Dịch</th>
                  <th>Loại</th>
                  <th>Nội Dung</th>
                  <th>Số Tiền</th>
                  <th>Thời Gian</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{tx.id}</td>
                      <td>
                        {tx.type === 'DEPOSIT' && <span className="badge badge-online">+ Nạp Tiền</span>}
                        {tx.type === 'WITHDRAW' && (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              fontWeight: 700
                            }}
                          >
                            ⬆ Rút Tiền
                          </span>
                        )}
                        {tx.type === 'PAYMENT' && <span className="badge badge-primary">- Thuê Duo</span>}
                        {tx.type === 'RECEIVE' && (
                          tx.status === 'FROZEN' ? (
                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                              ⏳ Tiền Tạm Giữ
                            </span>
                          ) : (
                            <span className="badge badge-online" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              + Nhận Tiền Thuê
                            </span>
                          )
                        )}
                        {tx.type === 'DONATE' && (
                          tx.amount > 0 ? (
                            <span className="badge badge-online" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                              🎁 + Nhận Quà
                            </span>
                          ) : (
                            <span className="badge badge-vip" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                              🎁 - Tặng Quà
                            </span>
                          )
                        )}
                        {tx.type === 'REFUND' && (
                          <span
                            className="badge"
                            style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#a855f7',
                              border: '1px solid rgba(168, 85, 247, 0.35)',
                              fontWeight: 700
                            }}
                          >
                            ↺ Nhận Tiền Hoàn
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        <div style={{ fontWeight: 600 }}>{tx.description}</div>
                        {tx.feeDetail && (
                          <div style={{
                            fontSize: '0.74rem',
                            color: tx.status === 'FROZEN' ? '#f59e0b' : (tx.amount > 0 ? '#10b981' : 'var(--text-muted)'),
                            marginTop: '3px',
                            fontWeight: 500
                          }}>
                            {tx.feeDetail}
                          </div>
                        )}
                      </td>
                      <td style={{
                        fontWeight: 800,
                        color: tx.status === 'FROZEN' ? '#f59e0b' : (tx.amount > 0 ? 'var(--accent-green)' : 'var(--accent-pink)'),
                        whiteSpace: 'nowrap'
                      }}>
                        <div>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString('vi-VN')} đ` : `${tx.amount.toLocaleString('vi-VN')} đ`}
                        </div>
                        {tx.status === 'FROZEN' ? (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            marginTop: '2px'
                          }}>
                            Đang đóng băng
                          </span>
                        ) : tx.amount > 0 && (tx.type === 'RECEIVE' || tx.subType === 'DONATE_RECEIVE') && tx.status === 'COMPLETED' ? (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            marginTop: '2px'
                          }}>
                            Thực nhận 85%
                          </span>
                        ) : null}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{tx.date}</td>
                      <td>
                        {renderStatusBadge(tx)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Chưa có lịch sử giao dịch nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
