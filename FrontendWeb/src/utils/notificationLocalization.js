/**
 * Utility to localize notification titles and messages based on language ('vi' | 'en').
 * Also normalizes currency display (converts legacy 'xu' and 'coin' to 'đ').
 */

// Title mappings (exact match or prefix match)
const EXACT_TITLE_TRANSLATIONS = {
  // Auth
  'Chào mừng đến với PlayerDuo!': 'Welcome to PlayerDuo!',
  'Đổi mật khẩu thành công!': 'Password changed successfully!',

  // Rent / Hire lifecycle
  'Bạn có đơn thuê mới!': 'New booking request!',
  'Đã gửi yêu cầu thuê player!': 'Hire request sent!',
  'Đơn thuê đã được xác nhận!': 'Booking confirmed!',
  'Đơn thuê bị từ chối': 'Booking declined',
  'Nhận bồi thường phí hủy đơn': 'Late cancellation compensation',
  'Đơn thuê đã bị hủy bởi Player': 'Booking cancelled by player',
  'Hủy đơn thuê thành công': 'Order cancelled successfully',
  'Khách hàng đã hủy đơn thuê': 'Client cancelled booking',
  'Đơn thuê đã hoàn thành': 'Booking completed',
  'Bạn nhận được đánh giá mới!': 'New review received!',
  'Đánh giá player sau khi thuê': 'Rate your player',
  'Đơn thuê bị hủy do player vi phạm': 'Booking cancelled due to player violation',
  'Tài khoản của bạn đã bị ban': 'Account suspended',

  // KYC
  'Xác minh danh tính (KYC) thành công!': 'Identity verification (KYC) approved!',
  'Xác minh danh tính (KYC) bị từ chối': 'Identity verification (KYC) declined',

  // Payments / Wallet / Withdraw
  '✅ Rút tiền thành công': 'Withdrawal successful',
  '❌ Yêu cầu rút tiền bị từ chối': 'Withdrawal request declined',
  'Nạp tiền thành công!': 'Deposit successful!',
  'Nạp xu thành công!': 'Deposit successful!',
  '❌ Rút tiền thất bại': 'Withdrawal failed',
  '⏳ Đã gửi yêu cầu rút tiền': 'Withdrawal request submitted',
  'Nạp tiền MoMo thành công!': 'MoMo deposit successful!',
  'Nạp xu MoMo thành công!': 'MoMo deposit successful!',
  'Nạp tiền ZaloPay thành công!': 'ZaloPay deposit successful!',
  'Nạp xu ZaloPay thành công!': 'ZaloPay deposit successful!',
  'Tiền thuê đã vào số dư khả dụng!': 'Rental earnings credited to balance!',

  // Donate / Gifts
  'Donate thất bại': 'Donation failed',
  '✅ Tặng quà thành công': 'Gift sent successfully',
  '🎁 Bạn nhận được quà tặng mới!': 'You received a new gift!',

  // Social / Messages / Followers
  'Bạn có người theo dõi mới!': 'New follower!',
  'Bạn có tin nhắn mới!': 'New message!',

  // Expiration / Auto complete / Reminders
  'Đơn thuê đã tự động hủy & Hoàn tiền': 'Booking auto-cancelled & refunded',
  'Đơn thuê đã tự động hủy & Hoàn xu': 'Booking auto-cancelled & refunded',
  'Đơn thuê đã hết hạn': 'Booking expired',
  'Sắp đến giờ thuê!': 'Booking starting soon!',
  'Đơn thuê sắp kết thúc!': 'Booking ending soon!',
  'Đơn thuê đã tự động hoàn thành': 'Booking auto-completed',

  // Admin Notification Service
  'Nạp tiền mới': 'New deposit',
  'Yêu cầu rút tiền': 'Withdrawal request',
  'Tố cáo mới': 'New report',
  'Giao dịch VNPay': 'VNPay transaction',
  'Giao dịch donate': 'Donation transaction',

  'Thông báo hệ thống': 'System notification'
};

const DYNAMIC_TITLE_PATTERNS = [
  {
    regex: /^Khiếu nại được chấp thuận & Hoàn tiền\s*\(([\d.,]+)%\)$/i,
    en: (m) => `Report approved & Refunded (${m[1]}%)`
  },
  {
    regex: /^Đơn hàng bị xử lý khiếu nại\s*\(([\d.,]+)%\)$/i,
    en: (m) => `Order penalty applied (${m[1]}%)`
  },
  {
    regex: /^📸\s*(.+?)\s*vừa đăng khoảnh khắc mới!$/i,
    en: (m) => `📸 ${m[1]} posted a new moment!`
  },
  {
    regex: /^[✅❌⏳🎁📸]\s*(.+?)$/,
    en: (m) => {
      const sub = EXACT_TITLE_TRANSLATIONS[m[1].trim()];
      return sub || m[1];
    }
  }
];

const MESSAGE_PATTERNS = [
  // 1. Welcome
  {
    regex: /^Cảm ơn bạn đã đăng ký tài khoản tại PlayerDuo\.\s*Chúc bạn có những trải nghiệm tuyệt vời!$/i,
    en: () => 'Thank you for registering at PlayerDuo. Wish you have an amazing experience!'
  },

  // 2. Booking request (player)
  {
    regex: /^Bạn vừa nhận được yêu cầu thuê từ\s+(.+?)\.\s*Vui lòng xác nhận đơn thuê trong hệ thống\.$/i,
    en: (m) => `You received a booking request from ${m[1]}. Please confirm in the system.`
  },

  // 3. Booking request sent (renter)
  {
    regex: /^Bạn đã gửi yêu cầu thuê player\s+(.+?)\.\s*Vui lòng chờ xác nhận từ player\.$/i,
    en: (m) => `You have sent a booking request for player ${m[1]}. Please wait for player confirmation.`
  },

  // 4. Booking confirmed
  {
    regex: /^Player\s+(.+?)\s+đã xác nhận đơn thuê của bạn\.\s*Hãy chuẩn bị trải nghiệm dịch vụ!$/i,
    en: (m) => `Player ${m[1]} has confirmed your booking. Get ready for your session!`
  },

  // 5. Booking declined
  {
    regex: /^Đơn thuê của bạn đã bị từ chối bởi player\s+(.+?)\.$/i,
    en: (m) => `Your booking was declined by player ${m[1]}.`
  },
  {
    regex: /^Yêu cầu thuê player\s+(.+?)\s+đã bị từ chối\.$/i,
    en: (m) => `The hire request for player ${m[1]} was declined.`
  },

  // 6. Cancellation compensation
  {
    regex: /^Đơn thuê #(\d+)\s+bị hủy sát giờ\.\s*Bạn nhận được\s+([\d.,]+)\s*(?:xu|đ)?\s*phí bồi thường\.$/i,
    en: (m) => `Order #${m[1]} was cancelled late. You received ${m[2]} đ compensation.`
  },

  // 7. Cancelled by player
  {
    regex: /^Đơn thuê #(\d+)\s+đã bị hủy bởi player\s+(.+?)\.\s*Số tiền\s+([\d.,]+)\s*(?:xu|đ)?\s*đã được hoàn lại đầy đủ vào ví(?: của bạn)?\.$/i,
    en: (m) => `Order #${m[1]} was cancelled by player ${m[2]}. Full refund of ${m[3]} đ has been returned to your wallet.`
  },

  // 8. Cancelled with late fee
  {
    regex: /^Bạn đã hủy đơn thuê #(\d+)\.\s*Khấu trừ phí hủy sát giờ\s+([\d.,]+)\s*(?:xu|đ)?\s*\(30%\)\.\s*Hoàn lại\s+([\d.,]+)\s*(?:xu|đ)?\s*vào ví(?: của bạn)?\.$/i,
    en: (m) => `You cancelled order #${m[1]}. Late fee of ${m[2]} đ (30%) deducted. Refunded ${m[3]} đ to your wallet.`
  },

  // 9. Cancelled with full refund
  {
    regex: /^Bạn đã hủy đơn thuê #(\d+)\.\s*Hoàn lại đầy đủ 100%\s*\(([\d.,]+)\s*(?:xu|đ)?\)\s*vào ví(?: của bạn)?\.$/i,
    en: (m) => `You cancelled order #${m[1]}. Full 100% refund (${m[2]} đ) credited back to your wallet.`
  },

  // 10. Client cancelled booking (player view)
  {
    regex: /^Khách hàng\s*(.*?)\s*đã hủy đơn thuê #(\d+)\.(?:\s*Bạn được cộng bồi thường\s+([\d.,]+)\s*(?:xu|đ)?\.)?$/i,
    en: (m) => `Client ${m[1] ? m[1] + ' ' : ''}cancelled order #${m[2]}.${m[3] ? ` You received ${m[3]} đ compensation.` : ''}`
  },

  // 11. Order completed
  {
    regex: /^Đơn thuê của bạn đã được hoàn thành\.$/i,
    en: () => 'Your booking has been completed.'
  },
  {
    regex: /^Bạn đã hoàn thành đơn thuê với\s+(.+?)\.$/i,
    en: (m) => `You have completed the booking with ${m[1]}.`
  },

  // 12. Review received
  {
    regex: /^Bạn vừa nhận được đánh giá từ\s+(.+?)\s+cho đơn hàng #(\d+)\.$/i,
    en: (m) => `You received a new review from ${m[1]} for order #${m[2]}.`
  },
  {
    regex: /^Bạn vừa nhận được đánh giá từ\s+(.+?)\.$/i,
    en: (m) => `You received a new review from ${m[1]}.`
  },

  // 13. Violation cancel & Account banned
  {
    regex: /^Đơn thuê với player này đã bị hủy và bạn đã được hoàn\s*(?:tiền đầy đủ vào ví|coin|tiền).*$/i,
    en: () => 'Your booking with this player was cancelled and your payment has been fully refunded.'
  },
  {
    regex: /^Bạn đã bị ban vì lý do:\s*(.+?)(?:\s*\nChi tiết:\s*(.*))?$/is,
    en: (m) => `Your account has been suspended for: ${m[1]}.${m[2] ? ` Details: ${m[2]}` : ''}`
  },
  {
    regex: /^Tài khoản của bạn đã bị ban.*$/i,
    en: () => 'Your account has been suspended by an administrator.'
  },

  // 14. KYC
  {
    regex: /^Hồ sơ danh tính của bạn đã được Admin phê duyệt\.\s*Bây giờ bạn có thể thực hiện rút tiền đầy đủ\.$/i,
    en: () => 'Your identity profile has been approved by Admin. Full withdrawals are now unlocked.'
  },
  {
    regex: /^Hồ sơ danh tính của bạn đã bị từ chối\.\s*Lý do:\s*(.+?)\.\s*Vui lòng cập nhật lại thông tin\.$/i,
    en: (m) => `Your identity verification was rejected. Reason: ${m[1]}. Please update your details.`
  },

  // 15. Withdrawals
  {
    regex: /^Yêu cầu rút\s+([\d.,]+)\s*(?:xu|đ)?\s*về tài khoản\s*(.*?)\s*\((.*?)\)\s*đã được Admin xử lý thành công\.$/i,
    en: (m) => `Withdrawal of ${m[1]} đ to account ${m[2]} (${m[3]}) was successfully processed by Admin.`
  },
  {
    regex: /^Yêu cầu rút\s+([\d.,]+)\s*(?:xu|đ)?\s*đã bị từ chối\.\s*Lý do:\s*(.+?)\.\s*Số tiền đã được hoàn lại vào ví(?: của bạn)?\.$/i,
    en: (m) => `Withdrawal of ${m[1]} đ was declined. Reason: ${m[2]}. Funds have been refunded to your wallet.`
  },
  {
    regex: /^Số dư khả dụng không đủ để rút\s+([\d.,]+)\s*(?:xu|đ)?\.\s*Số dư hiện tại:\s+([\d.,]+)\s*(?:xu|đ)?\.$/i,
    en: (m) => `Insufficient available balance to withdraw ${m[1]} đ. Current balance: ${m[2]} đ.`
  },
  {
    regex: /^Bạn đã gửi yêu cầu rút\s+([\d.,]+)\s*(?:xu|đ)?\s*về tài khoản\s+(.+?)\s*-\s*(.+?)\s*\((.+?)\)\.\s*Hệ thống đang chờ Admin xử lý chuyển khoản\.$/i,
    en: (m) => `You submitted a withdrawal of ${m[1]} đ to ${m[2]} - ${m[3]} (${m[4]}). Awaiting Admin processing.`
  },

  // 16. Top-up / Deposits
  {
    regex: /^Bạn vừa nạp thành công\s+([\d.,]+)\s*(?:xu|đ)?\s*vào tài khoản\.$/i,
    en: (m) => `Successfully deposited ${m[1]} đ into your account.`
  },
  {
    regex: /^Bạn vừa nạp thành công\s+([\d.,]+)\s*(?:xu|đ)?\s*qua Ví\s+(.+?)\.$/i,
    en: (m) => `Successfully deposited ${m[1]} đ via ${m[2]} Wallet.`
  },

  // 17. Donate & Gifts
  {
    regex: /^Số dư không đủ để tặng\s+([\d.,]+)\s*(?:xu|đ)?\s*cho\s+(.+?)\.\s*Số dư hiện tại:\s+([\d.,]+)\s*(?:xu|đ)?\.$/i,
    en: (m) => `Insufficient balance to send ${m[1]} đ to ${m[2]}. Current balance: ${m[3]} đ.`
  },
  {
    regex: /^Bạn đã tặng quà trị giá\s+([\d.,]+)\s*(?:xu|đ)?\s*cho\s+(.+?)\s*thành công\.\s*Số dư còn lại:\s+([\d.,]+)\s*(?:xu|đ)?\.$/i,
    en: (m) => `Successfully sent a gift worth ${m[1]} đ to ${m[2]}. Remaining balance: ${m[3]} đ.`
  },
  {
    regex: /^(.+?)\s+đã tặng quà trị giá\s+([\d.,]+)\s*(?:xu|đ)?\s*cho bạn\s*\(Thực nhận:\s*([\d.,]+)\s*(?:xu|đ)?\s*sau khi trừ 15% phí hệ thống\)\.\s*Lời nhắn:\s*(.*)$/i,
    en: (m) => `${m[1]} sent you a gift worth ${m[2]} đ (Net received: ${m[3]} đ after 15% platform fee).${m[4] ? ` Message: "${m[4]}"` : ''}`
  },
  {
    regex: /^(.+?)\s+đã tặng quà trị giá\s+([\d.,]+)\s*(?:xu|đ)?\s*cho bạn\.$/i,
    en: (m) => `${m[1]} sent you a gift worth ${m[2]} đ.`
  },

  // 18. Followers & Messages
  {
    regex: /^(.+?)\s+vừa theo dõi bạn\.$/i,
    en: (m) => `${m[1]} started following you.`
  },
  {
    regex: /^(.+?)\s+vừa gửi cho bạn một tin nhắn:\s*'(.*)'$/is,
    en: (m) => `${m[1]} sent you a message: '${m[2]}'`
  },

  // 19. Moments
  {
    regex: /^Hãy xem khoảnh khắc mới của\s+(.+?)\s+ngay nhé!$/i,
    en: (m) => `Check out the new moment from ${m[1]}!`
  },

  // 20. Expired orders
  {
    regex: /^Đơn thuê #(\d+)\s+với player\s+(.+?)\s+đã tự động hủy do player không xác nhận trong vòng\s+(\d+)\s+phút\.\s*([\d.,]+)\s*(?:xu|đ)?\s*đã được hoàn lại vào ví(?: của bạn)?\.$/i,
    en: (m) => `Order #${m[1]} with player ${m[2]} was auto-cancelled (no confirmation in ${m[3]} mins). ${m[4]} đ refunded to your wallet.`
  },
  {
    regex: /^Đơn thuê #(\d+)\s+từ khách hàng\s+(.+?)\s+đã tự động hủy do bạn không xác nhận trong vòng\s+(\d+)\s+phút\.$/i,
    en: (m) => `Order #${m[1]} from client ${m[2]} was auto-cancelled because you did not confirm within ${m[3]} minutes.`
  },

  // 21. Payout credited
  {
    regex: /^Đơn thuê #(\d+)\s*\((.+?)\)\.\s*Số tiền\s+([\d.,]+)\s*(?:xu|đ)?\s*đã được chuyển vào số dư khả dụng của bạn\.$/i,
    en: (m) => `Order #${m[1]} (${m[2]}). ${m[3]} đ has been credited to your available balance.`
  },

  // 22. Upcoming reminders
  {
    regex: /^Đơn thuê của bạn với player\s+(.+?)\s+sẽ bắt đầu lúc\s+(.+?)\.$/i,
    en: (m) => `Your booking with player ${m[1]} will start at ${m[2]}.`
  },
  {
    regex: /^Bạn sắp có đơn thuê với người dùng\s+(.+?)\s+lúc\s+(.+?)\.$/i,
    en: (m) => `You have an upcoming booking with ${m[1]} at ${m[2]}.`
  },

  // 23. Ending reminders
  {
    regex: /^Đơn thuê của bạn với player\s+(.+?)\s+sẽ kết thúc lúc\s+(.+?)\.$/i,
    en: (m) => `Your booking with player ${m[1]} will end at ${m[2]}.`
  },
  {
    regex: /^Bạn sắp kết thúc đơn thuê với người dùng\s+(.+?)\s+lúc\s+(.+?)\.$/i,
    en: (m) => `Your booking with ${m[1]} is ending at ${m[2]}.`
  },

  // 24. Auto completed
  {
    regex: /^Đơn thuê của bạn đã được tự động hoàn thành do hết thời gian\.$/i,
    en: () => 'Your booking was automatically completed as session time expired.'
  },

  // 25. Review reminders
  {
    regex: /^Đơn thuê với\s+(.+?)\s+đã kết thúc\.\s*Hãy đánh giá trải nghiệm của bạn!$/i,
    en: (m) => `Your session with ${m[1]} has concluded. Please rate your experience!`
  },

  // 26. Report refunds & penalties
  {
    regex: /^Khiếu nại đơn thuê #(\d+)\s+đã được Admin chấp nhận với mức hoàn tiền\s+([\d.,]+)%\.\s*Bạn đã được hoàn lại\s+([\d.,]+)\s*(?:Coin|coin|xu|đ)?\.$/i,
    en: (m) => `Report for order #${m[1]} was approved by Admin (${m[2]}% refund). You have received ${m[3]} đ back.`
  },
  {
    regex: /^Đơn thuê #(\d+)\s+bị khiếu nại và chấp nhận tố cáo\s*\(([\d.,]+)%\)\.\s*Đã trừ\s+([\d.,]+)\s*(?:xu|đ)?\s*từ số dư đóng băng\.\s*(.*)$/is,
    en: (m) => {
      let extra = m[4] || '';
      if (extra.includes('Đơn hàng bị khấu trừ toàn bộ từ số dư đóng băng')) {
        extra = 'The entire escrow balance for this order was deducted.';
      } else {
        const remMatch = extra.match(/Số tiền còn lại\s+([\d.,]+)\s*(?:xu|đ)?\s*đã được chuyển/);
        if (remMatch) {
          extra = `The remaining ${remMatch[1]} đ has been transferred to your Available Balance.`;
        }
      }
      return `Order #${m[1]} report was upheld (${m[2]}%). Deducted ${m[3]} đ from escrow. ${extra}`;
    }
  },

  // 27. Password changed
  {
    regex: /^Bạn vừa đổi mật khẩu thành công\.\s*Nếu không phải bạn thực hiện, hãy liên hệ hỗ trợ ngay!$/i,
    en: () => 'Your password was successfully updated. If you did not make this change, please contact support immediately!'
  },

  // 28. AdminNotificationService patterns
  {
    regex: /^Người dùng\s+(.+?)\s+đã nạp\s+([\d.,]+)\s*(?:coin|Coin|xu|đ)?\s*vào tài khoản$/i,
    en: (m) => `User ${m[1]} deposited ${m[2]} đ into account.`
  },
  {
    regex: /^Người dùng\s+(.+?)\s+đã\s*(?:rút|rút)\s+([\d.,]+)\s*(?:coin|Coin|xu|đ)?\s*(?:vào|về)\s*tài khoản\s+(.+?)\s*-\s*(.+?)\s*\((.+?)\)$/i,
    en: (m) => `User ${m[1]} requested withdrawal of ${m[2]} đ to ${m[3]} - ${m[4]} (${m[5]}).`
  },
  {
    regex: /^Người dùng\s+(.+?)\s+đã tố cáo\s+(.+?)\s+với lý do:\s*(.*)$/i,
    en: (m) => `User ${m[1]} reported ${m[2]} for: ${m[3]}`
  },
  {
    regex: /^Người dùng\s+(.+?)\s+đã thực hiện giao dịch VNPay\s+([\d.,]+)\s*VND\s*-\s*Trạng thái:\s*(.*)$/i,
    en: (m) => `User ${m[1]} made a VNPay payment of ${m[2]} VND - Status: ${m[3]}`
  },
  {
    regex: /^Người dùng\s+(.+?)\s+đã\s*(?:donate|tặng quà)\s+([\d.,]+)\s*(?:coin|Coin|xu|đ)?\s*cho\s+(.+?)$/i,
    en: (m) => `User ${m[1]} gifted ${m[2]} đ to ${m[3]}.`
  }
];

/**
 * Normalizes Vietnamese text by replacing legacy currencies with 'đ'
 */
const normalizeVietnameseCurrency = (text) => {
  if (!text) return '';
  return text
    // Replace: "Số dư còn lại: {x} xu" -> "Số dư còn lại: {x} đ"
    .replace(/Số dư còn lại:\s*([^\s]+)\s*xu/g, 'Số dư còn lại: $1 đ')
    // Replace: "Thực nhận: {x} xu" -> "Thực nhận: $1 đ"
    .replace(/Thực nhận:\s*([^\s]+)\s*xu/g, 'Thực nhận: $1 đ')
    // Replace: "Số dư hiện tại: {x} xu" -> "Số dư hiện tại: $1 đ"
    .replace(/Số dư hiện tại:\s*([^\s]+)\s*xu/g, 'Số dư hiện tại: $1 đ')
    // Replace numbers followed by xu/coin: "50.000 xu" -> "50.000 đ"
    .replace(/\b(\d+[\d.,]*)\s*(?:xu|coin|Coin|coins)\b/gi, '$1 đ')
    // Replace standalone "hoàn coin" -> "hoàn tiền"
    .replace(/\bhoàn coin\b/gi, 'hoàn tiền')
    .replace(/\bHoàn xu\b/g, 'Hoàn tiền')
    // Replace any remaining standalone "xu"
    .replace(/\bxu\b/g, 'đ');
};

export const localizeNotification = (notif, language = 'vi') => {
  if (!notif) return { title: '', message: '' };

  const rawTitle = notif.title || '';
  const rawMessage = notif.message || '';

  // 1. Vietnamese mode: normalize currency representation
  if (language !== 'en') {
    return {
      title: normalizeVietnameseCurrency(rawTitle),
      message: normalizeVietnameseCurrency(rawMessage)
    };
  }

  // 2. English mode:
  // Title translation
  let translatedTitle = EXACT_TITLE_TRANSLATIONS[rawTitle.trim()];
  if (!translatedTitle) {
    for (const { regex, en } of DYNAMIC_TITLE_PATTERNS) {
      const match = rawTitle.trim().match(regex);
      if (match) {
        translatedTitle = en(match);
        break;
      }
    }
  }
  if (!translatedTitle) {
    translatedTitle = rawTitle
      .replace(/\bxu\b/gi, 'coins')
      .replace(/\bhoàn tiền\b/gi, 'refund')
      .replace(/\bthành công\b/gi, 'successful');
  }

  // Message translation
  let translatedMessage = null;
  const cleanRawMsg = rawMessage.trim();
  for (const { regex, en } of MESSAGE_PATTERNS) {
    const match = cleanRawMsg.match(regex);
    if (match) {
      translatedMessage = en(match);
      break;
    }
  }

  if (!translatedMessage) {
    // Fallback: clean currency and basic terms
    translatedMessage = rawMessage
      .replace(/Số dư còn lại:\s*([^\s]+)\s*xu/g, 'Remaining balance: $1 đ')
      .replace(/Thực nhận:\s*([^\s]+)\s*xu/g, 'Net received: $1 đ')
      .replace(/Số dư hiện tại:\s*([^\s]+)\s*xu/g, 'Current balance: $1 đ')
      .replace(/\b(\d+[\d.,]*)\s*(?:xu|coin|Coin)\b/gi, '$1 đ')
      .replace(/\bxu\b/g, 'đ');
  }

  return {
    title: translatedTitle,
    message: translatedMessage
  };
};
