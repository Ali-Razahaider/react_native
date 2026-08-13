import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SortMode = 'recent' | 'az' | 'za';

const CYCLE: SortMode[] = ['recent', 'az', 'za'];

const SORT_CONFIG: Record<SortMode, { ios: 'clock' | 'arrow.up' | 'arrow.down'; android: 'schedule' | 'arrow_upward' | 'arrow_downward'; label: string; title: string }> = {
  recent: { ios: 'clock', android: 'schedule', label: 'Recent', title: 'Recently added' },
  az: { ios: 'arrow.up', android: 'arrow_upward', label: 'A–Z', title: 'Alphabetical A to Z' },
  za: { ios: 'arrow.down', android: 'arrow_downward', label: 'Z–A', title: 'Alphabetical Z to A' },
};

type Props = {
  value: SortMode;
  onChange: (mode: SortMode) => void;
};

export function SortControl({ value, onChange }: Props) {
  const theme = useTheme();
  const config = SORT_CONFIG[value];
  const next = CYCLE[(CYCLE.indexOf(value) + 1) % CYCLE.length];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sort: ${config.title}. Tap to change.`}
      onPress={() => onChange(next)}
      hitSlop={8}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        name={{ ios: config.ios, android: config.android }}
        size={14}
        weight="semibold"
        tintColor={theme.textSecondary}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {config.label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
  },
});
