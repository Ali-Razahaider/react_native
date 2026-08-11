import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCard } from "@/components/library/book-card";
import { EmptyState } from "@/components/library/empty-state";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { importBook, listBooks } from "@/lib/library";
import { type Book } from "@/lib/types";

export default function LibraryScreen() {
  const theme = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setBooks(await listBooks());
    } catch {
      setError("Could not load your library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAdd = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: false,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      console.log("[import] uri:", asset.uri);
      const book = await importBook({
        uri: asset.uri,
        name: asset.name ?? "book.pdf",
        size: asset.size ?? 0,
      });

      if (book) {
        refresh();
      } else {
        setError("Could not import that file.");
      }
    } catch (e) {
      const detail =
        e instanceof Error
          ? e.cause instanceof Error
            ? `${e.message}: ${e.cause.message}`
            : e.message
          : "Import failed.";
      console.error("[import] failed:", e);
      setError(detail);
    }
  }, [refresh]);

  const countLabel = `${books.length} ${books.length === 1 ? "book" : "books"}`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="subtitle">Library</ThemedText>
            {!loading && !error && books.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                {countLabel}
              </ThemedText>
            )}
          </View>
          <ThemeToggle />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ThemedText type="small">Loading...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
            <Pressable onPress={refresh}>
              <ThemedText type="smallBold" themeColor="tint">
                Retry
              </ThemedText>
            </Pressable>
          </View>
        ) : books.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <BookCard
                book={item}
                onPress={() => router.push(`/reader/${item.id}`)}
              />
            )}
          />
        )}

        {books.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a PDF"
            onPress={handleAdd}
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: theme.tint },
              pressed && styles.addPressed,
            ]}>
            <ThemedText style={styles.addLabel}>+</ThemedText>
          </Pressable>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerText: {
    gap: Spacing.half,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
  addButton: {
    position: "absolute",
    right: Spacing.four,
    bottom: Spacing.five,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addPressed: {
    opacity: 0.7,
  },
  addLabel: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 32,
  },
});
