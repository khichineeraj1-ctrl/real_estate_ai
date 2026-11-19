import { useRef, useState, type ComponentRef } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { photoUrl } from '../lib/api';
import { useTheme } from '../lib/theme';

export interface Photo { file: string; width?: number; height?: number; category?: string | null }
const GROUPS: Record<string, string> = { OUTSIDE: 'Outdoors', INSIDE: 'Interiors', AMENITIES: 'Amenities', PLAN: 'Floor plans', AREA: 'Neighbourhood' };

/**
 * The photos of a home or project: the cover large with two beside it and a count, as on the website. Tapping any
 * opens them all full screen, to swipe through.
 */
export function Photos({ photos, name }: { photos: Photo[]; name: string }) {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  if (!photos.length) return null;
  const show = (i: number) => { setAt(i); setOpen(true); setTimeout(() => pager.current?.scrollTo({ x: i * width, animated: false }), 0); };
  const side = photos.slice(1, 3);
  return (
    <>
      <View style={{ gap: 6 }}>
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`${name}: open all ${photos.length} photos`} onPress={() => show(0)} style={[s.big, { backgroundColor: t.soft }]}>
          <Image source={{ uri: photoUrl(photos[0].file) }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          {photos.length > 1 && <View style={s.badge}><Text style={s.badgeText}>▣ {photos.length} photos</Text></View>}
        </Pressable>
        {side.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {side.map((p, i) => (
              <Pressable key={p.file} accessibilityRole="imagebutton" accessibilityLabel={`Photo ${i + 2} of ${photos.length}`} onPress={() => show(i + 1)} style={[s.small, { backgroundColor: t.soft }]}>
                <Image source={{ uri: photoUrl(p.file, 'card') }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                {GROUPS[p.category ?? ''] ? <View style={s.badge}><Text style={s.badgeText}>{GROUPS[p.category!]}</Text></View> : null}
                {i === side.length - 1 && photos.length > 3 ? <View style={[s.badge, { left: undefined, right: 8 }]}><Text style={s.badgeText}>+{photos.length - 3} more</Text></View> : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={s.viewer}>
          <View style={s.top}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700' }}>{name}</Text>
              <Text style={{ color: '#aab2c0', fontSize: 13 }}>{at + 1} of {photos.length}{GROUPS[photos[at]?.category ?? ''] ? ` · ${GROUPS[photos[at].category!]}` : ''}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(false)} hitSlop={10} style={s.close}><Text style={{ color: '#fff', fontSize: 22, lineHeight: 24 }}>×</Text></Pressable>
          </View>
          <ScrollView ref={pager} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / width))} onScroll={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / width); if (i !== at && i >= 0 && i < photos.length) setAt(i); }} scrollEventThrottle={100} style={{ flex: 1 }}>
            {photos.map((p, i) => (
              <View key={p.file} style={{ width, height: height - 150, justifyContent: 'center' }}>
                <Image source={{ uri: photoUrl(p.file) }} accessibilityLabel={`${name}: photo ${i + 1} of ${photos.length}`} resizeMode="contain" style={{ width, height: '100%' }} />
              </View>
            ))}
          </ScrollView>
          {photos.length > 1 && (
            <View style={s.dots}>
              {photos.map((p, i) => <Pressable key={p.file} accessibilityLabel={`Photo ${i + 1}`} hitSlop={6} onPress={() => { setAt(i); pager.current?.scrollTo({ x: i * width, animated: true }); }} style={[s.dot, { backgroundColor: i === at ? '#fff' : 'rgba(255,255,255,0.35)', width: i === at ? 18 : 8 }]} />)}
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  big: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden' },
  small: { flex: 1, aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden' },
  badge: { position: 'absolute', left: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  viewer: { flex: 1, backgroundColor: '#0b0d11' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 10 },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 18 },
  dot: { height: 8, borderRadius: 4 },
});
