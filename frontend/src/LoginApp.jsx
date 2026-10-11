/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */
import { useState, useEffect, useRef } from 'react';
import {
  Globe, Key, Lock, Loader2, AlertCircle, ArrowRight,
  ShieldCheck, Sun, Moon, ArrowLeft
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

export default function LoginApp() {
  const { theme, toggle } = useTheme();
  const handleLogoClick = useSecretLogo('/');

  
  useEffect(() => {
    api.get('/api/user/me').then((res) => {
      if (res && res.code) {
        window.location.href = '/user.html';
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true">
        <div className="decor-shape decor-1" />
        <div className="decor-shape decor-2" />
      </div>

      <header className="login-page-header">
        <div className="logo" onClick={handleLogoClick} title="SubForge" role="button" tabIndex={0}>
          <div className="logo-icon"><Globe size={22} /></div>
          <span>SubForge</span>
        </div>
        <button className="theme-toggle-btn" onClick={toggle} title="Ganti tema">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </header>

      <main className="login-page-main">
        <div className="card login-card-new">
          <a className="login-back" href="/">
            <ArrowLeft size={14} /> Kembali ke Beranda
          </a>

          <div className="login-hero">
            <div className="login-hero-icon"><Key size={26} /></div>
            <h1>Masuk ke Dashboard</h1>
            <p>Masukkan kode unik dari admin untuk melanjutkan.</p>
          </div>

          <LoginForm />
        </div>
      </main>
    </div>
  );
}

function LoginForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    const res = await api.post('/api/user/login', { code: code.trim() });
    setLoading(false);
    if (res.success) {
      window.location.href = '/user.html';
    } else {
      setError(res.error || 'Kode tidak valid');
    }
  };

  return (
    <form onSubmit={submit} className="login-form">
      <div className="field">
        <label><Key size={14} /> Kode Unik</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SF-XXXXXX"
          autoFocus
          required
          className="code-input"
        />
        <span className="field-hint">Belum punya kode? Hubungi admin.</span>
      </div>

      {error && (
        <div className="alert alert-err">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <button className="btn btn-full btn-lav btn-lg" type="submit" disabled={loading || !code.trim()}>
        {loading ? <Loader2 className="spin" size={16} /> : <Lock size={16} />}
        {loading ? 'Memproses...' : 'Masuk'}
        {!loading && <ArrowRight size={16} />}
      </button>

      <div className="login-footer-note">
        <ShieldCheck size={14} /> Sesi tersimpan otomatis di browser
      </div>
    </form>
  );
}
