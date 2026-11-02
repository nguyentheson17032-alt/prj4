import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ShieldCheck, Heart, Sparkles, Headphones, Send } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const Footer = () => {
  const { t } = useLanguage();

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
              {t('footer.desc', 'Nền tảng kết nối game thủ, thuê Duo leo rank chuyên nghiệp và tâm sự giao lưu cùng hàng nghìn Idol nổi tiếng hàng đầu Việt Nam.')}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span className="badge badge-primary">{t('footer.reputationBadge', '✨ Uy Tín 100%')}</span>
              <span className="badge badge-online">{t('footer.refundBadge', '⚡ Hoàn Tiền 100%')}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '18px', color: 'var(--text-primary)' }}>{t('footer.explore', 'Khám Phá')}</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><Link to="/explore?game=Liên Quân Mobile" style={{ transition: 'color 0.2s' }}>{t('footer.gameLienQuan', 'Duo Liên Quân Mobile')}</Link></li>
              <li><Link to="/explore?game=Liên Minh Huyền Thoại">{t('footer.gameLmht', 'Duo LMHT (LOL)')}</Link></li>
              <li><Link to="/explore?game=Valorant">{t('footer.gameValorant', 'Duo & Coaching Valorant')}</Link></li>
              <li><Link to="/explore?game=PUBG">{t('footer.gamePubg', 'Duo PUBG PC & Mobile')}</Link></li>
              <li><Link to="/explore?game=Tâm Sự">{t('footer.talkAndSing', 'Tâm Sự & Hát Theo Yêu Cầu')}</Link></li>
            </ul>
          </div>

          {/* Support & Safety */}
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '18px', color: 'var(--text-primary)' }}>{t('footer.policySupport', 'Chính Sách & Hỗ Trợ')}</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li><Link to="/policy">{t('footer.policyCommunity', 'Quy định cộng đồng')}</Link></li>
              <li><Link to="/policy">{t('footer.policyPrivacy', 'Chính sách bảo mật')}</Link></li>
              <li><Link to="/policy">{t('footer.policyRefund', 'Chính sách hoàn tiền')}</Link></li>
              <li><Link to="/register-player">{t('footer.becomePlayer', 'Trở thành Player / Idol')}</Link></li>
              <li><a href="#support" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Headphones size={14} /> {t('footer.cskh', 'CSKH 24/7 (Hotline: 1900 xxxx)')}</a></li>
            </ul>
          </div>

          {/* Newsletter / App */}
          <div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '18px', color: 'var(--text-primary)' }}>{t('footer.newsletterTitle', 'Nhận Ưu Đãi Mới Nhất')}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '14px' }}>
              {t('footer.newsletterDesc', 'Đăng ký email để nhận voucher giảm 20% mỗi tuần!')}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder', 'Email của bạn...')}
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
            © {new Date().getFullYear()} PlayZone Gaming Platform. {t('footer.allRightsReserved', 'Tất cả quyền được bảo lưu.')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{t('footer.madeWith', 'Được tạo với')}</span>
            <Heart size={14} fill="#ec4899" color="#ec4899" />
            <span>{t('footer.forGamers', 'dành cho Game thủ')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
