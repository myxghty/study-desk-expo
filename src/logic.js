export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayStr = () => ymd(new Date());
export const daysLeft = (due) => Math.round((new Date(due + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 864e5);
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function dueLabel(n) {
  if (n < 0) return { label: -n + 'd overdue', tone: 'bad' };
  if (n === 0) return { label: 'Today', tone: 'warn' };
  if (n === 1) return { label: 'Tomorrow', tone: 'warn' };
  return { label: 'in ' + n + 'd', tone: '' };
}

// Per-course percentage. Uses weights only if every mark in the course has one.
export function courseStats(marks) {
  const g = {};
  marks.forEach((m) => { const c = m.course || 'General'; (g[c] = g[c] || []).push(m); });
  return Object.entries(g).map(([c, arr]) => {
    let pct;
    if (arr.every((m) => m.w > 0)) {
      const tw = arr.reduce((a, m) => a + m.w, 0);
      pct = arr.reduce((a, m) => a + (m.score / m.max) * 100 * m.w, 0) / tw;
    } else {
      pct = arr.reduce((a, m) => a + (m.score / m.max) * 100, 0) / arr.length;
    }
    return { c, arr, pct };
  });
}

export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const lastDays = (n) => Array.from({ length: n }, (_, i) => ymd(addDays(new Date(), -(n - 1 - i))));
