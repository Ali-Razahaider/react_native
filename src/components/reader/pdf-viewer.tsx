import * as FileSystem from 'expo-file-system/legacy';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { loadPdfAssets } from '@/components/reader/pdf-assets';
import { buildPdfHtml } from '@/components/reader/pdf-html';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PdfViewerHandle = {
  goToPage: (page: number) => void;
  captureThumbnail: () => Promise<string>;
};

type PdfViewerProps = {
  uri: string;
  initialPage?: number;
  darkMode?: boolean;
  onTotalPages?: (totalPages: number) => void;
  onPageChange?: (page: number) => void;
  onWordSelected?: (word: string) => void;
  onNoSelectableText?: () => void;
  onError?: (message: string) => void;
};

type Inbound =
  | { type: 'ready' }
  | { type: 'pageRendered'; page: number }
  | { type: 'totalPages'; totalPages: number }
  | { type: 'wordSelected'; word: string }
  | { type: 'noSelectableText' }
  | { type: 'thumbnail'; data: string }
  | { type: 'debug'; message: string }
  | { type: 'error'; message: string };

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  { uri, initialPage = 1, darkMode = false, onTotalPages, onPageChange, onWordSelected, onNoSelectableText, onError },
  ref,
) {
  const theme = useTheme();
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const darkModeRef = useRef(darkMode);
  const thumbnailResolveRef = useRef<((data: string) => void) | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    loadPdfAssets()
      .then((assets) => {
        if (!mounted) return;
        setHtml(buildPdfHtml(assets));
      })
      .catch((e) => {
        if (!mounted) return;
        const message = e instanceof Error ? e.message : String(e);
        setLoadError(message);
        onError?.(message);
      });
    return () => {
      mounted = false;
    };
  }, [onError]);

  const sendToWeb = useCallback((message: string) => {
    webRef.current?.postMessage(message);
  }, []);

  // Keep the webview's theme in sync whenever the prop changes.
  useEffect(() => {
    darkModeRef.current = darkMode;
    if (readyRef.current) {
      sendToWeb(JSON.stringify({ type: 'setDarkMode', on: darkMode }));
    }
  }, [darkMode, sendToWeb]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: Inbound;
      try {
        msg = JSON.parse(event.nativeEvent.data) as Inbound;
      } catch {
        return;
      }
      switch (msg.type) {
        case 'ready':
          readyRef.current = true;
          sendToWeb(JSON.stringify({ type: 'setDarkMode', on: darkModeRef.current }));
          FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          })
            .then((base64) => {
              sendToWeb(
                JSON.stringify({ type: 'openPdf', data: base64, initialPage }),
              );
            })
            .catch((e) => {
              const message = e instanceof Error ? e.message : String(e);
              onError?.(message);
            });
          break;
        case 'pageRendered':
          onPageChange?.(msg.page);
          break;
        case 'totalPages':
          onTotalPages?.(msg.totalPages);
          break;
        case 'thumbnail':
          thumbnailResolveRef.current?.(msg.data);
          thumbnailResolveRef.current = null;
          break;
        case 'wordSelected':
          onWordSelected?.(msg.word);
          break;
        case 'noSelectableText':
          onNoSelectableText?.();
          break;
        case 'debug':
          console.log(`[webview] ${msg.message}`);
          break;
        case 'error':
          onError?.(msg.message);
          break;
      }
    },
    [uri, initialPage, onPageChange, onTotalPages, onWordSelected, onNoSelectableText, onError, sendToWeb],
  );

  useImperativeHandle(
    ref,
    () => ({
      goToPage: (page: number) => sendToWeb(JSON.stringify({ type: 'goToPage', page })),
      captureThumbnail: () =>
        new Promise<string>((resolve) => {
          thumbnailResolveRef.current = resolve;
          sendToWeb(JSON.stringify({ type: 'captureThumbnail' }));
        }),
    }),
    [sendToWeb],
  );

  if (loadError || !html) {
    return (
      <View style={styles.placeholder}>
        <ThemedText type="small" themeColor={loadError ? 'danger' : 'textSecondary'}>
          {loadError ?? 'Preparing reader…'}
        </ThemedText>
      </View>
    );
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      style={[styles.webview, { backgroundColor: theme.background }]}
      source={{ html }}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      scrollEnabled={false}
      overScrollMode="never"
      bounces={false}
      onError={(syntheticEvent) => {
        const { description } = syntheticEvent.nativeEvent;
        onError?.(description);
      }}
    />
  );
});

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
});
