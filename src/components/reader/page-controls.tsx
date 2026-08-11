import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
};

export function PageControls({ page, totalPages, onPrev, onNext }: Props) {
  const theme = useTheme();
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  return (
    <View style={[styles.bar, { borderTopColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous page"
        disabled={atStart}
        onPress={onPrev}
        hitSlop={8}
        style={({ pressed }) => [
          styles.arrow,
          { borderColor: theme.border },
          atStart && styles.disabled,
          pressed && !atStart && styles.pressed,
        ]}>
        <ThemedText type="default" style={styles.arrowText}>
          ‹
        </ThemedText>
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary">
        {page} / {totalPages}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next page"
        disabled={atEnd}
        onPress={onNext}
        hitSlop={8}
        style={({ pressed }) => [
          styles.arrow,
          { borderColor: theme.border },
          atEnd && styles.disabled,
          pressed && !atEnd && styles.pressed,
        ]}>
        <ThemedText type="default" style={styles.arrowText}>
          ›
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 24,
    lineHeight: 28,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.6,
  },
});
