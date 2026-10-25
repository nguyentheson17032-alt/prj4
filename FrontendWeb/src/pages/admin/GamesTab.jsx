import React, { useState } from 'react';
import { Gamepad2, Search, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../api/apiService';
import { StatusBadge } from './adminHelpers';

export const GamesTab = ({ gamesList, setGamesList, loading }) => {
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('MOBA');
  const [formPlatform, setFormPlatform] = useState('MOBILE');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formHasRoles, setFormHasRoles] = useState(false);
  const [formRanks, setFormRanks] = useState('');
  const [formRoles, setFormRoles] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const filtered = gamesList.filter(g => !search || g.name?.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormImageUrl(''); setFormWebsiteUrl('');
    setFormHasRoles(false); setFormRanks(''); setFormRoles('');
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      const ranksArray = formRanks.trim() ? formRanks.split(',').map(r => r.trim()).filter(Boolean) : [];
      const rolesArray = formHasRoles && formRoles.trim() ? formRoles.split(',').map(r => r.trim()).filter(Boolean) : [];
      const created = await api.createGame({
        name: formName.trim(),
        description: formDescription.trim() || formName.trim(),
        category: formCategory,
        platform: formPlatform,
        status: 'ACTIVE',
        hasRoles: formHasRoles,
        imageUrl: formImageUrl.trim() || null,
        websiteUrl: formWebsiteUrl.trim() || null,
        availableRanks: ranksArray,
        availableRoles: rolesArray
      });
      setGamesList(prev => [...prev, created]);
      addToast(`Đã thêm game "${formName}"`, 'success');
      resetForm();
      setShowForm(false);
    } catch (err) {
      addToast(err.response?.data || 'Không thể thêm game. Kiểm tra lại quyền Admin.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Danh Mục Game ({gamesList.length})</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-control" style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem', minWidth: '180px' }} placeholder="Tìm game..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => setShowForm(v => !v)}>
            <Plus size={15} /> <span>Thêm game</span>
          </button>
        </div>
      </div>
      {showForm && (
        <div style={{ marginBottom: '18px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
            <div style={{ flex: 2, minWidth: '160px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tên game *</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Ví dụ: PUBG Mobile" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div style={{ flex: 3, minWidth: '180px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mô tả</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Mô tả ngắn về game..." value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>
            <div style={{ minWidth: '130px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Thể loại</label>
              <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                <option value="MOBA">MOBA</option>
                <option value="FPS">FPS</option>
                <option value="RPG">RPG</option>
                <option value="BATTLE_ROYALE">Battle Royale</option>
                <option value="STRATEGY">Strategy</option>
                <option value="SPORT">Sport</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            <div style={{ minWidth: '120px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nền tảng</label>
              <select className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} value={formPlatform} onChange={e => setFormPlatform(e.target.value)}>
                <option value="MOBILE">Mobile</option>
                <option value="PC">PC</option>
                <option value="CONSOLE">Console</option>
              </select>
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Link ảnh bìa (URL)</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="https://..." value={formImageUrl} onChange={e => setFormImageUrl(e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Website chính thức (URL)</label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="https://..." value={formWebsiteUrl} onChange={e => setFormWebsiteUrl(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ flex: 3, minWidth: '250px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                🏆 Danh sách Rank <span style={{ fontWeight: 400 }}>(phân cách bằng dấu phẩy, thứ tự thấp→cao)</span>
              </label>
              <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Ví dụ: Đồng, Bạc, Vàng, Bạch Kim, Kim Cương..." value={formRanks} onChange={e => setFormRanks(e.target.value)} />
            </div>
            <div style={{ minWidth: '120px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Có vị trí/Role?</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '36px', cursor: 'pointer' }} onClick={() => setFormHasRoles(v => !v)}>
                <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: formHasRoles ? 'var(--primary)' : 'var(--border-color)', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: formHasRoles ? '18px' : '2px', transition: 'left 0.2s' }} />
                </div>
                <span style={{ fontSize: '0.85rem' }}>{formHasRoles ? 'Có' : 'Không'}</span>
              </div>
            </div>
            {formHasRoles && (
              <div style={{ flex: 3, minWidth: '250px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  🎮 Danh sách Vị Trí/Role <span style={{ fontWeight: 400 }}>(phân cách bằng dấu phẩy)</span>
                </label>
                <input className="form-control" style={{ height: '36px', fontSize: '0.85rem' }} placeholder="Ví dụ: Top, Rừng, Mid, Xạ Thủ, Hỗ Trợ" value={formRoles} onChange={e => setFormRoles(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button className="btn btn-primary" style={{ fontSize: '0.85rem', height: '36px' }} onClick={handleAdd} disabled={submitting || !formName.trim()}>
                {submitting ? 'Đang lưu...' : 'Lưu game'}
              </button>
              <button className="btn btn-secondary" style={{ fontSize: '0.85rem', height: '36px' }} onClick={() => { setShowForm(false); resetForm(); }}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedGame && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedGame(null)}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '16px', maxWidth: '520px', width: '100%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid var(--border-color)' }} onClick={e => e.stopPropagation()}>
            {(selectedGame.imageUrl || selectedGame.image) && <img src={selectedGame.imageUrl || selectedGame.image} alt={selectedGame.name} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '16px 16px 0 0' }} onError={e => { e.target.style.display = 'none'; }} />}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{selectedGame.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{selectedGame.category}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>{selectedGame.platform}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedGame(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
              </div>
              {selectedGame.websiteUrl && <a href={selectedGame.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: 'var(--primary)' }}>{selectedGame.websiteUrl}</a>}
              {selectedGame.availableRanks?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>🏆 DANH SÁCH RANK ({selectedGame.availableRanks.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedGame.availableRanks.map((r, i) => <span key={i} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.2)' }}>{r}</span>)}
                  </div>
                </div>
              )}
              {selectedGame.availableRoles?.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-muted)' }}>🎮 DANH SÁCH VỊ TRÍ/ROLE ({selectedGame.availableRoles.length})</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedGame.availableRoles.map((r, i) => <span key={i} style={{ fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{r}</span>)}
                  </div>
                </div>
              )}
              {(!selectedGame.availableRanks?.length && !selectedGame.availableRoles?.length) && (
                <div style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Game này chưa có danh sách rank/role được cấu hình.</div>
              )}
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Đang tải...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {filtered.map(g => (
            <div key={g.id} style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => setSelectedGame(g)}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {(g.imageUrl || g.image)
                ? <img src={g.imageUrl || g.image} alt={g.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                : null}
              <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: (g.imageUrl || g.image) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}><Gamepad2 size={32} style={{ color: '#fff', opacity: 0.7 }} /></div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  {g.category} · {g.platform}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {g.availableRanks?.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>🏆 {g.availableRanks.length} rank</span>}
                  {g.availableRoles?.length > 0 && <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>🎮 {g.availableRoles.length} role</span>}
                </div>
                {g.status && <div style={{ marginTop: '6px' }}><StatusBadge status={g.status} /></div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GamesTab;
