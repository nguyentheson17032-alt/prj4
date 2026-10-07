import React from 'react';
import { ShieldCheck, Lock, RotateCcw, AlertTriangle } from 'lucide-react';

export const PolicyPage = () => {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: '840px', paddingBottom: '80px' }}>
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px' }}>
          Chính Sách & <span className="gradient-text">Quy Định Dịch Vụ</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Đảm bảo môi trường chơi game văn minh, an toàn và bảo vệ quyền lợi 100% cho người dùng.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Policy 1 */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: 'var(--accent-green)' }}>
              <RotateCcw size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>1. Chính Sách Hoàn Tiền 100%</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem' }}>
            Hệ thống PlayZone giữ tiền thanh toán trung gian. Nếu trong quá trình trải nghiệm:
          </p>
          <ul style={{ paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            <li>• Player không online hoặc không phản hồi sau 10 phút kể từ lúc tạo đơn.</li>
            <li>• Player có thái độ tiêu cực, toxic, xúc phạm hoặc cố ý phá trận đấu.</li>
            <li>• Hai bên thỏa thuận hủy đơn trước khi trận đấu bắt đầu.</li>
          </ul>
          <p style={{ marginTop: '10px', color: 'var(--accent-green)', fontWeight: 600, fontSize: '0.9rem' }}>
            ➔ Toàn bộ số tiền sẽ được hoàn trả 100% về ví tài khoản của bạn ngay lập tức.
          </p>
        </div>

        {/* Policy 2 */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '10px', color: 'var(--primary)' }}>
              <Lock size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>2. Quy Định Bảo Mật & Thông Tin Cá Nhân</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem' }}>
            PlayZone cam kết bảo mật tuyệt đối thông tin tài khoản game, số điện thoại và lịch sử giao dịch của bạn.
            Nghiêm cấm hành vi yêu cầu cung cấp mật khẩu tài khoản game hoặc chuyển tiền trực tiếp ngoài nền tảng để tránh các rủi ro lừa đảo.
          </p>
        </div>

        {/* Policy 3 */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '10px', color: 'var(--accent-amber)' }}>
              <AlertTriangle size={22} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>3. Quy Tắc Ứng Xử Văn Minh</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.92rem' }}>
            Người dùng và Player có nghĩa vụ tôn trọng lẫn nhau, không chia sẻ nội dung vi phạm thuần phong mỹ tục, không tuyên truyền văn hóa phẩm độc hại hoặc các hành vi gian lận (hack, cheat) trong game.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
