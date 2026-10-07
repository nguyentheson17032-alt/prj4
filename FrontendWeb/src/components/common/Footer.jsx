import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ShieldCheck, Heart, Sparkles, Headphones, Send } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
      padding: '60px 0 30px 0',
      marginTop: '80px'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div className="logo-badge" style={{ width: '36px', height: '36px' }}>
                <Gamepad2 size={20} />
              </div>
              <span className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800 }}>PlayZone DUO</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '20px' }}>
              Nền tảng kết nối game thủ, thuê Duo leo rank chuyên nghiệp và tâm sự giao lưu cùng hàng nghìn Idol nổi tiếng hàng đầu Việt Nam.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span className="badge badge-primary">✨ Uy Tín 100%</span>
              <span className="badge badge-online">⚡ Hoàn Tiền 100%</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '18px', color: 'var(--text-primary)' }}>Khám Phá</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><Link to="/explore?game=Liên Quân Mobile" style={{ transition: 'color 0.2s' }}>Duo Liên Quân Mobile</Link></li>
              <li><Link to="/explore?game=Liên Minh Huyền Thoại">Duo LMHT (LOL)</Link></li>
              <li><Link to="/explore?game=Valorant">Duo & Coaching Valorant</Link></li>
              <li><Link to="/explore?game=PUBG">Duo PUBG PC & Mobile</Link></li>
              <li><Link to="/explore?game=Tâm Sự">Tâm Sự & Hát Theo Yêu Cầu</Link></li>
            </ul>
          </div>

          {/* Support & Safety */}
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '18px', color: 'var(--text-primary)' }}>Chính Sách & Hỗ Trợ</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><Link to="/policy">Quy định cộng đồng</Link></li>
              <li><Link to="/policy">Chính sách bảo mật</Link></li>
              <li><Link to="/policy">Chính sách hoàn tiền</Link></li>
              <li><Link to="/register-player">Trở thành Player / Idol</Link></li>
              <li><a href="#support" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Headphones size={14} /> CSKH 24/7 (Hotline: 1900 xxxx)</a></li>
            </ul>
          </div>

          {/* Newsletter / App */}
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '18px', color: 'var(--text-primary)' }}>Nhận Ưu Đãi Mới Nhất</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>
              Đăng ký email để nhận voucher giảm 20% mỗi tuần!
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder="Email của bạn..."
                className="form-control"
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              />
              <button className="btn btn-primary btn-sm" style={{ padding: '0 16px' }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            © {new Date().getFullYear()} PlayZone Gaming Platform. Tất cả quyền được bảo lưu.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Made with</span>
            <Heart size={14} fill="#ec4899" color="#ec4899" />
            <span>for Gamers</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
