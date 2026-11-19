export const NAME_MIN = 4;     // "more than 3 letters"
export const NAME_MAX = 80;

export function nameError(v) {
  const n = String(v || '').trim();
  if (n.length < NAME_MIN) return 'Name must be more than 3 letters long';
  if (n.length > NAME_MAX) return 'Name must not be longer than 80 characters';
  return '';
}

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
export function emailError(v) {
  const e = String(v || '').trim();
  if (e.length > 254 || !EMAIL.test(e) || e.includes('..') || e.startsWith('.') || e.split('@')[0].endsWith('.')) return 'Enter a valid email address';
  return '';
}

export const passwordError = (v) => (String(v || '').length < 8 ? 'Password must be at least 8 characters' : '');
