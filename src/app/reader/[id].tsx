import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageControls } from '@/components/reader/page-controls';
import { PdfViewer, type PdfViewerHandle } from '@/components/reader/pdf-viewer';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getBook } from '@/lib/library';
import { type Book } from '@/lib/types';

export default function ReaderScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewerRef = useRef<PdfViewerHandle>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    getBook(id)
      .then((found) => {
        if (!mounted) return;
        if (!found) {
          setError('This book is missing.');
        } else {
          setBook(found);
        }
      })
      .catch(() => {
        if (mounted) setError('Could not load this book.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const goToPage = useCallback((next: number) => {
    if (next < 1) return;
    if (totalPages > 0 && next > totalPages) return;
    setPage(next);
    viewerRef.current?.goToPage(next);
  }, [totalPages]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading ? (
        <View style={styles.center}>
          <ThemedText type="small" themeColor="textSecondary">
            Loading…
          </ThemedText>
        </View>
      ) : error || !book ? (
        <View style={styles.center}>
          <ThemedText type="small" themeColor="danger">
            {error ?? 'This book is missing.'}
          </ThemedText>
        </View>
      ) : (
        <>
          <PdfViewer
            ref={viewerRef}
            uri={book.uri}
            onTotalPages={setTotalPages}
            onPageChange={setPage}
            onError={setError}
          />
          {totalPages > 0 && (
            <PageControls
              page={page}
              totalPages={totalPages}
              onPrev={() => goToPage(page - 1)}
              onNext={() => goToPage(page + 1)}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
