// Tiny Supabase client using plain fetch (no extra packages): sign-in + database calls.
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const SKEY = 'sd.supa.session';
let cached;          // undefined = not loaded yet, null = signed out

export const isId = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function http(path, { method = 'GET', body, token, headers, timeout = 15000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  let r;
  try {
    r = await fetch(SUPABASE_URL + path, {
      method,
      signal: ctl.signal,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Authorization: 'Bearer ' + (token || SUPABASE_KEY), ...(headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(e && e.name === 'AbortError' ? 'The server took too long. Check your connection.' : 'Could not reach the server. Check your connection.');
  } finally { clearTimeout(timer); }
  const text = await r.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch (e) {}
  if (!r.ok) {
    const msg = (j && (j.msg || j.message || j.error_description || j.error)) || 'Request failed (' + r.status + ')';
    throw Object.assign(new Error(String(msg)), { status: r.status });
  }
  return j;
}

async function load() {
  if (cached !== undefined) return cached;
  cached = null;
  try { const r = await SecureStore.getItemAsync(SKEY); if (r) cached = JSON.parse(r); } catch (e) {}
  return cached;
}
async function save(sess) {
  cached = sess;
  try { if (sess) await SecureStore.setItemAsync(SKEY, JSON.stringify(sess)); else await SecureStore.deleteItemAsync(SKEY); } catch (e) {}
}
const toSess = (j) => ({ a: j.access_token, r: j.refresh_token, exp: Math.floor(Date.now() / 1000) + (j.expires_in || 3600), uid: j.user.id, email: j.user.email });

export async function session() { return load(); }

async function token() {
  let s = await load();
  if (!s) return null;
  if (s.exp - 60 < Date.now() / 1000) {
    try { s = toSess(await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.r } })); await save(s); }
    catch (e) { if (e.status === 400 || e.status === 401 || e.status === 403) await save(null); return null; }
  }
  return s.a;
}

export async function signUp(email, password, name, role) {
  const j = await http('/auth/v1/signup', { method: 'POST', body: { email, password, data: { name, role } } });
  if (j && j.access_token) { await save(toSess(j)); return true; }
  return false;                                    // email confirmation is switched on
}
export async function signIn(email, password) {
  await save(toSess(await http('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })));
}
export async function signOut() {
  const t = await token();
  if (t) http('/auth/v1/logout', { method: 'POST', token: t }).catch(() => {});
  await save(null);
}

async function db(method, path, body, headers) {
  const t = await token();
  if (!t) throw Object.assign(new Error('Please sign in first.'), { status: 401 });
  return http('/rest/v1/' + path, { method, body, token: t, headers });
}
export const select = (path) => db('GET', path);
export const insert = (table, row) => db('POST', table, row, { Prefer: 'return=representation' });
export const upsert = (table, row, conflict) => db('POST', table + '?on_conflict=' + conflict, row, { Prefer: 'resolution=merge-duplicates,return=minimal' });
export const remove = (path) => db('DELETE', path);
export const rpc = (name, args) => db('POST', 'rpc/' + name, args || {});
// Calls a Supabase Edge Function as the signed-in user (used by the AI coach).
export async function callFunction(name, body) {
  const t = await token();
  if (!t) throw Object.assign(new Error('Please sign in first.'), { status: 401 });
  return http('/functions/v1/' + name, { method: 'POST', body, token: t, timeout: 45000 });
}
export async function myProfile() {
  const s = await load();
  if (!s || !isId(s.uid)) return null;
  const r = await select('profiles?select=role,name&id=eq.' + s.uid);
  return r && r[0] ? r[0] : null;
}
