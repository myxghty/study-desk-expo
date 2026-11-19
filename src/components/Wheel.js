import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { useC } from '../theme';

const ROWS = 3;

// Swipe-up/down number wheel: snaps to each value, neighbours fade and shrink.
export default function Wheel({ values, value, onChange, itemHeight = 64, fontSize = 56, width = 110, format = (v) => String(v) }) {
  const c = useC();
  const H = itemHeight;
  const y = useRef(new Animated.Value(0)).current;
  const ref = useRef(null);
  const idx = Math.max(0, values.indexOf(value));

  useEffect(() => {
    const t = setTimeout(() => { if (ref.current) ref.current.scrollTo({ y: idx * H, animated: false }); }, 0);
    return () => clearTimeout(t);
  }, []);

  const commit = (e) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / H)));
    if (values[i] !== value) onChange(values[i]);
  };

  return (
    <View style={{ height: H * ROWS, width, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: H, height: H, left: 0, right: 0, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: c.acc, borderRadius: 4, opacity: 0.55 }} />
      <Animated.ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={commit}
        contentContainerStyle={{ paddingVertical: H * ((ROWS - 1) / 2) }}
      >
        {values.map((v, i) => {
          const range = [(i - 1) * H, i * H, (i + 1) * H];
          return (
            <Animated.View key={v} style={{ height: H, alignItems: 'center', justifyContent: 'center',
              opacity: y.interpolate({ inputRange: range, outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' }),
              transform: [{ scale: y.interpolate({ inputRange: range, outputRange: [0.72, 1, 0.72], extrapolate: 'clamp' }) }] }}>
              <Text style={{ color: c.ink, fontSize, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{format(v)}</Text>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}
