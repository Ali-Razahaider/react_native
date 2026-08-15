import { SymbolView } from 'expo-symbols';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/brand/brand-header';
import { ThemedText } from '@/components/themed-text';
import { LibraryMenu } from '@/components/library/stats-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLearnedWordsByWeek, type LearnedWord } from '@/lib/vocab-db';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function WordRow({ word }: { word: LearnedWord }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.wordCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setExpanded((e) => !e)}
        style={styles.wordHeader}>
        <View style={styles.wordTitleWrap}>
          <ThemedText type="default" style={styles.wordText}>
            {word.word}
          </ThemedText>
          {word.partOfSpeech ? (
            <View style={[styles.pos, { backgroundColor: `${theme.tint}18` }]}>
              <ThemedText type="smallBold" style={[styles.posLabel, { color: theme.tint }]}>
                {word.partOfSpeech}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.wordMeta}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(word.learnedAt)}
          </ThemedText>
          <SymbolView
            name={{ ios: 'chevron.down', android: 'expand_more' }}
            size={16}
            weight="bold"
            tintColor={theme.textSecondary}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </View>
      </Pressable>
      {expanded && word.definition ? (
        <View style={[styles.definitionWrap, { borderTopColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {word.definition}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export default function VocabularyScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [sections, setSections] = useState<{ label: string; words: LearnedWord[] }[]>([]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getLearnedWordsByWeek()
        .then((s) => {
          if (mounted) setSections(s);
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, []),
  );

  const total = sections.reduce((sum, s) => sum + s.words.length, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <BrandHeader right={<ThemeToggle />} style={styles.headerBrand} />
      </View>

      <View style={[styles.hero, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <View style={[styles.heroIcon, { backgroundColor: `${theme.tint}14` }]}>
          <SymbolView
            name={{ ios: 'character.book.closed.fill', android: 'menu_book' }}
            size={28}
            weight="bold"
            tintColor={theme.tint}
          />
        </View>
        <ThemedText type="subtitle" style={styles.heroTitle}>
          Words you've learned
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.heroSubtitle}>
          Words you've looked up while reading, grouped by week.
        </ThemedText>
      </View>

      {total === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: `${theme.tint}14` }]}>
            <SymbolView
              name={{ ios: 'character.book.closed', android: 'menu_book' }}
              size={28}
              weight="bold"
              tintColor={theme.tint}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Long-press a word in a book to look up its meaning — words you learn will appear here, grouped by week.
          </ThemedText>
        </View>
      ) : (
        <SectionList
          sections={sections.map((s) => ({ title: s.label, data: s.words }))}
          keyExtractor={(item) => item.word}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.four },
          ]}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
              <ThemedText type="smallBold" themeColor="tint">
                {section.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {section.data.length} word{section.data.length === 1 ? '' : 's'}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => <WordRow word={item} />}
        />
      )}

      <View style={[styles.menuWrap, { paddingBottom: insets.bottom }]}>
        <LibraryMenu />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  heroTitle: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
  },
  heroSubtitle: {
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.six,
    gap: Spacing.three,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  listContent: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  menuWrap: {
    marginHorizontal: -Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wordCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  wordTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  wordText: {
    fontWeight: '700',
  },
  pos: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
  },
  posLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  definitionWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
  },
});