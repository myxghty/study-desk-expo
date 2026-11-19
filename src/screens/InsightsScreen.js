import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useC } from '../theme';
import { Card, Stat } from '../components/ui';
import { analyze } from '../insights';
import { lastDays, todayStr } from '../logic';

export default function InsightsScreen({ s }) {
  const c = useC();
  const a = analyze(s);
  const days = lastDays(7);
  const mins = days.map((d) => (s.focus[d] && s.focus[d].min) || 0);
  const max = Math.max(30, ...mins);
  const total = Object.values(s.focus).reduce((x, f) => x + f.min, 0);
  const col = a.level === 'high' ? c.bad : a.level === 'watch' ? c.warn : c.acc;
  const label = a.level === 'high' ? 'Falling behind' : a.level === 'watch' ? 'Worth watching' : 'On track';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Insights</Text>

      <Card title="Procrastination check">
        <Text style={{ color: col, fontSize: 24, fontWeight: '700' }}>{label}</Text>
        <View style={{ height: 6, backgroundColor: c.line, borderRadius: 6, overflow: 'hidden', marginVertical: 8 }}>
          <View style={{ height: '100%', width: a.score + '%', backgroundColor: col }} />
        </View>
        {a.reasons.length ? a.reasons.map((r, i) => (
          <Text key={i} style={{ color: r.tone === 'bad' ? c.bad : c.ink, fontSize: 14.5, marginTop: 6 }}>• {r.text}</Text>
        )) : <Text style={{ color: c.mut, fontSize: 14 }}>Nothing worrying right now.</Text>}
        {a.tips.map((t, i) => <Text key={i} style={{ color: c.acc, fontSize: 14, marginTop: 8 }}>→ {t}</Text>)}
        <Text style={{ color: c.mut, fontSize: 12, marginTop: 12 }}>This only looks at what happens inside the app: deadlines, logged focus time, abandoned timers, and when you finish things. It can't see what you do in other apps.</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        <Stat value={(mins.reduce((x, y) => x + y, 0) / 60).toFixed(1) + 'h'} label="last 7 days" />
        <Stat value={(total / 60).toFixed(1) + 'h'} label="all time" />
        <Stat value={a.min3 + 'm'} label="last 3 days" />
      </View>

      <Card title="Focus per day">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 6 }}>
          {mins.map((v, i) => (
            <View key={i} style={{ flex: 1, height: Math.max(3, (v / max) * 90), backgroundColor: days[i] === todayStr() ? c.acc : c.line, borderRadius: 4 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
          {days.map((d) => (
            <Text key={d} style={{ flex: 1, textAlign: 'center', color: c.mut, fontSize: 11 }}>{new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
