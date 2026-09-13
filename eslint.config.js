// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Reglas nuevas del React Compiler (eslint-plugin-react-hooks v7) que
      // señalan patrones preexistentes: fetch dentro de useEffect, sync de
      // prop->state y lecturas de reloj durante el render. Se dejan como
      // aviso hasta refactorizarlas respaldados por tests.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
]);
