import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, Animated, Easing, useWindowDimensions, Pressable } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { useC } from '../theme';
import { Btn } from '../components/ui';
import { Logo, FadeIn } from '../components/Loader';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// one-way 0 -> 1 loop (restarts each cycle)
function useCycle(duration) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: false }));
    a.start();
    return () => a.stop();
  }, []);
  return v;
}
const bob = (v, amt, phase = 0) => v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, phase ? amt : -amt, 0] });

function ArtCards() {
  const c = useC();
  const v = useCycle(2600);
  const Card = ({ w, tint, y, check }) => (
    <Animated.View style={{ width: w, height: 48, borderRadius: 12, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, marginVertical: 6, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, transform: [{ translateY: y }] }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: check ? c.acc : c.line, backgroundColor: check ? c.acc : 'transparent' }} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <View style={{ height: 7, width: '70%', borderRadius: 4, backgroundColor: tint }} />
        <View style={{ height: 6, width: '40%', borderRadius: 4, backgroundColor: c.line, marginTop: 6 }} />
      </View>
    </Animated.View>
  );
  return (
    <View style={{ alignItems: 'center' }}>
      <Card w={230} tint={c.acc} y={bob(v, 6)} check />
      <Card w={210} tint={c.warn} y={bob(v, 6, 1)} />
      <Card w={190} tint={c.mut} y={bob(v, 4)} />
    </View>
  );
}

function ArtRing() {
  const c = useC();
  const v = useCycle(2800);
  const r = 58, circ = 2 * Math.PI * r;
  return (
    <Svg width={170} height={170} viewBox="0 0 170 170">
      <Circle cx="85" cy="85" r={r} stroke={c.line} strokeWidth="12" fill="none" />
      <AnimatedCircle cx="85" cy="85" r={r} stroke={c.acc} strokeWidth="12" fill="none" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [circ * 0.95, circ * 0.12] })}
        rotation="-90" origin="85, 85" />
      <Path d="M62 88 L78 104 L110 70" stroke={c.acc} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function ArtShare() {
  const c = useC();
  const v = useCycle(2000);
  return (
    <Svg width={220} height={170} viewBox="0 0 220 170">
      <Line x1="45" y1="125" x2="110" y2="55" stroke={c.line} strokeWidth="3" />
      <Line x1="175" y1="125" x2="110" y2="55" stroke={c.line} strokeWidth="3" />
      <AnimatedCircle cx="110" cy="55" r={v.interpolate({ inputRange: [0, 1], outputRange: [20, 46] })} stroke={c.acc} strokeWidth="3" fill="none" strokeOpacity={v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })} />
      <Circle cx="110" cy="55" r="20" fill={c.acc} />
      <Circle cx="45" cy="125" r="16" fill={c.card} stroke={c.acc} strokeWidth="3" />
      <Circle cx="175" cy="125" r="16" fill={c.card} stroke={c.line} strokeWidth="3" />
    </Svg>
  );
}

const SLIDES = [
  { key: 'plan', art: ArtCards, title: 'Every deadline in one place', body: 'Add assignments and exams, strike things off, and always know what is due this week.' },
  { key: 'focus', art: ArtRing, title: 'Focus, then see your progress', body: 'A simple timer logs your study hours, and a gentle check spots when you are slipping behind.' },
  { key: 'share', art: ArtShare, title: 'Yours first, shareable if you want', body: 'Everything stays on your phone. Share marks and hours with a teacher only when you choose to.' },
];

// Page dots. The glowing dot stretches to join the next dot as you move, then
// shrinks onto it, so only the current page glows.
const DOT = 8, GAP = 16, STEP = DOT + GAP;
function Dots({ pos, count }) {
  const c = useC();
  const input = [], left = [], wide = [];
  for (let k = 0; k < count; k++) {
    input.push(k); left.push(k * STEP); wide.push(DOT);
    if (k < count - 1) { input.push(k + 0.5); left.push(k * STEP); wide.push(DOT + STEP); }
  }
  const L = pos.interpolate({ inputRange: input, outputRange: left });
  const W = pos.interpolate({ inputRange: input, outputRange: wide });
  const total = count * DOT + (count - 1) * GAP;
  return (
    <View style={{ alignItems: 'center', marginBottom: 20, height: DOT + 16, justifyContent: 'center' }}>
      <View style={{ width: total, height: DOT }}>
        {Array.from({ length: count }, (_, k) => <View key={k} style={{ position: 'absolute', left: k * STEP, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: c.line }} />)}
        <Animated.View style={{ position: 'absolute', top: 0, height: DOT, borderRadius: DOT / 2, backgroundColor: c.acc, left: L, width: W,
          shadowColor: c.acc, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }} />
      </View>
    </View>
  );
}

export default function WelcomeScreen({ onDone }) {
  const c = useC();
  const { width } = useWindowDimensions();
  const ref = useRef(null);
  const [i, setI] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const last = i === SLIDES.length - 1;
  // The page number follows the scroll position itself, so it stays right for swipes
  // and for the Next button alike (programmatic scrolls don't always fire "momentum end").
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
    useNativeDriver: false,
    listener: (e) => { const n = Math.min(SLIDES.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width))); setI((o) => (o === n ? o : n)); },
  });
  const next = () => (last ? onDone() : ref.current && ref.current.scrollTo({ x: Math.min(SLIDES.length - 1, i + 1) * width, animated: true }));
  const pos = scrollX.interpolate({ inputRange: [0, width * (SLIDES.length - 1)], outputRange: [0, SLIDES.length - 1], extrapolate: 'clamp' });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }}>
        <Logo size={36} />
        {!last ? <Pressable onPress={onDone} hitSlop={10}><Text style={{ color: c.mut, fontSize: 15 }}>Skip</Text></Pressable> : <View />}
      </View>

      <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
        {SLIDES.map((s) => {
          const Art = s.art;
          return (
            <View key={s.key} style={{ width, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ height: 190, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}><Art /></View>
              <Text style={{ color: c.ink, fontSize: 26, fontWeight: '700', textAlign: 'center' }}>{s.title}</Text>
              <Text style={{ color: c.mut, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10 }}>{s.body}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ padding: 20, paddingBottom: 28 }}>
        <Dots pos={pos} count={SLIDES.length} />
        <FadeIn><Btn label={last ? 'Get started' : 'Next'} onPress={next} /></FadeIn>
      </View>
    </View>
  );
}
