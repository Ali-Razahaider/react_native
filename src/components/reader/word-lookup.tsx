import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  word: string | null;
  onClose: () => void;
};

type Definition = {
  partOfSpeech: string;
  definition: string;
};

type LookupState =
  | { phase: 'confirm' }
  | { phase: 'loading' }
  | { phase: 'result'; phonetic?: string; definitions: Definition[] }
  | { phase: 'error'; message: string };

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const lookupCache = new Map<string, LookupState>();

export function WordLookup({ word, onClose }: Props) {
  const theme = useTheme();
  const [state, setState] = useState<LookupState>(() => {
    const cached = word ? lookupCache.get(word.toLowerCase()) : undefined;
    return cached ?? { phase: 'confirm' };
  });

  const lookup = async () => {
    if (!word) return;
    const key = word.toLowerCase();
    const cached = lookupCache.get(key);
    if (cached && cached.phase !== 'confirm') {
      setState(cached);
      return;
    }
    setState({ phase: 'loading' });
    try {
      const response = await fetch(`${DICTIONARY_API}${encodeURIComponent(key)}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'No definition found' : 'Lookup failed');
      }
      const entries = (await response.json()) as {
        word: string;
        phonetic?: string;
        meanings?: {
          partOfSpeech: string;
          definitions?: { definition?: string }[];
        }[];
      }[];
      const entry = entries[0];
      const definitions: Definition[] = [];
      for (const meaning of entry?.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          if (def.definition) {
            definitions.push({
              partOfSpeech: meaning.partOfSpeech,
              definition: def.definition,
            });
          }
          if (definitions.length >= 2) break;
        }
        if (definitions.length >= 2) break;
      }
      if (definitions.length === 0) {
        throw new Error('No definition found');
      }
      const result: LookupState = {
        phase: 'result',
        phonetic: entry?.phonetic,
        definitions,
      };
      lookupCache.set(key, result);
      setState(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Lookup failed';
      const failed: LookupState = { phase: 'error', message };
      lookupCache.set(key, failed);
      setState(failed);
    }
  };

  return (
    <Modal
      visible={word !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: theme.surfaceElevated }]}>
          {word && state.phase === 'confirm' && (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.eyebrow}>
                Selected
              </ThemedText>
              <ThemedText type="subtitle" style={styles.word}>
                {word}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Check meaning"
                onPress={lookup}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.tint },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.actionLabel}>
                  Check meaning
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
            </>
          )}

          {word && state.phase === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator color={theme.tint} />
              <ThemedText type="small" themeColor="textSecondary">
                Looking up “{word}”…
              </ThemedText>
            </View>
          )}

          {word && state.phase === 'result' && (
            <>
              <ThemedText type="subtitle" style={styles.word}>
                {word}
              </ThemedText>
              {state.phonetic ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {state.phonetic}
                </ThemedText>
              ) : null}
              <View style={styles.definitions}>
                {state.definitions.map((def, index) => (
                  <View key={index} style={styles.definition}>
                    <ThemedText type="smallBold" themeColor="tint">
                      {def.partOfSpeech}
                    </ThemedText>
                    <ThemedText type="small" style={styles.definitionText}>
                      {def.definition}
                    </ThemedText>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.action, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold">Close</ThemedText>
              </Pressable>
            </>
          )}

          {word && state.phase === 'error' && (
            <>
              <ThemedText type="subtitle" style={styles.word}>
                {word}
              </ThemedText>
              <ThemedText type="small" themeColor="danger">
                {state.message}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [styles.action, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Close
                </ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  eyebrow: {
    textTransform: 'uppercase',
  },
  word: {
    fontSize: 32,
    lineHeight: 40,
  },
  action: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: Spacing.three,
  },
  actionLabel: {
    color: '#ffffff',
  },
  dismiss: {
    paddingVertical: Spacing.two,
  },
  center: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  definitions: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  definition: {
    gap: Spacing.half,
  },
  definitionText: {
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});