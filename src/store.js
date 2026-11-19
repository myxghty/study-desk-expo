import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEY = 'studydesk.v1';
const EMPTY = {
  items: [], focus: {}, quick: [], marks: [],
  stats: { starts: {}, abandoned: {} },
  profile: { name: '', onboarded: false, lock: false, role: '' },
  postSeen: {},
  share: { on: false, marks: true, hours: true, tasks: true, done: true, flags: false },
  settings: { calOn: false, calId: '', remindOn: false, remindDeadlines: true, remindDaily: true, remindTime: '18:00', timerSec: { focus: 1500, short: 300, long: 900 } },
};
const NESTED = ['stats', 'profile', 'share', 'settings'];

// Secrets never go in AsyncStorage (plain storage). The sign-in session lives in
// secure storage (see supa.js). The old link-sharing key is cleaned up below.
const SECRETS = [];

function merge(parsed) {
  const s = { ...EMPTY, ...parsed };
  delete s.inbox; delete s.wa;
  NESTED.forEach((k) => { s[k] = { ...EMPTY[k], ...(parsed[k] || {}) }; });
  delete s.share.id; delete s.share.secret; delete s.settings.apiBase;   // old link-sharing fields
  const oldT = parsed.settings && parsed.settings.timer;                 // timer lengths used to be saved in minutes
  if (oldT && !(parsed.settings && parsed.settings.timerSec)) s.settings.timerSec = { focus: (oldT.focus || 25) * 60, short: (oldT.short || 5) * 60, long: (oldT.long || 15) * 60 };
  delete s.settings.timer;
  return s;
}
const strip = (s) => {
  const c = { ...s };
  SECRETS.forEach(([a, b]) => { c[a] = { ...c[a], [b]: '' }; });
  return c;
};
async function loadSecrets(s) {
  for (const [a, b, key] of SECRETS) {
    try { const v = await SecureStore.getItemAsync(key); if (v) s[a][b] = v; } catch (e) {}
  }
}
async function saveSecrets(prev, next) {
  for (const [a, b, key] of SECRETS) {
    if (prev && prev[a][b] === next[a][b]) continue;
    try {
      if (next[a][b]) await SecureStore.setItemAsync(key, next[a][b]);
      else await SecureStore.deleteItemAsync(key);
    } catch (e) {}
  }
}

// update(fn) takes the old state and returns the new one.
export function useStore() {
  const [state, setState] = useState(null);
  useEffect(() => {
    (async () => {
      let s = merge({});
      try { const r = await AsyncStorage.getItem(KEY); if (r) s = merge(JSON.parse(r)); } catch (e) {}
      SecureStore.deleteItemAsync('sd.wa.secret').catch(() => {});   // old WhatsApp pairing key, no longer used
      SecureStore.deleteItemAsync('sd.share.secret').catch(() => {}); // old link-sharing key, replaced by accounts
      await loadSecrets(s);
      await saveSecrets(null, s);                                   // moves any old plain-text secret into secure storage
      AsyncStorage.setItem(KEY, JSON.stringify(strip(s))).catch(() => {});
      setState(s);
    })();
  }, []);
  const update = useCallback((fn) => {
    setState((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(strip(next))).catch(() => {});
      saveSecrets(prev, next);
      return next;
    });
  }, []);
  return [state, update];
}
