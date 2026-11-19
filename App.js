import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, useColorScheme, KeyboardAvoidingView, Platform, AppState, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext, light, dark } from './src/theme';
import { useStore } from './src/store';
import { push } from './src/sync';
import { session } from './src/supa';
import { pullClasses, landPosts } from './src/classes';
import { hasPin } from './src/security';
import { initNotifications, syncReminders } from './src/notifications';
import { analyze } from './src/insights';
import { todayStr } from './src/logic';
import { BootScreen, Logo } from './src/components/Loader';
import { Card, Btn } from './src/components/ui';
import Drawer from './src/components/Drawer';
import appJson from './app.json';

const VERSION = (appJson.expo && appJson.expo.version) || '';
import WelcomeScreen from './src/screens/WelcomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import LockScreen from './src/screens/LockScreen';
import PlanScreen from './src/screens/PlanScreen';
import MarksScreen from './src/screens/MarksScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ClassesScreen from './src/screens/ClassesScreen';
import AuthScreen from './src/screens/AuthScreen';
import TeacherScreen, { TeacherAccount } from './src/screens/TeacherScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const STUDENT_TABS = [['plan', 'Plan'], ['marks', 'Marks'], ['classes', 'Classes'], ['insights', 'Insights'], ['settings', 'Settings']];
const TEACHER_TABS = [['classes', 'Classes'], ['account', 'Account']];
const RELOCK_AFTER_MS = 60000;

// Everyone signs in with an email. After logging out you land here: pick student or teacher, then sign in.
function Gate({ s, update, c, onSignedIn }) {
  const role = s.profile.role;
  const pick = (r) => update((p) => ({ ...p, profile: { ...p.profile, role: r } }));
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Logo size={64} />
        <Text style={{ color: c.ink, fontSize: 24, fontWeight: '700', marginTop: 12 }}>{!role ? 'Who is this for?' : role === 'teacher' ? 'Teacher sign in' : 'Student sign in'}</Text>
      </View>
      {!role ? (
        <Card>
          <Text style={{ color: c.mut, fontSize: 14, marginBottom: 14 }}>Choose how you use Study Desk, then sign in with your email.</Text>
          <Btn label="I'm a student" onPress={() => pick('student')} />
          <Btn label="I'm a teacher" ghost onPress={() => pick('teacher')} style={{ marginTop: 8 }} />
        </Card>
      ) : (
        <Card>
          <AuthScreen role={role} name={s.profile.name} onDone={(name) => { if (name) update((p) => ({ ...p, profile: { ...p.profile, name } })); onSignedIn(); }} />
          <Btn label="Switch student / teacher" ghost onPress={() => pick('')} style={{ marginTop: 8 }} />
        </Card>
      )}
    </ScrollView>
  );
}

function TopBar({ title, onMenu, c }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 48, backgroundColor: c.bg }}>
      <Pressable onPress={onMenu} hitSlop={8} accessibilityLabel="Open menu" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        {[0, 1, 2].map((k) => <View key={k} style={{ width: 22, height: 2.5, borderRadius: 2, backgroundColor: c.ink, marginVertical: 2.5 }} />)}
      </Pressable>
      <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700', marginLeft: 4 }}>{title}</Text>
    </View>
  );
}

export default function App() {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? dark : light;
  const [s, update] = useStore();
  const [tab, setTab] = useState('plan');
  const [menu, setMenu] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [locked, setLocked] = useState(null);          // null = still checking
  const leftAt = useRef(0);
  const lockOn = !!(s && s.profile.lock);
  const teacher = !!(s && s.profile.role === 'teacher');
  const [sess, setSess] = useState(undefined);       // sign-in session (teachers must have one)
  const sRef = useRef(null);
  sRef.current = s;

  useEffect(() => { initNotifications(); }, []);
  useEffect(() => { session().then(setSess); }, []);

  // Students: pull teacher posts into the Plan (once each).
  const landNow = () => {
    const cur = sRef.current;
    if (!cur || cur.profile.role === 'teacher') return;
    pullClasses().then((d) => { if (d) return landPosts(sRef.current, update, d.posts); }).catch(() => {});
  };


  // Decide once, after loading, whether to start on the lock screen.
  useEffect(() => {
    if (!s || locked !== null) return;
    hasPin().then((h) => setLocked(!!(s.profile.lock && h)));
  }, [s]);

  // Re-lock if the app was away for over a minute.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background' || st === 'inactive') { leftAt.current = leftAt.current || Date.now(); }
      else if (st === 'active') {
        if (lockOn && leftAt.current && Date.now() - leftAt.current > RELOCK_AFTER_MS) setLocked(true);
        leftAt.current = 0;
        landNow();
      }
    });
    return () => sub.remove();
  }, [lockOn]);

  // Once unlocked, fetch new posts from the student's classes.
  useEffect(() => { if (s && s.profile.onboarded && locked === false) landNow(); }, [!!s, locked]);

  // Keep the student's shared snapshot fresh (only if sharing is on).
  useEffect(() => {
    if (!s || teacher || !s.share.on) return;
    const t = setTimeout(() => { push(s).catch(() => {}); }, 4000);
    return () => clearTimeout(t);
  }, [s]);

  // Rebuild local reminders when something that affects them changes.
  const sig = s ? JSON.stringify([s.settings.remindOn, s.settings.remindDeadlines, s.settings.remindDaily, s.settings.remindTime,
    s.items.map((i) => [i.id, i.due, i.time, i.type, i.done]), ((s.focus[todayStr()] || {}).min || 0) >= 25, analyze(s).level]) : '';
  useEffect(() => {
    if (!s) return;
    const t = setTimeout(() => { syncReminders(s).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [sig]);

  let body;
  if (!s || locked === null) {
    body = <BootScreen />;
  } else if (!s.profile.onboarded) {
    body = !welcomed
      ? <WelcomeScreen onDone={() => setWelcomed(true)} />
      : <SetupScreen onDone={({ name, lock, role }) => { update((p) => ({ ...p, profile: { ...p.profile, name, lock, role, onboarded: true } })); setLocked(false); }} />;
  } else if (locked) {
    body = <LockScreen name={s.profile.name} onUnlock={() => setLocked(false)} />;
  } else if (sess === undefined) {
    body = <BootScreen />;
  } else if (!sess || !s.profile.role) {
    body = <Gate s={s} update={update} c={c} onSignedIn={() => session().then(setSess)} />;
  } else if (teacher) {
    const tt = TEACHER_TABS.some(([k]) => k === tab) ? tab : 'classes';
    body = (
      <View style={{ flex: 1 }}>
        <TopBar title={(TEACHER_TABS.find(([k]) => k === tt) || [])[1]} onMenu={() => setMenu(true)} c={c} />
        <View style={{ flex: 1 }}>
          {tt === 'classes' ? <TeacherScreen /> : <TeacherAccount name={s.profile.name} onOut={() => { update((p) => ({ ...p, profile: { ...p.profile, role: '' } })); setSess(null); setTab('plan'); }} />}
        </View>
        <Drawer open={menu} onClose={() => setMenu(false)} tabs={TEACHER_TABS} tab={tt} name={s.profile.name} version={VERSION} onPick={(k) => { setTab(k); setMenu(false); }} />
      </View>
    );
  } else {
    const screen = tab === 'plan' ? <PlanScreen s={s} update={update} openInsights={() => setTab('insights')} />
      : tab === 'marks' ? <MarksScreen s={s} update={update} />
      : tab === 'classes' ? <ClassesScreen s={s} update={update} />
      : tab === 'insights' ? <InsightsScreen s={s} />
      : <SettingsScreen s={s} update={update} />;
    body = (
      <View style={{ flex: 1 }}>
        <TopBar title={(STUDENT_TABS.find(([k]) => k === tab) || [])[1]} onMenu={() => setMenu(true)} c={c} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{screen}</KeyboardAvoidingView>
        <Drawer open={menu} onClose={() => setMenu(false)} tabs={STUDENT_TABS} tab={tab} name={s.profile.name} version={VERSION} onPick={(k) => { setTab(k); setMenu(false); }} />
      </View>
    );
  }

  const boot = !s || locked === null;
  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={c}>
        <StatusBar style={boot ? 'light' : scheme === 'dark' ? 'light' : 'dark'} />
        <SafeAreaView edges={boot ? [] : ['top']} style={{ flex: 1, backgroundColor: boot ? '#2f6f62' : c.bg }}>{body}</SafeAreaView>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
