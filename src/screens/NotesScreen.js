import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Field, CourseField, Toggle, Empty } from '../components/ui';
import { uid, todayStr } from '../logic';

export default function NotesScreen({ s, update }) {
  const c = useC();
  const [edit, setEdit] = useState(null);          // null | { id|null, title, body, course, shared }
  const notes = s.notes || [];
  const courses = [...new Set([...s.items.map((i) => i.course), ...s.marks.map((m) => m.course), ...notes.map((n) => n.course)].filter(Boolean))];

  const save = () => {
    const title = edit.title.trim();
    if (!title && !edit.body.trim()) { setEdit(null); return; }
    const n = { id: edit.id || uid(), title: title || 'Untitled', body: edit.body, course: edit.course.trim(), shared: edit.shared, updated: todayStr() };
    update((p) => ({ ...p, notes: edit.id ? p.notes.map((x) => (x.id === n.id ? n : x)) : [n, ...(p.notes || [])] }));
    setEdit(null);
  };
  const del = () => Alert.alert('Delete this note?', '', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { update((p) => ({ ...p, notes: p.notes.filter((x) => x.id !== edit.id) })); setEdit(null); } },
  ]);

  if (edit) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => setEdit(null)} hitSlop={10}><Text style={{ color: c.acc, fontSize: 15, marginBottom: 10 }}>‹ Notes</Text></Pressable>
        <Card>
          <Field value={edit.title} onChangeText={(v) => setEdit({ ...edit, title: v })} placeholder="Title" maxLength={100} />
          <CourseField value={edit.course} onChangeText={(v) => setEdit({ ...edit, course: v })} courses={courses} />
          <Field value={edit.body} onChangeText={(v) => setEdit({ ...edit, body: v })} placeholder="Write your note…" multiline maxLength={5000} style={{ minHeight: 180, textAlignVertical: 'top' }} />
          <Toggle label="Share with my teachers" hint={s.share.notes ? 'They can read this note.' : 'Notes sharing is switched off in Classes, so nobody sees it yet.'} value={edit.shared} onChange={(v) => setEdit({ ...edit, shared: v })} />
          <Btn label="Save note" onPress={save} style={{ marginTop: 8 }} />
          {edit.id ? <Btn label="Delete" ghost onPress={del} style={{ marginTop: 8 }} /> : null}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Notes</Text>
      <Btn label="New note" onPress={() => setEdit({ id: null, title: '', body: '', course: '', shared: false })} style={{ marginBottom: 14 }} />
      <Card title={'Your notes (' + notes.length + ')'}>
        {notes.length === 0 ? <Empty text="No notes yet. Notes stay private unless you switch on 'Share with my teachers' for a note." /> : notes.map((n) => (
          <Pressable key={n.id} onPress={() => setEdit({ id: n.id, title: n.title, body: n.body, course: n.course || '', shared: !!n.shared })} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text numberOfLines={1} style={{ color: c.ink, fontSize: 16, fontWeight: '600', flex: 1 }}>{n.title}</Text>
              {n.shared ? <Text style={{ color: c.acc, fontSize: 12, fontWeight: '700', marginLeft: 8 }}>SHARED</Text> : null}
            </View>
            <Text style={{ color: c.mut, fontSize: 12.5 }}>{n.course ? n.course + ' · ' : ''}{n.updated || ''}</Text>
            {n.body ? <Text numberOfLines={2} style={{ color: c.mut, fontSize: 14, marginTop: 3 }}>{n.body}</Text> : null}
          </Pressable>
        ))}
      </Card>
    </ScrollView>
  );
}
