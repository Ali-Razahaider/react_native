import * as DocumentPicker from "expo-document-picker";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

  const refresh = useCallback(() => {
    try {
      setError(null);
      setBooks(listBooks());
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
        type: ["application/pdf", "com.adobe.pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const book = importBook({
        uri: asset.uri,
        name: asset.name ?? "book.pdf",
        size: asset.size ?? 0,
      });

      if (book) {
        refresh();
      } else {
        setError("Could not import that file.");
      }
    } catch {
      setError("Import failed.");
    }
  }, [refresh]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Library</ThemedText>
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
          <View style={styles.center}>
            <ThemedText type="subtitle">No books yet</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Tap + to add a PDF from your device.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={books}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.row, { backgroundColor: theme.backgroundElement }]}
              >
                <ThemedText type="default" numberOfLines={1}>
                  {item.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {(item.size / 1024 / 1024).toFixed(1)} MB
                </ThemedText>
              </Pressable>
            )}
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a PDF"
          onPress={handleAdd}
          style={[styles.addButton, { backgroundColor: theme.tint }]}
        >
          <ThemedText style={styles.addLabel}>+</ThemedText>
        </Pressable>
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
    paddingBottom: Spacing.two,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  listContent: {
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
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
  addLabel: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 32,
  },
});
