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
};

type PdfViewerProps = {
  uri: string;
  initialPage?: number;
  darkMode?: boolean;
  onTotalPages?: (totalPages: number) => void;
  onPageChange?: (page: number) => void;
  onError?: (message: string) => void;
};

type Inbound =
  | { type: 'ready' }
  | { type: 'pageRendered'; page: number }
  | { type: 'totalPages'; totalPages: number }
  | { type: 'error'; message: string };

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(function PdfViewer(
  { uri, initialPage = 1, darkMode = false, onTotalPages, onPageChange, onError },
  ref,
) {
  const theme = useTheme();
  const webRef = useRef<WebView>(null);
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
        case 'error':
          onError?.(msg.message);
          break;
      }
    },
    [uri, initialPage, onPageChange, onTotalPages, onError, sendToWeb],
  );

  useImperativeHandle(
    ref,
    () => ({
      goToPage: (page: number) => sendToWeb(JSON.stringify({ type: 'goToPage', page })),
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
