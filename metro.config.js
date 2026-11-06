// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

// The app uses React Native's own fetch, not expo/fetch (the default since SDK 54+):
// - certificate pinning (react-native-ssl-public-key-pinning) hooks React Native's
//   networking client; expo/fetch builds its own OkHttp client and would skip the pins;
// - React Native's FormData sends a file by its uri ({ uri, name, type }), which is how
//   the profile photo is uploaded; expo/fetch rejects it ("Unsupported FormDataPart").
// Read by babel-preset-expo while bundling (dev server, EAS and Gradle builds alike).
// After changing it, restart Metro with --clear.
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1';

const config = getDefaultConfig(__dirname);

// Production bundles: strip every console.* call (so nothing about requests or
// tokens ends up in device logs) and mangle top-level names. Hermes then compiles
// the result to bytecode, so the release app ships no readable JavaScript.
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  compress: {
    ...config.transformer.minifierConfig?.compress,
    drop_console: true,
    drop_debugger: true,
    passes: 2,
  },
  mangle: {
    ...config.transformer.minifierConfig?.mangle,
    toplevel: true,
  },
};

module.exports = config;
