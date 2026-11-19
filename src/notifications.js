import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addDays, ymd, todayStr } from './logic';
import { analyze } from './insights';

// All reminders are local: scheduled on the phone, no server or push service involved.
export const TIMER_ID = 'sd-timer';

export function initNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT, lightColor: '#2f6f62' }).catch(() => {});
  }
}

export async function askNotify() {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const atTime = (day, hm) => { const [h, m] = hm.split(':').map(Number); const d = new Date(day + 'T00:00:00'); d.setHours(h, m, 0, 0); return d; };

// Rebuilds every reminder from scratch (cheap, and keeps things from drifting out of date).
export async function syncReminders(s) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith('sd-') && n.identifier !== TIMER_ID).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (!s.settings.remindOn) return;

  const list = [];
  const open = s.items.filter((i) => !i.done);

  if (s.settings.remindDeadlines) {
    open.forEach((i) => {
      const exam = i.type === 'exam';
      (exam ? [3, 1, 0] : [1, 0]).forEach((o) => {
        const day = ymd(addDays(new Date(i.due + 'T00:00:00'), -o));
        let when = atTime(day, o === 0 ? '08:00' : '18:00');
        if (o === 0 && i.time) when = new Date(new Date(i.due + 'T' + i.time + ':00').getTime() - 3600000);
        list.push({
          id: 'sd-d-' + i.id + '-' + o, when,
          title: exam ? 'Exam coming up' : 'Deadline coming up',
          body: i.title + (o === 0 ? ' is due today' : o === 1 ? ' is due tomorrow' : ' is in ' + o + ' days'),
        });
      });
    });
  }

  if (s.settings.remindDaily) {
    const studied = ((s.focus[todayStr()] || {}).min || 0) >= 25;
    const next = open.slice().sort((a, b) => a.due.localeCompare(b.due))[0];
    for (let k = 0; k < 7; k++) {
      if (k === 0 && studied) continue;
      const day = ymd(addDays(new Date(), k));
      list.push({ id: 'sd-n-' + day, when: atTime(day, s.settings.remindTime), title: 'Time for a focus session', body: next ? 'Next up: ' + next.title : 'Even 25 minutes counts.' });
    }
  }

  const a = analyze(s);
  if (a.level === 'high' && a.reasons.length) {
    list.push({ id: 'sd-p', when: atTime(ymd(addDays(new Date(), 1)), '09:00'), title: "You're falling behind", body: a.reasons[0].text });
  }

  // iOS keeps at most 64 scheduled notifications, so schedule the soonest 60.
  const upcoming = list.filter((n) => n.when.getTime() > Date.now() + 5000).sort((x, y) => x.when - y.when).slice(0, 60);
  for (const n of upcoming) {
    try {
      await Notifications.scheduleNotificationAsync({ identifier: n.id, content: { title: n.title, body: n.body }, trigger: { date: n.when, channelId: 'default' } });
    } catch (e) {}
  }
}

export async function scheduleTimer(ms, label) {
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.scheduleNotificationAsync({
      identifier: TIMER_ID,
      content: { title: label + ' finished', body: label === 'Focus' ? 'Nice work. Take a short break.' : 'Break is over. Ready for another round?' },
      trigger: { date: new Date(Date.now() + ms), channelId: 'default' },
    });
  } catch (e) {}
}
export async function cancelTimer() { try { await Notifications.cancelScheduledNotificationAsync(TIMER_ID); } catch (e) {} }

export async function testNotification() {
  await Notifications.scheduleNotificationAsync({ content: { title: 'Study Desk', body: 'Reminders are working.' }, trigger: { date: new Date(Date.now() + 4000), channelId: 'default' } });
}
