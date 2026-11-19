import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Field, Toggle, Empty, ItemRow } from '../components/ui';
import AuthScreen from './AuthScreen';
import { session, signOut, rpc, remove, isId } from '../supa';
import { pullClasses, landPosts } from '../classes';
import { removeSnapshot } from '../sync';

const KIND = { assignment: 'Assignment', exam: 'Exam', announcement: 'Announcement' };

export default function ClassesScreen({ s, update }) {
  const c = useC();
  const [sess, setSess] = useState(undefined);       // undefined = checking
  const [data, setData] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const refresh = useCallback(async () => {
    setErr('');
    try {
      const d = await pullClasses();
      setData(d);
      if (d) await landPosts(s, update, d.posts);
    } catch (e) { setErr(String((e && e.message) || e)); }
  }, [s.postSeen]);

  useEffect(() => { session().then(setSess); }, []);
  useEffect(() => { if (sess) refresh(); }, [sess]);

  const setShare = (k, v) => update((p) => ({ ...p, share: { ...p.share, [k]: v } }));

  const join = async () => {
    if (!code.trim()) return;
    setBusy('join'); setErr('');
    try {
      await rpc('join_class', { p_code: code.trim() });
      setCode('');
      setShare('on', true);
      await refresh();
    } catch (e) { setErr(String((e && e.message) || e)); }
    setBusy('');
  };
  const leave = (m) => Alert.alert('Leave this class?', 'Your teacher will stop seeing your data right away.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Leave', style: 'destructive', onPress: async () => {
      try {
        if (!isId(m.class_id) || !isId(sess.uid)) return;
        await remove('members?class_id=eq.' + m.class_id + '&student_id=eq.' + sess.uid);
        const d = await pullClasses();
        if (d && !d.members.length) { await removeSnapshot().catch(() => {}); setShare('on', false); }
        setData(d);
      } catch (e) { setErr(String((e && e.message) || e)); }
    } },
  ]);
  const out = async () => { await signOut(); setSess(null); setData(null); setShare('on', false); };

  const head = <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Classes</Text>;

  if (sess === undefined) return <View style={{ flex: 1 }} />;
  if (!sess) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {head}
        <Card title="Join a class">
          <Text style={{ color: c.ink, fontSize: 14, lineHeight: 21, marginBottom: 12 }}>
            Sign in to join your teacher's class. Their assignments and exams then appear in your Plan, and you choose what they can see. The rest of the app works without an account.
          </Text>
          <AuthScreen role="student" name={s.profile.name} onDone={() => session().then(setSess)} />
        </Card>
      </ScrollView>
    );
  }

  const announcements = data ? data.posts.filter((p) => p.kind === 'announcement') : [];
  const upcoming = data ? data.posts.filter((p) => p.kind !== 'announcement') : [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {head}
      {err ? <Text style={{ color: c.bad, fontSize: 13, marginBottom: 10 }}>{err}</Text> : null}

      <Card title="Join with a code">
        <Field value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="Class code from your teacher" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={join} />
        <Btn label="Join class" onPress={join} busy={busy === 'join'} />
      </Card>

      <Card title="My classes">
        {data && data.members.length ? data.members.map((m) => (
          <ItemRow key={m.class_id} title={(m.classes && m.classes.name) || 'Class'} meta={'Code ' + ((m.classes && m.classes.code) || '')} onDelete={() => leave(m)} />
        )) : <Empty text="You haven't joined a class yet." />}
      </Card>

      {data && data.members.length > 0 && (
        <Card title="What your teachers can see">
          <Toggle label="Share with my classes" value={s.share.on} onChange={(v) => { setShare('on', v); if (!v) removeSnapshot().catch(() => {}); }} />
          <View style={{ opacity: s.share.on ? 1 : 0.4 }} pointerEvents={s.share.on ? 'auto' : 'none'}>
            <Toggle label="Marks" value={s.share.marks} onChange={(v) => setShare('marks', v)} />
            <Toggle label="Study hours" value={s.share.hours} onChange={(v) => setShare('hours', v)} />
            <Toggle label="To-do list" value={s.share.tasks} onChange={(v) => setShare('tasks', v)} />
            <Toggle label="Finished items" value={s.share.done} onChange={(v) => setShare('done', v)} />
            <Toggle label="Procrastination flags" hint="Off by default" value={s.share.flags} onChange={(v) => setShare('flags', v)} />
          </View>
          <Text style={{ color: c.mut, fontSize: 12, marginTop: 8 }}>Only what's switched on is uploaded. It updates a few seconds after changes while the app is open.</Text>
        </Card>
      )}

      {announcements.length > 0 && (
        <Card title="Announcements">
          {announcements.slice(0, 10).map((p) => (
            <View key={p.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600' }}>{p.title}</Text>
              <Text style={{ color: c.mut, fontSize: 12.5 }}>{(p.classes && p.classes.name) || ''} · {String(p.created_at).slice(0, 10)}</Text>
              {p.notes ? <Text style={{ color: c.ink, fontSize: 14, marginTop: 4 }}>{p.notes}</Text> : null}
            </View>
          ))}
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card title="Posted by your teachers">
          {upcoming.slice(0, 15).map((p) => (
            <View key={p.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ color: c.ink, fontSize: 15 }}>{p.title}</Text>
              <Text style={{ color: c.mut, fontSize: 12.5 }}>{KIND[p.kind]} · {(p.classes && p.classes.name) || ''}{p.due_at ? ' · due ' + String(p.due_at).slice(0, 10) : ''}</Text>
              {p.notes ? <Text style={{ color: c.mut, fontSize: 13, marginTop: 3 }}>{p.notes}</Text> : null}
            </View>
          ))}
          <Text style={{ color: c.mut, fontSize: 12, marginTop: 8 }}>New ones are added to your Plan automatically.</Text>
        </Card>
      )}

      {data && data.marks.length > 0 && (
        <Card title="Marks from your teachers">
          {data.marks.map((m) => (
            <View key={m.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
              <Text style={{ color: c.ink, fontSize: 15 }}>{m.title}: {m.score}/{m.max_score}</Text>
              <Text style={{ color: c.mut, fontSize: 12.5 }}>{(m.classes && m.classes.name) || ''} · {String(m.created_at).slice(0, 10)}</Text>
              {m.comment ? <Text style={{ color: c.ink, fontSize: 14, marginTop: 3 }}>{m.comment}</Text> : null}
            </View>
          ))}
        </Card>
      )}

      <Btn label="Refresh" ghost onPress={refresh} style={{ marginBottom: 8 }} />
      <Btn label="Sign out" ghost onPress={out} />
    </ScrollView>
  );
}
