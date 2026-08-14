import { StyleSheet, Text, View } from 'react-native';
import { useThemeMode } from '@/context/theme-mode-context';

type PdfMarkProps = {
  size?: number;
};

export function PdfMark({ size = 128 }: PdfMarkProps) {
  const { isDark } = useThemeMode();
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.logoText, { fontSize: size * 0.4, color: isDark ? '#FFFFFF' : '#000000' }]}>
        Lumio
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'PlayfairDisplay-Bold',
    letterSpacing: 1,
  },
});
