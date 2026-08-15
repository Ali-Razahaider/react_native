import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { type ScrollMode } from '@/components/reader/scroll-mode';

const SETTINGS_FILE = 'scroll-mode.json';

function readPersistedMode(): ScrollMode {
  if (Platform.OS === 'web') return 'single';
  try {
    const file = new File(Paths.document, SETTINGS_FILE);
    if (!file.exists) return 'single';
    const parsed = JSON.parse(file.textSync());
    if (parsed.mode === 'single' || parsed.mode === 'continuous') {
      return parsed.mode;
    }
  } catch {
    // Corrupt or unreadable settings: fall back to single page.
  }
  return 'single';
}

function persistMode(mode: ScrollMode) {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(Paths.document, SETTINGS_FILE);
    if (!file.exists) file.create();
    file.write(JSON.stringify({ mode }));
  } catch {
    // Non-critical: failing to persist should never crash the app.
  }
}

export function useScrollModePreference() {
  const [mode, setMode] = useState<ScrollMode>(readPersistedMode);

  useEffect(() => {
    persistMode(mode);
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((current) => (current === 'single' ? 'continuous' : 'single'));
  }, []);

  return { mode, setMode, toggle };
}