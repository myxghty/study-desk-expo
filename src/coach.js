import { callFunction } from './supa';
import { courseStats, daysLeft, lastDays, todayStr } from './logic';
import { analyze } from './insights';

const cut = (v, n) => String(v == null ? '' : v).slice(0, n);

// What the AI is told. Notes are never included.
export function buildContext(s) {
  const open = s.items.filter((i) => !i.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 20)
    .map((i) => ({ title: cut(i.title, 80), course: cut(i.course, 40), type: i.type, due: i.due, days_left: daysLeft(i.due) }));
  const a = analyze(s);
  return {
    today: todayStr(),
    open_items: open,
    courses: courseStats(s.marks).slice(0, 12).map((x) => ({ course: cut(x.c, 40), average_percent: Math.round(x.pct), assessments: x.arr.length })),
    focus_minutes_last_7_days: lastDays(7).map((d) => Math.round((s.focus[d] && s.focus[d].min) || 0)),
    procrastination: { level: a.level, reasons: a.reasons.slice(0, 5).map((r) => cut(r.text, 120)) },
  };
}

export async function askCoach(s, question) {
  try {
    const r = await callFunction('coach', { question: cut(question, 500), context: buildContext(s) });
    if (!r || !r.reply) throw new Error('No answer came back.');
    return String(r.reply);
  } catch (e) {
    if (e && (e.status === 404 || /not found|not configured/i.test(String(e.message)) || e.status === 503)) throw Object.assign(new Error('not_setup'), { code: 'not_setup' });
    throw e;
  }
}

// Works with no internet and no AI: a plain rule-based plan from the same data.
export function localPlan(s) {
  const open = s.items.filter((i) => !i.done).sort((a, b) => a.due.localeCompare(b.due));
  const lines = [];
  const overdue = open.filter((i) => daysLeft(i.due) < 0);
  const soon = open.filter((i) => daysLeft(i.due) >= 0).slice(0, 4);
  if (!open.length) lines.push('Nothing is due. Use the time to review notes or get ahead on a course you find hard.');
  if (overdue.length) lines.push('1. Clear what is overdue first: ' + overdue.slice(0, 3).map((i) => i.title).join(', ') + '.');
  if (soon.length) {
    lines.push((overdue.length ? '2. ' : '1. ') + 'Next up:');
    soon.forEach((i) => { const n = daysLeft(i.due); lines.push('   • ' + i.title + (i.type === 'exam' ? ' (exam)' : '') + ' – ' + (n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days')); });
  }
  const exam = open.find((i) => i.type === 'exam' && daysLeft(i.due) >= 0 && daysLeft(i.due) <= 7);
  if (exam) lines.push('Your exam "' + exam.title + '" is close. Aim for 2 focus blocks a day on it until then.');
  const weak = courseStats(s.marks).filter((x) => x.pct < 60).sort((a, b) => a.pct - b.pct)[0];
  if (weak) lines.push('Your lowest course is ' + weak.c + ' (' + Math.round(weak.pct) + '%). Give it one extra block this week.');
  const today = (s.focus[todayStr()] || {}).min || 0;
  lines.push(today < 25 ? 'You have not logged a focus block today. Start one 25-minute block now, then take a 5-minute break.' : 'Good, you have ' + Math.round(today) + ' focus minutes today. One more block would be a strong finish.');
  return lines.join('\n');
}
