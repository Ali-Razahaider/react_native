import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type ThemeMode } from '@/constants/theme';
import { useThemeMode } from '@/context/theme-mode-context';
import { useTheme } from '@/hooks/use-theme';

const CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

const MODE_LABEL: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();

  function onPress() {
    const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
    setMode(next);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Theme: ${MODE_LABEL[mode]}. Tap to change.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" themeColor="tint">
        {MODE_LABEL[mode]}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
});
