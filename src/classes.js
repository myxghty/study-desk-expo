import { session, select, isId } from './supa';
import { addEvent } from './calendar';
import { todayStr } from './logic';

// Everything a student sees from their classes.
export async function pullClasses() {
  const sess = await session();
  if (!sess || !isId(sess.uid)) return null;
  const [members, posts, marks] = await Promise.all([
    select('members?select=class_id,classes(name,code)&student_id=eq.' + sess.uid),
    select('posts?select=id,class_id,kind,title,notes,due_at,created_at,classes(name)&order=created_at.desc&limit=100'),
    select('teacher_marks?select=id,title,score,max_score,comment,created_at,classes(name)&student_id=eq.' + sess.uid + '&order=created_at.desc&limit=100'),
  ]);
  return { members: members || [], posts: posts || [], marks: marks || [] };
}

// Teacher posts with a due date land in the student's own list (once each, even
// if the student later deletes them) and in the phone calendar if that's on.
export async function landPosts(s, update, posts) {
  const seen = s.postSeen || {};
  const fresh = posts.filter((p) => (p.kind === 'assignment' || p.kind === 'exam') && p.due_at && !seen[p.id]);
  if (!fresh.length) return 0;
  const items = [];
  for (const p of fresh) {
    const it = {
      id: 'post:' + p.id, title: String(p.title).slice(0, 120), course: String((p.classes && p.classes.name) || '').slice(0, 80),
      due: String(p.due_at).slice(0, 10), type: p.kind === 'exam' ? 'exam' : 'task', done: false, created: todayStr(), fromTeacher: true,
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(it.due)) continue;
    if (s.settings.calOn && s.settings.calId && it.due >= todayStr()) { try { it.eventId = await addEvent(s.settings.calId, it); } catch (e) {} }
    items.push(it);
  }
  update((p) => {
    const ps = { ...(p.postSeen || {}) };
    fresh.forEach((x) => { ps[x.id] = 1; });
    const have = new Set(p.items.map((i) => i.id));
    return { ...p, postSeen: ps, items: [...p.items, ...items.filter((i) => !have.has(i.id))] };
  });
  return items.length;
}
