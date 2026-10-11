/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Globe, Key, Lock, ArrowRight, ShieldCheck, Zap, Globe2, Shield,
  Sparkles, CheckCircle2, Server, Radio, Star, TrendingUp,
  Sun, Moon, ChevronDown, Layers, Database, Activity,
  Rocket, Heart
} from 'lucide-react';
import { api } from './api.js';

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
      if (total < 5 && homePath) {
        window.location.href = homePath;
      }
    }, 500);
  };

  return handleClick;
}

export default function LandingApp() {
  const [stats, setStats] = useState({ domains: 0, subdomains: 0, codes: 0 });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { theme, toggle } = useTheme();
  const handleLogoClick = useSecretLogo('/');

  useEffect(() => {
    api.get('/api/public-stats').then(s => {
      if (s && typeof s.domains === 'number') setStats(s);
    }).catch(() => {});

    api.get('/api/user/me').then((res) => {
      if (res && res.code) setIsLoggedIn(true);
    }).catch(() => {});
  }, []);

  const goLogin = () => { window.location.href = '/login.html'; };
  const goDashboard = () => { window.location.href = '/user.html'; };

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="logo" onClick={handleLogoClick} title="SubForge" role="button" tabIndex={0}>
            <div className="logo-icon"><Globe size={22} /></div>
            <span>SubForge</span>
          </div>

          <div className="landing-header-actions">
            <button className="theme-toggle-btn" onClick={toggle} title="Ganti tema">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {isLoggedIn ? (
              <button className="btn btn-sm btn-mint" onClick={goDashboard}>
                <Globe size={14} /> Dashboard
              </button>
            ) : (
              <button className="btn btn-sm" onClick={goLogin}>
                <Lock size={14} /> Masuk
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="hero-bg-decor" aria-hidden="true">
          <div className="decor-shape decor-1" />
          <div className="decor-shape decor-2" />
          <div className="decor-shape decor-3" />
        </div>

        <div className="hero-inner">
          <div className="hero-badge">
            <Sparkles size={14} /> Powered by Cloudflare DNS
          </div>

          <h1 className="hero-title">
            Bikin Subdomain <br />
            <span className="hero-title-accent">Tanpa Ribet</span>
          </h1>

          <p className="hero-subtitle">
            Platform untuk membuat dan mengelola subdomain dengan cepat.
            Cukup masukkan kode unik dari admin, pilih domain, isi target,
            dan subdomain kamu langsung aktif dalam hitungan detik.
          </p>

          <div className="hero-cta">
            <button className="btn btn-lg" onClick={isLoggedIn ? goDashboard : goLogin}>
              <Lock size={16} /> {isLoggedIn ? 'Buka Dashboard' : 'Masuk Pakai Kode'}
              <ArrowRight size={16} />
            </button>
            <a className="btn btn-lg btn-ghost" href="#fitur">
              <Layers size={16} /> Lihat Fitur
            </a>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{stats.domains}</div>
              <div className="hero-stat-label">Domain Aktif</div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-value">{stats.subdomains}</div>
              <div className="hero-stat-label">Subdomain Dibuat</div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-value">A - SRV</div>
              <div className="hero-stat-label">Tipe Record</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="fitur">
        <div className="section-inner">
          <div className="section-head">
            <div className="section-badge"><Zap size={14} /> Fitur</div>
            <h2 className="section-title">Semua yang kamu butuhkan</h2>
            <p className="section-desc">
              Fitur lengkap untuk kebutuhan subdomain kamu, dari yang basic sampai advanced.
            </p>
          </div>

          <div className="features-grid">
            {[
              { icon: Zap, color: 'feature-yellow', title: 'Instant Aktif', desc: 'Subdomain langsung aktif begitu dibuat. DNS propagate dalam hitungan menit.' },
              { icon: Globe2, color: 'feature-mint', title: 'Multi Domain', desc: 'Pilih dari berbagai domain yang tersedia. Satu kode bisa buat banyak subdomain.' },
              { icon: Shield, color: 'feature-blue', title: 'Cloudflare Proxy', desc: 'Opsional pakai proxy Cloudflare untuk proteksi DDoS dan SSL otomatis.' },
              { icon: Layers, color: 'feature-lav', title: 'Semua Tipe Record', desc: 'Support A, AAAA, CNAME, TXT, MX, NS, CAA, dan SRV. Fleksibel.' },
              { icon: Radio, color: 'feature-yellow', title: 'Cek DNS Propagation', desc: 'Verifikasi langsung apakah DNS sudah aktif di resolver publik.' },
              { icon: Star, color: 'feature-mint', title: 'Favorit & Template', desc: 'Tandai subdomain favorit. Pakai template untuk setup cepat.' }
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div className="feature-card" key={i}>
                  <div className={`feature-card-icon ${f.color}`}>
                    <Icon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="cara">
        <div className="section-inner">
          <div className="section-head">
            <div className="section-badge"><Rocket size={14} /> Cara Pakai</div>
            <h2 className="section-title">Tiga langkah, selesai</h2>
            <p className="section-desc">
              Tidak perlu setup rumit. Dari login sampai subdomain aktif cuma butuh 3 langkah.
            </p>
          </div>

          <div className="steps">
            {[
              { n: 1, icon: Key, title: 'Masuk dengan Kode', desc: 'Minta kode unik ke admin, masukkan di halaman login untuk akses dashboard kamu.' },
              { n: 2, icon: Globe2, title: 'Pilih Domain & Subdomain', desc: 'Pilih domain yang tersedia, isi nama subdomain, dan tentukan tipe record yang diinginkan.' },
              { n: 3, icon: Rocket, title: 'Subdomain Aktif', desc: 'Klik buat, tunggu beberapa detik, subdomain kamu langsung aktif dan bisa diakses.' }
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div className="step-card" key={i}>
                  <div className="step-number">{s.n}</div>
                  <div className="step-icon"><Icon size={24} /></div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="steps-cta">
            <button className="btn btn-lg btn-mint" onClick={isLoggedIn ? goDashboard : goLogin}>
              <Lock size={16} /> {isLoggedIn ? 'Buka Dashboard' : 'Mulai Sekarang'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="why-grid">
            <div className="why-left">
              <div className="section-badge"><Heart size={14} /> Kenapa SubForge</div>
              <h2 className="section-title" style={{ textAlign: 'left', marginBottom: 20 }}>
                Dibuat simpel untuk semua orang
              </h2>
              <div className="why-list">
                {[
                  'Tanpa perlu akun atau registrasi — cukup kode unik dari admin',
                  'Sesi login tersimpan otomatis, tidak perlu input kode berulang',
                  'Kelola semua subdomain kamu dari satu dashboard',
                  'Lihat status DNS tiap subdomain secara langsung',
                  'Tandai favorit untuk akses cepat',
                  'Support dark mode untuk kenyamanan mata'
                ].map((text, i) => (
                  <div className="why-item" key={i}>
                    <div className="why-check"><CheckCircle2 size={16} /></div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="why-right">
              <div className="why-mockup">
                <div className="mockup-bar">
                  <div className="site-dot" />
                  <div className="site-dot" />
                  <div className="site-dot" />
                </div>
                <div className="mockup-body">
                  <div className="mockup-row">
                    <div className="mockup-icon mockup-mint"><Globe size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="mockup-title">app.momonpxl.xyz</div>
                      <div className="mockup-sub">A - 192.0.2.1</div>
                    </div>
                    <span className="chip chip-ok">aktif</span>
                  </div>
                  <div className="mockup-row">
                    <div className="mockup-icon mockup-blue"><Server size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="mockup-title">api.fluxers.site</div>
                      <div className="mockup-sub">A - 10.0.0.5</div>
                    </div>
                    <span className="chip chip-ok">aktif</span>
                  </div>
                  <div className="mockup-row">
                    <div className="mockup-icon mockup-yellow"><Star size={14} /></div>
                    <div style={{ flex: 1 }}>
                      <div className="mockup-title">mc.momonpxl.xyz</div>
                      <div className="mockup-sub">A - 203.0.113.7</div>
                    </div>
                    <span className="chip">favorit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="faq">
        <div className="section-inner">
          <div className="section-head">
            <div className="section-badge"><Activity size={14} /> FAQ</div>
            <h2 className="section-title">Pertanyaan yang sering ditanya</h2>
          </div>

          <div className="faq-list">
            {[
              { q: 'Bagaimana cara mendapatkan kode unik?', a: 'Kode unik diberikan oleh admin SubForge. Hubungi admin langsung untuk meminta kode akses ke dashboard.' },
              { q: 'Apakah harus input kode setiap kali buka dashboard?', a: 'Tidak. Setelah login pertama kali, sesi kamu tersimpan otomatis selama 7 hari. Kamu bisa langsung buka dashboard tanpa input kode ulang.' },
              { q: 'Berapa lama subdomain aktif setelah dibuat?', a: 'Subdomain langsung terdaftar di Cloudflare begitu kamu klik buat. Propagasi DNS ke seluruh internet biasanya memakan waktu 1-5 menit.' },
              { q: 'Apakah ada batasan jumlah subdomain?', a: 'Tergantung kode yang diberikan admin. Ada kode yang unlimited, ada juga yang dibatasi jumlah pemakaian atau tanggal kadaluarsa.' },
              { q: 'Tipe record apa saja yang bisa dibuat?', a: 'Kami mendukung A, AAAA, CNAME, TXT, MX, NS, CAA, dan SRV. Semua tipe record standar Cloudflare DNS tersedia.' },
              { q: 'Bagaimana kalau lupa kode unik?', a: 'Kode unik tidak bisa direcovery — hubungi admin untuk mendapatkan kode baru.' }
            ].map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-card">
          <div className="cta-inner">
            <div className="cta-badge"><Sparkles size={14} /> Siap mulai?</div>
            <h2>Siap bikin subdomain kamu?</h2>
            <p>Masuk pakai kode unik dari admin dan mulai buat subdomain pertamamu.</p>
            <button className="btn btn-lg btn-mint" onClick={isLoggedIn ? goDashboard : goLogin}>
              <Lock size={16} /> {isLoggedIn ? 'Buka Dashboard' : 'Masuk Sekarang'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer-new">
        <div className="landing-footer-inner">
          <div className="footer-brand">
            <div className="logo-icon" style={{ width: 34, height: 34 }}><Globe size={18} /></div>
            <div>
              <div className="footer-title">SubForge</div>
              <div className="footer-sub">Subdomain manager sederhana</div>
            </div>
          </div>

         <div className="footer-links">
           <a href="#fitur">Fitur</a>
           <a href="#cara">Cara Pakai</a>
           <a href="#faq">FAQ</a>
           <a href="/status.html">Status</a>
           <a href="/login.html">Masuk</a>
        </div>

          <div className="footer-copy">
            <Heart size={12} /> Dibuat untuk mempermudah pengelolaan subdomain
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <ChevronDown size={18} className="faq-chevron" />
      </button>
      {open && <div className="faq-a">{a}</div>}
    </div>
  );
}
