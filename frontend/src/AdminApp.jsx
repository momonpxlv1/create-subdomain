/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */




import { useState, useEffect, useRef } from 'react';
import {
  Shield, User, Lock, Loader2, AlertCircle, ArrowLeft,
  LayoutDashboard, Key, Server, List, Plus, Tag, RefreshCw,
  Copy, CheckCircle2, Trash2, Globe2, Globe, Clock, TrendingUp,
  LogOut, Menu, X, Activity, Sun, Moon, BarChart3, Hash, Power,
  Database, ShieldAlert, RotateCcw, Calendar, Wifi, WifiOff, Gauge,
  Search, Filter, Sparkles, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { api } from './api.js';
import { SkeletonStats, SkeletonList } from './Skeleton.jsx';

export default function AdminApp() {
  const [token, setTokenState] = useState(null); 

  useEffect(() => {
    const saved = localStorage.getItem('sf_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  useEffect(() => {
    localStorage.removeItem('sf_token');
    api.get('/api/admin/me')
      .then((r) => setTokenState(r && r.admin ? 'ok' : ''))
      .catch(() => setTokenState(''));
  }, []);

  const setToken = (t) => setTokenState(t ? 'ok' : '');

  const goHome = () => { window.location.href = '/'; };

  if (token === null) return null;
  if (!token) return <AdminLogin setToken={setToken} goHome={goHome} />;

  return <AdminDashboard token={token} onLogout={async () => { try { await api.post('/api/admin/logout', {}); } catch {} setToken(''); goHome(); }} goHome={goHome} />;
}

function useTheme() {
  const [theme, setTheme] = useState(localStorage.getItem('sf_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sf_theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return { theme, toggle };
}

function AdminLogin({ setToken, goHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, toggle } = useTheme();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await api.post('/api/admin/login', { username, password });
    setLoading(false);
    if (res.success) setToken('ok');
    else setError(res.error || 'Login gagal');
  };

  return (
    <div className="admin-login-page">
      <button className="theme-toggle-floating" onClick={toggle} title="Ganti tema">
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon"><Shield size={22} /></div>
          <div>
            <h1>Admin Panel</h1>
            <p>Login untuk mengelola SubForge</p>
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label><User size={14} /> Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus required />
          </div>
          <div className="field">
            <label><Lock size={14} /> Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required />
          </div>
          {error && <div className="alert alert-err"><AlertCircle size={16} /> {error}</div>}
          <button className="btn btn-full btn-lav" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <Lock size={16} />}
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <button className="btn btn-full btn-ghost" style={{ marginTop: 10 }} onClick={goHome}>
          <ArrowLeft size={16} /> Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}


const uiBus = new Set();
const uiEmit = (e) => uiBus.forEach(fn => fn(e));
function askConfirm(message, opts) {
  return new Promise((resolve) => uiEmit({ kind: 'confirm', message, opts: opts || {}, resolve }));
}
function askPrompt(message, defaultValue) {
  return new Promise((resolve) => uiEmit({ kind: 'prompt', message, defaultValue: defaultValue || '', resolve }));
}
function notify(message, type) {
  uiEmit({ kind: 'toast', message, type: type || 'info' });
}

function DialogHost() {
  const [dlg, setDlg] = useState(null);
  const [value, setValue] = useState('');
  const [toasts, setToasts] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (e.kind === 'toast') {
        const id = Date.now() + Math.random();
        setToasts(t => t.concat([{ id, message: e.message, type: e.type }]));
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
      } else {
        setDlg(e);
        setValue(e.defaultValue || '');
      }
    };
    uiBus.add(fn);
    return () => { uiBus.delete(fn); };
  }, []);

  useEffect(() => {
    if (dlg && dlg.kind === 'prompt') {
      setTimeout(() => { if (inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, 30);
    }
  }, [dlg]);

  const cancelValue = dlg && dlg.kind === 'prompt' ? null : false;
  const close = (result) => {
    if (dlg) dlg.resolve(result);
    setDlg(null);
  };

  useEffect(() => {
    if (!dlg) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(cancelValue); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dlg]);

  const danger = !!(dlg && dlg.kind === 'confirm' && (dlg.opts.danger || /^(Hapus|Reset|Blokir)/.test(dlg.message)));

  return (
    <>
      {dlg && (
        <div className="ui-backdrop" onMouseDown={() => close(cancelValue)}>
          <div className="ui-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ui-dialog-title">
              {danger ? <ShieldAlert size={18} /> : <AlertCircle size={18} />}
              <span>{dlg.kind === 'prompt' ? 'Input' : 'Konfirmasi'}</span>
            </div>
            <div className="ui-dialog-msg">{dlg.message}</div>
            {dlg.kind === 'prompt' && (
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); close(value); } }}
              />
            )}
            <div className="ui-dialog-actions">
              <button className="btn btn-sm btn-ghost" autoFocus={danger} onClick={() => close(cancelValue)}>Batal</button>
              <button
                className={'btn btn-sm ' + (danger ? 'btn-pink' : 'btn-mint')}
                autoFocus={dlg.kind === 'confirm' && !danger}
                onClick={() => close(dlg.kind === 'prompt' ? value : true)}
              >
                {dlg.kind === 'prompt' ? 'OK' : (danger ? 'Ya, lanjutkan' : 'Lanjutkan')}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="ui-toasts">
        {toasts.map(t => <div key={t.id} className={'ui-toast ' + t.type}>{t.message}</div>)}
      </div>
    </>
  );
}


function Sparkline({ values }) {
  const max = Math.max(...values, 1);
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n === 1 ? 50 : (i / (n - 1)) * 100;
    const y = 22 - (v / max) * 20;
    return x.toFixed(1) + ',' + y.toFixed(1);
  });
  return (
    <svg className="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polygon className="area" points={'0,24 ' + pts.join(' ') + ' 100,24'} />
      <polyline points={pts.join(' ')} />
    </svg>
  );
}


function CommandPalette({ open, onClose, tabs, onGo, token }) {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const [subs, setSubs] = useState([]);
  const [codes, setCodes] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setIdx(0);
    setSubs([]);
    api.get('/api/admin/codes', token).then(r => setCodes(Array.isArray(r) ? r : []));
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 30);
  }, [open]);

  useEffect(() => {
    if (!open || q.trim().length < 2) { setSubs([]); return undefined; }
    const t = setTimeout(() => {
      api.get('/api/admin/subdomains?search=' + encodeURIComponent(q.trim()), token)
        .then(r => setSubs(Array.isArray(r) ? r.slice(0, 6) : []));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  const needle = q.trim().toLowerCase();
  const items = [];
  tabs.filter(t => !needle || t.label.toLowerCase().includes(needle)).forEach(t => {
    items.push({ id: 'tab-' + t.key, group: 'Menu', label: t.label, hint: '', icon: t.icon, run: () => onGo(t.key, '') });
  });
  if (needle.length >= 2) {
    codes
      .filter(c => String(c.code).toLowerCase().includes(needle) || String(c.label || '').toLowerCase().includes(needle))
      .slice(0, 5)
      .forEach(c => items.push({ id: 'code-' + c.id, group: 'Kode', label: c.code, hint: c.label || '', icon: Key, run: () => onGo('codes', '') }));
    subs.forEach(s => items.push({
      id: 'sub-' + s.id,
      group: 'Subdomain',
      label: s.subdomain + '.' + s.domain,
      hint: s.type + (s.suspended ? ' - disuspend' : ''),
      icon: Globe,
      run: () => onGo('subdomains', s.subdomain)
    }));
  }
  const safeIdx = Math.min(idx, Math.max(items.length - 1, 0));

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(Math.min(safeIdx + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(Math.max(safeIdx - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[safeIdx]) items[safeIdx].run(); }
  };

  let lastGroup = '';
  return (
    <div className="ui-backdrop palette-backdrop" onMouseDown={onClose}>
      <div className="palette" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search size={18} />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Cari menu, kode, atau subdomain..."
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list">
          {items.length === 0 && <div className="empty">Tidak ada hasil.</div>}
          {items.map((it, i) => {
            const Icon = it.icon;
            const showGroup = it.group !== lastGroup;
            lastGroup = it.group;
            return (
              <div key={it.id}>
                {showGroup && <div className="palette-group">{it.group}</div>}
                <button
                  className={'palette-item' + (i === safeIdx ? ' active' : '')}
                  onMouseEnter={() => setIdx(i)}
                  onClick={it.run}
                >
                  <Icon size={16} />
                  <span className="palette-label">{it.label}</span>
                  {it.hint ? <span className="palette-hint">{it.hint}</span> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="palette-footer">
          <span><kbd>Up</kbd> <kbd>Down</kbd> pilih</span>
          <span><kbd>Enter</kbd> buka</span>
          <span><kbd>Ctrl</kbd> <kbd>K</kbd> tutup</span>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ token, onLogout, goHome }) {
  const [tab, setTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sf_admin_collapsed') === '1'; } catch (e) { return false; }
  });
  const [summary, setSummary] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const { theme, toggle } = useTheme();

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('sf_admin_collapsed', c ? '0' : '1'); } catch (e) 
      return !c;
    });
  };

  useEffect(() => {
    api.get('/api/admin/summary', token).then((r) => { if (r && !r.error) setSummary(r); });
  }, [tab]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'codes', label: 'Kode Unik', icon: Key },
    { key: 'domains', label: 'Domain', icon: Server },
    { key: 'subdomains', label: 'Subdomain', icon: List },
    { key: 'status', label: 'Status', icon: Wifi },
    { key: 'sync', label: 'Sinkronisasi', icon: RefreshCw },
    { key: 'logs', label: 'Log Aktivitas', icon: Activity }
  ];

  const badgeFor = (key) => {
    if (!summary) return null;
    if (key === 'codes') {
      const n = (summary.expiring || 0) + (summary.expired || 0);
      return n > 0 ? { n, kind: 'warn' } : null;
    }
    if (key === 'subdomains') return summary.suspendedSubs > 0 ? { n: summary.suspendedSubs, kind: 'err' } : null;
    return null;
  };

  const goTo = (key, search) => {
    if (key === 'subdomains') setSubSearch(search || '');
    setTab(key);
    setMobileMenuOpen(false);
    setPaletteOpen(false);
  };
  const handleTabChange = (key) => goTo(key, '');

  return (
    <div className="admin-layout">
      <aside className={'admin-sidebar' + (mobileMenuOpen ? ' open' : '') + (collapsed ? ' collapsed' : '')}>
        <div className="admin-brand">
          <div className="logo-icon"><Shield size={20} /></div>
          <div className="admin-brand-text">
            <span className="admin-brand-title">SubForge</span>
            <span className="admin-brand-sub">Admin Panel</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)}><X size={18} /></button>
        </div>

        <nav className="admin-nav">
          {tabs.map(t => {
            const Icon = t.icon;
            const b = badgeFor(t.key);
            return (
              <button
                key={t.key}
                className={'admin-nav-item' + (tab === t.key ? ' active' : '')}
                onClick={() => handleTabChange(t.key)}
                title={t.label}
              >
                <Icon size={18} />
                <span>{t.label}</span>
                {b ? <em className={'nav-badge ' + b.kind}>{b.n}</em> : null}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item" onClick={goHome} title="Beranda">
            <ArrowLeft size={18} />
            <span>Beranda</span>
          </button>
          <button className="admin-nav-item danger" onClick={onLogout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          <button className="admin-nav-item sidebar-collapse-btn" onClick={toggleCollapsed} title={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'}>
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            <span>Ciutkan menu</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && <div className="admin-backdrop" onClick={() => setMobileMenuOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <h2>{tabs.find(t => t.key === tab)?.label}</h2>
          <div className="admin-topbar-right">
            <button className="search-trigger" onClick={() => setPaletteOpen(true)} title="Cari (Ctrl+K)">
              <Search size={16} />
              <span>Cari...</span>
              <kbd>Ctrl K</kbd>
            </button>
            <button className="theme-toggle-btn" onClick={toggle} title="Ganti tema">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <span className="chip chip-ok"><Shield size={12} /> Admin</span>
          </div>
        </header>

        <div className="admin-content">
          {tab === 'overview' && <OverviewTab token={token} setTab={goTo} summary={summary} />}
          {tab === 'codes' && <CodesTab token={token} />}
          {tab === 'domains' && <DomainsTab token={token} />}
          {tab === 'subdomains' && <SubdomainsTab key={'sub-' + subSearch} token={token} initialSearch={subSearch} />}
          {tab === 'status' && <StatusTab token={token} />}
          {tab === 'sync' && <SyncTab token={token} />}
          {tab === 'logs' && <LogsTab token={token} />}
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} tabs={tabs} onGo={goTo} token={token} />
      <DialogHost />
    </div>
  );
}


function OverviewTab({ token, setTab, summary }) {
  const [stats, setStats] = useState(null);
  const [subdomains, setSubdomains] = useState([]);
  const [domains, setDomains] = useState([]);

  useEffect(() => {
    api.get('/api/admin/stats', token).then(setStats);
    api.get('/api/admin/subdomains', token).then(setSubdomains);
    api.get('/api/admin/domains', token).then(setDomains);
  }, []);

  if (!stats) return <SkeletonStats />;

  const { days, topDomains, topTypes, totals } = stats;
  const maxDay = Math.max(...days.map(d => d.count), 1);
  const maxTop = Math.max(...topDomains.map(d => d.c), 1);

  const attention = [];
  if (summary) {
    if (summary.expired > 0) attention.push({ key: 'exp', kind: 'err', icon: Clock, tab: 'codes', text: summary.expired + ' kode sudah kedaluwarsa. Perpanjang atau bersihkan.' });
    if (summary.expiring > 0) attention.push({ key: 'soon', kind: 'warn', icon: Clock, tab: 'codes', text: summary.expiring + ' kode akan kedaluwarsa dalam 3 hari' });
    if (summary.blocked > 0) attention.push({ key: 'blk', kind: 'info', icon: Lock, tab: 'codes', text: summary.blocked + ' kode sedang diblokir' });
    if (summary.suspendedSubs > 0) attention.push({ key: 'sus', kind: 'warn', icon: ShieldAlert, tab: 'subdomains', text: summary.suspendedSubs + ' subdomain sedang disuspend' });
    if (summary.domainsOff > 0) attention.push({ key: 'dom', kind: 'info', icon: Server, tab: 'domains', text: summary.domainsOff + ' domain nonaktif' });
  }

  const statCards = [
    { label: 'Kode Unik', value: totals.codes, icon: Key, color: 'stat-yellow' },
    { label: 'Total Dipakai', value: totals.usageTotal, icon: TrendingUp, color: 'stat-mint' },
    { label: 'Domain Aktif', value: `${totals.domainsActive}/${totals.domainsTotal}`, icon: Server, color: 'stat-blue' },
    { label: 'Subdomain', value: totals.subdomains, icon: Globe, color: 'stat-lav', spark: days.map(d => d.count) }
  ];

  return (
    <div className="overview">
      <div className="stats-grid">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div className={`stat-card ${s.color}`} key={i}>
              <div className="stat-icon"><Icon size={20} /></div>
              <div className="stat-info">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
                {s.spark ? <Sparkline values={s.spark} /> : null}
              </div>
            </div>
          );
        })}
      </div>

      {summary && (
        <div className="section-card">
          <div className="section-header">
            <h3><ShieldAlert size={16} /> Perlu Perhatian</h3>
            <div className="quick-actions">
              <button className="btn btn-sm btn-ghost" onClick={() => setTab('codes')}><Plus size={14} /> Buat kode</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setTab('sync')}><RefreshCw size={14} /> Sinkronisasi</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setTab('status')}><Wifi size={14} /> Status</button>
            </div>
          </div>
          {attention.length === 0 ? (
            <div className="alert alert-ok"><CheckCircle2 size={16} /> Semua aman, tidak ada yang perlu ditindak.</div>
          ) : (
            <div className="attention-list">
              {attention.map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.key} className={'attention-item ' + a.kind} onClick={() => setTab(a.tab)}>
                    <Icon size={18} />
                    <span>{a.text}</span>
                    <ChevronsRight size={14} style={{ marginLeft: 'auto' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="section-card">
        <div className="section-header">
          <h3><BarChart3 size={16} /> Aktivitas 7 Hari Terakhir</h3>
          <span className="list-item-sub">{totals.subdomains} total subdomain</span>
        </div>
        <div className="chart">
          {days.map(d => (
            <div className="chart-col" key={d.date}>
              <div className="chart-bar-wrapper">
                <span className="chart-value">{d.count}</span>
                <div className="chart-bar" style={{ height: `${Math.max((d.count / maxDay) * 100, 4)}%` }} />
              </div>
              <span className="chart-label">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="two-col">
        <div className="section-card">
          <div className="section-header"><h3><Globe2 size={16} /> Top Domain</h3></div>
          {topDomains.length === 0 ? <div className="empty">Belum ada data.</div> : (
            <div className="rank-list">
              {topDomains.map((d, i) => (
                <div className="rank-item" key={d.domain}>
                  <span className="rank-num">{i + 1}</span>
                  <span className="rank-name">{d.domain}</span>
                  <div className="rank-bar-wrapper">
                    <div className="rank-bar" style={{ width: `${(d.c / maxTop) * 100}%` }} />
                  </div>
                  <span className="rank-count">{d.c}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card">
          <div className="section-header"><h3><Hash size={16} /> Tipe Record</h3></div>
          {topTypes.length === 0 ? <div className="empty">Belum ada data.</div> : (
            <div className="type-list">
              {topTypes.map(t => (
                <div className="type-item" key={t.type}>
                  <span className="mono">{t.type}</span>
                  <span className="type-count">{t.c}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h3><Clock size={16} /> Subdomain Terbaru</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setTab('subdomains')}>Lihat semua</button>
        </div>
        {subdomains.length === 0 ? <div className="empty">Belum ada subdomain yang dibuat.</div> : (
          <div className="list">
            {subdomains.slice(0, 5).map(s => (
              <div className="list-item" key={s.id}>
                <div className="list-item-info">
                  <div className="list-item-title">
                    <Globe size={14} />
                    <span className="mono">{s.subdomain}.{s.domain}</span>
                    <span className="chip">{s.type}</span>
                  </div>
                  <div className="list-item-sub">{new Date(s.created_at).toLocaleString('id-ID')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section-card">
        <div className="section-header">
          <h3><Database size={16} /> Status Domain</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setTab('domains')}>Kelola</button>
        </div>
        <div className="list">
          {domains.map(d => (
            <div className="list-item" key={d.id}>
              <div className="list-item-info">
                <div className="list-item-title"><Globe2 size={14} /> {d.name}</div>
                <div className="list-item-sub mono">{d.zone_id}</div>
              </div>
              <span className={`chip ${d.enabled ? 'chip-ok' : 'chip-off'}`}>
                {d.enabled ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function SyncTab({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);

  const scan = async () => {
    setLoading(true);
    const res = await api.get('/api/admin/sync', token);
    setLoading(false);
    if (res && Array.isArray(res.domains)) { setData(res.domains); return true; }
    setMsg({ type: 'err', text: (res && res.error) || 'Gagal scan' });
    return false;
  };

  const act = async (key, url, body) => {
    setBusy(key);
    setMsg(null);
    const res = await api.post(url, body, token);
    if (res && res.success) {
      await scan();
      setMsg({ type: 'ok', text: 'Selesai: ' + (res.removed ?? res.imported ?? 0) + ' diproses, ' + (res.skipped || 0) + ' dilewati' });
    } else {
      setMsg({ type: 'err', text: (res && res.error) || 'Gagal' });
    }
    setBusy('');
  };

  const totalIssues = data
    ? data.reduce((n, d) => n + (d.missingInCf ? d.missingInCf.length : 0) + (d.orphans ? d.orphans.length : 0), 0)
    : 0;

  return (
    <div className="tab-content">
      <div className="section-card">
        <div className="section-header">
          <h3><RefreshCw size={16} /> Sinkronisasi DB dan Cloudflare</h3>
          <button className="btn btn-sm btn-ghost" onClick={scan} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Memindai...' : 'Scan'}
          </button>
        </div>
        <div className="list-item-sub">Bandingkan record di database dengan zona Cloudflare. Scan tidak mengubah apa pun.</div>
        {msg && <div className={'alert ' + (msg.type === 'ok' ? 'alert-ok' : 'alert-err')}>{msg.text}</div>}
      </div>

      {data && data.length > 0 && totalIssues === 0 && !data.some(d => d.error) && (
        <div className="alert alert-ok"><CheckCircle2 size={16} /> Semua sinkron, tidak ada selisih.</div>
      )}

      {data && data.map(d => (
        <div className="section-card" key={d.id}>
          <div className="section-header">
            <h3><Globe2 size={16} /> {d.name}</h3>
            {!d.error && <span className="list-item-sub">Cloudflare: {d.cfTotal} record - DB: {d.dbTotal}</span>}
          </div>

          {d.error && <div className="alert alert-err"><AlertCircle size={16} /> {d.error}</div>}

          {!d.error && d.missingInCf.length === 0 && d.orphans.length === 0 && (
            <div className="list-item-sub">Sinkron.</div>
          )}

          {!d.error && d.missingInCf.length > 0 && (
            <>
              <div className="section-header">
                <h3>Ada di DB, hilang di Cloudflare ({d.missingInCf.length})</h3>
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={!!busy}
                  onClick={async () => {
                    if (await askConfirm('Hapus ' + d.missingInCf.length + ' entri ini dari DB?')) {
                      act('db-all-' + d.id, '/api/admin/sync/db-remove', { ids: d.missingInCf.map(x => x.id) });
                    }
                  }}
                >
                  {busy === 'db-all-' + d.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                  Hapus semua dari DB
                </button>
              </div>
              <div className="list">
                {d.missingInCf.map(x => (
                  <div className="list-item" key={x.id}>
                    <div className="list-item-info">
                      <div className="list-item-title">
                        <span className="mono">{x.name}</span>
                        <span className="chip">{x.type}</span>
                      </div>
                      <div className="list-item-sub">code: {x.code_used || '-'}</div>
                    </div>
                    <button
                      className="icon-btn danger"
                      title="Hapus dari DB"
                      disabled={!!busy}
                      onClick={() => act('db-' + x.id, '/api/admin/sync/db-remove', { ids: [x.id] })}
                    >
                      {busy === 'db-' + x.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {!d.error && d.orphans.length > 0 && (
            <>
              <div className="section-header">
                <h3>Ada di Cloudflare, tidak tercatat di DB ({d.orphans.length})</h3>
              </div>
              <div className="list">
                {d.orphans.map(x => (
                  <div className="list-item" key={x.cfId}>
                    <div className="list-item-info">
                      <div className="list-item-title">
                        <span className="mono">{x.name}</span>
                        <span className="chip">{x.type}</span>
                      </div>
                      <div className="list-item-sub mono">{x.content}</div>
                    </div>
                    <button
                      className="btn btn-sm btn-mint"
                      disabled={!!busy}
                      onClick={() => act('imp-' + x.cfId, '/api/admin/sync/import', { items: [{ domainId: d.id, cfId: x.cfId }] })}
                    >
                      {busy === 'imp-' + x.cfId ? <Loader2 className="spin" size={14} /> : <Plus size={14} />}
                      Impor
                    </button>
                    <button
                      className="icon-btn danger"
                      title="Hapus dari Cloudflare"
                      disabled={!!busy}
                      onClick={async () => {
                        if (await askConfirm('Hapus ' + x.name + ' (' + x.type + ') dari Cloudflare? Tidak bisa dibatalkan.')) {
                          act('cf-' + x.cfId, '/api/admin/sync/cf-remove', { items: [{ domainId: d.id, cfId: x.cfId }] });
                        }
                      }}
                    >
                      {busy === 'cf-' + x.cfId ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}


function StatusTab({ token }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const res = await api.get('/api/admin/status', token);
    setStatus(Array.isArray(res) ? res : []);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <SkeletonList n={4} />;

  const okCount = status.filter(s => s.ok).length;
  const totalCount = status.length;
  const allOk = okCount === totalCount && totalCount > 0;

  return (
    <div className="tab-content">
      <div className="section-card">
        <div className="section-header">
          <h3>{allOk ? <Wifi size={16} /> : <WifiOff size={16} />} Status Cloudflare API</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Memeriksa...' : 'Refresh'}
          </button>
        </div>

        <div className={`status-summary ${allOk ? 'status-summary-ok' : 'status-summary-err'}`}>
          <div className="status-summary-icon">
            {allOk ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
          </div>
          <div>
            <div className="status-summary-title">
              {allOk ? 'Semua API sehat' : `${totalCount - okCount} dari ${totalCount} API bermasalah`}
            </div>
            <div className="status-summary-sub">Diperiksa {new Date().toLocaleTimeString('id-ID')}</div>
          </div>
        </div>

        <div className="status-grid">
          {status.map(s => (
            <div className={`status-card ${s.ok ? 'status-ok' : 'status-err'}`} key={s.id}>
              <div className="status-card-header">
                <div className="status-card-icon">
                  {s.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="status-card-info">
                  <div className="status-card-name">{s.name}</div>
                  <div className="status-card-meta"><Gauge size={11} /> {s.latency}ms</div>
                </div>
                <span className={`chip ${s.enabled ? 'chip-ok' : 'chip-off'}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                  {s.enabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div className="status-card-footer">
                {s.ok ? (
                  <span className="status-badge status-badge-ok">Zona {s.status}</span>
                ) : (
                  <span className="status-badge status-badge-err">{s.error || 'Gagal'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function CodesTab({ token }) {
  const [codes, setCodes] = useState([]);
  const [domains, setDomains] = useState([]);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [maxUsage, setMaxUsage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [allowedDomains, setAllowedDomains] = useState([]);
  const [err, setErr] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [cleaning, setCleaning] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const load = () => {
    api.get('/api/admin/codes', token).then(setCodes);
    api.get('/api/admin/domains', token).then(setDomains);
  };
  useEffect(() => { load(); }, []);

  const generateRandom = () => {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    setCode(`SF-${rand}`);
  };

  const toggleDomain = (name) => {
    setAllowedDomains(prev => prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]);
  };

  const resetForm = () => {
    setCode(''); setLabel(''); setMaxUsage(''); setExpiresAt(''); setAllowedDomains([]); setErr('');
  };

  const add = async (e) => {
    e.preventDefault();
    setErr('');
    const res = await api.post('/api/admin/codes', {
      code: code.trim(),
      label: label.trim(),
      max_usage: maxUsage === '' ? null : Number(maxUsage),
      expires_at: expiresAt === '' ? null : new Date(expiresAt).toISOString(),
      allowed_domains: allowedDomains
    }, token);
    if (res.error) return setErr(res.error);
    resetForm();
    load();
    showToast('Kode ditambahkan', 'success');
  };

  const extend = async (c) => {
    const v = await askPrompt('Perpanjang kode "' + c.code + '" berapa hari? (isi 0 untuk hapus masa berlaku)', '30');
    if (v === null) return;
    const days = Number(v);
    if (!Number.isFinite(days) || days < 0) { showToast('Jumlah hari tidak valid', 'error'); return; }
    const res = await api.post('/api/admin/codes/' + c.id + '/extend', days === 0 ? { unlimited: true } : { days }, token);
    if (res.success) { showToast(days === 0 ? 'Masa berlaku dihapus' : 'Kode diperpanjang', 'success'); load(); }
    else showToast(res.error || 'Gagal', 'error');
  };

  const toggleBlock = async (c) => {
    if (!(await askConfirm((c.blocked ? 'Buka blokir' : 'Blokir') + ' kode "' + c.code + '"?'))) return;
    const res = await api.post('/api/admin/codes/' + c.id + '/block', { blocked: !c.blocked }, token);
    if (res.success) { showToast(c.blocked ? 'Blokir dibuka' : 'Kode diblokir', 'success'); load(); }
    else showToast(res.error || 'Gagal', 'error');
  };

  const resetUsage = async (id, codeStr) => {
    if (!(await askConfirm(`Reset pemakaian kode "${codeStr}" ke 0?`))) return;
    await api.post(`/api/admin/codes/${id}/reset`, {}, token);
    load();
  };

  const remove = async (id) => {
    if (!(await askConfirm('Hapus kode ini?'))) return;
    await api.del(`/api/admin/codes/${id}`, token);
    load();
  };

  const cleanup = async () => {
    if (!(await askConfirm('Hapus semua kode yang sudah kadaluarsa?'))) return;
    setCleaning(true);
    const res = await api.post('/api/admin/codes/cleanup', {}, token);
    setCleaning(false);
    showToast(`${res.deleted || 0} kode expired dihapus`, 'success');
    load();
  };

  const copy = (c, id) => {
    navigator.clipboard.writeText(c);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const isExpired = (exp) => exp && new Date(exp).getTime() < Date.now();
  const expiredCount = codes.filter(c => isExpired(c.expires_at)).length;

  return (
    <div className="tab-content">
      {toast && <div className={`toast toast-${toast.type}`}><CheckCircle2 size={16} /><span>{toast.msg}</span></div>}

      <div className="section-card">
        <h3><Plus size={16} /> Tambah Kode Baru</h3>
        <form onSubmit={add}>
          <div className="row">
            <div className="field">
              <label><Tag size={14} /> Kode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SF-XXXXXX" required />
                <button type="button" className="btn btn-sm" onClick={generateRandom} title="Generate random">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <div className="field">
              <label>Label (opsional)</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Untuk siapa" />
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label><TrendingUp size={14} /> Batas Pemakaian</label>
              <input type="number" value={maxUsage} onChange={(e) => setMaxUsage(e.target.value)} placeholder="Kosongkan untuk unlimited" min="1" />
              <span className="field-hint">Kosong = unlimited. Isi angka misal 5 = cuma bisa dipakai 5x.</span>
            </div>
            <div className="field">
              <label><Calendar size={14} /> Tanggal Kadaluarsa</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              <span className="field-hint">Kosong = tidak pernah kadaluarsa.</span>
            </div>
          </div>

          <div className="field">
            <label><Globe2 size={14} /> Whitelist Domain</label>
            <span className="field-hint" style={{ marginTop: 0, marginBottom: 6 }}>
              Kode hanya boleh dipakai untuk domain yang dipilih. Kosong = semua domain.
            </span>
            <div className="domain-checks">
              {domains.map(d => (
                <label className={`domain-check ${allowedDomains.includes(d.name) ? 'checked' : ''}`} key={d.id}>
                  <input type="checkbox" checked={allowedDomains.includes(d.name)} onChange={() => toggleDomain(d.name)} />
                  <Globe2 size={14} />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>
          </div>

          {err && <div className="alert alert-err"><AlertCircle size={16} />{err}</div>}
          <button className="btn btn-mint" type="submit"><Plus size={14} /> Tambah Kode</button>
        </form>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h3><Key size={16} /> Daftar Kode ({codes.length})</h3>
          {expiredCount > 0 && (
            <button className="btn btn-sm btn-pink" onClick={cleanup} disabled={cleaning}>
              {cleaning ? <Loader2 className="spin" size={14} /> : <Sparkles size={14} />}
              Hapus {expiredCount} expired
            </button>
          )}
        </div>
        {codes.length === 0 ? <div className="empty">Belum ada kode unik.</div> : (
          <div className="list">
            {codes.map(c => {
              const unlimited = c.max_usage === null || c.max_usage === undefined;
              const exhausted = !unlimited && c.usage_count >= c.max_usage;
              const expired = isExpired(c.expires_at);
              return (
                <div className={`list-item ${expired ? 'list-item-expired' : ''}`} key={c.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', width: '100%' }}>
                    <div className="list-item-info">
                      <div className="list-item-title">
                        <span className="mono">{c.code}</span>
                        {c.label && <span className="list-item-sub">- {c.label}</span>}
                        <span className={`chip ${unlimited ? 'chip-ok' : (exhausted ? 'chip-off' : 'chip')}`}>
                          {unlimited ? 'Unlimited' : `${c.usage_count}/${c.max_usage}`}
                        </span>
                        {expired && <span className="chip chip-off">Kadaluarsa</span>}
                         {c.blocked ? <span className="chip chip-off">Diblokir</span> : null}
                        {!expired && c.expires_at && (
                          <span className="chip chip-ok">
                            <Calendar size={10} /> {new Date(c.expires_at).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                      <div className="list-item-sub">Dipakai {c.usage_count}x - {new Date(c.created_at).toLocaleString('id-ID')}</div>
                      {c.allowed_domains && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {c.allowed_domains.map(d => (
                            <span className="chip" key={d} style={{ fontSize: 10, padding: '3px 8px' }}>{d}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="actions">
                      <button className="icon-btn" title="Copy" onClick={() => copy(c.code, c.id)}>
                        {copiedId === c.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </button>
                      <button className="icon-btn" title="Perpanjang" onClick={() => extend(c)}>
                        <Clock size={14} />
                      </button>
                      <button className="icon-btn" title={c.blocked ? 'Buka blokir' : 'Blokir kode'} onClick={() => toggleBlock(c)}>
                        <Lock size={14} />
                      </button>
                      <button className="icon-btn" title="Reset pemakaian" onClick={() => resetUsage(c.id, c.code)}>
                        <RotateCcw size={14} />
                      </button>
                      <button className="icon-btn danger" title="Hapus" onClick={() => remove(c.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function DomainsTab({ token }) {
  const [domains, setDomains] = useState([]);
  const load = () => api.get('/api/admin/domains', token).then(setDomains);
  useEffect(() => { load(); }, []);

  const toggle = async (d) => {
    await api.patch(`/api/admin/domains/${d.id}`, { enabled: !d.enabled }, token);
    load();
  };

  return (
    <div className="tab-content">
      <div className="section-card">
        <div className="section-header">
          <h3><Server size={16} /> Domain ({domains.length})</h3>
          <span className="list-item-sub">Toggle untuk enable/disable</span>
        </div>
        <div className="list">
          {domains.map(d => (
            <div className="list-item" key={d.id}>
              <div className="list-item-info">
                <div className="list-item-title">
                  <Globe2 size={14} /> {d.name}
                  <span className={`chip ${d.enabled ? 'chip-ok' : 'chip-off'}`}>
                    {d.enabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <div className="list-item-sub mono">Zone: {d.zone_id}</div>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={!!d.enabled} onChange={() => toggle(d)} />
                <span className="toggle-track"></span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function SubdomainsTab({ token, initialSearch }) {
  const [items, setItems] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  
  const [search, setSearch] = useState(initialSearch || '');
  const [domain, setDomain] = useState('all');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('newest');

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (domain !== 'all') params.set('domain', domain);
    if (type !== 'all') params.set('type', type);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (sort) params.set('sort', sort);

    const res = await api.get(`/api/admin/subdomains?${params.toString()}`, token);
    setItems(Array.isArray(res) ? res : []);
    setLoading(false);
  };

  useEffect(() => {
    api.get('/api/admin/domains', token).then(d => setDomains(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [search, domain, type, from, to, sort]);

  const resetFilters = () => {
    setSearch(''); setDomain('all'); setType('all'); setFrom(''); setTo(''); setSort('newest');
  };

  const activeFilterCount = [
    search, domain !== 'all' ? domain : '', type !== 'all' ? type : '', from, to, sort !== 'newest' ? sort : ''
  ].filter(Boolean).length;

  const toggleSuspend = async (s) => {
    const full = s.subdomain + '.' + s.domain;
    let body = {};
    if (!s.suspended) {
      const reason = await askPrompt('Suspend "' + full + '". Alasan (opsional):', '');
      if (reason === null) return;
      body = { reason };
    } else if (!(await askConfirm('Pulihkan "' + full + '" ke Cloudflare?'))) {
      return;
    }
    setDeleting(s.id);
    const res = await api.post('/api/admin/subdomains/' + s.id + (s.suspended ? '/unsuspend' : '/suspend'), body, token);
    setDeleting(null);
    if (res.success) load();
    else notify(res.error || 'Gagal', 'error');
  };

  const remove = async (s) => {
    const full = `${s.subdomain}.${s.domain}`;
    if (!(await askConfirm(`Hapus subdomain "${full}"?`))) return;
    setDeleting(s.id);
    const res = await api.del(`/api/admin/subdomains/${s.id}`, token);
    setDeleting(null);
    if (res.success) load();
    else notify(res.error || 'Gagal hapus', 'error');
  };

  const typeOptions = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'CAA', 'SRV'];

  return (
    <div className="tab-content">
      <div className="section-card">
        <div className="section-header">
          <h3><List size={16} /> Subdomain ({items.length})</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${showFilters ? 'btn-mint' : 'btn-ghost'}`}
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter size={14} /> Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <div className="filter-panel-grid">
              <div className="field">
                <label><Search size={14} /> Cari</label>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama / domain / content" />
              </div>
              <div className="field">
                <label><Globe2 size={14} /> Domain</label>
                <select value={domain} onChange={(e) => setDomain(e.target.value)}>
                  <option value="all">Semua domain</option>
                  {domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label><Hash size={14} /> Tipe</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="all">Semua tipe</option>
                  {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label><Calendar size={14} /> Dari Tanggal</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="field">
                <label><Calendar size={14} /> Sampai Tanggal</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="field">
                <label><TrendingUp size={14} /> Urutkan</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  <option value="name">Nama A-Z</option>
                  <option value="name-desc">Nama Z-A</option>
                  <option value="type">Tipe</option>
                </select>
              </div>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={resetFilters}>
              <X size={14} /> Reset Filter
            </button>
          </div>
        )}

        {loading ? (
          <SkeletonList n={4} />
        ) : items.length === 0 ? (
          <div className="empty">Tidak ada subdomain yang cocok.</div>
        ) : (
          <div className="list">
            {items.map(s => (
              <div className="list-item" key={s.id}>
                <div className="list-item-info">
                  <div className="list-item-title">
                    <Globe size={14} />
                    <span className="mono">{s.subdomain}.{s.domain}</span>
                    <span className="chip">{s.type}</span>
                    {s.proxied ? <span className="chip chip-ok">proxied</span> : null}
                    {s.suspended ? <span className="chip chip-off">disuspend</span> : null}
                  </div>
                  <div className="list-item-sub">
                    {s.content} - TTL {s.ttl} - code: {s.code_used} - {new Date(s.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
                <button className="icon-btn" title={s.suspended ? 'Pulihkan' : 'Suspend'} onClick={() => toggleSuspend(s)} disabled={deleting === s.id}>
                  {s.suspended ? <RotateCcw size={14} /> : <ShieldAlert size={14} />}
                </button>
                <button className="icon-btn danger" title="Hapus" onClick={() => remove(s)} disabled={deleting === s.id}>
                  {deleting === s.id ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


const LOG_META = {
  'subdomain.create': { icon: Plus, color: 'log-green', label: 'Buat subdomain' },
  'subdomain.delete': { icon: Trash2, color: 'log-red', label: 'Hapus subdomain' },
  'subdomain.delete_user': { icon: Trash2, color: 'log-red', label: 'Hapus subdomain (user)' },
  'subdomain.update_user': { icon: RotateCcw, color: 'log-yellow', label: 'Edit subdomain (user)' },
  'code.create': { icon: Key, color: 'log-blue', label: 'Buat kode' },
  'code.delete': { icon: Trash2, color: 'log-red', label: 'Hapus kode' },
  'code.reset': { icon: RotateCcw, color: 'log-yellow', label: 'Reset kode' },
  'code.auto_cleanup': { icon: Sparkles, color: 'log-lav', label: 'Auto-cleanup kode' },
  'domain.toggle': { icon: Power, color: 'log-yellow', label: 'Toggle domain' },
  'admin.login': { icon: Lock, color: 'log-lav', label: 'Login admin' },
  'admin.login_fail': { icon: ShieldAlert, color: 'log-red', label: 'Login admin gagal' },
  'user.login': { icon: User, color: 'log-green', label: 'Login user' },
  'user.login_fail': { icon: ShieldAlert, color: 'log-red', label: 'Login user gagal' }
};

function LogsTab({ token }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = () => api.get('/api/admin/logs', token).then(setLogs);
  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter);

  const actionTypes = ['all', 'subdomain.create', 'subdomain.update_user', 'subdomain.delete', 'subdomain.delete_user', 'code.create', 'code.delete', 'code.reset', 'code.auto_cleanup', 'domain.toggle', 'admin.login', 'admin.login_fail', 'user.login', 'user.login_fail'];

  return (
    <div className="tab-content">
      <div className="section-card">
        <div className="section-header">
          <h3><Activity size={16} /> Log Aktivitas ({logs.length})</h3>
          <button className="btn btn-sm btn-ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>

        <div className="filter-row">
          {actionTypes.map(a => (
            <button key={a} className={`filter-chip ${filter === a ? 'active' : ''}`} onClick={() => setFilter(a)}>
              {a === 'all' ? 'Semua' : (LOG_META[a]?.label || a)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? <div className="empty">Belum ada log.</div> : (
          <div className="log-list">
            {filtered.map(l => {
              const meta = LOG_META[l.action] || { icon: Activity, color: 'log-blue', label: l.action };
              const Icon = meta.icon;
              return (
                <div className="log-item" key={l.id}>
                  <div className={`log-icon ${meta.color}`}><Icon size={14} /></div>
                  <div className="log-body">
                    <div className="log-line-1">
                      <span className="log-action">{meta.label}</span>
                      {l.detail && <span className="log-detail">{l.detail}</span>}
                    </div>
                    <div className="log-line-2">
                      <span>{new Date(l.created_at).toLocaleString('id-ID')}</span>
                      <span className="log-sep">-</span>
                      <span className="mono" style={{ fontSize: 11 }}>{l.ip}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
