import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  onAdd: () => void;
};

export function EmptyState({ onAdd }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle">No books yet</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
        Add a PDF from your device to start reading.
      </ThemedText>

      <Pressable
        onPress={onAdd}
        accessibilityRole="button"
        accessibilityLabel="Add a book"
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.tint },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.buttonLabel}>Add a book</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  body: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
