import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Animated, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useC } from '../theme';
import { Logo } from './Loader';

// Slide-in side panel that replaces the bottom tab bar.
export default function Drawer({ open, onClose, tabs, tab, onPick, name, version }) {
  const c = useC();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const w = Math.min(300, width * 0.8);
  const v = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) { setShown(true); Animated.timing(v, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }
    else Animated.timing(v, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) setShown(false); });
  }, [open]);

  if (!shown && !open) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1 }}>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) }}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: w, backgroundColor: c.card, borderRightColor: c.line, borderRightWidth: 1, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 12, paddingHorizontal: 14,
          transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-w, 0] }) }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 22, paddingHorizontal: 6 }}>
            <Logo size={40} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: c.ink, fontSize: 18, fontWeight: '700' }}>Study Desk</Text>
              {name ? <Text numberOfLines={1} style={{ color: c.mut, fontSize: 13 }}>{name}</Text> : null}
            </View>
          </View>
          {tabs.map(([k, l]) => {
            const on = k === tab;
            return (
              <Pressable key={k} onPress={() => onPick(k)} style={{ paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4, backgroundColor: on ? c.acc : 'transparent' }}>
                <Text style={{ color: on ? c.accInk : c.ink, fontSize: 16, fontWeight: on ? '700' : '500' }}>{l}</Text>
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          {version ? <Text style={{ color: c.mut, fontSize: 12.5, textAlign: 'center', paddingTop: 12 }}>{'Version ' + version}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
