import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeModeProvider, useThemeMode } from '@/context/theme-mode-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { resolvedScheme } = useThemeMode();
  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <RootNavigator />
    </ThemeModeProvider>
  );
}
