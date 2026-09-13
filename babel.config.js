module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
    ],
    plugins: [
      // El plugin se movió de react-native-reanimated a worklets en Reanimated 4.5.
      'react-native-worklets/plugin', // Debe ir el último
    ],
  };
};
