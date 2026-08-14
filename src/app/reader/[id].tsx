import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PageControls } from '@/components/reader/page-controls';
import { PdfViewer, type PdfViewerHandle } from '@/components/reader/pdf-viewer';
import { ReaderHeader } from '@/components/reader/reader-header';
import { WordLookup } from '@/components/reader/word-lookup';
import { ThemedText } from '@/components/themed-text';
import { type ThemeMode } from '@/constants/theme';
import { Spacing } from '@/constants/theme';
import { useThemeMode } from '@/context/theme-mode-context';
import { useTheme } from '@/hooks/use-theme';
import { getBook, saveBookThumbnail } from '@/lib/library';
import { getProgress, saveProgress } from '@/lib/progress-db';
import { type Book } from '@/lib/types';

export default function ReaderScreen() {
  const theme = useTheme();
  const { isDark, override, setOverride } = useThemeMode();
  const { id } = useLocalSearchParams<{ id: string }>();
  const viewerRef = useRef<PdfViewerHandle>(null);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [initialPage, setInitialPage] = useState(1);
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [noSelectableText, setNoSelectableText] = useState(false);

  const readingMode: ThemeMode = override ?? 'system';
  const onChangeMode = useCallback(
    (next: ThemeMode) => setOverride(next === 'system' ? null : next),
    [setOverride],
  );

  useEffect(() => {
    return () => setOverride(null);
  }, [setOverride]);

  const bookId = book?.id ?? id ?? '';

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    Promise.all([getBook(id), getProgress(id)])
      .then(([found, progress]) => {
        if (!mounted) return;
        if (!found) {
          setError('This book is missing.');
        } else {
          setBook(found);
          const resumeAt = progress?.lastPage ?? found.lastPage ?? 0;
          setInitialPage(Math.max(1, resumeAt));
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

  const saveDebouncedRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (pageNum: number) => {
      if (!bookId) return;
      if (saveDebouncedRef.current) clearTimeout(saveDebouncedRef.current);
      saveDebouncedRef.current = setTimeout(() => {
        saveProgress(bookId, pageNum, totalPages);
      }, 500);
    },
    [bookId, totalPages],
  );

  const onPageChange = useCallback(
    (next: number) => {
      setPage(next);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const onWordSelected = useCallback((next: string) => {
    setNoSelectableText(false);
    setLookupWord(next);
  }, []);

  const onNoSelectableText = useCallback(() => {
    setNoSelectableText(true);
    setLookupWord(null);
  }, []);

  const thumbnailCapturedRef = useRef(false);

  const onTotalPages = useCallback(
    (next: number) => {
      setTotalPages(next);
      if (thumbnailCapturedRef.current) return;
      thumbnailCapturedRef.current = true;
      if (!bookId) return;
      viewerRef.current
        ?.captureThumbnail()
        .then((dataUrl) => saveBookThumbnail(bookId, dataUrl))
        .catch(() => {});
    },
    [bookId],
  );

  useEffect(() => {
    return () => {
      if (saveDebouncedRef.current) clearTimeout(saveDebouncedRef.current);
    };
  }, []);

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
          <ReaderHeader
            title={book.title}
            readingMode={readingMode}
            onChangeMode={onChangeMode}
          />
          <PdfViewer
            ref={viewerRef}
            uri={book.uri}
            initialPage={initialPage}
            darkMode={isDark}
            onTotalPages={onTotalPages}
            onPageChange={onPageChange}
            onWordSelected={onWordSelected}
            onNoSelectableText={onNoSelectableText}
            onError={setError}
          />
          <WordLookup
            key={lookupWord ?? (noSelectableText ? 'no-text' : 'none')}
            word={lookupWord}
            noText={noSelectableText}
            onClose={() => {
              setLookupWord(null);
              setNoSelectableText(false);
            }}
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
