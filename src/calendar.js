import * as Calendar from 'expo-calendar';

// Writes to the phone's calendar. If your Google account is added on the phone,
// Android/iOS sync these events to Google Calendar on their own.
export async function askCalendar() {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function writableCalendars() {
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return cals
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, owner: c.ownerAccount || (c.source && c.source.name) || '' }));
}

export async function addEvent(calId, it) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const base = {
    title: (it.type === 'exam' ? 'Exam: ' : 'Due: ') + it.title,
    notes: (it.course ? it.course + '\n' : '') + 'Added by Study Desk',
    timeZone: tz,
    alarms: [{ relativeOffset: -1440 }, { relativeOffset: -60 }],
  };
  if (it.time) {
    const start = new Date(it.due + 'T' + it.time + ':00');
    return Calendar.createEventAsync(calId, { ...base, startDate: start, endDate: new Date(start.getTime() + 3600000) });
  }
  return Calendar.createEventAsync(calId, { ...base, allDay: true, startDate: new Date(it.due + 'T00:00:00'), endDate: new Date(it.due + 'T23:59:59') });
}

export async function removeEvent(id) {
  try { await Calendar.deleteEventAsync(id); } catch (e) {}
}
