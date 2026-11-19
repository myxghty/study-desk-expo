import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Chip, Stat, Field, CourseField, ItemRow, Empty } from '../components/ui';
import { courseStats, uid } from '../logic';

const KINDS = [['exam', 'Exam'], ['quiz', 'Quiz / test'], ['assignment', 'Assignment'], ['other', 'Other']];
const KIND_LABEL = Object.fromEntries(KINDS);

export default function MarksScreen({ s, update }) {
  const c = useC();
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [score, setScore] = useState('');
  const [max, setMax] = useState('');
  const [w, setW] = useState('');
  const [kind, setKind] = useState('exam');

  const cs = courseStats(s.marks);
  const courses = [...new Set([...s.items.map((i) => i.course), ...s.marks.map((m) => m.course)].filter(Boolean))];
  const overall = cs.length ? Math.round(cs.reduce((a, x) => a + x.pct, 0) / cs.length) + '%' : '–';
  const best = cs.length ? cs.slice().sort((a, b) => b.pct - a.pct)[0].c : '–';

  const add = () => {
    const sc = parseFloat(score), mx = parseFloat(max), wt = parseFloat(w) || 0;
    if (!name.trim() || isNaN(sc) || !(mx > 0)) return;
    update((p) => ({ ...p, marks: [...p.marks, { id: uid(), name: name.trim(), course: course.trim(), score: sc, max: mx, w: wt, kind }] }));
    setName(''); setScore(''); setMax(''); setW('');
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Marks</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Stat value={overall} label="overall average" />
        <Stat value={s.marks.length} label="assessments" />
        <Stat value={best} label="strongest course" />
      </View>

      <Card title="Add marks">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
          {KINDS.map(([k, l]) => <Chip key={k} label={l} on={kind === k} onPress={() => setKind(k)} style={{ marginBottom: 6 }} />)}
        </View>
        <Field value={name} onChangeText={setName} placeholder="Assessment e.g. CT-1, Lab viva" />
        <CourseField value={course} onChangeText={setCourse} courses={courses} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Field style={{ flex: 1 }} value={score} onChangeText={setScore} placeholder="Score" keyboardType="decimal-pad" />
          <Field style={{ flex: 1 }} value={max} onChangeText={setMax} placeholder="Out of" keyboardType="decimal-pad" />
          <Field style={{ flex: 1 }} value={w} onChangeText={setW} placeholder="Weight %" keyboardType="decimal-pad" />
        </View>
        <Btn label="Add" onPress={add} />
      </Card>

      <Card title="Your marks">
        {cs.length ? cs.map((x) => (
          <View key={x.c} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600' }}>{x.c}</Text>
              <Text style={{ color: x.pct < 50 ? c.bad : c.acc, fontSize: 17, fontWeight: '700' }}>{Math.round(x.pct)}%</Text>
            </View>
            {x.arr.map((m) => (
              <ItemRow
                key={m.id}
                title={m.name}
                meta={(KIND_LABEL[m.kind] || 'Exam') + ' · ' + m.score + ' / ' + m.max + ' · ' + Math.round((m.score / m.max) * 100) + '%' + (m.w ? ' · weight ' + m.w + '%' : '')}
                onDelete={() => update((p) => ({ ...p, marks: p.marks.filter((k) => k.id !== m.id) }))}
              />
            ))}
          </View>
        )) : <Empty text="No marks yet." />}
        <Text style={{ color: c.mut, fontSize: 12, marginTop: 4 }}>A course uses weights only when every mark in it has one; otherwise it's a plain average.</Text>
      </Card>
    </ScrollView>
  );
}
