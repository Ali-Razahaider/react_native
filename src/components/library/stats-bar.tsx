import { SymbolView, type AndroidSymbol, type SFSymbol } from "expo-symbols";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getReadingStats } from "@/lib/stats-db";
import { getLearnedWordCountThisWeek } from "@/lib/vocab-db";

type MenuItemProps = {
  icon: { ios: SFSymbol; android: AndroidSymbol };
  title: string;
  onPress: () => void;
};

function MenuItem({ icon, title, onPress }: MenuItemProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}>
      <SymbolView name={icon} size={20} weight="semibold" tintColor={theme.textSecondary} />
      <ThemedText type="smallBold" style={styles.itemTitle}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

export function LibraryMenu() {
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      getLearnedWordCountThisWeek().catch(() => {});
      // Refresh reading stats too so the bar always reflects recent activity.
      getReadingStats().catch(() => {});
      return () => {
        mounted = false;
      };
    }, []),
  );

  return (
    <View style={[styles.bar, { borderTopColor: theme.border }]}>
      <MenuItem
        icon={{ ios: "books.vertical.fill", android: "library_books" }}
        title="Library"
        onPress={() => router.navigate("/")}
      />
      <View style={[styles.separator, { backgroundColor: theme.border }]} />
      <MenuItem
        icon={{ ios: "chart.bar.fill", android: "insights" }}
        title="Stats"
        onPress={() => router.navigate("/stats")}
      />
      <View style={[styles.separator, { backgroundColor: theme.border }]} />
      <MenuItem
        icon={{ ios: "character.book.closed.fill", android: "menu_book" }}
        title="Vocabulary"
        onPress={() => router.navigate("/vocab")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  itemPressed: {
    opacity: 0.6,
  },
  itemTitle: {
    fontSize: 14,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    marginVertical: Spacing.two,
  },
});