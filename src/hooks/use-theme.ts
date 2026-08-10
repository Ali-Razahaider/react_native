/**
 * Colors for the current theme, honoring the user's override (light/dark/system).
 */

import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/context/theme-mode-context';

export function useTheme() {
  const { resolvedScheme } = useThemeMode();

  return Colors[resolvedScheme];
}
