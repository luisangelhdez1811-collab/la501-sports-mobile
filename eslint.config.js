// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

// Clean Architecture: each layer may only depend on the layers below it
// (app → components → hooks → data → api → domain). See docs/arquitectura.md.
// Type-only imports are allowed: they vanish at runtime.
const forbid = (layers, message) => ({
  '@typescript-eslint/no-restricted-imports': [
    'error',
    {
      patterns: layers.map((layer) => ({
        group: layer.startsWith('@/') ? [`${layer}/*`, layer] : [layer, `${layer}/*`],
        message,
        allowTypeImports: true,
      })),
    },
  ],
});

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: forbid(
      ['react', 'react-native', 'expo-*', '@expo/*', '@/app', '@/components', '@/hooks', '@/data', '@/api'],
      'Dominio: reglas de negocio puras, sin interfaz, red ni almacenamiento.',
    ),
  },
  {
    files: ['src/api/**/*.ts'],
    rules: forbid(['@/app', '@/components', '@/hooks', '@/data'], 'API: solo habla con el servidor; no conoce la interfaz.'),
  },
  {
    files: ['src/data/**/*.ts'],
    rules: forbid(['@/app', '@/components', '@/hooks'], 'Datos: repositorios y almacenamiento; no conocen la interfaz.'),
  },
  {
    files: ['src/hooks/**/*.{ts,tsx}'],
    rules: forbid(['@/app', '@/components'], 'ViewModels: exponen estado; no dibujan pantallas.'),
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: forbid(['@/app'], 'Componentes: no dependen de las pantallas (rutas).'),
  },
]);
