/**
 * Utility to localize transaction descriptions and fee details in Wallet history.
 */

const GIFT_NAME_MAP = {
  'Trà Sữa': 'Milk Tea',
  'Hoa Hồng Tình Bạn': 'Friendship Rose',
  'Bánh Kem Ngọt Ngào': 'Sweet Cake',
  'Gấu Bông Khổng Lồ': 'Giant Teddy Bear',
  'Vương Miện Nữ Hoàng': 'Queen Crown',
  'Siêu Xe Cyber Car': 'Cyber Car'
};

export const localizeTxDescription = (desc, language) => {
  if (!desc) return '';
  if (language !== 'en') return desc;

  // 1. Topup: "Nạp tiền vào ví (TOPUP)" or "Nạp tiền vào ví (VIETQR)"
  const topupMatch = desc.match(/^Nạp tiền vào ví(?:\s*\(([^)]+)\))?/i);
  if (topupMatch) {
    const method = topupMatch[1] || 'Wallet';
    return `Top up wallet (${method})`;
  }

  // 2. Hire player: "Thuê PlayerName (2h)"
  const hireMatch = desc.match(/^Thuê\s+(.+?)(?:\s*\((\d+(?:\.\d+)?)h\))?$/i);
  if (hireMatch) {
    const [, player, hours] = hireMatch;
    return `Hire ${player}${hours ? ` (${hours}h)` : ''}`;
  }

  // 3. Receive rental: "Nhận tiền thuê từ RenterName (2h)"
  const recvMatch = desc.match(/^Nhận tiền thuê từ\s+(.+?)(?:\s*\((\d+(?:\.\d+)?)h\))?(.*)$/i);
  if (recvMatch) {
    const [, renter, hours, stage] = recvMatch;
    let stageEn = stage || '';
    if (stageEn.includes('Sau khi trừ')) {
      stageEn = stageEn.replace(/Sau khi trừ (\d+)% hoàn tiền/i, 'After deducting $1% refund')
                       .replace(/Sau khi trừ hoàn tiền/i, 'After refund deduction');
    }
    return `Rental payment from ${renter}${hours ? ` (${hours}h)` : ''}${stageEn}`;
  }

  // 4. Refund for order: "Nhận tiền hoàn đơn thuê #11 (40%) - PlayerName"
  const refundMatch = desc.match(/^Nhận tiền hoàn đơn thuê\s+#(\d+)(?:\s*\(([^)]+)\))?(?:\s*-\s*(.+))?$/i);
  if (refundMatch) {
    const [, id, pct, player] = refundMatch;
    return `Refund for booking #${id}${pct ? ` (${pct})` : ''}${player ? ` - ${player}` : ''}`;
  }

  // 5. Donate / Gift: "Donate cho theson5: Tặng Siêu Xe Cyber Car kèm lời chúc..." or "Tặng quà cho theson5"
  const giftSentMatch = desc.match(/^(?:Donate|Tặng quà)\s+cho\s+([^:]+)(?::\s*Tặng\s+(.+?)(?:\s+kèm lời chúc\s*(.*))?)?$/i);
  if (giftSentMatch) {
    const [, partner, giftRaw, wish] = giftSentMatch;
    let giftEn = giftRaw ? (GIFT_NAME_MAP[giftRaw] || giftRaw) : '';
    if (giftEn) {
      return `Gift to ${partner}: Sent ${giftEn}${wish ? ` with message: "${wish}"` : ' with best wishes'}`;
    }
    return `Send gift to ${partner}`;
  }

  // 6. Receive gift: "Nhận quà tặng từ theson5"
  const giftRecvMatch = desc.match(/^Nhận quà tặng từ\s+(.+)$/i);
  if (giftRecvMatch) {
    return `Received gift from ${giftRecvMatch[1]}`;
  }

  // 7. Withdraw: "Rút tiền về MB Bank (Quân Đội)"
  const withdrawMatch = desc.match(/^Rút tiền về\s+(.+)$/i);
  if (withdrawMatch) {
    return `Withdraw to ${withdrawMatch[1]}`;
  }

  // 8. Withdraw refund: "Hoàn tiền rút về ví (Yêu cầu rút #5 bị từ chối)" or "Hoàn tiền rút về ví (Yêu cầu rút #5 đã tự hủy)"
  const withdrawRefundMatch = desc.match(/^Hoàn tiền rút về ví\s*\(Yêu cầu rút\s*#(\d+)\s*(bị từ chối|đã tự hủy)\)/i);
  if (withdrawRefundMatch) {
    const isCanceled = withdrawRefundMatch[2].includes('tự hủy');
    return isCanceled
      ? `Withdrawal refund to wallet (Request #${withdrawRefundMatch[1]} canceled)`
      : `Withdrawal refund to wallet (Request #${withdrawRefundMatch[1]} rejected)`;
  }

  // 9. Dispute refund: "Hoàn tiền 40% từ đơn thuê #11 do chấp thuận khiếu nại"
  const disputeRefundMatch = desc.match(/^Hoàn tiền\s*(?:(\d+)%\s*)?từ đơn thuê\s*#(\d+)\s*do chấp thuận khiếu nại/i);
  if (disputeRefundMatch) {
    const [, pct, id] = disputeRefundMatch;
    return `Refund ${pct ? `${pct}% ` : ''}from booking #${id} due to approved dispute`;
  }

  return desc;
};

export const localizeTxFeeDetail = (detail, language) => {
  if (!detail) return '';
  if (language !== 'en') return detail;

  let res = detail;

  // "Idol nhận: 850.000 đ (đã khấu trừ 15% phí hệ thống)"
  res = res.replace(/Idol nhận:\s*([\d.,]+)\s*đ\s*\(đã khấu trừ\s*15%\s*phí hệ thống\)/i, 'Idol receives: $1 đ (15% platform fee deducted)');

  // "Giá gốc: 100.000 đ | Chiết khấu sàn (15%): -15.000 đ"
  res = res.replace(/Giá gốc:\s*([\d.,]+)\s*đ\s*\|\s*Chiết khấu sàn\s*\(15%\):\s*-([\d.,]+)\s*đ/i, 'Original: $1 đ | Platform fee (15%): -$2 đ');

  // "Giá quà: 100.000 đ | Chiết khấu sàn (15%): -15.000 đ"
  res = res.replace(/Giá quà:\s*([\d.,]+)\s*đ\s*\|\s*Chiết khấu sàn\s*\(15%\):\s*-([\d.,]+)\s*đ/i, 'Gift value: $1 đ | Platform fee (15%): -$2 đ');

  // "Hoàn tiền 40% từ đơn thuê #11 do chấp thuận khiếu nại"
  res = res.replace(/Hoàn tiền\s*(?:(\d+)%\s*)?từ đơn thuê\s*#(\d+)\s*do chấp thuận khiếu nại/i, 'Refund $1% from booking #$2 due to approved dispute');

  // "Bị hoàn tiền 100% cho người thuê do khiếu nại"
  res = res.replace(/Bị hoàn tiền 100% cho người thuê do khiếu nại/i, '100% refunded to renter due to approved dispute');

  // "Đơn thuê đang có khiếu nại chờ Admin giải quyết"
  res = res.replace(/Đơn thuê đang có khiếu nại chờ Admin giải quyết/i, 'Booking under dispute pending Admin resolution');

  // "Đang diễn ra | Tiền sẽ tự động vào số dư khả dụng sau 24h từ khi kết thúc hoặc khi khách đánh giá ≥4★"
  res = res.replace(/Đang diễn ra \| Tiền sẽ tự động vào số dư khả dụng sau 24h từ khi kết thúc hoặc khi khách đánh giá ≥4★/i, 'In progress | Funds automatically released after 24h from end or when client rates ≥4★');

  // "Tạm giữ 85%: 85.000 đ (Tự động vào số dư khả dụng sau 24h hoặc khi khách đánh giá ≥4★)"
  res = res.replace(/Tạm giữ 85%:\s*([\d.,]+)\s*đ\s*\(Tự động vào số dư khả dụng sau 24h hoặc khi khách đánh giá ≥4★\)/i, 'Pending 85%: $1 đ (Released after 24h or when client rates ≥4★)');

  // "Đã cộng vào số dư khả dụng"
  res = res.replace(/Đã cộng vào số dư khả dụng/i, 'Credited to available balance');

  // Bank withdrawal details:
  // "Số TK: ... | Chủ TK: ... (Đã chuyển khoản thành công)"
  res = res.replace(/Số TK:/gi, 'Acc:')
           .replace(/Chủ TK:/gi, 'Holder:')
           .replace(/\(Đã chuyển khoản thành công\)/gi, '(Transferred successfully)')
           .replace(/\(Đã bị từ chối & hoàn tiền về ví\)/gi, '(Rejected & refunded to wallet)')
           .replace(/\(Đã hủy yêu cầu & hoàn tiền về ví\)/gi, '(Canceled & refunded to wallet)')
           .replace(/Cộng lại ([\d.,]+) đ vào số dư khả dụng do lệnh rút về (.+?) đã được bạn tự hủy/gi, 'Refunded $1 đ to balance because withdrawal to $2 was canceled by user')
           .replace(/\(Đang chờ Admin duyệt\)/gi, '(Awaiting Admin review)')
           .replace(/Cộng lại ([\d.,]+) đ vào số dư khả dụng do lệnh rút về (.+?) bị từ chối/gi, 'Refunded $1 đ to balance because withdrawal to $2 was rejected')
           .replace(/Lý do từ chối:/gi, 'Reason:');

  return res;
};

export default {
  localizeTxDescription,
  localizeTxFeeDetail
};

