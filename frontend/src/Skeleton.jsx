/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */
import { Globe } from 'lucide-react';

export function Bar({ w = '100%', h = 12, className = '', style }) {
  return (
    <span
      className={`sk ${className}`}
      style={{ display: 'block', width: w, height: h, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonList({ n = 4 }) {
  return (
    <div className="list" role="status" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: n }).map((_, i) => (
        <div className="list-item sk-row" key={i}>
          <Bar w={36} h={36} className="sk-sq" />
          <div className="sk-col">
            <Bar w={`${62 - (i % 3) * 9}%`} h={14} />
            <Bar w={`${88 - (i % 2) * 18}%`} h={10} />
          </div>
          <Bar w={64} h={28} className="sk-pill" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ n = 4 }) {
  return (
    <div className="stat-mini-grid" role="status" aria-busy="true" aria-label="Memuat statistik">
      {Array.from({ length: n }).map((_, i) => (
        <div className="stat-mini sk-tile" key={i}>
          <Bar w={36} h={36} className="sk-sq" />
          <div className="sk-col">
            <Bar w="45%" h={10} />
            <Bar w="75%" h={16} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="app">
      <header>
        <div className="logo">
          <div className="logo-icon"><Globe size={22} /></div>
          <span>SubForge</span>
        </div>
      </header>
      <main className="main-wide">
        <div className="card" style={{ marginBottom: 20 }}>
          <Bar w={190} h={22} style={{ marginBottom: 24 }} />
          <SkeletonStats />
        </div>
        <div className="card">
          <Bar w={230} h={22} style={{ marginBottom: 24 }} />
          <SkeletonList n={3} />
        </div>
      </main>
    </div>
  );
}
