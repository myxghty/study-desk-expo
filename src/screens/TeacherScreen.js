import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Pressable, Share } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Chip, Field, DateField, Empty, ItemRow } from '../components/ui';
import { select, insert, remove, rpc, isId, signOut } from '../supa';
import { todayStr } from '../logic';
import StudentDetail from './StudentDetail';

const KINDS = [['assignment', 'Assignment'], ['exam', 'Exam'], ['announcement', 'Announcement']];
const errText = (e) => String((e && e.message) || e);

function ClassDetail({ cls, onBack, onGone }) {
  const c = useC();
  const [members, setMembers] = useState(null);
  const [posts, setPosts] = useState([]);
  const [student, setStudent] = useState(null);
  const [kind, setKind] = useState('assignment');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [due, setDue] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [m, p] = await Promise.all([
        select('members?select=student_id,joined_at,profiles(name)&class_id=eq.' + cls.id + '&order=joined_at.asc'),
        select('posts?select=id,kind,title,notes,due_at,created_at&class_id=eq.' + cls.id + '&order=created_at.desc&limit=50'),
      ]);
      setMembers(m || []); setPosts(p || []);
    } catch (e) { setErr(errText(e)); }
  }, [cls.id]);
  useEffect(() => { load(); }, [load]);

  const post = async () => {
    if (!title.trim()) return;
    setBusy(true); setErr('');
    try {
      const row = { class_id: cls.id, kind, title: title.trim().slice(0, 120), notes: notes.trim().slice(0, 2000) };
      if (kind !== 'announcement') row.due_at = due + 'T12:00:00Z';
      await insert('posts', row);
      setTitle(''); setNotes('');
      await load();
    } catch (e) { setErr(errText(e)); }
    setBusy(false);
  };
  const delPost = (p) => Alert.alert('Delete this post?', 'It disappears for students. Items already in their Plan stay there.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { try { if (isId(p.id)) await remove('posts?id=eq.' + p.id); await load(); } catch (e) { setErr(errText(e)); } } },
  ]);
  const delClass = () => Alert.alert('Delete this class?', 'Students are removed and all posts and marks in it are deleted. This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete class', style: 'destructive', onPress: async () => { try { await remove('classes?id=eq.' + cls.id); onGone(); } catch (e) { setErr(errText(e)); } } },
  ]);

  if (student) return <StudentDetail cls={cls} student={student} onBack={() => setStudent(null)} />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={10}><Text style={{ color: c.acc, fontSize: 15, marginBottom: 6 }}>‹ All classes</Text></Pressable>
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: '700' }}>{cls.name}</Text>
      <Text style={{ color: c.mut, fontSize: 14, marginBottom: 14 }}>Class code <Text style={{ color: c.ink, fontWeight: '700', letterSpacing: 2 }}>{cls.code}</Text></Text>
      <Btn label="Share the code" ghost onPress={() => Share.share({ message: 'Join my class "' + cls.name + '" in Study Desk with code ' + cls.code })} style={{ marginBottom: 14 }} />
      {err ? <Text style={{ color: c.bad, fontSize: 13, marginBottom: 10 }}>{err}</Text> : null}

      <Card title="Post to the class">
        <View style={{ flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' }}>
          {KINDS.map(([k, l]) => <Chip key={k} label={l} on={kind === k} onPress={() => setKind(k)} style={{ marginBottom: 6 }} />)}
        </View>
        <Field value={title} onChangeText={setTitle} placeholder={kind === 'exam' ? 'Exam title' : kind === 'assignment' ? 'Assignment title' : 'Announcement'} maxLength={120} />
        <Field value={notes} onChangeText={setNotes} placeholder="Details (optional)" multiline maxLength={2000} style={{ minHeight: 60, textAlignVertical: 'top' }} />
        {kind !== 'announcement' && <DateField value={due} onChange={setDue} />}
        <Btn label="Post" onPress={post} busy={busy} />
        {kind !== 'announcement' && <Text style={{ color: c.mut, fontSize: 12, marginTop: 8 }}>It will appear in every student's Plan and phone calendar.</Text>}
      </Card>

      <Card title={'Students' + (members ? ' (' + members.length + ')' : '')}>
        {members === null ? <Empty text="Loading…" /> : members.length === 0 ? <Empty text="No one has joined yet. Share the class code." /> : members.map((m) => (
          <Pressable key={m.student_id} onPress={() => setStudent({ id: m.student_id, name: (m.profiles && m.profiles.name) || 'Student' })} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: c.ink, fontSize: 16 }}>{(m.profiles && m.profiles.name) || 'Student'}</Text>
            <Text style={{ color: c.mut, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Posts">
        {posts.length === 0 ? <Empty text="Nothing posted yet." /> : posts.map((p) => (
          <ItemRow key={p.id} title={p.title} meta={(p.kind[0].toUpperCase() + p.kind.slice(1)) + (p.due_at ? ' · due ' + String(p.due_at).slice(0, 10) : '')} onDelete={() => delPost(p)} />
        ))}
      </Card>

      <Btn label="Delete class" ghost onPress={delClass} />
    </ScrollView>
  );
}

export default function TeacherScreen() {
  const c = useC();
  const [classes, setClasses] = useState(null);
  const [open, setOpen] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try { setClasses(await select('classes?select=id,name,code,created_at&order=created_at.desc')); }
    catch (e) { setErr(errText(e)); setClasses([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr('');
    try { await rpc('create_class', { p_name: name.trim() }); setName(''); await load(); }
    catch (e) { setErr(errText(e)); }
    setBusy(false);
  };

  if (open) return <ClassDetail cls={open} onBack={() => setOpen(null)} onGone={() => { setOpen(null); load(); }} />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Your classes</Text>
      {err ? <Text style={{ color: c.bad, fontSize: 13, marginBottom: 10 }}>{err}</Text> : null}
      <Card title="New class">
        <Field value={name} onChangeText={setName} placeholder="e.g. CS101 Section B" maxLength={80} onSubmitEditing={create} />
        <Btn label="Create class" onPress={create} busy={busy} />
      </Card>
      <Card title="Classes">
        {classes === null ? <Empty text="Loading…" /> : classes.length === 0 ? <Empty text="No classes yet. Create one above, then share its code." /> : classes.map((k) => (
          <Pressable key={k.id} onPress={() => setOpen(k)} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: c.ink, fontSize: 16 }}>{k.name}</Text>
              <Text style={{ color: c.mut, fontSize: 12.5 }}>Code {k.code}</Text>
            </View>
            <Text style={{ color: c.mut, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </Card>
      <Btn label="Refresh" ghost onPress={load} />
    </ScrollView>
  );
}

export function TeacherAccount({ name, onOut }) {
  const c = useC();
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Account</Text>
      <Card title="Signed in">
        <Text style={{ color: c.ink, fontSize: 16, marginBottom: 12 }}>{name || 'Teacher'}</Text>
        <Btn label="Sign out" ghost onPress={async () => { await signOut(); onOut(); }} />
      </Card>
    </ScrollView>
  );
}
