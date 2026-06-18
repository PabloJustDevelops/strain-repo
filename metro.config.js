// Metro config para habilitar resolución de alias y soporte web
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Soporte para resolver alias de tsconfig en web
config.resolver.resolveRequest = (origin, target, options) => {
  if (target.match(/^@/) && !options.preferNativePlatform) {
    const aliasMap = {
      '@': `${__dirname}/src`,
      '@db': `${__dirname}/src/db`,
      '@components': `${__dirname}/src/components`,
      '@stores': `${__dirname}/src/stores`,
      '@lib': `${__dirname}/src/lib`,
      '@types': `${__dirname}/src/types`,
      '@assets': `${__dirname}/assets`,
    };
    const prefix = target.split('/')[0];
    if (aliasMap[prefix]) {
      const remainder = target.replace(prefix, '');
      return require.resolve(`${aliasMap[prefix]}${remainder}`);
    }
  }
  return config.resolver.resolveRequest(origin, target, options);
};

module.exports = config;
