import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  | { phase: 'loading' }
  | { phase: 'result'; phonetic?: string; definitions: Definition[] }
  | { phase: 'error'; message: string };

const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';
const lookupCache = new Map<string, LookupState>();

function normalizeWord(raw: string): string {
  return raw
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, '')
    .trim();
}

// Part-of-speech headings that count as actual definitions (everything else —
// Etymology, Pronunciation, Translations, References, ... is skipped).
const POS_HEADINGS = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'preposition',
  'conjunction',
  'interjection',
  'article',
  'determiner',
  'particle',
  'numeral',
  'prefix',
  'suffix',
  'infix',
  'interfix',
  'circumfix',
  'phrase',
  'idiom',
  'proper noun',
  'letter',
]);

function stripTemplates(text: string): string {
  let out = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('{{', i)) {
      depth++;
      i += 1;
    } else if (text.startsWith('}}', i) && depth > 0) {
      depth--;
      i += 1;
    } else if (depth === 0) {
      out += text[i];
    }
  }
  return out;
}

function cleanWikitext(raw: string): string {
  return (
    stripTemplates(raw)
      // Reference tags and any other HTML, including their contents.
      .replace(/<ref[\s\S]*?<\/ref>/g, ' ')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      // Wikilinks: [[target|label]] -> label, [[target]] -> target.
      .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
      .replace(/\[\[([^\]]*)\]\]/g, '$1')
      // Bold/italic markers.
      .replace(/'{2,5}/g, '')
      // Collapse leftover whitespace.
      .replace(/\s+/g, ' ')
      .trim()
  );
}

// Parse the wikitext of a Wiktionary English entry into the parts-of-speech
// and their glosses. Handles nested sections (e.g. "===Etymology 2=== ====Noun====")
// and only trusts numbered " # ..." definition lines.
function parseWiktionary(wikitext: string): {
  phonetic?: string;
  definitions: Definition[];
} {
  const lines = wikitext.split('\n');
  const definitions: Definition[] = [];
  let phonetic: string | undefined;

  let inEnglish = false;
  let currentPos: string | null = null;
  let inPronunciation = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const leadMatch = trimmed.match(/^(=+)\s*(.*?)\s*=*$/);

    if (leadMatch && leadMatch[1].length >= 2) {
      const level = leadMatch[1].length;
      const heading = leadMatch[2].trim();

      if (level === 2) {
        // Top-level language section; English switches on, any other language
        // (or a non-language header) switches us off.
        currentPos = null;
        inPronunciation = false;
        inEnglish = /^English/.test(heading);
      } else if (inEnglish) {
        // Sub-heading like "===Noun===" or "=====Noun=====" under an etymology
        // section — the part of speech for the definitions that follow. Other
        // subsections (Etymology, Pronunciation, Translations, ...) reset it.
        inPronunciation = /^pronunciation/i.test(heading);
        const label = heading.replace(/-/g, ' ').toLowerCase();
        currentPos = POS_HEADINGS.has(label) ? label : null;
      }
      continue;
    }

    if (!inEnglish) continue;

    if (inPronunciation && !phonetic) {
      const ipa = trimmed.match(/\{\{IPA\|[^|]*\|([^}|]+)/);
      if (ipa) phonetic = ipa[1].replace(/\/+/g, '/').trim();
    }

    if (currentPos && /^#\s+/.test(trimmed)) {
      const definition = cleanWikitext(trimmed.replace(/^#\s*/, ''));
      if (definition && definition.length > 1) {
        definitions.push({
          partOfSpeech: currentPos.charAt(0).toUpperCase() + currentPos.slice(1),
          definition,
        });
        if (definitions.length >= 6) break;
      }
    }
  }

  return { phonetic, definitions };
}

export function WordLookup({ word, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [initial] = useState(() => {
    if (!word) return null;
    const key = normalizeWord(word).toLowerCase();
    if (!key) {
      return { key: '', state: { phase: 'error', message: 'No word selected.' } as LookupState };
    }
    return { key, state: (lookupCache.get(key) ?? { phase: 'loading' }) as LookupState };
  });

  const [state, setState] = useState<LookupState>(initial?.state ?? { phase: 'loading' });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const key = initial?.key;
    if (!word || !key || initial?.state.phase !== 'loading') return;

    const requestId = ++requestIdRef.current;

    const run = async () => {
      try {
        const params = new URLSearchParams({
          action: 'parse',
          page: key,
          prop: 'wikitext',
          format: 'json',
          formatversion: '2',
          redirects: '1',
          origin: '*',
        });
        const response = await fetch(`${WIKTIONARY_API}?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Lookup failed');
        }
        const json = (await response.json()) as {
          parse?: { title?: string; wikitext?: string };
          error?: { info?: string };
        };
        if (json.error) {
          throw new Error('No definition found');
        }
        const wikitext = json.parse?.wikitext;
        if (!wikitext) {
          throw new Error('No definition found');
        }
        const { phonetic, definitions } = parseWiktionary(wikitext);
        if (definitions.length === 0) {
          throw new Error('No definition found');
        }
        const result: LookupState = {
          phase: 'result',
          phonetic,
          definitions,
        };
        lookupCache.set(key, result);
        if (requestIdRef.current === requestId) setState(result);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Lookup failed';
        const failed: LookupState = { phase: 'error', message };
        lookupCache.set(key, failed);
        if (requestIdRef.current === requestId) setState(failed);
      }
    };
    run();
  }, [word, initial]);

  if (!word) return null;

  const title = word ? normalizeWord(word) : '';

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surfaceElevated,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.four),
            },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.backgroundSelected }]} />

          <View style={styles.header}>
            <View style={styles.wordWrap}>
              <ThemedText
                type="subtitle"
                style={[styles.word, { color: theme.text }]}>
                {title}
              </ThemedText>
              {state.phase === 'result' && state.phonetic ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {state.phonetic}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.close,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                ✕
              </ThemedText>
            </Pressable>
          </View>

          {state.phase === 'loading' && (
            <View style={styles.center}>
              <ActivityIndicator color={theme.tint} />
            </View>
          )}

          {state.phase === 'result' && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.definitions}
              contentContainerStyle={styles.definitionsContent}>
              {state.definitions.map((def, index) => (
                <View key={index} style={styles.definition}>
                  <View
                    style={[
                      styles.pos,
                      { backgroundColor: `${theme.tint}18` },
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={[styles.posLabel, { color: theme.tint }]}>
                      {def.partOfSpeech}
                    </ThemedText>
                  </View>
                  <ThemedText type="default" style={styles.definitionText}>
                    {def.definition}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          )}

          {state.phase === 'error' && (
            <View style={styles.center}>
              <ThemedText
                type="default"
                themeColor="textSecondary"
                style={styles.errorText}>
                {state.message}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: '100%',
    maxHeight: '68%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  wordWrap: {
    flex: 1,
    gap: Spacing.half,
  },
  word: {
    fontSize: 30,
    lineHeight: 36,
    textTransform: 'capitalize',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  definitions: {
    flexGrow: 0,
  },
  definitionsContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.three,
  },
  definition: {
    gap: Spacing.two,
  },
  pos: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: 2,
  },
  posLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  definitionText: {
    lineHeight: 24,
  },
  errorText: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
});