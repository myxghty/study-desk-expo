import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Vibration } from 'react-native';
import { useC } from '../theme';
import { PIN_LENGTH, verifyPin, lockoutLeft } from '../security';

// Dots + keypad. Bump errorKey to shake and clear after a wrong entry.
export default function PinPad({ title, subtitle, onComplete, errorKey = 0, disabled, extraLeft }) {
  const c = useC();
  const [pin, setPin] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!errorKey) return;
    setPin('');
    Vibration.vibrate(80);
    Animated.sequence([10, -10, 8, -8, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }))).start();
  }, [errorKey]);

  const press = (d) => {
    if (disabled || pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setPin(next);
    if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120);
  };
  const back = () => setPin((p) => p.slice(0, -1));

  const Key = ({ label, onPress }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 74, height: 74, borderRadius: 37, backgroundColor: pressed ? c.line : c.card, borderColor: c.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center', margin: 7, opacity: disabled ? 0.4 : 1 })}>
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
  const Blank = ({ children }) => <View style={{ width: 74, height: 74, margin: 7, alignItems: 'center', justifyContent: 'center' }}>{children}</View>;

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: c.ink, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
      <Text style={{ color: c.mut, fontSize: 14, marginTop: 6, marginBottom: 22, textAlign: 'center', minHeight: 20 }}>{subtitle}</Text>
      <Animated.View style={{ flexDirection: 'row', marginBottom: 26, transform: [{ translateX: shake }] }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 7, marginHorizontal: 8, borderWidth: 2, borderColor: c.acc, backgroundColor: i < pin.length ? c.acc : 'transparent' }} />
        ))}
      </Animated.View>
      {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row) => (
        <View key={row[0]} style={{ flexDirection: 'row' }}>{row.map((d) => <Key key={d} label={d} onPress={() => press(d)} />)}</View>
      ))}
      <View style={{ flexDirection: 'row' }}>
        <Blank>{extraLeft}</Blank>
        <Key label="0" onPress={() => press('0')} />
        <Pressable onPress={back} style={{ width: 74, height: 74, margin: 7, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: c.mut, fontSize: 22 }}>⌫</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Choose a PIN: enter, then confirm.
export function PinSetup({ onDone, onCancel, title = 'Choose a PIN' }) {
  const c = useC();
  const [first, setFirst] = useState(null);
  const [err, setErr] = useState(0);
  const [msg, setMsg] = useState('');
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      {!first ? (
        <PinPad key="a" title={title} subtitle={PIN_LENGTH + ' digits. Avoid birthdays and 123456.'} onComplete={(p) => { setMsg(''); setFirst(p); }} />
      ) : (
        <PinPad key="b" errorKey={err} title="Confirm your PIN" subtitle={msg || 'Enter it once more'} onComplete={(p) => { if (p === first) onDone(p); else { setMsg("Those didn't match. Try again."); setErr((e) => e + 1); } }} />
      )}
      <Pressable onPress={first ? () => { setFirst(null); setMsg(''); } : onCancel} style={{ marginTop: 14 }}>
        <Text style={{ color: c.mut, textAlign: 'center', textDecorationLine: 'underline' }}>{first ? 'Start over' : 'Cancel'}</Text>
      </Pressable>
    </View>
  );
}

// Ask for the current PIN (used before turning the lock off or changing it).
export function PinVerify({ title = 'Enter your PIN', onOk, onCancel }) {
  const c = useC();
  const [err, setErr] = useState(0);
  const [msg, setMsg] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => { lockoutLeft().then(setWait); }, []);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(t);
  }, [wait > 0]);
  const submit = async (pin) => {
    const r = await verifyPin(pin);
    if (r.ok) return onOk();
    setErr((e) => e + 1);
    if (r.wait > 0) { setWait(r.wait); setMsg(''); } else setMsg('Wrong PIN. ' + r.left + ' tries before a short lockout.');
  };
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <PinPad title={title} subtitle={wait > 0 ? 'Too many tries. Wait ' + wait + 's.' : msg} errorKey={err} disabled={wait > 0} onComplete={submit} />
      <Pressable onPress={onCancel} style={{ marginTop: 14 }}><Text style={{ color: c.mut, textAlign: 'center', textDecorationLine: 'underline' }}>Cancel</Text></Pressable>
    </View>
  );
}
