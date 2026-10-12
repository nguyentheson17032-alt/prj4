// Static UI config — không phải dữ liệu giả lập
// Quà tặng và Voucher là cấu hình cố định của sản phẩm, không cần backend quản lý

export const MOCK_GIFTS = [
  { id: 'rose', name: 'Bông Hồng', price: 10000, icon: '🌹', exp: '+50 Exp' },
  { id: 'boba', name: 'Trà Sữa', price: 30000, icon: '🧋', exp: '+150 Exp' },
  { id: 'heart', name: 'Trái Tim VIP', price: 50000, icon: '💖', exp: '+300 Exp' },
  { id: 'car', name: 'Siêu Xe', price: 200000, icon: '🏎️', exp: '+1500 Exp' },
  { id: 'rocket', name: 'Tên Lửa Siêu Cấp', price: 500000, icon: '🚀', exp: '+4000 Exp' }
];

export const MOCK_VOUCHERS = [
  { code: 'PLAYZONE10', discountPercent: 10, maxDiscount: 20000, description: 'Giảm 10% cho đơn thuê đầu tiên' },
  { code: 'WEEKENDVIP', discountPercent: 20, maxDiscount: 50000, description: 'Giảm 20% cho đơn thuê từ 3 giờ' },
  { code: 'FREESHIP50', discountPercent: 15, maxDiscount: 30000, description: 'Ưu đãi thành viên mới' }
];
