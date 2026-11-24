export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
}));

const two = (n) => String(n).padStart(2, '0');
/** 05:52 */
export const hm = (x) => { if (x == null) return '—'; const d = new Date(x); return `${two(d.getHours())}:${two(d.getMinutes())}`; };
/** 7h 05m */
export const dur = (min) => { if (!min) return '0h'; const h = Math.floor(min / 60); const m = Math.round(min % 60); if (!h) return `${m}m`; return m ? `${h}h ${two(m)}m` : `${h}h`; };
export const hours = (min) => (Math.round((min / 60) * 10) / 10).toLocaleString();
export const money = (n, cur = 'GH₵') => `${cur} ${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m) => MONTHS[m - 1];
/** "Fri 20 Nov" from 'YYYY-MM-DD' */
export const dayLabel = (s, withYear = false) => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]} ${d} ${MONTHS[m - 1].slice(0, 3)}${withYear ? ` ${y}` : ''}`;
};
export const weekday = (s) => { const [y, m, d] = s.split('-').map(Number); return DAYS[new Date(y, m - 1, d).getDay()]; };
export const ago = (x) => {
  if (!x) return 'never';
  const s = Math.round((Date.now() - new Date(x).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
};
export const countdown = (ms) => {
  if (ms <= 0) return 'now';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${two(m % 60)}m`;
  return `${Math.round(h / 24)} days`;
};
export const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
export const phoneOk = (p) => String(p).replace(/\D/g, '').length >= 9;
