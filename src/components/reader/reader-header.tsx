import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScrollModeLabels, ScrollModes, type ScrollMode } from '@/components/reader/scroll-mode';
import { ThemedText } from '@/components/themed-text';
import { type ThemeMode } from '@/constants/theme';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MODE_OPTIONS: ThemeMode[] = ['light', 'dark', 'system'];

const MODE_LABEL: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System',
};

type ReaderHeaderProps = {
  title: string;
  readingMode: ThemeMode;
  onChangeMode: (mode: ThemeMode) => void;
  scrollMode: ScrollMode;
  onChangeScrollMode: (mode: ScrollMode) => void;
};

export function ReaderHeader({ title, readingMode, onChangeMode, scrollMode, onChangeScrollMode }: ReaderHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View>
      {collapsed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Expand header"
          onPress={() => setCollapsed(false)}
          style={({ pressed }) => [
            styles.collapsedBar,
            { borderBottomColor: theme.border },
            { paddingTop: insets.top },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more' }}
            size={16}
            weight="bold"
            tintColor={theme.textSecondary}
          />
        </Pressable>
      ) : (
        <Animated.View entering={FadeIn.duration(150)}>
          <View
            style={[
              styles.header,
              { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border },
              { paddingTop: insets.top + Spacing.two },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'chevron.backward', android: 'chevron_left' }}
                size={20}
                weight="bold"
                tintColor={theme.text}
              />
            </Pressable>

            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {title}
            </ThemedText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Collapse header"
              onPress={() => setCollapsed(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'chevron.up', android: 'expand_less' }}
                size={20}
                weight="bold"
                tintColor={theme.textSecondary}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reading options"
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
          </View>
        </Animated.View>
      )}

      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardTitle}>
              Reading mode
            </ThemedText>
            {MODE_OPTIONS.map((mode) => {
              const active = mode === readingMode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="button"
                  onPress={() => {
                    onChangeMode(mode);
                    setMenuOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <ThemedText type="small" themeColor={active ? 'tint' : 'text'}>
                    {MODE_LABEL[mode]}
                  </ThemedText>
                </Pressable>
              );
            })}
            <ThemedText type="small" themeColor="textSecondary" style={styles.cardTitle}>
              Layout
            </ThemedText>
            <View style={styles.segmented}>
              {ScrollModes.map((mode) => {
                const active = mode === scrollMode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityLabel={ScrollModeLabels[mode]}
                    onPress={() => {
                      onChangeScrollMode(mode);
                      setMenuOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.segment,
                      active && { backgroundColor: theme.tint },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="small"
                      style={active ? styles.segmentActiveText : undefined}
                      themeColor={active ? undefined : 'text'}>
                      {ScrollModeLabels[mode]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedBar: {
    paddingBottom: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginHorizontal: Spacing.one,
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
  segmented: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 8,
  },
  segmentActiveText: {
    color: '#ffffff',
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
