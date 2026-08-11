import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Book } from '@/lib/types';

type Props = {
  book: Book;
  onPress: () => void;
  onLongPress: () => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BookCard({ book, onPress, onLongPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={`Open ${book.title}`}
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.badge, { backgroundColor: theme.tint }]}>
        <ThemedText style={styles.badgeText}>PDF</ThemedText>
      </View>

      <View style={styles.info}>
        <ThemedText type="default" numberOfLines={1}>
          {book.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatSize(book.size)}
          {book.lastPage > 0 ? ' · continued' : ''}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 40,
    height: 52,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
