/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Globe, Key, Loader2, LogOut, Globe2, Trash2,
  CheckCircle2, Clock, Radio, RefreshCw, Star, Sun, Moon,
  ExternalLink, LayoutDashboard, Search, X, AlertCircle,
  Pencil, Eye, Info, ArrowLeft
} from 'lucide-react';
import { api } from './api.js';
import { SkeletonPage, SkeletonList } from './Skeleton.jsx';

function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem('sf_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sf_theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return { theme, toggle };
}

function useSecretLogo(homePath = '/') {
  const count = useRef(0);
  const timer = useRef(null);
  const handleClick = () => {
    count.current += 1;
    if (timer.current) clearTimeout(timer.current);
    if (count.current >= 5) {
      count.current = 0;
      clearTimeout(timer.current);
      window.location.href = '/admin.html';
      return;
    }
    timer.current = setTimeout(() => {
      const total = count.current;
      count.current = 0;
      if (total < 5 && homePath) window.location.href = homePath;
    }, 500);
  };
  return handleClick;
}

export default function FavoritesApp() {
  const [state, setState] = useState({ loading: true, me: null });

  useEffect(() => {
    let mounted = true;
    api.get('/api/user/me').then((res) => {
      if (!mounted) return;
      if (res && res.code) setState({ loading: false, me: res });
      else window.location.href = '/login.html';
    }).catch(() => { window.location.href = '/login.html'; });
    return () => { mounted = false; };
  }, []);

  if (state.loading) {
    return <SkeletonPage />;
  }

  const handleLogout = async () => {
    await api.post('/api/user/logout', {});
    window.location.href = '/';
  };

  return <FavoritesPage me={state.me} onLogout={handleLogout} />;
}

function UserNav({ active }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/user.html' },
    { key: 'favorites', label: 'Favorites', icon: Star, href: '/favorites.html' }
  ];
  return (
    <div className="user-nav">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = active === item.key;
        return (
          <a key={item.key} href={item.href} className={`user-nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={16} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </div>
  );
}

function FavoritesPage({ me, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [removingFav, setRemovingFav] = useState(null);
  const [editing, setEditing] = useState(null);
  const [dnsOpen, setDnsOpen] = useState(null);
  const [dnsResult, setDnsResult] = useState({});
  const [dnsLoading, setDnsLoading] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const { theme, toggle } = useTheme();
  const handleLogoClick = useSecretLogo('/');

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    const res = await api.get('/api/user/favorites');
    setItems(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removeFav = async (s) => {
    if (removingFav === s.id) return;
    setRemovingFav(s.id);
    try {
      const res = await api.post(`/api/user/subdomains/${s.id}/favorite`, {});
      if (!res || res.error) {
        showToast(res?.error || 'Gagal hapus dari favorit', 'error');
        setRemovingFav(null);
        return;
      }
      if (res.favorited === false) {
        setItems(prev => prev.filter(it => it.id !== s.id));
        showToast('Dihapus dari favorit', 'success');
      }
    } catch (err) {
      showToast('Gagal: ' + err.message, 'error');
    }
    setRemovingFav(null);
  };

  const removeSub = async (s) => {
    const full = `${s.subdomain}.${s.domain}`;
    if (!confirm(`Hapus subdomain "${full}" permanen?\n\nRecord DNS di Cloudflare juga akan dihapus.`)) return;
    setDeleting(s.id);
    const res = await api.del(`/api/user/subdomains/${s.id}`);
    setDeleting(null);
    if (res.success) {
      showToast('Subdomain dihapus', 'success');
      load();
    } else {
      showToast(res.error || 'Gagal hapus', 'error');
    }
  };

  const checkDns = async (s) => {
    const full = `${s.subdomain}.${s.domain}`;
    setDnsLoading(s.id);
    setDnsOpen(s.id);
    setDnsResult(prev => ({ ...prev, [s.id]: null }));
    const res = await api.post('/api/dns/check', { name: full, type: s.type });
    setDnsLoading(null);
    setDnsResult(prev => ({ ...prev, [s.id]: res }));
  };

  const saveEdit = async (id, updates) => {
    const res = await api.patch(`/api/user/subdomains/${id}`, updates);
    if (res.success) {
      showToast('Subdomain diupdate', 'success');
      setEditing(null);
      load();
    } else {
      showToast(res.error || 'Gagal update', 'error');
    }
  };

  const filtered = items.filter(s =>
    `${s.subdomain}.${s.domain}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <header>
        <div className="logo" onClick={handleLogoClick} title="SubForge" role="button" tabIndex={0}>
          <div className="logo-icon"><Globe size={22} /></div>
          <span>SubForge</span>
        </div>
        <div className="header-actions">
          <div className="chip chip-ok"><Key size={14} /> {me?.code}</div>
          <button className="theme-toggle-btn" onClick={toggle} title="Ganti tema">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="btn btn-sm btn-pink" onClick={onLogout}><LogOut size={14} /> Logout</button>
        </div>
      </header>

      <main className="main-wide">
        <UserNav active="favorites" />

        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Star size={22} fill="currentColor" />
              <h1>Favorites ({items.length})</h1>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="spin" size={14} /> : <RefreshCw size={14} />}
              Refresh
            </button>
          </div>

          {items.length > 0 && (
            <div className="search-box" style={{ marginBottom: 16 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari di favorites..."
                className="search-input"
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')} type="button">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {loading ? (
            <SkeletonList n={4} />
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Star size={32} /></div>
              <h3>Belum ada favorites</h3>
              <p>Tandai subdomain dengan ikon bintang di dashboard untuk menyimpannya di sini.</p>
              <a className="btn btn-mint" href="/user.html" style={{ marginTop: 14 }}>
                <LayoutDashboard size={14} /> Buka Dashboard
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">Tidak ada yang cocok dengan "{search}"</div>
          ) : (
            <div className="list">
              {filtered.map(s => {
                const isRemovingFav = removingFav === s.id;
                const isEditing = editing === s.id;
                return (
                  <div className="list-item" key={s.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    {isEditing ? (
                      <EditForm
                        item={s}
                        onCancel={() => setEditing(null)}
                        onSave={(updates) => saveEdit(s.id, updates)}
                      />
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', width: '100%' }}>
                          <div className="list-item-info">
                            <div className="list-item-title">
                              <button
                                type="button"
                                className={`fav-btn active ${isRemovingFav ? 'loading' : ''}`}
                                onClick={(e) => { e.stopPropagation(); removeFav(s); }}
                                disabled={isRemovingFav}
                                title="Hapus dari favorit"
                              >
                                {isRemovingFav ? <Loader2 className="spin" size={12} /> : <Star size={14} fill="currentColor" />}
                              </button>
                              <Globe size={14} />
                              <span className="mono">{s.subdomain}.{s.domain}</span>
                              <span className="chip">{s.type}</span>
                              {s.proxied ? <span className="chip chip-ok">proxied</span> : null}
                            </div>
                            <div className="list-item-sub">
                              {s.content} - TTL {s.ttl} - ditandai {new Date(s.favorited_at || s.created_at).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <div className="actions">
                            <button className="icon-btn" title="Edit" onClick={() => setEditing(s.id)}>
                              <Pencil size={14} />
                            </button>
                            <a className="icon-btn" href={`https://${s.subdomain}.${s.domain}`} target="_blank" rel="noopener noreferrer" title="Buka di tab baru">
                              <ExternalLink size={14} />
                            </a>
                            <button className="icon-btn" title="Cek DNS" onClick={() => checkDns(s)} disabled={dnsLoading === s.id}>
                              {dnsLoading === s.id ? <Loader2 className="spin" size={14} /> : <Radio size={14} />}
                            </button>
                            <button className="icon-btn danger" title="Hapus subdomain" onClick={() => removeSub(s)} disabled={deleting === s.id}>
                              {deleting === s.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>

                        {dnsOpen === s.id && dnsResult[s.id] && (
                          <div className={`dns-result ${dnsResult[s.id].answers?.length > 0 ? 'dns-ok' : 'dns-pending'}`} style={{ marginTop: 12, marginBottom: 0 }}>
                            <div className="dns-header">
                              {dnsResult[s.id].answers?.length > 0 ? (
                                <><CheckCircle2 size={16} /> <span>DNS aktif ({dnsResult[s.id].answers.length})</span></>
                              ) : (
                                <><Clock size={16} /> <span>Belum propagate ({dnsResult[s.id].statusText})</span></>
                              )}
                            </div>
                            {dnsResult[s.id].answers?.length > 0 && (
                              <div className="dns-answers">
                                {dnsResult[s.id].answers.map((a, i) => (
                                  <div className="dns-answer" key={i}>
                                    <span className="mono">{a.type}</span>
                                    <span className="dns-data mono">{a.data}</span>
                                    <span className="dns-ttl">TTL {a.ttl}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EditForm({ item, onCancel, onSave }) {
  const [content, setContent] = useState(item.content);
  const [proxied, setProxied] = useState(!!item.proxied);
  const [ttl, setTtl] = useState(item.ttl);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const isComplex = item.type === 'CAA' || item.type === 'SRV';

  const fullName = `${item.subdomain}.${item.domain}`;

  const save = async () => {
    setSaving(true);
    const updates = { content, ttl: Number(ttl) };
    if (['A', 'AAAA', 'CNAME'].includes(item.type)) updates.proxied = proxied;
    await onSave(updates);
    setSaving(false);
  };

  const previewValue = () => {
    if (isComplex) {
      try {
        const parsed = JSON.parse(content);
        if (item.type === 'CAA') return `flags=${parsed.flags} tag=${parsed.tag} value=${parsed.value}`;
        if (item.type === 'SRV') return `priority=${parsed.priority} weight=${parsed.weight} port=${parsed.port} target=${parsed.target}`;
      } catch { return content; }
    }
    return content;
  };

  if (showPreview) {
    return (
      <div className="edit-form">
        <div className="alert alert-info" style={{ marginBottom: 14 }}>
          <Info size={18} /> Konfirmasi perubahan sebelum disimpan.
        </div>

        <div className="preview-box" style={{ marginBottom: 14 }}>
          <div className="preview-row"><span className="preview-label">Nama</span><span className="preview-value mono">{fullName}</span></div>
          <div className="preview-row"><span className="preview-label">Type</span><span className="preview-value mono">{item.type}</span></div>
          <div className="preview-row"><span className="preview-label">Value Baru</span><span className="preview-value mono">{previewValue()}</span></div>
          <div className="preview-row"><span className="preview-label">TTL Baru</span><span className="preview-value mono">{ttl === 1 || ttl === '1' ? 'Auto' : `${ttl} detik`}</span></div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-mint" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowPreview(false)} disabled={saving}>
            <ArrowLeft size={14} /> Ubah Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-form">
      <div className="edit-form-header">
        <Pencil size={16} />
        <span>Edit <strong className="mono">{fullName}</strong></span>
      </div>

      <div className="field">
        <label>{isComplex ? 'Data (JSON)' : 'Content'}</label>
        <input type="text" value={content} onChange={(e) => setContent(e.target.value)} autoFocus />
        {isComplex && <span className="field-hint">Format JSON.</span>}
      </div>

      <div className="row">
        <div className="field">
          <label>TTL</label>
          <select value={ttl} onChange={(e) => setTtl(e.target.value)}>
            <option value={1}>Auto</option>
            <option value={60}>1 menit</option>
            <option value={300}>5 menit</option>
            <option value={3600}>1 jam</option>
            <option value={86400}>1 hari</option>
          </select>
        </div>
        {['A', 'AAAA', 'CNAME'].includes(item.type) && (
          <div className="field">
            <label>Proxied</label>
            <label className="toggle" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={proxied} onChange={(e) => setProxied(e.target.checked)} />
              <span className="toggle-track"></span>
              <span>{proxied ? 'Aktif' : 'Nonaktif'}</span>
            </label>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-mint btn-sm" onClick={() => setShowPreview(true)}>
          <Eye size={14} /> Preview & Simpan
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          <X size={14} /> Batal
        </button>
      </div>
    </div>
  );
}
