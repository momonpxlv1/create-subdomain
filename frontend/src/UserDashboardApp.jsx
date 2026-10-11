/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Globe, Key, User, Loader2, AlertCircle, LogOut,
  ArrowLeft, Globe2, Trash2, CheckCircle2, Clock, Layers,
  Radio, TrendingUp, RefreshCw, List, Calendar, Plus, Copy,
  Eye, ShieldCheck, X, Sun, Moon, Star, Sparkles, Server,
  Mail, Gamepad, Settings, Zap, ExternalLink, Info, ArrowRight,
  LayoutDashboard, Pencil
} from 'lucide-react';
import { api } from './api.js';
import { SkeletonPage } from './Skeleton.jsx';

const TEMPLATES = [
  { id: 'web-hosting', name: 'Web Hosting', icon: Globe2, desc: 'Website dengan proxy Cloudflare', type: 'A', ttl: 1, proxied: true, contentLabel: 'IP Server', contentPlaceholder: '192.0.2.1' },
  { id: 'minecraft', name: 'Minecraft Server', icon: Gamepad, desc: 'Server game, DNS only', type: 'A', ttl: 300, proxied: false, contentLabel: 'IP Server', contentPlaceholder: '192.0.2.1' },
  { id: 'api', name: 'API Endpoint', icon: Server, desc: 'API backend dengan proxy', type: 'A', ttl: 60, proxied: true, contentLabel: 'IP Server', contentPlaceholder: '192.0.2.1' },
  { id: 'mail', name: 'Mail Server', icon: Mail, desc: 'Mail exchange record', type: 'MX', ttl: 3600, proxied: false, contentLabel: 'Mail Server', contentPlaceholder: 'mail.example.com', priority: 10 },
  { id: 'custom', name: 'Custom', icon: Settings, desc: 'Isi manual dari awal', type: 'A', ttl: 1, proxied: true, contentLabel: 'Content', contentPlaceholder: '192.0.2.1' }
];

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

export default function UserDashboardApp() {
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

  return <UserDashboard me={state.me} onLogout={handleLogout} />;
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

function OnboardingTour({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: Sparkles, title: 'Selamat Datang!', desc: 'Dashboard pribadi kamu. Buat dan kelola subdomain dari sini.' },
    { icon: Plus, title: 'Buat Subdomain Baru', desc: 'Klik "Buka" untuk bikin subdomain baru dengan template atau manual.' },
    { icon: Pencil, title: 'Edit Kapan Saja', desc: 'Klik ikon pensil untuk update content, TTL, atau proxied tanpa perlu hapus.' },
    { icon: Star, title: 'Tandai Favorit', desc: 'Klik ikon bintang untuk menyimpan ke halaman Favorites.' }
  ];
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="tour-overlay">
      <div className="tour-modal">
        <div className="tour-icon-wrap"><Icon size={32} /></div>
        <div className="tour-step-indicator">
          {steps.map((_, i) => <span key={i} className={`tour-dot ${i === step ? 'active' : ''}`} />)}
        </div>
        <h2>{current.title}</h2>
        <p>{current.desc}</p>
        <div className="tour-actions">
          <button className="btn btn-ghost" onClick={onClose}>Lewati</button>
          {!isLast ? (
            <button className="btn btn-mint" onClick={() => setStep(s => s + 1)}>Lanjut <ArrowRight size={14} /></button>
          ) : (
            <button className="btn btn-mint" onClick={onClose}><CheckCircle2 size={14} /> Mulai</button>
          )}
        </div>
      </div>
    </div>
  );
}

function describeExpiry(ms) {
  if (ms < 3600000) return 'habis dalam kurang dari 1 jam';
  if (ms < 86400000) return 'habis dalam ' + Math.floor(ms / 3600000) + ' jam';
  return 'habis dalam ' + Math.ceil(ms / 86400000) + ' hari';
}

function UserDashboard({ me: initialMe, onLogout }) {
  const [me, setMe] = useState(initialMe);
  const [items, setItems] = useState([]);
  const [domains, setDomains] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [favLoading, setFavLoading] = useState(null);
  const [dnsOpen, setDnsOpen] = useState(null);
  const [dnsResult, setDnsResult] = useState({});
  const [dnsLoading, setDnsLoading] = useState(null);
  const [showTour, setShowTour] = useState(false);
  const [toast, setToast] = useState(null);
  const { theme, toggle } = useTheme();
  const handleLogoClick = useSecretLogo('/');

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const loadAll = async () => {
    setLoading(true);
    const [meRes, listRes, domRes, blRes] = await Promise.all([
      api.get('/api/user/me'),
      api.get('/api/user/subdomains'),
      api.get('/api/domains'),
      api.get('/api/blacklist')
    ]);
    if (meRes && meRes.code) setMe(meRes);
    else { window.location.href = '/login.html'; return; }
    setItems(Array.isArray(listRes) ? listRes : []);
    setDomains(Array.isArray(domRes) ? domRes : []);
    setBlacklist(blRes?.names || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    if (!localStorage.getItem('sf_onboarded')) setTimeout(() => setShowTour(true), 500);
  }, []);

  const closeTour = () => {
    localStorage.setItem('sf_onboarded', '1');
    setShowTour(false);
  };

  const remove = async (s) => {
    const full = `${s.subdomain}.${s.domain}`;
    if (!confirm(`Hapus subdomain "${full}"?`)) return;
    setDeleting(s.id);
    const res = await api.del(`/api/user/subdomains/${s.id}`);
    setDeleting(null);
    if (res.success) { showToast('Subdomain dihapus', 'success'); loadAll(); }
    else showToast(res.error || 'Gagal hapus', 'error');
  };

  const toggleFav = async (s) => {
    if (favLoading === s.id) return;
    setFavLoading(s.id);
    try {
      const res = await api.post(`/api/user/subdomains/${s.id}/favorite`, {});
      if (!res || res.error) {
        showToast(res?.error || 'Gagal menyimpan favorit', 'error');
        setFavLoading(null);
        return;
      }
      setItems(prev => prev.map(it =>
        it.id === s.id ? { ...it, favorited: res.favorited ? 1 : 0 } : it
      ));
      showToast(res.favorited ? 'Ditambahkan ke favorit' : 'Dihapus dari favorit', 'success');
    } catch (err) {
      showToast('Gagal: ' + err.message, 'error');
    }
    setFavLoading(null);
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
      loadAll();
    } else {
      showToast(res.error || 'Gagal update', 'error');
    }
  };

  if (loading) {
    return <SkeletonPage />;
  }

  const usageText = me?.max_usage ? `${me.usage_count} / ${me.max_usage}` : `${me?.usage_count || 0} (unlimited)`;
  const favCount = items.filter(i => i.favorited).length;

  return (
    <div className="app">
      {showTour && <OnboardingTour onClose={closeTour} />}

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
        <UserNav active="dashboard" />

        {me && me.expires_in_ms !== null && me.expires_in_ms !== undefined && me.expires_in_ms > 0 && me.expires_in_ms < 3 * 86400000 && (
          <div className={'alert ' + (me.expires_in_ms < 86400000 ? 'alert-err' : 'alert-info')} style={{ marginBottom: 16 }}>
            <Clock size={16} /> Kode kamu {describeExpiry(me.expires_in_ms)}. Semua subdomain dari kode ini ikut dihapus saat kode kedaluwarsa. Hubungi admin untuk memperpanjang.
          </div>
        )}

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <User size={22} />
            <h1>Dashboard Saya</h1>
          </div>

          <div className="stat-mini-grid">
            <div className="stat-mini stat-mint">
              <div className="stat-mini-icon"><Key size={16} /></div>
              <div>
                <div className="stat-mini-label">Kode</div>
                <div className="stat-mini-value mono">{me?.code}</div>
              </div>
            </div>
            <div className="stat-mini stat-blue">
              <div className="stat-mini-icon"><TrendingUp size={16} /></div>
              <div>
                <div className="stat-mini-label">Dipakai</div>
                <div className="stat-mini-value">{usageText}</div>
              </div>
            </div>
            <div className="stat-mini stat-yellow">
              <div className="stat-mini-icon"><Globe size={16} /></div>
              <div>
                <div className="stat-mini-label">Subdomain</div>
                <div className="stat-mini-value">{items.length}</div>
              </div>
            </div>
            <div className="stat-mini stat-lav">
              <div className="stat-mini-icon"><Calendar size={16} /></div>
              <div>
                <div className="stat-mini-label">Kadaluarsa</div>
                <div className="stat-mini-value" style={{ fontSize: 13 }}>
                  {me?.expires_at ? new Date(me.expires_at).toLocaleDateString('id-ID') : 'Tidak ada'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Plus size={22} />
              <h1>Buat Subdomain Baru</h1>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(v => !v)}>
              {showForm ? <><X size={14} /> Tutup</> : <><Plus size={14} /> Buka</>}
            </button>
          </div>

          {!showForm ? (
            <div className="empty" style={{ padding: '24px 20px' }}>Klik "Buka" untuk mulai membuat subdomain baru.</div>
          ) : (
            <CreateForm code={me?.code} me={me} domains={domains} blacklist={blacklist} onCreated={() => { loadAll(); setShowForm(false); }} />
          )}
        </div>

        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <List size={22} />
              <h1>Subdomain Saya ({items.length})</h1>
              {favCount > 0 && (
                <a href="/favorites.html" className="chip chip-ok" style={{ cursor: 'pointer' }}>
                  <Star size={12} fill="currentColor" /> {favCount} favorit
                </a>
              )}
            </div>
            <button className="btn btn-sm btn-ghost" onClick={loadAll}><RefreshCw size={14} /> Refresh</button>
          </div>

          {items.length === 0 ? (
            <div className="empty">Belum ada subdomain. Buat yang pertama di atas.</div>
          ) : (
            <div className="list">
              {items.map(s => {
                const isFav = s.favorited === 1 || s.favorited === true;
                const isFavLoading = favLoading === s.id;
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
                                className={`fav-btn ${isFav ? 'active' : ''} ${isFavLoading ? 'loading' : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleFav(s); }}
                                disabled={isFavLoading}
                                title={isFav ? 'Hapus dari favorit' : 'Tandai favorit'}
                              >
                                {isFavLoading ? <Loader2 className="spin" size={12} /> : <Star size={14} fill={isFav ? 'currentColor' : 'none'} />}
                              </button>
                              <Globe size={14} />
                              <span className="mono">{s.subdomain}.{s.domain}</span>
                              <span className="chip">{s.type}</span>
                              {s.proxied ? <span className="chip chip-ok">proxied</span> : null}
                              {s.suspended ? <span className="chip chip-off">disuspend</span> : null}
                              {isFav && <span className="chip chip-fav"><Star size={10} fill="currentColor" /> Favorit</span>}
                            </div>
                            <div className="list-item-sub">{s.content} - TTL {s.ttl} - {new Date(s.created_at).toLocaleString('id-ID')}</div>
                            {s.suspended ? <div className="list-item-sub">Disuspend admin{s.suspend_reason ? ': ' + s.suspend_reason : ''}</div> : null}
                          </div>
                          <div className="actions">
                            <button className="icon-btn" title="Edit" disabled={!!s.suspended} onClick={() => setEditing(s.id)}>
                              <Pencil size={14} />
                            </button>
                            <a className="icon-btn" href={`https://${s.subdomain}.${s.domain}`} target="_blank" rel="noopener noreferrer" title="Buka di tab baru">
                              <ExternalLink size={14} />
                            </a>
                            <button className="icon-btn" title="Cek DNS" onClick={() => checkDns(s)} disabled={dnsLoading === s.id}>
                              {dnsLoading === s.id ? <Loader2 className="spin" size={14} /> : <Radio size={14} />}
                            </button>
                            <button className="icon-btn danger" title="Hapus" onClick={() => remove(s)} disabled={deleting === s.id}>
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
  const [content, setContent] = useState(
    item.type === 'CAA' || item.type === 'SRV'
      ? item.content
      : item.content
  );
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
          <div className="preview-row">
            <span className="preview-label">Nama</span>
            <span className="preview-value mono">{fullName}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Type</span>
            <span className="preview-value mono">{item.type}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">Value Baru</span>
            <span className="preview-value mono">{previewValue()}</span>
          </div>
          <div className="preview-row">
            <span className="preview-label">TTL Baru</span>
            <span className="preview-value mono">{ttl === 1 || ttl === '1' ? 'Auto' : `${ttl} detik`}</span>
          </div>
          {['A', 'AAAA', 'CNAME'].includes(item.type) && (
            <div className="preview-row">
              <span className="preview-label">Proxy</span>
              <span className="preview-value">
                <span className={`chip ${proxied ? 'chip-ok' : 'chip-off'}`}>
                  {proxied ? 'Aktif' : 'Nonaktif'}
                </span>
              </span>
            </div>
          )}
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
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Isi value baru"
          autoFocus
        />
        {isComplex && (
          <span className="field-hint">
            Format JSON. Contoh CAA: {'{"flags":0,"tag":"issue","value":"letsencrypt.org"}'}
          </span>
        )}
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

function CreateForm({ code, me, domains, blacklist, onCreated }) {
  const [templateId, setTemplateId] = useState('web-hosting');
  const [domainId, setDomainId] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [type, setType] = useState('A');
  const [content, setContent] = useState('');
  const [ttl, setTtl] = useState(1);
  const [proxied, setProxied] = useState(true);
  const [priority, setPriority] = useState(10);
  const [srv, setSrv] = useState({ priority: 10, weight: 0, port: 443, target: '' });
  const [caa, setCaa] = useState({ flags: 0, tag: 'issue', value: '' });
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dnsResult, setDnsResult] = useState(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  useEffect(() => { applyTemplate(templateId); }, [templateId]);

  const applyTemplate = (id) => {
    const t = TEMPLATES.find(x => x.id === id);
    if (!t) return;
    setType(t.type); setTtl(t.ttl); setProxied(t.proxied);
    if (t.priority !== undefined) setPriority(t.priority);
  };

  const subLower = subdomain.trim().toLowerCase();
  const isBlacklistedName = subLower && blacklist.includes(subLower);

  const buildPayload = () => ({
    code: code.trim(), domainId: Number(domainId), subdomain: subLower,
    type, content: content.trim(), ttl: Number(ttl), proxied, priority: Number(priority), srv, caa
  });

  const handlePreview = (e) => {
    e.preventDefault();
    if (isBlacklistedName) return;
    setShowPreview(true);
    setResult(null);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setShowPreview(false);
    const res = await api.post('/api/subdomain', buildPayload());
    if (res.success) {
      const r = res.record || {};
      const chosenDomain = domains.find(d => d.id === Number(domainId));
      const value = (r.type === 'CAA' || r.type === 'SRV') ? JSON.stringify(r.data || {}) : (r.content || '');
      setResult({ ok: true, name: r.name || `${subdomain}.${chosenDomain?.name || ''}`, type: r.type || type, value });
      setSubdomain('');
      setContent('');
    } else {
      setResult({ ok: false, msg: res.error || 'Gagal membuat subdomain' });
    }
    setLoading(false);
  };

  const resetAll = () => {
    setResult(null); setShowPreview(false); setCopied(false); setDnsResult(null);
    setDomainId(''); setSubdomain(''); setContent(''); setTemplateId('web-hosting');
  };

  const copyResult = () => {
    if (!result || !result.ok) return;
    const text = `Nama: ${result.name}\nType: ${result.type}\nValue: ${result.value}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const checkDns = async () => {
    if (!result?.ok) return;
    setDnsLoading(true);
    setDnsResult(null);
    const res = await api.post('/api/dns/check', { name: result.name, type: result.type });
    setDnsLoading(false);
    setDnsResult(res);
  };

  const domainOptions = me?.allowed_domains ? domains.filter(d => me.allowed_domains.includes(d.name)) : domains;

  const previewValue = () => {
    if (type === 'CAA') return `flags=${caa.flags} tag=${caa.tag} value=${caa.value}`;
    if (type === 'SRV') return `priority=${srv.priority} weight=${srv.weight} port=${srv.port} target=${srv.target}`;
    return content;
  };

  const chosenDomain = domains.find(d => d.id === Number(domainId));
  const fullDomain = subLower && chosenDomain ? `${subLower}.${chosenDomain.name}` : '';
  const currentTemplate = TEMPLATES.find(t => t.id === templateId);

  if (result?.ok) {
    return (
      <div>
        <div className="result-box">
          <div className="result-header"><CheckCircle2 size={20} /><span>DNS record berhasil dibuat</span></div>
          <p className="result-note">Simpan data ini kalau perlu.</p>
          <div className="result-rows">
            <div className="result-row"><span className="result-label">Nama</span><span className="result-value mono">{result.name}</span></div>
            <div className="result-row"><span className="result-label">Type</span><span className="result-value mono">{result.type}</span></div>
            <div className="result-row"><span className="result-label">Value</span><span className="result-value mono">{result.value}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm btn-ghost" onClick={copyResult}>
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              {copied ? 'Tersalin' : 'Copy'}
            </button>
            <button type="button" className="btn btn-sm btn-blue" onClick={checkDns} disabled={dnsLoading}>
              {dnsLoading ? <Loader2 className="spin" size={14} /> : <Radio size={14} />}
              {dnsLoading ? 'Mengecek...' : 'Cek DNS Propagation'}
            </button>
            <a className="btn btn-sm btn-lav" href={`https://${result.name}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Buka
            </a>
          </div>
        </div>

        {dnsResult && (
          <div className={`dns-result ${dnsResult.answers?.length > 0 ? 'dns-ok' : 'dns-pending'}`}>
            <div className="dns-header">
              {dnsResult.answers?.length > 0 ? (
                <><CheckCircle2 size={18} /> <span>DNS sudah aktif ({dnsResult.answers.length} record)</span></>
              ) : (
                <><Clock size={18} /> <span>DNS belum propagate ({dnsResult.statusText})</span></>
              )}
            </div>
            {dnsResult.answers?.length > 0 && (
              <div className="dns-answers">
                {dnsResult.answers.map((a, i) => (
                  <div className="dns-answer" key={i}>
                    <span className="mono">{a.type}</span>
                    <span className="dns-data mono">{a.data}</span>
                    <span className="dns-ttl">TTL {a.ttl}</span>
                  </div>
                ))}
              </div>
            )}
            {dnsResult.answers?.length === 0 && <p className="dns-note">Record belum terdeteksi. Coba lagi dalam 1-5 menit.</p>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-mint" onClick={resetAll}><Plus size={14} /> Buat Lagi</button>
          <button className="btn btn-ghost" onClick={() => { resetAll(); onCreated(); }}>
            <CheckCircle2 size={14} /> Selesai
          </button>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return (
      <div>
        <div className="alert alert-info"><Info size={18} /> Periksa kembali data di bawah sebelum konfirmasi.</div>

        <div className="site-preview">
          <div className="site-preview-bar">
            <div className="site-dot" /><div className="site-dot" /><div className="site-dot" />
            <div className="site-url"><ShieldCheck size={12} /> https:
          </div>
          <div className="site-preview-body">
            <div className="site-preview-icon"><Globe2 size={28} /></div>
            <div className="site-preview-domain">{fullDomain}</div>
            <div className="site-preview-desc">
              Setelah DNS aktif, alamat di atas akan mengarah ke server kamu
              {proxied && ['A', 'AAAA', 'CNAME'].includes(type) ? ' melalui proxy Cloudflare' : ''}.
            </div>
            <div className="site-preview-chips">
              <span className="chip">{type}</span>
              {proxied && ['A', 'AAAA', 'CNAME'].includes(type) && <span className="chip chip-ok">proxied</span>}
              <span className="chip">{ttl === 1 || ttl === '1' ? 'TTL Auto' : `TTL ${ttl}`}</span>
            </div>
          </div>
        </div>

        <div className="preview-box">
          <div className="preview-row"><span className="preview-label">Nama Lengkap</span><span className="preview-value mono">{fullDomain}</span></div>
          <div className="preview-row"><span className="preview-label">Tipe Record</span><span className="preview-value mono">{type}</span></div>
          <div className="preview-row"><span className="preview-label">Value</span><span className="preview-value mono">{previewValue()}</span></div>
          <div className="preview-row"><span className="preview-label">TTL</span><span className="preview-value mono">{ttl === '1' || ttl === 1 ? 'Auto' : `${ttl} detik`}</span></div>
          {['A', 'AAAA', 'CNAME'].includes(type) && (
            <div className="preview-row">
              <span className="preview-label">Proxy</span>
              <span className="preview-value">
                <span className={`chip ${proxied ? 'chip-ok' : 'chip-off'}`}>{proxied ? 'Aktif (oranye)' : 'Nonaktif (DNS only)'}</span>
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-mint" onClick={handleConfirm} disabled={loading}>
            {loading ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
            {loading ? 'Membuat...' : 'Konfirmasi & Buat'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowPreview(false)} disabled={loading}>
            <ArrowLeft size={14} /> Ubah Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handlePreview}>
      <div className="field">
        <label><Zap size={14} /> Template Cepat</label>
        <div className="template-grid">
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button type="button" key={t.id} className={`template-card ${templateId === t.id ? 'active' : ''}`} onClick={() => setTemplateId(t.id)}>
                <div className="template-icon"><Icon size={18} /></div>
                <div className="template-info">
                  <div className="template-name">{t.name}</div>
                  <div className="template-desc">{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label><Globe2 size={14} /> Domain</label>
        <select value={domainId} onChange={(e) => setDomainId(e.target.value)} required>
          <option value="">-- Pilih domain --</option>
          {domainOptions.map((d) => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
        </select>
        {me?.allowed_domains && <span className="field-hint">Kode ini hanya boleh untuk {me.allowed_domains.length} domain tertentu.</span>}
      </div>

      <div className="row">
        <div className="field">
          <label><Globe size={14} /> Subdomain</label>
          <input type="text" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase())} placeholder="myapp" required />
          {fullDomain && !isBlacklistedName && <span className="field-hint">Jadi: <strong>{fullDomain}</strong></span>}
          {isBlacklistedName && (
            <span className="field-hint" style={{ color: '#B91C1C', fontWeight: 700 }}>
              Nama "{subLower}" di-blacklist (reserved sistem)
            </span>
          )}
        </div>
        <div className="field">
          <label><Layers size={14} /> Tipe Record</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="A">A</option>
            <option value="AAAA">AAAA</option>
            <option value="CNAME">CNAME</option>
            <option value="TXT">TXT</option>
            <option value="MX">MX</option>
            <option value="NS">NS</option>
            <option value="CAA">CAA</option>
            <option value="SRV">SRV</option>
          </select>
        </div>
      </div>

      {['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'MX'].includes(type) && (
        <div className="field">
          <label>{currentTemplate?.contentLabel || (type === 'MX' ? 'Mail Server' : 'Content / Target')}</label>
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={currentTemplate?.contentPlaceholder || (type === 'A' ? '192.0.2.1' : type === 'AAAA' ? '2001:db8::1' : type === 'CNAME' ? 'target.example.com' : type === 'MX' ? 'mail.example.com' : type === 'NS' ? 'ns1.example.com' : 'TXT value')}
            required />
        </div>
      )}

      {type === 'MX' && (
        <div className="field">
          <label>Priority</label>
          <input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} min="0" max="65535" />
        </div>
      )}

      {type === 'CAA' && (
        <div className="row">
          <div className="field"><label>Flags</label><input type="number" value={caa.flags} onChange={(e) => setCaa({ ...caa, flags: e.target.value })} min="0" max="255" /></div>
          <div className="field">
            <label>Tag</label>
            <select value={caa.tag} onChange={(e) => setCaa({ ...caa, tag: e.target.value })}>
              <option value="issue">issue</option><option value="issuewild">issuewild</option><option value="iodef">iodef</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Value</label>
            <input type="text" value={caa.value} onChange={(e) => setCaa({ ...caa, value: e.target.value })} placeholder="letsencrypt.org" />
          </div>
        </div>
      )}

      {type === 'SRV' && (
        <div className="row">
          <div className="field"><label>Priority</label><input type="number" value={srv.priority} onChange={(e) => setSrv({ ...srv, priority: e.target.value })} /></div>
          <div className="field"><label>Weight</label><input type="number" value={srv.weight} onChange={(e) => setSrv({ ...srv, weight: e.target.value })} /></div>
          <div className="field"><label>Port</label><input type="number" value={srv.port} onChange={(e) => setSrv({ ...srv, port: e.target.value })} /></div>
          <div className="field"><label>Target</label><input type="text" value={srv.target} onChange={(e) => setSrv({ ...srv, target: e.target.value })} placeholder="srv.example.com" /></div>
        </div>
      )}

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
        {['A', 'AAAA', 'CNAME'].includes(type) && (
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

      <button className="btn btn-full btn-mint" type="submit" disabled={isBlacklistedName}>
        <Eye size={16} /> Preview & Buat
      </button>
    </form>
  );
}
