import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ThemeModeProvider, useThemeMode } from '@/context/theme-mode-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { resolvedScheme } = useThemeMode();
  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="reader/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Sora-Regular': require('@/assets/fonts/Sora-Regular.ttf'),
    'Sora-Bold': require('@/assets/fonts/Sora-Bold.ttf'),
    'PlayfairDisplay-Bold': require('@/assets/fonts/PlayfairDisplay-Bold.ttf'),
    'Caveat-Bold': Caveat_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeModeProvider>
      <RootNavigator />
    </ThemeModeProvider>
  );
}
