import { Image, StyleSheet, View } from 'react-native';

type PdfMarkProps = {
  size?: number;
};

export function PdfMark({ size = 128 }: PdfMarkProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('@/assets/images/lumio-logo.png')}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
