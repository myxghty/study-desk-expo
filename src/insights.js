import { daysLeft, lastDays, todayStr } from './logic';

// Rule-based procrastination check, using only what the app itself can see:
// deadlines, logged focus time, abandoned timers, and when things get finished.
export function analyze(s) {
  const open = s.items.filter((i) => !i.done);
  const last3 = lastDays(3);
  const min3 = last3.reduce((a, d) => a + ((s.focus[d] && s.focus[d].min) || 0), 0);
  const reasons = [];
  const tips = [];
  let score = 0;

  const overdue = open.filter((i) => daysLeft(i.due) < 0);
  if (overdue.length) {
    score += Math.min(30, overdue.length * 15);
    reasons.push({ tone: 'bad', text: overdue.length + ' overdue: ' + overdue.slice(0, 2).map((i) => i.title).join(', ') });
  }

  const urgent = open.filter((i) => { const n = daysLeft(i.due); return n >= 0 && n <= 3; });
  if (urgent.length && min3 < 75) {
    score += min3 < 30 ? 30 : 15;
    reasons.push({ tone: 'warn', text: urgent.length + ' due within 3 days, but only ' + min3 + ' focus min logged in the last 3 days' });
  }

  const exams = open.filter((i) => i.type === 'exam' && daysLeft(i.due) >= 0 && daysLeft(i.due) <= 7);
  if (exams.length && min3 < 60) {
    score += 15;
    reasons.push({ tone: 'warn', text: 'Exam within a week: ' + exams[0].title });
  }

  const focusDays = Object.keys(s.focus).filter((d) => s.focus[d].min > 0).sort();
  const gap = focusDays.length ? Math.round((new Date(todayStr() + 'T00:00:00') - new Date(focusDays[focusDays.length - 1] + 'T00:00:00')) / 864e5) : null;
  const dueSoon = open.some((i) => daysLeft(i.due) >= 0 && daysLeft(i.due) <= 7);
  if (dueSoon && (gap === null || gap >= 2)) {
    score += gap === null || gap >= 4 ? 20 : 15;
    reasons.push({ tone: 'warn', text: gap === null ? 'No focus sessions logged yet' : 'No focus session for ' + gap + ' days' });
  }

  const ab = last3.reduce((a, d) => a + (s.stats.abandoned[d] || 0), 0);
  const st = last3.reduce((a, d) => a + (s.stats.starts[d] || 0), 0);
  if (ab >= 2 && ab >= st * 0.5) {
    score += 10;
    reasons.push({ tone: 'warn', text: ab + ' focus sessions abandoned in the last 3 days' });
  }

  const finished = s.items.filter((i) => i.done && i.doneAt && daysLeft(i.due) >= -30);
  const late = finished.filter((i) => i.doneAt >= i.due);
  if (finished.length >= 3 && late.length / finished.length >= 0.6) {
    score += 15;
    reasons.push({ tone: 'warn', text: late.length + ' of your last ' + finished.length + ' finished items were done on or after the due date' });
  }

  score = Math.min(100, score);
  const level = score < 25 ? 'low' : score < 55 ? 'watch' : 'high';

  const next = [...overdue, ...urgent].sort((a, b) => a.due.localeCompare(b.due))[0];
  if (next) tips.push('Start one 25-minute focus session on "' + next.title + '" now.');
  if (exams.length) tips.push('Split "' + exams[0].title + '" into short daily sessions instead of one big push.');
  if (gap !== null && gap >= 2) tips.push('A 10-minute session today restarts your streak.');
  if (level === 'low') tips.push("You're on track. Keep the daily sessions going.");

  return { score, level, reasons, tips, min3 };
}
