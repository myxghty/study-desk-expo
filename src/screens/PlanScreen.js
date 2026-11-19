import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useC } from '../theme';
import { Card, Chip, Btn, Stat, Field, CourseField, DateField, ItemRow, Empty } from '../components/ui';
import FocusTimer from '../components/FocusTimer';
import { todayStr, daysLeft, dueLabel, uid } from '../logic';
import { analyze } from '../insights';
import { addEvent, removeEvent } from '../calendar';
import { FadeIn } from '../components/Loader';

export default function PlanScreen({ s, update, openInsights }) {
  const c = useC();
  const [qIn, setQIn] = useState('');
  const [fTitle, setFTitle] = useState('');
  const [fCourse, setFCourse] = useState('');
  const [fDue, setFDue] = useState(todayStr());
  const [fType, setFType] = useState('task');
  const [filter, setFilter] = useState('all');

  const courses = [...new Set([...s.items.map((i) => i.course), ...s.marks.map((m) => m.course)].filter(Boolean))];
  const open = s.items.filter((i) => !i.done);
  const focusToday = (s.focus[todayStr()] || { min: 0 }).min;
  const a = analyze(s);

  const addQuick = () => {
    const v = qIn.trim();
    if (!v) return;
    update((p) => ({ ...p, quick: [{ id: uid(), text: v, done: false }, ...p.quick] }));
    setQIn('');
  };
  const addItem = async () => {
    const title = fTitle.trim();
    if (!title) return;
    const it = { id: uid(), title, course: fCourse.trim(), due: fDue, type: fType, done: false, created: todayStr() };
    if (s.settings.calOn && s.settings.calId) { try { it.eventId = await addEvent(s.settings.calId, it); } catch (e) {} }
    update((p) => ({ ...p, items: [...p.items, it] }));
    setFTitle('');
  };
  const toggleItem = (i) => update((p) => ({ ...p, items: p.items.map((x) => (x.id === i.id ? { ...x, done: !x.done, doneAt: !x.done ? todayStr() : null } : x)) }));
  const deleteItem = (i) => { if (i.eventId) removeEvent(i.eventId); update((p) => ({ ...p, items: p.items.filter((x) => x.id !== i.id) })); };

  const bump = (key) => update((p) => { const t = todayStr(); return { ...p, stats: { ...p.stats, [key]: { ...p.stats[key], [t]: (p.stats[key][t] || 0) + 1 } } }; });
  const onFocusDone = (min) => update((p) => {
    const t = todayStr();
    const f = p.focus[t] || { min: 0, sess: 0 };
    return { ...p, focus: { ...p.focus, [t]: { min: f.min + min, sess: f.sess + 1 } } };
  });

  let rows = s.items.slice();
  if (filter === 'done') rows = rows.filter((i) => i.done);
  else {
    rows = rows.filter((i) => !i.done);
    if (filter !== 'all') rows = rows.filter((i) => i.type === filter);
  }
  rows.sort((x, y) => x.due.localeCompare(y.due));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700' }}>Study Desk</Text>
      <Text style={{ color: c.mut, fontSize: 14, marginBottom: 16 }}>
        {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      </Text>

      {a.level !== 'low' && a.reasons.length > 0 && (
        <FadeIn><Pressable onPress={openInsights} style={{ backgroundColor: c.card, borderColor: a.level === 'high' ? c.bad : c.warn, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <Text style={{ color: a.level === 'high' ? c.bad : c.warn, fontWeight: '700', marginBottom: 2 }}>{a.level === 'high' ? 'Procrastination alert' : 'Heads up'}</Text>
          <Text style={{ color: c.ink, fontSize: 13.5 }}>{a.reasons[0].text}</Text>
          {a.tips[0] ? <Text style={{ color: c.mut, fontSize: 13, marginTop: 4 }}>{a.tips[0]}</Text> : null}
        </Pressable></FadeIn>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Stat value={open.filter((i) => { const n = daysLeft(i.due); return n >= 0 && n <= 7; }).length} label="due in 7 days" />
        <Stat value={open.filter((i) => i.type === 'exam' && daysLeft(i.due) >= 0).length} label="exams ahead" />
        <Stat value={Math.round(focusToday)} label="focus min today" />
      </View>

      <FocusTimer secs={s.settings.timerSec} onSecs={(m) => update((p) => ({ ...p, settings: { ...p.settings, timerSec: m } }))} onFocusDone={onFocusDone} onStart={() => bump('starts')} onAbandon={() => bump('abandoned')} />

      <Card title="Quick list">
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Field style={{ flex: 1 }} value={qIn} onChangeText={setQIn} placeholder="Add something to do…" onSubmitEditing={addQuick} returnKeyType="done" />
          <Btn label="Add" onPress={addQuick} />
        </View>
        {s.quick.length ? s.quick.map((q) => (
          <ItemRow
            key={q.id}
            done={q.done}
            title={q.text}
            onToggle={() => update((p) => ({ ...p, quick: p.quick.map((x) => (x.id === q.id ? { ...x, done: !x.done } : x)) }))}
            onDelete={() => update((p) => ({ ...p, quick: p.quick.filter((x) => x.id !== q.id) }))}
          />
        )) : <Empty text="Add anything. Tap the circle to strike it off." />}
        {s.quick.some((q) => q.done) && (
          <Pressable onPress={() => update((p) => ({ ...p, quick: p.quick.filter((x) => !x.done) }))} style={{ marginTop: 10 }}>
            <Text style={{ color: c.mut, fontSize: 13, textDecorationLine: 'underline' }}>Clear done</Text>
          </Pressable>
        )}
      </Card>

      <Card title="Add deadline">
        <Field value={fTitle} onChangeText={setFTitle} placeholder="What's due? e.g. Lab record, Unit 2 test" />
        <CourseField value={fCourse} onChangeText={setFCourse} courses={courses} />
        <DateField value={fDue} onChange={setFDue} />
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <Chip label="Assignment / task" on={fType === 'task'} onPress={() => setFType('task')} />
          <Chip label="Exam / test" on={fType === 'exam'} onPress={() => setFType('exam')} />
        </View>
        <Btn label="Add" onPress={addItem} />
      </Card>

      <Card title="Coming up">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginBottom: 8 }}>
          {[['all', 'All'], ['task', 'Tasks'], ['exam', 'Exams'], ['done', 'Done']].map(([k, l]) => (
            <Chip key={k} label={l} on={filter === k} onPress={() => setFilter(k)} />
          ))}
        </View>
        {rows.length ? rows.map((i) => {
          const d = dueLabel(daysLeft(i.due));
          return (
            <ItemRow
              key={i.id}
              done={i.done}
              title={i.title}
              meta={(i.type === 'exam' ? 'Exam' : 'Task') + (i.course ? ' · ' + i.course : '') + ' · ' + i.due + (i.time ? ' ' + i.time : '')}
              badge={i.done ? null : d.label}
              tone={d.tone}
              onToggle={() => toggleItem(i)}
              onDelete={() => deleteItem(i)}
            />
          );
        }) : <Empty text="Nothing here yet." />}
      </Card>
    </ScrollView>
  );
}
