// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');

const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: [
      'dist/**',
      // Skills de agentes y temporales de Expo: no son codigo de la app.
      '.agents/**',
      '.claude/**',
      '.commandcode/**',
      '.expo/**',
      // Plugin de lint vendorizado.
      'tools/oxlint/anti-slop/**',
      // Prototipo externo de Lynx: no es codigo de la app ni sigue sus gates.
      'lynx/**',
    ],
  },
  expoConfig,
]);
