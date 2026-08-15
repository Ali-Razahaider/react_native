import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/brand/brand-header';
import { ThemedText } from '@/components/themed-text';
import { LibraryMenu } from '@/components/library/stats-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getReadingStats, type ReadingStats } from '@/lib/stats-db';

function formatMinutes(minutes: number): string {
  if (minutes < 1) return 'less than a minute';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function shortMinutes(minutes: number): string {
  if (minutes < 1) return '';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Labels for the last 7 days, oldest first, ending today.
function weekDayLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(DAY_LABELS[d.getDay()]);
  }
  return labels;
}

function WeeklyChart({ minutes }: { minutes: number[] }) {
  const theme = useTheme();
  const labels = weekDayLabels();
  const max = Math.max(...minutes, 1);
  const hasData = minutes.some((m) => m > 0);

  return (
    <View style={[styles.chartCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
      <View style={styles.chartHeader}>
        <View style={[styles.cardIcon, { backgroundColor: `${theme.tint}14` }]}>
          <SymbolView
            name={{ ios: 'chart.bar.fill', android: 'bar_chart' }}
            size={20}
            weight="semibold"
            tintColor={theme.tint}
          />
        </View>
        <ThemedText type="smallBold">This week</ThemedText>
      </View>

      {!hasData ? (
        <View style={styles.chartEmpty}>
          <ThemedText type="small" themeColor="textSecondary">
            No reading time recorded yet this week.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.chart}>
          {minutes.map((m, i) => {
            const height = Math.max(4, (m / max) * 100);
            const isToday = i === minutes.length - 1;
            return (
              <View key={i} style={styles.barColumn}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.barValue}>
                  {shortMinutes(m)}
                </ThemedText>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height,
                        backgroundColor: isToday ? theme.tint : `${theme.tint}55`,
                      },
                    ]}
                  />
                </View>
                <ThemedText
                  type="small"
                  themeColor={isToday ? 'tint' : 'textSecondary'}
                  style={styles.barLabel}>
                  {labels[i]}
                </ThemedText>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

type StatCardProps = {
  icon: { ios: SFSymbol; android: AndroidSymbol };
  label: string;
  value: string;
  hint: string;
};

function StatCard({ icon, label, value, hint }: StatCardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
      <View style={[styles.cardIcon, { backgroundColor: `${theme.tint}14` }]}>
        <SymbolView name={icon} size={22} weight="semibold" tintColor={theme.tint} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.cardLabel}>
        {label}
      </ThemedText>
      <ThemedText type="subtitle" style={styles.cardValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.cardHint}>
        {hint}
      </ThemedText>
    </View>
  );
}

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<ReadingStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getReadingStats()
        .then((s) => {
          if (mounted) setStats(s);
        })
        .catch(() => {});
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <BrandHeader right={<ThemeToggle />} style={styles.headerBrand} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + Spacing.four },
        ]}>
        <View style={[styles.pageHero, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.pageHeroIcon, { backgroundColor: `${theme.tint}14` }]}>
            <SymbolView
              name={{ ios: 'chart.bar.fill', android: 'insights' }}
              size={28}
              weight="bold"
              tintColor={theme.tint}
            />
          </View>
          <ThemedText type="subtitle" style={styles.pageHeroTitle}>
            Reading stats
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.pageHeroSubtitle}>
            Your reading habits at a glance — streaks, time, and weekly progress.
          </ThemedText>
        </View>

        <View style={[styles.hero, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: `${theme.tint}14` }]}>
            <SymbolView
              name={{ ios: 'flame.fill', android: 'local_fire_department' }}
              size={30}
              weight="bold"
              tintColor={theme.tint}
            />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Current reading streak
          </ThemedText>
          <ThemedText type="title" style={styles.heroValue}>
            {stats ? `${stats.streakDays} day${stats.streakDays === 1 ? '' : 's'}` : '–'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.heroHint}>
            {stats && stats.streakDays > 0
              ? `You've read ${stats.streakDays} day${stats.streakDays === 1 ? '' : 's'} in a row!`
              : 'Open a book to start your streak.'}
          </ThemedText>
        </View>

        <View style={styles.timeCard}>
          <StatCard
            icon={{ ios: 'clock', android: 'schedule' }}
            label="Time spent today"
            value={stats ? formatMinutes(stats.minutesToday) : '–'}
            hint="time inside the reader"
          />
        </View>

        <WeeklyChart minutes={stats?.weekMinutes ?? []} />
      </ScrollView>

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
  scroll: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  pageHero: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
    marginBottom: Spacing.three,
  },
  pageHeroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  pageHeroTitle: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
  },
  pageHeroSubtitle: {
    textAlign: 'center',
  },
  menuWrap: {
    marginHorizontal: -Spacing.three,
  },
  hero: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
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
  heroValue: {
    textAlign: 'center',
  },
  heroHint: {
    textAlign: 'center',
  },
  timeCard: {
    marginTop: Spacing.three,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  cardLabel: {
    fontSize: 12,
  },
  cardValue: {
    fontSize: 26,
    lineHeight: 32,
  },
  cardHint: {
    fontSize: 12,
  },
  chartCard: {
    marginTop: Spacing.three,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  chartEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: Spacing.one,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.one,
  },
  barValue: {
    fontSize: 10,
    minHeight: 14,
  },
  barTrack: {
    height: 100,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
  },
});