import { StyleSheet, View, type ViewProps } from 'react-native';

import { PdfMark } from '@/components/brand/pdf-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { Spacing } from '@/constants/theme';

type BrandHeaderProps = ViewProps & {
  right?: React.ReactNode;
};

export function BrandHeader({ right, ...rest }: BrandHeaderProps) {
  return (
    <View style={styles.header} {...rest}>
      <View style={styles.brand}>
        <PdfMark size={44} />
        <Wordmark size={24} />
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
