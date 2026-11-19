import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useC } from '../theme';
import { Btn, FormField } from '../components/ui';
import { signUp, signIn, signOut, myProfile } from '../supa';
import { nameError, emailError, passwordError, NAME_MAX } from '../validate';

// Sign up / sign in with an email. `role` is what this device is being used as; an
// account made as a teacher can't be used as a student and the other way round.
export default function AuthScreen({ role, name: initialName, onDone }) {
  const c = useC();
  const [mode, setMode] = useState('in');
  const [name, setName] = useState(initialName || '');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState({});
  const [shake, setShake] = useState({ name: 0, email: 0, pw: 0 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const go = async () => {
    const e = { email: emailError(email), pw: passwordError(pw) };
    if (mode === 'up') e.name = nameError(name);
    setErr(e);
    const bad = Object.keys(e).filter((k) => e[k]);
    if (bad.length) { setShake((s) => { const n = { ...s }; bad.forEach((k) => { n[k] = s[k] + 1; }); return n; }); return; }
    setBusy(true); setMsg('');
    const mail = email.trim().toLowerCase();
    try {
      if (mode === 'up') {
        const ok = await signUp(mail, pw, name.trim(), role);
        if (!ok) { setMode('in'); setMsg('Check your email and confirm your address, then sign in here.'); setBusy(false); return; }
      } else {
        await signIn(mail, pw);
      }
      const p = await myProfile();
      if (p && p.role !== role) {
        await signOut();
        setMsg('That account is a ' + p.role + ' account. Use a different email for ' + (role === 'teacher' ? 'teaching' : 'studying') + '.');
        setBusy(false); return;
      }
      onDone(p && p.name ? p.name : name.trim());
    } catch (er) { setMsg(String((er && er.message) || er)); }
    setBusy(false);
  };

  return (
    <View>
      <Text style={{ color: c.mut, fontSize: 14, marginBottom: 12 }}>
        {mode === 'up' ? 'Create your ' + role + ' account with your email.' : 'Sign in to your ' + role + ' account with your email.'}
      </Text>
      {mode === 'up' && (
        <FormField value={name} onChangeText={(v) => { setName(v); if (err.name) setErr({ ...err, name: '' }); }} placeholder="Your name" maxLength={NAME_MAX} error={err.name} shake={shake.name} />
      )}
      <FormField value={email} onChangeText={(v) => { setEmail(v); if (err.email) setErr({ ...err, email: '' }); }} placeholder="Email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" maxLength={254} error={err.email} shake={shake.email} />
      <FormField value={pw} onChangeText={(v) => { setPw(v); if (err.pw) setErr({ ...err, pw: '' }); }} placeholder="Password (8+ characters)" secureTextEntry autoCapitalize="none" textContentType={mode === 'up' ? 'newPassword' : 'password'} onSubmitEditing={go} error={err.pw} shake={shake.pw} />
      {msg ? <Text style={{ color: c.bad, fontSize: 13, marginBottom: 8 }}>{msg}</Text> : null}
      <Btn label={mode === 'up' ? 'Create account' : 'Sign in'} onPress={go} busy={busy} />
      <Btn label={mode === 'up' ? 'I already have an account' : 'Create a new account'} ghost onPress={() => { setMode(mode === 'up' ? 'in' : 'up'); setMsg(''); setErr({}); }} style={{ marginTop: 8 }} />
    </View>
  );
}
