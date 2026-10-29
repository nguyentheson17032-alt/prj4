import React, { createContext, useContext, useState } from 'react';

const translations = {
  vi: {
    // Navigation
    'nav.home': 'Trang Chủ',
    'nav.explore': 'Khám Phá',
    'nav.moments': 'Khoảnh Khắc',
    'nav.orders': 'Đơn Thuê',
    'nav.messages': 'Tin Nhắn',
    'nav.wallet': 'Ví Tiền',
    'nav.register': 'Đăng Ký Idol',
    'nav.admin': 'Quản Trị',
    'nav.login': 'Đăng Nhập',
    'nav.logout': 'Đăng Xuất',
    'nav.notifications': 'Thông báo',
    'nav.coin': 'Xu',
    'nav.searchPlaceholder': 'Tìm kiếm idol, game...',
    'nav.profile': 'Hồ Sơ Cá Nhân',

    // Chat
    'chat.conversations': 'Cuộc trò chuyện',
    'chat.search': 'Tìm kiếm hội thoại...',
    'chat.typeMessage': 'Nhập tin nhắn trò chuyện...',
    'chat.send': 'Gửi',
    'chat.online': 'Trực tuyến',
    'chat.offline': 'Ngoại tuyến',
    'chat.hire': 'Thuê Duo Ngay',
    'chat.noConversation': 'Chọn một cuộc trò chuyện để bắt đầu nhắn tin',
    'chat.empty': 'Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!',

    // Wallet & Income
    'wallet.balance': 'Số dư ví khả dụng',
    'wallet.topup': 'Nạp Tiền',
    'wallet.withdraw': 'Rút Tiền',
    'wallet.history': 'Lịch Sử Giao Dịch',
    'wallet.idolReport': 'Báo Cáo Thu Nhập Idol',
    'wallet.todayIncome': 'Thu Nhập Hôm Nay',
    'wallet.weekIncome': 'Thu Nhập Tuần Này',
    'wallet.monthIncome': 'Thu Nhập Tháng Này',
    'wallet.totalIncome': 'Tổng Thu Nhập Đã Nhận',
    'wallet.frozenIncome': 'Đang Tạm Giữ (Escrow)',
    'wallet.completedOrders': 'Đơn Hoàn Thành',
    'wallet.byDay': 'Theo Ngày',
    'wallet.byWeek': 'Theo Tuần',
    'wallet.exportStatement': 'Xuất Sao Kê Giao Dịch (CSV)',
    'wallet.all': 'Tất Cả',
    'wallet.deposit': 'Nạp Tiền',
    'wallet.payment': 'Thuê Duo',
    'wallet.receive': 'Nhận Tiền Thuê',
    'wallet.donate': 'Quà Tặng',
    'wallet.refund': 'Hoàn Tiền',
    'wallet.statementDownloaded': 'Đã xuất và tải file sao kê CSV thành công!',
    'wallet.dateRange': 'Khoảng thời gian',
    'wallet.from': 'Từ ngày',
    'wallet.to': 'Đến ngày',

    // Deposit Modal
    'deposit.title': 'Nạp Coin Vào Ví PlayZone',
    'deposit.currentBalance': 'Số dư ví hiện tại:',
    'deposit.chooseAmount': 'Chọn Mệnh Giá Nạp:',
    'deposit.chooseMethod': 'Chọn Kênh Thanh Toán:',
    'deposit.vietqrDesc': 'Quét mã QR bằng ứng dụng ngân hàng bất kỳ để nạp tự động 24/7 (Khớp lệnh sau 3s)',
    'deposit.momoDesc': 'Thanh toán siêu tốc qua ứng dụng MoMo bằng mã QR hoặc tài khoản ví MoMo.',
    'deposit.zalopayDesc': 'Thanh toán qua ví ZaloPay hoặc quét mã QR trong app Zalo bảo mật 100%.',
    'deposit.vnpayDesc': 'Hỗ trợ hơn 40 ngân hàng nội địa Việt Nam và thẻ quốc tế Visa / Mastercard.',
    'deposit.processing': 'Đang Xử Lý...',
    'deposit.submit': 'Nạp Tiền',
    'deposit.receive': 'Thực nhận vào ví:',
    'deposit.bonusLabel': 'Thưởng thêm',

    // Withdraw Modal
    'withdraw.title': 'Rút Tiền Về Tài Khoản Ngân Hàng',
    'withdraw.bankNumber': 'Số Tài Khoản Ngân Hàng',
    'withdraw.bankAccountName': 'Tên Chủ Tài Khoản (In hoa không dấu)',
    'withdraw.bankName': 'Ngân Hàng Thụ Hưởng',
    'withdraw.amount': 'Số Tiền Cần Rút (đ)',
    'withdraw.minAmountNotice': 'Số tiền rút tối thiểu: 50.000 đ',
    'withdraw.submit': 'Tạo Yêu Cầu Rút Tiền',

    // Notifications
    'notif.title': 'Thông Báo',
    'notif.all': 'Tất cả',
    'notif.unread': 'Chưa đọc',
    'notif.markAll': 'Đã đọc tất cả',
    'notif.deleteRead': 'Xóa đã đọc',
    'notif.empty': 'Bạn chưa có thông báo nào',
    'notif.emptyUnread': 'Không có thông báo chưa đọc',
    'notif.orderHistory': 'Xem lịch sử đơn hàng',
    'notif.newBadge': 'mới',

    // Common
    'common.success': 'Thành công',
    'common.failed': 'Thất bại',
    'common.loading': 'Đang tải...',
    'common.confirm': 'Xác nhận',
    'common.cancel': 'Hủy',
    'common.status': 'Trạng thái',
    'common.action': 'Thao tác',
    'common.filter': 'Bộ lọc',
    'common.date': 'Thời gian',
    'common.amount': 'Số tiền'
  },
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.moments': 'Moments',
    'nav.orders': 'Orders',
    'nav.messages': 'Messages',
    'nav.wallet': 'Wallet',
    'nav.register': 'Become an Idol',
    'nav.admin': 'Admin Panel',
    'nav.login': 'Sign In',
    'nav.logout': 'Sign Out',
    'nav.notifications': 'Notifications',
    'nav.coin': 'Coins',
    'nav.searchPlaceholder': 'Search idols, games...',
    'nav.profile': 'My Profile',

    // Chat
    'chat.conversations': 'Conversations',
    'chat.search': 'Search chat...',
    'chat.typeMessage': 'Type a message...',
    'chat.send': 'Send',
    'chat.online': 'Online',
    'chat.offline': 'Offline',
    'chat.hire': 'Hire Duo Now',
    'chat.noConversation': 'Select a conversation to start chatting',
    'chat.empty': 'No messages yet. Send the first greeting!',

    // Wallet & Income
    'wallet.balance': 'Available Balance',
    'wallet.topup': 'Deposit',
    'wallet.withdraw': 'Withdraw',
    'wallet.history': 'Transaction History',
    'wallet.idolReport': 'Idol Income Report',
    'wallet.todayIncome': "Today's Income",
    'wallet.weekIncome': "This Week's Income",
    'wallet.monthIncome': "This Month's Income",
    'wallet.totalIncome': 'Total Income Earned',
    'wallet.frozenIncome': 'Escrow Pending (Held)',
    'wallet.completedOrders': 'Completed Orders',
    'wallet.byDay': 'Daily',
    'wallet.byWeek': 'Weekly',
    'wallet.exportStatement': 'Export Statement (CSV)',
    'wallet.all': 'All',
    'wallet.deposit': 'Deposits',
    'wallet.payment': 'Hires',
    'wallet.receive': 'Income',
    'wallet.donate': 'Gifts',
    'wallet.refund': 'Refunds',
    'wallet.statementDownloaded': 'Transaction statement exported successfully!',
    'wallet.dateRange': 'Date Range',
    'wallet.from': 'From',
    'wallet.to': 'To',

    // Deposit Modal
    'deposit.title': 'Top Up PlayZone Wallet',
    'deposit.currentBalance': 'Current Balance:',
    'deposit.chooseAmount': 'Select Amount:',
    'deposit.chooseMethod': 'Select Payment Gateway:',
    'deposit.vietqrDesc': 'Scan QR with any banking app for 24/7 instant auto-crediting (Matched in 3s)',
    'deposit.momoDesc': 'Fast payment via MoMo Wallet App using QR code or wallet balance.',
    'deposit.zalopayDesc': 'Secure checkout with ZaloPay Wallet or Zalo App QR scan 100% encrypted.',
    'deposit.vnpayDesc': 'Supports 40+ Vietnam national banks and Visa / Mastercard.',
    'deposit.processing': 'Processing...',
    'deposit.submit': 'Deposit Now',
    'deposit.receive': 'Amount to receive:',
    'deposit.bonusLabel': 'Bonus promotion',

    // Withdraw Modal
    'withdraw.title': 'Withdraw Funds to Bank Account',
    'withdraw.bankNumber': 'Bank Account Number',
    'withdraw.bankAccountName': 'Account Holder Name',
    'withdraw.bankName': 'Beneficiary Bank',
    'withdraw.amount': 'Amount to Withdraw (VND)',
    'withdraw.minAmountNotice': 'Minimum withdrawal: 50,000 VND',
    'withdraw.submit': 'Submit Withdrawal Request',

    // Notifications
    'notif.title': 'Notifications',
    'notif.all': 'All',
    'notif.unread': 'Unread',
    'notif.markAll': 'Mark all as read',
    'notif.deleteRead': 'Clear read',
    'notif.empty': 'You have no notifications yet',
    'notif.emptyUnread': 'No unread notifications',
    'notif.orderHistory': 'View Order History',
    'notif.newBadge': 'new',

    // Common
    'common.success': 'Success',
    'common.failed': 'Failed',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.status': 'Status',
    'common.action': 'Action',
    'common.filter': 'Filter',
    'common.date': 'Time',
    'common.amount': 'Amount'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('playzone_language') || 'vi';
  });

  const changeLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      setLanguage(lang);
      localStorage.setItem('playzone_language', lang);
    }
  };

  const t = (key, fallback = '') => {
    const dict = translations[language] || translations.vi;
    return dict[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'vi',
      changeLanguage: () => {},
      t: (key, fallback = '') => fallback || key
    };
  }
  return context;
};

export default LanguageContext;
