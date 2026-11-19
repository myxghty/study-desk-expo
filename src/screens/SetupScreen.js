import React, { useState, useEffect } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useC } from '../theme';
import { Btn, FormField, Card } from '../components/ui';
import { nameError, NAME_MAX } from '../validate';
import { Logo, FadeIn } from '../components/Loader';
import { PinSetup } from '../components/PinPad';
import { setPin, setBio, bioAvailable, bioAuth } from '../security';

// First-run "sign in": make a profile, optionally protect it with a PIN / biometrics.
export default function SetupScreen({ onDone }) {
  const c = useC();
  const [step, setStep] = useState('role');
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [bioOk, setBioOk] = useState(false);
  const [nameErr, setNameErr] = useState('');
  const [nameShake, setNameShake] = useState(0);
  const goName = () => { const e = nameError(name); setNameErr(e); if (e) setNameShake((n) => n + 1); else setStep('ask'); };
  useEffect(() => { bioAvailable().then(setBioOk); }, []);
  const finish = (lock) => onDone({ name: name.trim(), lock, role });

  if (step === 'pin') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <PinSetup onCancel={() => setStep('ask')} onDone={async (pin) => { await setPin(pin); if (bioOk) setStep('bio'); else finish(true); }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <FadeIn key={step}>
          <View style={{ alignItems: 'center', marginBottom: 22 }}>
            <Logo size={72} />
            <Text style={{ color: c.ink, fontSize: 26, fontWeight: '700', marginTop: 14 }}>
              {step === 'role' ? 'Who is this for?' : step === 'name' ? 'Create your profile' : step === 'ask' ? 'Keep your marks private' : 'Unlock faster'}
            </Text>
          </View>

          {step === 'role' && (
            <Card>
              <Text style={{ color: c.mut, fontSize: 14, marginBottom: 14 }}>Students plan their work and can join a teacher's class. Teachers create classes, post assignments and see what their students choose to share.</Text>
              <Btn label="I'm a student" onPress={() => { setRole('student'); setStep('name'); }} />
              <Btn label="I'm a teacher" ghost onPress={() => { setRole('teacher'); setStep('name'); }} style={{ marginTop: 8 }} />
            </Card>
          )}

          {step === 'name' && (
            <Card>
              <Text style={{ color: c.mut, fontSize: 14, marginBottom: 12 }}>What should we call you? This is also the name your teachers or students see.</Text>
              <FormField value={name} onChangeText={(v) => { setName(v); if (nameErr) setNameErr(''); }} placeholder="Your name" maxLength={NAME_MAX} autoFocus returnKeyType="done" onSubmitEditing={goName} error={nameErr} shake={nameShake} />
              <Btn label="Continue" onPress={goName} />
            </Card>
          )}

          {step === 'ask' && (
            <Card>
              <Text style={{ color: c.ink, fontSize: 15, lineHeight: 22, marginBottom: 6 }}>Lock Study Desk with a 6-digit PIN so nobody else can open it and see your marks.</Text>
              <Text style={{ color: c.mut, fontSize: 13, lineHeight: 19, marginBottom: 14 }}>Your data stays on this phone. The PIN is never sent anywhere. If you forget it, you'll have to reinstall the app, which clears your data.</Text>
              <Btn label="Set a PIN" onPress={() => setStep('pin')} />
              <Btn label="Not now" ghost onPress={() => finish(false)} style={{ marginTop: 8 }} />
            </Card>
          )}

          {step === 'bio' && (
            <Card>
              <Text style={{ color: c.ink, fontSize: 15, lineHeight: 22, marginBottom: 14 }}>Also unlock with your fingerprint or face? You can always use the PIN instead.</Text>
              <Btn label="Yes, turn it on" onPress={async () => { if (await bioAuth('Confirm it works')) await setBio(true); finish(true); }} />
              <Btn label="No thanks" ghost onPress={() => finish(true)} style={{ marginTop: 8 }} />
            </Card>
          )}
        </FadeIn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
