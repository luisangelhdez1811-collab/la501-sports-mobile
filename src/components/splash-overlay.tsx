import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Must match the native splash: imageWidth (288) * logo share of the padded
// splash-logo.png canvas (1224 / 2062), so the hand-off is seamless.
const LOGO_WIDTH = 171;
const LOGO_ASPECT_RATIO = 1224 / 624;
const HOLD = 900;

const logo = require('@/assets/images/logo-501.png');

// A single view stays mounted for the whole sequence: remounting it (e.g.
// swapping a View for an Animated.View) leaves a frame where the app shows through.
export function SplashOverlay({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const started = useRef(false);
  const overlayOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  // Waits for the logo to be decoded (so the native splash never hands off to a blank
  // screen) and for the app to be ready (fonts), so the menu never shows with fallback fonts.
  useEffect(() => {
    if (!ready || !logoLoaded || started.current) return;
    started.current = true;

    // The logo is on screen now, identical to the native splash, so hiding it is invisible.
    SplashScreen.hideAsync().finally(() => {
      // Logo "breathes" once, then zooms out while the black background fades away.
      logoScale.value = withDelay(
        HOLD,
        withSequence(
          withTiming(1.08, { duration: 450, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.94, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(6, { duration: 550, easing: Easing.in(Easing.cubic) }),
        ),
      );
      logoOpacity.value = withDelay(HOLD + 800, withTiming(0, { duration: 550 }));
      overlayOpacity.value = withDelay(
        HOLD + 900,
        withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(setVisible, false);
        }),
      );
    });
  }, [ready, logoLoaded, logoScale, logoOpacity, overlayOpacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.View style={logoStyle}>
        <Image
          style={styles.logo}
          source={logo}
          contentFit="contain"
          onLoadEnd={() => setLogoLoaded(true)}
        />
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
});
