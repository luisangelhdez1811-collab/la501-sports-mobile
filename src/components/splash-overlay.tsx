import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Brand } from '@/constants/brand';

// Must match the native splash: imageWidth (288) * logo share of the padded
// splash-logo.png canvas (1224 / 2062), so the hand-off is seamless.
const LOGO_WIDTH = 171;
const LOGO_ASPECT_RATIO = 1224 / 624;
// The loading bar only appears if the app takes longer than this (e.g. a slow phone).
const BAR_DELAY = 400;
const BAR_WIDTH = 120;
const EXIT_MS = 450;

const logo = require('@/assets/images/logo-501.png');

// A single view stays mounted for the whole sequence: remounting it (e.g.
// swapping a View for an Animated.View) leaves a frame where the app shows through.
export function SplashOverlay({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const started = useRef(false);
  const overlayOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const barOpacity = useSharedValue(0);
  const barProgress = useSharedValue(0);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: logoScale.value }] }));
  const barStyle = useAnimatedStyle(() => ({ opacity: barOpacity.value }));
  const barFillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -BAR_WIDTH / 2 + barProgress.value * BAR_WIDTH * 1.5 }],
  }));

  // As soon as the logo is decoded it looks exactly like the native splash, so the native
  // one is hidden right away; the app keeps starting (and downloading data) behind this.
  useEffect(() => {
    if (!logoLoaded) return;
    SplashScreen.hideAsync().catch(() => {});
    barOpacity.set(withDelay(BAR_DELAY, withTiming(1, { duration: 250 })));
    barProgress.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1));
  }, [logoLoaded, barOpacity, barProgress]);

  // Ready (fonts + who is signed in): a short zoom while the black background fades away.
  useEffect(() => {
    if (!ready || !logoLoaded || started.current) return;
    started.current = true;
    cancelAnimation(barOpacity);
    barOpacity.set(withTiming(0, { duration: 150 }));
    logoScale.set(withTiming(1.15, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) }));
    overlayOpacity.set(
      withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(setVisible, false);
      }),
    );
  }, [ready, logoLoaded, logoScale, barOpacity, overlayOpacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.View style={logoStyle}>
        <Image style={styles.logo} source={logo} contentFit="contain" onLoadEnd={() => setLogoLoaded(true)} />
      </Animated.View>
      <Animated.View style={[styles.bar, barStyle]}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barFillStyle]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  logo: {
    width: LOGO_WIDTH,
    aspectRatio: LOGO_ASPECT_RATIO,
  },
  // Below the logo without moving it: the logo must stay where the native splash drew it.
  bar: {
    position: 'absolute',
    top: '50%',
    marginTop: LOGO_WIDTH / LOGO_ASPECT_RATIO / 2 + 36,
  },
  track: {
    width: BAR_WIDTH,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fill: {
    width: BAR_WIDTH / 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: Brand.orange,
  },
});
