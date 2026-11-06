// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

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
