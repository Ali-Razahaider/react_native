import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { type ThemeMode } from '@/constants/theme';
import { Spacing } from '@/constants/theme';
import { useThemeMode } from '@/context/theme-mode-context';
import { useTheme } from '@/hooks/use-theme';

const MODE_OPTIONS: ThemeMode[] = ['light', 'dark', 'system'];

const MODE_LABEL: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System',
};

export function ThemeToggle() {
  const { mode, setMode } = useThemeMode();
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Theme options"
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
        <SymbolView
          name={{ ios: 'ellipsis', android: 'more_vert' }}
          size={20}
          weight="bold"
          tintColor={theme.text}
        />
      </Pressable>

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardTitle}>
              Theme
            </ThemedText>
            {MODE_OPTIONS.map((option) => {
              const active = option === mode;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => {
                    setMode(option);
                    setMenuOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <ThemedText type="small" themeColor={active ? 'tint' : 'text'}>
                    {MODE_LABEL[option]}
                  </ThemedText>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              onPress={() => setMenuOpen(false)}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <ThemedText type="small" themeColor="textSecondary">
                Cancel
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 240,
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.half,
  },
  cardTitle: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  option: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  close: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    marginTop: Spacing.half,
  },
  pressed: {
    opacity: 0.7,
  },
});
