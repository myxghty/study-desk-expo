import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Modal } from 'react-native';
import { useC } from '../theme';
import { Card, Btn, Chip, FormField, Toggle, TimeField } from '../components/ui';
import { nameError, NAME_MAX } from '../validate';
import { session, signOut } from '../supa';
import { removeSnapshot } from '../sync';
import { PinSetup, PinVerify } from '../components/PinPad';
import { askCalendar, writableCalendars, addEvent } from '../calendar';
import { askNotify, syncReminders, testNotification } from '../notifications';
import { hasPin, setPin, clearPin, bioAvailable, bioEnabled, setBio, bioAuth } from '../security';
import { todayStr } from '../logic';

const TIMES = ['17:00', '18:00', '19:00', '20:00', '21:00'];

export default function SettingsScreen({ s, update }) {
  const c = useC();
  const [cals, setCals] = useState([]);
  const [busy, setBusy] = useState('');
  const [lock, setLock] = useState(null);        // null | enable | disable | change-verify | change-new
  const [bioA, setBioA] = useState(false);
  const [bioE, setBioE] = useState(false);
  const [acct, setAcct] = useState(null);
  const [nameErr, setNameErr] = useState('');
  const [nameShake, setNameShake] = useState(0);
  useEffect(() => { session().then((x) => setAcct(x ? x.email : null)); }, []);
  const setShareOn = (v) => update((p) => ({ ...p, share: { ...p.share, on: v } }));
  const logout = () => Alert.alert('Log out?', 'Your plan and marks stay on this phone. Your teachers stop seeing your shared data. You\'ll go back to the student / teacher screen and sign in again with your email.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: async () => { try { await removeSnapshot(); } catch (e) {} await signOut(); update((p) => ({ ...p, share: { ...p.share, on: false }, profile: { ...p.profile, role: '' } })); setAcct(null); } },
  ]);

  useEffect(() => { (async () => { setBioA(await bioAvailable()); setBioE(await bioEnabled()); })(); }, [lock]);

  const set = (k, v) => update((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));
  const run = async (name, fn) => { setBusy(name); try { await fn(); } finally { setBusy(''); } };
  const fail = (e) => Alert.alert('Something went wrong', String((e && e.message) || e));

  // ---- lock ----
  const toggleBio = async (v) => {
    if (v && !(await bioAuth('Confirm it works'))) return;
    await setBio(v); setBioE(v);
  };
  const lockModal = () => {
    if (lock === 'enable' || lock === 'change-new') {
      return <PinSetup title={lock === 'change-new' ? 'Choose a new PIN' : 'Choose a PIN'} onCancel={() => setLock(null)} onDone={async (pin) => { await setPin(pin); update((p) => ({ ...p, profile: { ...p.profile, lock: true } })); setLock(null); }} />;
    }
    return <PinVerify title={lock === 'disable' ? 'Enter your PIN to turn the lock off' : 'Enter your current PIN'} onCancel={() => setLock(null)} onOk={async () => {
      if (lock === 'disable') { await clearPin(); update((p) => ({ ...p, profile: { ...p.profile, lock: false } })); setLock(null); }
      else setLock('change-new');
    }} />;
  };

  // ---- reminders ----
  const toggleRemind = async (v) => {
    if (v && !(await askNotify())) { Alert.alert('Notifications are off', 'Allow notifications for Study Desk in your phone settings, then try again.'); return; }
    set('remindOn', v);
  };

  // ---- calendar ----
  const loadCals = async () => {
    if (!(await askCalendar())) { Alert.alert('Calendar permission is needed', 'Allow calendar access in your phone settings.'); return false; }
    const list = await writableCalendars();
    setCals(list);
    if (!list.length) { Alert.alert('No writable calendar found', 'Add your Google account to the phone first.'); return false; }
    if (!s.settings.calId) set('calId', (list.find((x) => /google|gmail/i.test(x.owner)) || list[0]).id);
    return true;
  };
  const toggleCal = async (v) => { if (v && !(await loadCals())) return; set('calOn', v); };
  const addExisting = () => run('cal', async () => {
    const todo = s.items.filter((i) => !i.done && !i.eventId && i.due >= todayStr());
    const ids = {};
    for (const i of todo) { try { ids[i.id] = await addEvent(s.settings.calId, i); } catch (e) {} }
    update((p) => ({ ...p, items: p.items.map((x) => (ids[x.id] ? { ...x, eventId: ids[x.id] } : x)) }));
    Alert.alert('Done', Object.keys(ids).length + ' added to your calendar.');
  });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text style={{ color: c.ink, fontSize: 28, fontWeight: '700', marginBottom: 16 }}>Settings</Text>

      <Card title="You">
        <FormField value={s.profile.name} maxLength={NAME_MAX} onChangeText={(v) => { update((p) => ({ ...p, profile: { ...p.profile, name: v } })); if (nameErr) setNameErr(nameError(v)); }}
          onBlur={() => { const e = nameError(s.profile.name); setNameErr(e); if (e) setNameShake((n) => n + 1); }}
          placeholder="Your name (shown to your teachers or students)" error={nameErr} shake={nameShake} />
      </Card>

      <Card title="Privacy and lock">
        <Toggle label="App lock" hint="Ask for a 6-digit PIN when the app opens" value={s.profile.lock} onChange={(v) => setLock(v ? 'enable' : 'disable')} />
        {s.profile.lock && bioA ? <Toggle label="Fingerprint / Face ID" value={bioE} onChange={toggleBio} /> : null}
        {s.profile.lock ? <Btn label="Change PIN" ghost onPress={() => setLock('change-verify')} style={{ marginTop: 6 }} /> : null}
        <Text style={{ color: c.mut, fontSize: 12, marginTop: 10 }}>The PIN is stored only as a salted hash on this phone, and repeated wrong guesses lock you out for longer each time.</Text>
      </Card>

      <Card title="Reminders">
        <Toggle label="Study reminders" hint="Deadline alerts and a daily nudge, scheduled on your phone" value={s.settings.remindOn} onChange={toggleRemind} />
        {s.settings.remindOn && (
          <View>
            <Toggle label="Deadline alerts" hint="Exams: 3 days, 1 day, and the morning of. Tasks: the evening before and the morning of." value={s.settings.remindDeadlines} onChange={(v) => set('remindDeadlines', v)} />
            <Toggle label="Daily focus nudge" hint="Skipped on days you've already studied" value={s.settings.remindDaily} onChange={(v) => set('remindDaily', v)} />
            {s.settings.remindDaily && (
              <View style={{ marginVertical: 4 }}>
                <TimeField label="Nudge me at" value={s.settings.remindTime} onChange={(v) => set('remindTime', v)} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginBottom: 8 }}>
                  {TIMES.map((t) => <Chip key={t} label={t} on={s.settings.remindTime === t} onPress={() => set('remindTime', t)} />)}
                </View>
              </View>
            )}
            <Btn label="Send a test reminder" ghost onPress={() => testNotification().catch(fail)} />
          </View>
        )}
      </Card>

      <Card title="Calendar">
        <Toggle label="Add deadlines to my calendar" hint="Uses your phone's calendar. If your Google account is on the phone, it syncs to Google Calendar." value={s.settings.calOn} onChange={toggleCal} />
        {s.settings.calOn && (
          <View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6, marginVertical: 8 }}>
              {cals.map((x) => <Chip key={x.id} label={x.title + (x.owner ? ' · ' + x.owner : '')} on={s.settings.calId === x.id} onPress={() => set('calId', x.id)} />)}
            </View>
            <Btn label="Add my existing deadlines" ghost busy={busy === 'cal'} onPress={addExisting} />
          </View>
        )}
      </Card>

      <Card title="Account">
        {acct ? (
          <View>
            <Text style={{ color: c.ink, fontSize: 15, marginBottom: 4 }}>Signed in as {acct}</Text>
            <Text style={{ color: c.mut, fontSize: 13, marginBottom: 12 }}>Choose what your teachers can see in the Classes tab.</Text>
            <Btn label="Log out" ghost onPress={logout} />
          </View>
        ) : (
          <Text style={{ color: c.mut, fontSize: 14, lineHeight: 20 }}>You're not signed in.</Text>
        )}
      </Card>

      <Modal visible={!!lock} animationType="slide" onRequestClose={() => setLock(null)}>
        <View style={{ flex: 1, backgroundColor: c.bg }}>{lock ? lockModal() : null}</View>
      </Modal>
    </ScrollView>
  );
}
