/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Globe, Loader2, ArrowLeft, Activity, Server, Database,
  Key, CheckCircle2, TrendingUp, Clock, Sun, Moon, RefreshCw,
  BarChart3, ShieldCheck, AlertCircle
} from 'lucide-react';
import { api } from './api.js';
import { SkeletonList } from './Skeleton.jsx';

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

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export default function StatusApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, toggle } = useTheme();
  const handleLogoClick = useSecretLogo('/');

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    const res = await api.get('/api/public/status');
    setData(res);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 60000);
    return () => clearInterval(interval);
  }, []);

  const maxActivity = data ? Math.max(...data.activity.map(a => a.count), 1) : 1;
  const last30Total = data ? data.activity.reduce((s, a) => s + a.count, 0) : 0;

  return (
    <div className="app">
      <header>
        <div className="logo" onClick={handleLogoClick} title="SubForge" role="button" tabIndex={0}>
          <div className="logo-icon"><Globe size={22} /></div>
          <span>SubForge</span>
        </div>
        <div className="header-actions">
          <a className="btn btn-sm btn-ghost" href="/">
            <ArrowLeft size={14} /> Beranda
          </a>
          <button className="theme-toggle-btn" onClick={toggle} title="Ganti tema">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      <main className="main-wide">
        <div className="status-page-hero">
          <div className="status-page-badge">
            <Activity size={14} /> Status Sistem
          </div>
          <h1>SubForge Status</h1>
          <p>Ringkasan penggunaan dan kondisi sistem secara real-time.</p>
        </div>

        {loading ? (
          <SkeletonList n={4} />
        ) : !data ? (
          <div className="empty">Gagal memuat data.</div>
        ) : (
          <>
            <div className="status-live-banner">
              <div className="status-live-icon">
                <CheckCircle2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="status-live-title">Semua sistem beroperasi normal</div>
                <div className="status-live-sub">
                  Uptime server: {formatUptime(data.uptime)} · Update terakhir {new Date(data.now).toLocaleTimeString('id-ID')}
                </div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => load(true)} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
              </button>
            </div>

            <div className="stats-grid-4">
              <div className="stat-card stat-yellow">
                <div className="stat-icon"><Globe size={20} /></div>
                <div className="stat-info">
                  <div className="stat-value">{data.totals.subdomains}</div>
                  <div className="stat-label">Total Subdomain</div>
                </div>
              </div>
              <div className="stat-card stat-mint">
                <div className="stat-icon"><Server size={20} /></div>
                <div className="stat-info">
                  <div className="stat-value">{data.totals.domainsActive}</div>
                  <div className="stat-label">Domain Aktif</div>
                </div>
              </div>
              <div className="stat-card stat-blue">
                <div className="stat-icon"><Key size={20} /></div>
                <div className="stat-info">
                  <div className="stat-value">{data.totals.codesActive}</div>
                  <div className="stat-label">Kode Aktif</div>
                </div>
              </div>
              <div className="stat-card stat-lav">
                <div className="stat-icon"><TrendingUp size={20} /></div>
                <div className="stat-info">
                  <div className="stat-value">{last30Total}</div>
                  <div className="stat-label">30 Hari Terakhir</div>
                </div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <h3><BarChart3 size={16} /> Aktivitas 30 Hari Terakhir</h3>
                <span className="list-item-sub">{last30Total} total</span>
              </div>
              <div className="chart chart-tall">
                {data.activity.map(a => (
                  <div className="chart-col" key={a.date} title={`${a.date}: ${a.count}`}>
                    <div className="chart-bar-wrapper">
                      <div
                        className="chart-bar"
                        style={{ height: `${Math.max((a.count / maxActivity) * 100, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="chart-axis">
                <span>{data.activity[0]?.date.slice(5)}</span>
                <span>{data.activity[Math.floor(data.activity.length / 2)]?.date.slice(5)}</span>
                <span>Hari ini</span>
              </div>
            </div>

            <div className="two-col">
              <div className="section-card">
                <div className="section-header">
                  <h3><Clock size={16} /> Subdomain Terbaru</h3>
                </div>
                {data.recent.length === 0 ? (
                  <div className="empty">Belum ada subdomain.</div>
                ) : (
                  <div className="list">
                    {data.recent.map((r, i) => (
                      <div className="list-item" key={i}>
                        <div className="list-item-info">
                          <div className="list-item-title">
                            <Globe size={14} />
                            <span className="mono">{r.name}</span>
                            <span className="chip">{r.type}</span>
                          </div>
                          <div className="list-item-sub">
                            {new Date(r.created_at).toLocaleString('id-ID')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="section-card">
                <div className="section-header">
                  <h3><ShieldCheck size={16} /> Info Sistem</h3>
                </div>
                <div className="status-info-list">
                  <div className="status-info-item">
                    <div className="status-info-icon status-info-ok">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <div className="status-info-label">Cloudflare DNS</div>
                      <div className="status-info-value">Operational</div>
                    </div>
                  </div>
                  <div className="status-info-item">
                    <div className="status-info-icon status-info-ok">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <div className="status-info-label">Database</div>
                      <div className="status-info-value">Operational</div>
                    </div>
                  </div>
                  <div className="status-info-item">
                    <div className="status-info-icon status-info-ok">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <div className="status-info-label">API Server</div>
                      <div className="status-info-value">Operational</div>
                    </div>
                  </div>
                  <div className="status-info-item">
                    <div className="status-info-icon status-info-ok">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <div className="status-info-label">Domain</div>
                      <div className="status-info-value">{data.totals.domainsActive}/{data.totals.domainsTotal} aktif</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
