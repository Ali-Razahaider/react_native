import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/brand/brand-header";
import { BrandLoader } from "@/components/brand/brand-loader";
import { BookCard } from "@/components/library/book-card";
import { EmptyState } from "@/components/library/empty-state";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { deleteBook, importBook, listBooks, removeBookFromLibrary } from "@/lib/library";
import { type Book } from "@/lib/types";

export default function LibraryScreen() {
  const theme = useTheme();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuBook, setMenuBook] = useState<Book | null>(null);

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

  const handleRemoveFromLibrary = useCallback(
    async (book: Book) => {
      setMenuBook(null);
      await removeBookFromLibrary(book.id);
      refresh();
    },
    [refresh],
  );

  const handleDeletePermanently = useCallback(
    async (book: Book) => {
      setMenuBook(null);
      await deleteBook(book.id);
      refresh();
    },
    [refresh],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <BrandHeader
            right={<ThemeToggle />}
            style={styles.headerBrand}
          />
          {!loading && !error && books.length > 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {countLabel}
            </ThemedText>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <BrandLoader size={96} />
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
                onLongPress={() => setMenuBook(item)}
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

        <Modal
          visible={menuBook !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuBook(null)}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuBook(null)}>
            <View style={[styles.menuSheet, { backgroundColor: theme.surfaceElevated }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.menuTitle}>
                {menuBook?.title}
              </ThemedText>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => menuBook && handleRemoveFromLibrary(menuBook)}>
                <ThemedText type="default">Remove from library</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => menuBook && handleDeletePermanently(menuBook)}>
                <ThemedText type="default" themeColor="danger">
                  Delete permanently
                </ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                onPress={() => setMenuBook(null)}>
                <ThemedText type="default" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
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
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    gap: Spacing.half,
  },
  menuTitle: {
    paddingBottom: Spacing.one,
  },
  menuItem: {
    paddingVertical: Spacing.two,
  },
  menuItemPressed: {
    opacity: 0.6,
  },
});
