import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type WordmarkProps = {
  light?: boolean;
  size?: number;
};

export function Wordmark({ light = false, size = 36 }: WordmarkProps) {
  const theme = useTheme();
  const color = light ? '#ffffff' : theme.text;

  return (
    <View style={styles.row}>
      <Text style={[styles.main, { color, fontSize: size }]}>Lumio</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  main: {
    fontFamily: 'Caveat-Bold',
    letterSpacing: 1,
  },
});
