import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

/**
 * The picture of a switch: a grey track with the knob on the left when off, a coloured track with the knob on the
 * right when on. It only shows the state; the row it sits in is what gets pressed. Drawn here rather than using the
 * system switch, whose track is invisible when off on a white background.
 */
export function Toggle({ on, color }: { on: boolean; color?: string }) {
  const t = useTheme();
  const x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => { Animated.timing(x, { toValue: on ? 1 : 0, duration: 160, useNativeDriver: false }).start(); }, [on, x]);
  return (
    <Animated.View pointerEvents="none" style={[s.track, { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [t.muted, color ?? t.brand] }), opacity: x.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]}>
      <Animated.View style={[s.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  track: { width: 50, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
});
