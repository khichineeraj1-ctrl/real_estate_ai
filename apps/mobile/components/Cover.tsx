import { Image, StyleSheet, View } from 'react-native';
import { photoUrl } from '../lib/api';
import { useTheme } from '../lib/theme';

const BOX = 4 / 3; // the shape of the cover on a card

/**
 * The picture at the top of a card. A picture taller than the box is trimmed mostly from the bottom, so a tower keeps
 * its top; a wider one fills the box and is trimmed evenly at the sides.
 */
export function Cover({ photo, label }: { photo: { file: string; width?: number; height?: number }; label: string }) {
  const t = useTheme();
  const shape = photo.width && photo.height ? photo.width / photo.height : BOX;
  const tall = shape < BOX;
  // How much taller the picture is than the box, as a share of the box's height; 12% of that is hidden above.
  const above = tall ? -12 * (BOX / shape - 1) : 0;
  return (
    <View style={[s.box, { backgroundColor: t.soft }]}>
      <Image
        source={{ uri: photoUrl(photo.file, 'card') }} accessibilityLabel={label} resizeMode="cover"
        style={tall ? { position: 'absolute', left: 0, right: 0, top: `${above}%`, width: '100%', aspectRatio: shape } : StyleSheet.absoluteFill}
      />
    </View>
  );
}

const s = StyleSheet.create({ box: { width: '100%', aspectRatio: BOX, borderRadius: 10, overflow: 'hidden', marginBottom: 6 } });
