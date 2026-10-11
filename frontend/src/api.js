/**
 * Creator: momonpxl
 * Sosmed: Instagram & TikTok -> @momonpxl
 * Join Channel WhatsApp admin: https://whatsapp.com/channel/0029VbDYUWf8qIzlSl4slR0t
 * Jangan hapus credit dari Developer, hargailah Dev.
 * Jika menemukan bug, silakan buat pull request.
 */


const parse = (r) => r.json().catch(() => ({ error: 'Respon server tidak valid' }));

const opts = (method, body) => ({
  method,
  credentials: 'include',
  headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
  body: body !== undefined ? JSON.stringify(body) : undefined
});

export const api = {
  get: (url) => fetch(url, opts('GET')).then(parse),
  post: (url, body) => fetch(url, opts('POST', body ?? {})).then(parse),
  patch: (url, body) => fetch(url, opts('PATCH', body ?? {})).then(parse),
  del: (url) => fetch(url, opts('DELETE')).then(parse)
};
