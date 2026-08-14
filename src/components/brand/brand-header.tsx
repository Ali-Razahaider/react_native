import { StyleSheet, View, type ViewProps } from 'react-native';

import { Wordmark } from '@/components/brand/wordmark';
import { Spacing } from '@/constants/theme';

type BrandHeaderProps = ViewProps & {
  right?: React.ReactNode;
};

export function BrandHeader({ right, ...rest }: BrandHeaderProps) {
  return (
    <View style={styles.header} {...rest}>
      <View style={styles.brand}>
        <Wordmark size={32} />
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
    paddingHorizontal: Spacing.two,
  },
});
