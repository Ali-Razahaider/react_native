import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PdfMark } from '@/components/brand/pdf-mark';
import { Wordmark } from '@/components/brand/wordmark';
import { Spacing } from '@/constants/theme';

type BrandLoaderProps = {
  light?: boolean;
  size?: number;
};

const DOT_DURATION = 700;

function LoadingDot({ delay, color }: { delay: number; color: string }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withRepeat(
      withDelay(
        delay,
        withTiming(1, { duration: DOT_DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [delay, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animatedStyle]} />;
}

export function BrandLoader({ light = false, size = 112 }: BrandLoaderProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(0.96, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scale]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const dotColor = light ? 'rgba(255,255,255,0.85)' : '#208AEF';

  return (
    <View style={styles.container}>
      <Animated.View style={markStyle}>
        <PdfMark size={size} />
      </Animated.View>
      <View style={styles.wordmark}>
        <Wordmark light={light} size={size * 0.26} />
      </View>
      <View style={styles.dots}>
        <LoadingDot delay={0} color={dotColor} />
        <LoadingDot delay={DOT_DURATION / 3} color={dotColor} />
        <LoadingDot delay={(DOT_DURATION / 3) * 2} color={dotColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    marginTop: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
