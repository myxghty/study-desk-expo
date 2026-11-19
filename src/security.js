import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuth from 'expo-local-authentication';

// App lock: a 6-digit PIN (stored only as a salted hash in secure storage) plus optional
// fingerprint / Face ID. Wrong guesses lock you out for longer each time.
// This keeps people who pick up your phone out of your marks. It is not an account.
export const PIN_LENGTH = 6;
const K = { hash: 'sd.pin.hash', salt: 'sd.pin.salt', bio: 'sd.bio', fails: 'sd.fails', until: 'sd.until' };
const get = (k) => SecureStore.getItemAsync(k).catch(() => null);
const set = (k, v) => SecureStore.setItemAsync(k, String(v)).catch(() => {});
const del = (k) => SecureStore.deleteItemAsync(k).catch(() => {});

async function digest(pin, salt) {
  let h = salt + ':' + pin;
  for (let i = 0; i < 300; i++) h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, h);
  return h;
}

export async function hasPin() { return !!(await get(K.hash)); }

export async function setPin(pin) {
  const salt = Array.from(Crypto.getRandomBytes(16)).map((b) => b.toString(16).padStart(2, '0')).join('');
  await set(K.salt, salt);
  await set(K.hash, await digest(pin, salt));
  await del(K.fails); await del(K.until);
}

export async function clearPin() {
  await Promise.all([K.hash, K.salt, K.bio, K.fails, K.until].map(del));
}

// Seconds left in a lockout, 0 if none.
export async function lockoutLeft() {
  const until = Number(await get(K.until)) || 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

export async function verifyPin(pin) {
  const wait = await lockoutLeft();
  if (wait > 0) return { ok: false, wait };
  const ok = (await digest(pin, (await get(K.salt)) || '')) === (await get(K.hash));
  if (ok) { await del(K.fails); await del(K.until); return { ok: true, wait: 0 }; }
  const fails = (Number(await get(K.fails)) || 0) + 1;
  await set(K.fails, fails);
  let nextWait = 0;
  if (fails >= 5) {
    nextWait = Math.min(900, 30 * Math.pow(2, fails - 5));      // 30s, 60s, 2m ... capped at 15 min
    await set(K.until, Date.now() + nextWait * 1000);
  }
  return { ok: false, wait: nextWait, left: Math.max(0, 5 - fails) };
}

export async function bioAvailable() {
  try { return (await LocalAuth.hasHardwareAsync()) && (await LocalAuth.isEnrolledAsync()); } catch (e) { return false; }
}
export async function bioEnabled() { return (await get(K.bio)) === '1'; }
export async function setBio(on) { if (on) await set(K.bio, '1'); else await del(K.bio); }
export async function bioAuth(prompt) {
  try {
    const r = await LocalAuth.authenticateAsync({ promptMessage: prompt || 'Unlock Study Desk', disableDeviceFallback: true, cancelLabel: 'Use PIN' });
    return !!r.success;
  } catch (e) { return false; }
}
