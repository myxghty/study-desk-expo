import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Chip, Field } from '../components/ui';
import { askCoach, localPlan } from '../coach';

const PROMPTS = ['Plan my week', 'What should I study first?', "I'm behind. Help me catch up", 'Make a plan for my next exam'];

export default function CoachScreen({ s }) {
  const c = useC();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);           // { text, offline, error }

  const ask = async (text) => {
    const question = (text || q).trim();
    if (!question || busy) return;
    setQ(question); setBusy(true); setRes(null);
    try {
      setRes({ text: await askCoach(s, question) });
    } catch (e) {
      if (e && e.code === 'not_setup') setRes({ text: localPlan(s), offline: true });
      else setRes({ error: String((e && e.message) || e) });
    }
    setBusy(false);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700' }}>Study coach</Text>
      <Text style={{ color: c.mut, fontSize: 14, marginBottom: 16 }}>Ask for a plan based on your deadlines, marks and focus time.</Text>

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
          {PROMPTS.map((p) => <Chip key={p} label={p} onPress={() => ask(p)} style={{ marginBottom: 6 }} />)}
        </View>
        <Field value={q} onChangeText={setQ} placeholder="Or ask your own question" maxLength={500} multiline style={{ minHeight: 56, textAlignVertical: 'top' }} />
        <Btn label="Ask" onPress={() => ask()} busy={busy} />
        <Text style={{ color: c.mut, fontSize: 12, marginTop: 10 }}>Sends your open tasks, course averages and focus minutes to the AI to answer. Your notes and name are never sent, and nothing is kept.</Text>
      </Card>

      {res && res.error ? <Card><Text style={{ color: c.bad, fontSize: 14 }}>{res.error}</Text></Card> : null}
      {res && res.text ? (
        <Card title={res.offline ? 'Quick plan (AI is not switched on)' : 'Coach'}>
          <Text selectable style={{ color: c.ink, fontSize: 15, lineHeight: 23 }}>{res.text}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}
