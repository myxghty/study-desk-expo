import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Field, Empty, ItemRow } from '../components/ui';
import { select, insert, remove, isId } from '../supa';
import { courseStats, lastDays } from '../logic';

const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (v == null ? '' : String(v)).slice(0, 200);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function StudentDetail({ cls, student, onBack }) {
  const c = useC();
  const [snap, setSnap] = useState(undefined);
  const [tm, setTm] = useState([]);
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [max, setMax] = useState('');
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    if (!isId(student.id) || !isId(cls.id)) return;
    try {
      const [s, m] = await Promise.all([
        select('snapshots?select=data,updated_at&student_id=eq.' + student.id),
        select('teacher_marks?select=id,title,score,max_score,comment,created_at&class_id=eq.' + cls.id + '&student_id=eq.' + student.id + '&order=created_at.desc'),
      ]);
      setSnap(s && s[0] ? s[0] : null); setTm(m || []);
    } catch (e) { setErr(String((e && e.message) || e)); setSnap(null); }
  }, [cls.id, student.id]);
  useEffect(() => { load(); }, [load]);

  const addMark = async () => {
    const sc = parseFloat(score), mx = parseFloat(max);
    if (!title.trim() || isNaN(sc) || !(mx > 0)) return;
    try {
      await insert('teacher_marks', { class_id: cls.id, student_id: student.id, title: title.trim().slice(0, 120), score: sc, max_score: mx, comment: comment.trim().slice(0, 1000) });
      setTitle(''); setScore(''); setMax(''); setComment('');
      await load();
    } catch (e) { setErr(String((e && e.message) || e)); }
  };
  const delMark = (m) => Alert.alert('Delete this mark?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { if (isId(m.id)) await remove('teacher_marks?id=eq.' + m.id); await load(); } catch (e) { setErr(String((e && e.message) || e)); } } },
  ]);

  const d = snap && snap.data && typeof snap.data === 'object' ? snap.data : {};
  const marks = arr(d.marks).map((m) => ({ course: str(m.course), name: str(m.name), score: num(m.score), max: num(m.max) || 1, w: num(m.w) }));
  const focus = d.focus && typeof d.focus === 'object' ? d.focus : {};
  const week = lastDays(7).map((day) => ({ day, min: num((focus[day] || {}).min) }));
  const weekMin = week.reduce((a, x) => a + x.min, 0);
  const hrs = (m) => (m / 60).toFixed(1) + ' h';
  const shared = snap && (d.marks || d.focus || d.open || d.done || d.flags);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10}><Text style={{ color: c.acc, fontSize: 15, marginBottom: 6 }}>‹ {cls.name}</Text></Pressable>
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: '700' }}>{student.name}</Text>
      {snap ? <Text style={{ color: c.mut, fontSize: 13, marginBottom: 14 }}>Updated {String(snap.updated_at).replace('T', ' ').slice(0, 16)} UTC</Text> : <View style={{ height: 14 }} />}
      {err ? <Text style={{ color: c.bad, fontSize: 13, marginBottom: 10 }}>{err}</Text> : null}

      {snap === undefined ? <Empty text="Loading…" /> : !shared ? (
        <Card><Empty text="This student hasn't shared anything yet, or has switched sharing off." /></Card>
      ) : (
        <>
          {d.flags ? (
            <Card title="Procrastination check">
              <Text style={{ color: d.flags.level === 'high' ? c.bad : d.flags.level === 'watch' ? c.warn : c.ink, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>{str(d.flags.level).toUpperCase()}</Text>
              {arr(d.flags.reasons).slice(0, 8).map((r, i) => <Text key={i} style={{ color: c.mut, fontSize: 13.5, marginBottom: 3 }}>• {str(r)}</Text>)}
            </Card>
          ) : null}

          {d.marks ? (
            <Card title="Marks (self-recorded)">
              {marks.length === 0 ? <Empty text="No marks yet." /> : courseStats(marks).map((x) => (
                <View key={x.c} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                  <Text style={{ color: c.ink, fontSize: 16 }}>{x.c} · {Math.round(x.pct)}%</Text>
                  <Text style={{ color: c.mut, fontSize: 12.5 }}>{x.arr.map((m) => m.name + ' ' + m.score + '/' + m.max).join(', ')}</Text>
                </View>
              ))}
            </Card>
          ) : null}

          {d.focus ? (
            <Card title="Study time">
              <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{hrs(weekMin)} <Text style={{ color: c.mut, fontSize: 13, fontWeight: '400' }}>last 7 days · {hrs(num(d.totalMin))} total</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, marginTop: 10 }}>
                {week.map((x) => <View key={x.day} style={{ flex: 1, marginHorizontal: 2, height: Math.max(3, Math.min(60, x.min / 2)), backgroundColor: c.acc, borderRadius: 3 }} />)}
              </View>
            </Card>
          ) : null}

          {d.open ? (
            <Card title="To-do list">
              {arr(d.open).length + arr(d.quickOpen).length === 0 ? <Empty text="Nothing open." /> : null}
              {arr(d.open).slice(0, 40).map((i, k) => <Text key={k} style={{ color: c.ink, fontSize: 15, paddingVertical: 4 }}>{str(i.title)} <Text style={{ color: c.mut, fontSize: 12.5 }}>{str(i.type)} · {str(i.course)} · {str(i.due)}</Text></Text>)}
              {arr(d.quickOpen).slice(0, 40).map((q, k) => <Text key={'q' + k} style={{ color: c.ink, fontSize: 15, paddingVertical: 4 }}>{str(q)}</Text>)}
            </Card>
          ) : null}

          {d.done ? (
            <Card title="Finished">
              {arr(d.done).length + arr(d.quickDone).length === 0 ? <Empty text="Nothing finished yet." /> : null}
              {arr(d.done).slice().reverse().slice(0, 40).map((i, k) => <Text key={k} style={{ color: c.mut, fontSize: 15, paddingVertical: 4, textDecorationLine: 'line-through' }}>{str(i.title)} <Text style={{ fontSize: 12.5 }}>{i.doneAt ? '· ' + str(i.doneAt) : ''}</Text></Text>)}
              {arr(d.quickDone).slice(0, 40).map((q, k) => <Text key={'q' + k} style={{ color: c.mut, fontSize: 15, paddingVertical: 4, textDecorationLine: 'line-through' }}>{str(q)}</Text>)}
            </Card>
          ) : null}
        </>
      )}

      <Card title="Marks from you">
        {tm.length === 0 ? <Empty text="You haven't posted any marks for this student." /> : tm.map((m) => (
          <ItemRow key={m.id} title={m.title + ': ' + m.score + '/' + m.max_score} meta={m.comment || String(m.created_at).slice(0, 10)} onDelete={() => delMark(m)} />
        ))}
        <View style={{ height: 12 }} />
        <Field value={title} onChangeText={setTitle} placeholder="Title, e.g. Quiz 1" maxLength={120} />
        <View style={{ flexDirection: 'row' }}>
          <Field value={score} onChangeText={setScore} placeholder="Score" keyboardType="decimal-pad" style={{ flex: 1, marginRight: 8 }} />
          <Field value={max} onChangeText={setMax} placeholder="Out of" keyboardType="decimal-pad" style={{ flex: 1 }} />
        </View>
        <Field value={comment} onChangeText={setComment} placeholder="Comment (optional)" maxLength={1000} />
        <Btn label="Post mark" onPress={addMark} />
      </Card>
    </ScrollView>
  );
}
