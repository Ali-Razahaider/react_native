import { File, Paths } from 'expo-file-system';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { type ThemeMode } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedScheme: 'light' | 'dark';
  isDark: boolean;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

const DEFAULT_MODE: ThemeMode = 'system';
const SETTINGS_FILE = 'theme-mode.json';

function readPersistedMode(): ThemeMode {
  if (Platform.OS === 'web') return DEFAULT_MODE;
  try {
    const file = new File(Paths.document, SETTINGS_FILE);
    if (!file.exists) return DEFAULT_MODE;
    const parsed = JSON.parse(file.textSync());
    if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system') {
      return parsed.mode;
    }
  } catch {
    // Corrupt or unreadable settings: fall back to the default mode.
  }
  return DEFAULT_MODE;
}

function persistMode(mode: ThemeMode) {
  if (Platform.OS === 'web') return;
  try {
    const file = new File(Paths.document, SETTINGS_FILE);
    if (!file.exists) file.create();
    file.write(JSON.stringify({ mode }));
  } catch {
    // Non-critical: failing to persist should never crash the app.
  }
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(readPersistedMode);

  useEffect(() => {
    persistMode(mode);
  }, [mode]);

  const value = useMemo<ThemeModeContextValue>(() => {
    const resolvedScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return { mode, setMode, resolvedScheme, isDark: resolvedScheme === 'dark' };
  }, [mode, systemScheme]);

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  const value = useContext(ThemeModeContext);
  if (!value) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return value;
}
