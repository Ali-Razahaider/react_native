import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type WordmarkProps = {
  light?: boolean;
  size?: number;
};

export function Wordmark({ light = false, size = 28 }: WordmarkProps) {
  const theme = useTheme();
  const mainColor = light ? '#ffffff' : theme.text;
  const subColor = light ? 'rgba(255,255,255,0.72)' : theme.textSecondary;

  return (
    <View style={styles.row}>
      <Text style={[styles.main, { color: mainColor, fontSize: size }]}>PDF</Text>
      <Text style={[styles.sub, { color: subColor, fontSize: size * 0.8 }]}>
        Viewer
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  main: {
    fontFamily: 'Sora-Bold',
    letterSpacing: -1,
  },
  sub: {
    fontFamily: 'Sora-Regular',
    marginLeft: 6,
    letterSpacing: 0.2,
  },
});
