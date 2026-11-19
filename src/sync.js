import { session, upsert, remove, isId } from './supa';
import { lastDays } from './logic';
import { analyze } from './insights';

// Builds only the parts the student chose to share.
export function buildSnapshot(s) {
  const sh = s.share;
  const snap = { v: 1, name: s.profile.name || 'Student' };
  if (sh.marks) snap.marks = s.marks.map((m) => ({ course: m.course, name: m.name, score: m.score, max: m.max, w: m.w, kind: m.kind || 'exam' }));
  if (sh.hours) {
    snap.focus = {};
    lastDays(30).forEach((d) => { if (s.focus[d]) snap.focus[d] = s.focus[d]; });
    snap.totalMin = Object.values(s.focus).reduce((a, f) => a + f.min, 0);
  }
  if (sh.tasks) {
    snap.open = s.items.filter((i) => !i.done).map((i) => ({ title: i.title, course: i.course, type: i.type, due: i.due }));
    snap.quickOpen = s.quick.filter((q) => !q.done).map((q) => q.text);
  }
  if (sh.done) {
    snap.done = s.items.filter((i) => i.done).sort((a, b) => (a.doneAt || '').localeCompare(b.doneAt || '')).slice(-40)
      .map((i) => ({ title: i.title, course: i.course, type: i.type, due: i.due, doneAt: i.doneAt || null }));
    snap.quickDone = s.quick.filter((q) => q.done).map((q) => q.text).slice(0, 40);
  }
  if (sh.notes) {
    // only notes the student marked "share with teachers"
    snap.notes = (s.notes || []).filter((n) => n.shared).slice(0, 30)
      .map((n) => ({ title: String(n.title || '').slice(0, 100), course: String(n.course || '').slice(0, 60), body: String(n.body || '').slice(0, 4000), updated: n.updated || null }));
  }
  if (sh.flags) {
    const a = analyze(s);
    snap.flags = { score: a.score, level: a.level, reasons: a.reasons.map((r) => r.text) };
  }
  return snap;
}

// Writes the student's own snapshot row. Teachers can read it only while the
// student is a member of one of their classes (enforced by the database).
export async function push(s) {
  if (!s.share.on) return;
  const sess = await session();
  if (!sess) return;
  await upsert('snapshots', { student_id: sess.uid, data: buildSnapshot(s), updated_at: new Date().toISOString() }, 'student_id');
}

export async function removeSnapshot() {
  const sess = await session();
  if (sess && isId(sess.uid)) await remove('snapshots?student_id=eq.' + sess.uid);
}
