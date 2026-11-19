import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useC } from '../theme';
import PinPad from '../components/PinPad';
import { Logo, FadeIn } from '../components/Loader';
import { verifyPin, lockoutLeft, bioEnabled, bioAuth } from '../security';

export default function LockScreen({ name, onUnlock }) {
  const c = useC();
  const [err, setErr] = useState(0);
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(0);
  const [bio, setBio] = useState(false);

  const tryBio = async () => { if (await bioAuth()) onUnlock(); };
  useEffect(() => {
    (async () => {
      const w = await lockoutLeft();
      setWait(w);
      const on = await bioEnabled();
      setBio(on);
      if (on && w === 0) tryBio();
    })();
  }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, [wait > 0]);

  const submit = async (pin) => {
    const r = await verifyPin(pin);
    if (r.ok) return onUnlock();
    setErr((e) => e + 1);
    if (r.wait > 0) { setWait(r.wait); setMsg(''); } else setMsg('Wrong PIN. ' + r.left + ' tries before a short lockout.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 20 }}>
      <FadeIn style={{ alignItems: 'center', marginBottom: 18 }}><Logo size={64} /></FadeIn>
      <FadeIn delay={120}>
        <PinPad
          title={'Welcome back' + (name ? ', ' + name : '')}
          subtitle={wait > 0 ? 'Too many tries. Wait ' + wait + 's.' : msg || 'Enter your PIN'}
          errorKey={err}
          disabled={wait > 0}
          onComplete={submit}
          extraLeft={bio && wait === 0 ? (
            <Pressable onPress={tryBio}><Text style={{ color: c.acc, fontSize: 12, textAlign: 'center', fontWeight: '700' }}>Use{'\n'}biometrics</Text></Pressable>
          ) : null}
        />
      </FadeIn>
    </View>
  );
}
