import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { useC } from '../theme';

// The app mark: a timer ring (75% done) with a check.
export function Logo({ size = 96, rounded = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {rounded ? <Rect width="100" height="100" rx="22" fill="#2f6f62" /> : null}
      <Circle cx="50" cy="50" r="26.5" stroke="#f6f4ef" strokeOpacity="0.3" strokeWidth="6.4" fill="none" />
      <Path d="M50 23.5 A26.5 26.5 0 1 1 23.5 50" stroke="#f6f4ef" strokeWidth="6.4" strokeLinecap="round" fill="none" />
      <Path d="M39 50.8 L46.9 58.4 L61.6 41.9" stroke="#f6f4ef" strokeWidth="6.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// Small spinning arc for buttons and "checking…" states.
export function Spinner({ size = 20, color, style }) {
  const c = useC();
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, []);
  const col = color || c.acc;
  const r = 10, circ = 2 * Math.PI * r;
  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r={r} stroke={col} strokeOpacity="0.25" strokeWidth="3" fill="none" />
        <Circle cx="12" cy="12" r={r} stroke={col} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray={circ * 0.28 + ' ' + circ} />
      </Svg>
    </Animated.View>
  );
}

// Gentle breathing for anything that is "waiting".
export function Pulse({ children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, []);
  return (
    <Animated.View style={[{ opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function FadeIn({ children, delay = 0, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(v, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

// Grey placeholder row shown while content is on its way.
export function Skeleton({ height = 14, width = '100%', style }) {
  const c = useC();
  return <Pulse><View style={[{ height, width, borderRadius: 7, backgroundColor: c.line, marginVertical: 5 }, style]} /></Pulse>;
}

// Full-screen loader used while the app wakes up. Matches the splash colour so there's no flash.
export function BootScreen({ label = 'Getting things ready' }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#2f6f62', alignItems: 'center', justifyContent: 'center' }}>
      <Pulse><Logo size={96} rounded={false} /></Pulse>
      <Text style={{ color: '#f6f4ef', opacity: 0.8, marginTop: 18, fontSize: 14 }}>{label}</Text>
    </View>
  );
}
