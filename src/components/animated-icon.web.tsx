import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { BrandLoader } from '@/components/brand/brand-loader';

const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setAnimate(true), 800);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    100: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
  });

  const loader = <BrandLoader light size={112} />;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          setVisible(false);
        }
      })}
      style={styles.splashOverlay}>
      {loader}
    </Animated.View>
  ) : (
    <View style={styles.splashOverlay}>{loader}</View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
