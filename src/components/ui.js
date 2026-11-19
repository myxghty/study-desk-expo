import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Switch, Animated } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useC } from '../theme';
import { ymd } from '../logic';
import { Spinner } from './Loader';

export function Card({ title, children }) {
  const c = useC();
  return (
    <View style={{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 14 }}>
      {title ? <Text style={{ color: c.mut, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, fontWeight: '600' }}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Chip({ label, on, onPress, style }) {
  const c = useC();
  return (
    <Pressable onPress={onPress} style={[{ borderWidth: 1, borderColor: on ? c.acc : c.line, backgroundColor: on ? c.acc : 'transparent', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13, marginRight: 6 }, style]}>
      <Text style={{ color: on ? c.accInk : c.mut, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Btn({ label, onPress, ghost, style, busy }) {
  const c = useC();
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      style={[{ backgroundColor: ghost ? 'transparent' : c.acc, borderColor: ghost ? c.line : c.acc, borderWidth: 1, borderRadius: 9, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', opacity: busy ? 0.75 : 1 }, style]}
    >
      {busy ? <Spinner size={16} color={ghost ? c.ink : c.accInk} style={{ marginRight: 8 }} /> : null}
      <Text style={{ color: ghost ? c.ink : c.accInk, fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

export function Stat({ value, label }) {
  const c = useC();
  return (
    <View style={{ flex: 1, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 10 }}>
      <Text numberOfLines={1} style={{ color: c.ink, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: c.mut, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

export function Field(props) {
  const c = useC();
  return (
    <TextInput
      placeholderTextColor={c.mut}
      {...props}
      style={[{ backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 9, padding: 10, fontSize: 15, color: c.ink, marginBottom: 8 }, props.style]}
    />
  );
}

// Field that outlines itself in red, shakes (when `shake` changes) and shows `error` below.
export function FormField({ error, shake, style, ...props }) {
  const c = useC();
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!shake) return;
    x.setValue(0);
    Animated.sequence([12, -12, 9, -9, 5, -5, 0].map((v) => Animated.timing(x, { toValue: v, duration: 45, useNativeDriver: true }))).start();
  }, [shake]);
  return (
    <View>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        <Field {...props} style={[style, error ? { borderColor: c.bad, borderWidth: 2 } : null]} />
      </Animated.View>
      {error ? <Text style={{ color: c.bad, fontSize: 13, marginTop: -2, marginBottom: 8 }}>{error}</Text> : null}
    </View>
  );
}

// Text field with tappable suggestions from courses already used
export function CourseField({ value, onChangeText, courses }) {
  const sugg = courses.filter((x) => x !== value && x.toLowerCase().startsWith(value.toLowerCase()));
  return (
    <View>
      <Field value={value} onChangeText={onChangeText} placeholder="Course" />
      {sugg.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 8 }}>
          {sugg.map((x) => <Chip key={x} label={x} onPress={() => onChangeText(x)} />)}
        </ScrollView>
      )}
    </View>
  );
}

export function DateField({ value, onChange }) {
  const c = useC();
  const [show, setShow] = useState(false);
  const d = new Date(value + 'T00:00:00');
  const onCh = (e, date) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (date) onChange(ymd(date));
  };
  if (Platform.OS === 'ios') {
    return <View style={{ alignItems: 'flex-start', marginBottom: 8 }}><DateTimePicker value={d} mode="date" display="compact" onChange={onCh} /></View>;
  }
  return (
    <View>
      <Pressable onPress={() => setShow(true)} style={{ backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 9, padding: 12, marginBottom: 8 }}>
        <Text style={{ color: c.ink, fontSize: 15 }}>Due: {value}</Text>
      </Pressable>
      {show && <DateTimePicker value={d} mode="date" onChange={onCh} />}
    </View>
  );
}

// 'HH:MM' picker
export function TimeField({ value, onChange, label }) {
  const c = useC();
  const [show, setShow] = useState(false);
  const [h, m] = String(value || '18:00').split(':').map((x) => parseInt(x, 10) || 0);
  const d = new Date(); d.setHours(h, m, 0, 0);
  const onCh = (e, date) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (date && e.type !== 'dismissed') onChange(String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'));
  };
  if (Platform.OS === 'ios') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}>
        <Text style={{ color: c.ink, fontSize: 15, flex: 1 }}>{label}</Text>
        <DateTimePicker value={d} mode="time" display="compact" onChange={onCh} />
      </View>
    );
  }
  return (
    <View>
      <Pressable onPress={() => setShow(true)} style={{ backgroundColor: c.bg, borderColor: c.line, borderWidth: 1, borderRadius: 9, padding: 12, marginVertical: 6 }}>
        <Text style={{ color: c.ink, fontSize: 15 }}>{label}: {value}</Text>
      </Pressable>
      {show && <DateTimePicker value={d} mode="time" is24Hour onChange={onCh} />}
    </View>
  );
}

// One list row: optional tick circle, title, meta line, optional badge, delete
export function ItemRow({ done, onToggle, title, meta, badge, tone, onDelete }) {
  const c = useC();
  const toneColor = tone === 'bad' ? c.bad : tone === 'warn' ? c.warn : c.mut;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
      {onToggle && (
        <Pressable onPress={onToggle} hitSlop={8} style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: done ? c.acc : c.line, backgroundColor: done ? c.acc : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
          {done ? <Text style={{ color: c.accInk, fontSize: 13, fontWeight: '700' }}>✓</Text> : null}
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: done ? c.mut : c.ink, fontSize: 16, textDecorationLine: done ? 'line-through' : 'none' }}>{title}</Text>
        {meta ? <Text style={{ color: c.mut, fontSize: 12.5 }}>{meta}</Text> : null}
      </View>
      {badge ? <Text style={{ color: toneColor, borderColor: toneColor, borderWidth: 1, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 9, fontSize: 12, fontWeight: '700', marginLeft: 8 }}>{badge}</Text> : null}
      <Pressable onPress={onDelete} hitSlop={10} style={{ paddingLeft: 10 }}>
        <Text style={{ color: c.mut, fontSize: 22 }}>×</Text>
      </Pressable>
    </View>
  );
}

export function Empty({ text }) {
  const c = useC();
  return <Text style={{ color: c.mut, fontSize: 14 }}>{text}</Text>;
}

export function Toggle({ label, hint, value, onChange }) {
  const c = useC();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ color: c.ink, fontSize: 15 }}>{label}</Text>
        {hint ? <Text style={{ color: c.mut, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.acc, false: c.line }} />
    </View>
  );
}
