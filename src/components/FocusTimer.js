import React, { useState, useEffect } from 'react';
import { View, Text, Vibration } from 'react-native';
import { useC } from '../theme';
import { Card, Chip, Btn } from './ui';
import { pad } from '../logic';
import { scheduleTimer, cancelTimer } from '../notifications';
import Wheel from './Wheel';

const NAMES = { focus: 'Focus', short: 'Break', long: 'Long break' };
const MAX_MIN = { focus: 180, short: 30, long: 60 };
const MIN_SEC = 5;
const MINUTES = (m) => Array.from({ length: MAX_MIN[m] + 1 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);
const fmt = (sec) => (sec % 60 === 0 ? String(sec / 60) : Math.floor(sec / 60) + ':' + pad(sec % 60));

// End-timestamp based, so the count stays right if the app is backgrounded.
// A local notification is scheduled for the end, so you're alerted even with the app closed.
// onStart / onAbandon feed the procrastination check.
export default function FocusTimer({ secs, onSecs, onFocusDone, onStart, onAbandon }) {
  const c = useC();
  const MODES = { focus: [NAMES.focus, secs.focus], short: [NAMES.short, secs.short], long: [NAMES.long, secs.long] };
  const [mode, setMode] = useState('focus');
  const [remain, setRemain] = useState(secs.focus * 1000);
  const [endAt, setEndAt] = useState(null);
  const [bump, setBump] = useState(0);
  const [, setTick] = useState(0);

  const switchMode = (m) => { cancelTimer(); setEndAt(null); setMode(m); setRemain(MODES[m][1] * 1000); };
  const userSwitch = (m) => {
    if (mode === 'focus' && (endAt || remain < MODES.focus[1] * 1000)) onAbandon();
    switchMode(m);
  };

  const idle = !endAt && remain === MODES[mode][1] * 1000;
  const cur = MODES[mode][1];
  const setPart = (part, v) => {
    let m = Math.floor(cur / 60), sc = cur % 60;
    if (part === 'm') m = v; else sc = v;
    let total = m * 60 + sc;
    if (total < MIN_SEC) { total = MIN_SEC; setBump((b) => b + 1); }       // wheels snap back to 00:05
    onSecs({ ...secs, [mode]: total });
    setRemain(total * 1000);
  };

  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => {
      if (endAt - Date.now() <= 0) {
        Vibration.vibrate([0, 250, 120, 250]);
        if (mode === 'focus') onFocusDone(Math.round(MODES.focus[1] / 6) / 10);   // minutes, one decimal
        switchMode(mode === 'focus' ? 'short' : 'focus');
      } else setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(id);
  }, [endAt, mode]);

  const ms = endAt ? Math.max(0, endAt - Date.now()) : remain;
  const s = Math.ceil(ms / 1000);
  const pct = 100 - ms / (MODES[mode][1] * 10);

  const toggle = () => {
    if (endAt) { cancelTimer(); setRemain(Math.max(0, endAt - Date.now())); setEndAt(null); return; }
    if (mode === 'focus' && remain === MODES.focus[1] * 1000) onStart();
    scheduleTimer(remain, MODES[mode][0] === 'Focus' ? 'Focus' : 'Break');
    setEndAt(Date.now() + remain);
  };

  return (
    <Card title="Focus timer">
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 6 }}>
        {Object.entries(MODES).map(([k, v]) => <Chip key={k} label={v[0] + ' ' + fmt(v[1])} on={mode === k} onPress={() => userSwitch(k)} />)}
      </View>
      {idle ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <Wheel key={'m' + mode + bump} values={MINUTES(mode)} value={Math.floor(cur / 60)} onChange={(v) => setPart('m', v)} format={pad} width={92} />
            <Text style={{ color: c.ink, fontSize: 56, fontWeight: '700', marginHorizontal: 2 }}>:</Text>
            <Wheel key={'s' + mode + bump} values={SECONDS} value={cur % 60} onChange={(v) => setPart('s', v)} format={pad} width={92} />
          </View>
          <Text style={{ color: c.mut, fontSize: 12.5, textAlign: 'center' }}>Swipe the minutes or seconds up or down to set the length</Text>
        </View>
      ) : (
        <Text style={{ color: c.ink, fontSize: 64, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] }}>{pad(Math.floor(s / 60))}:{pad(s % 60)}</Text>
      )}
      <View style={{ height: 6, backgroundColor: c.line, borderRadius: 6, overflow: 'hidden', marginVertical: 8 }}>
        <View style={{ height: '100%', width: pct + '%', backgroundColor: c.acc }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 6 }}>
        <Btn label={endAt ? 'Pause' : 'Start'} onPress={toggle} style={{ minWidth: 110 }} />
        <Btn label="Reset" ghost onPress={() => userSwitch(mode)} />
      </View>
    </Card>
  );
}
