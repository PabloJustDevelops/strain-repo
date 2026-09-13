// Metro config para habilitar resolución de alias y soporte web
const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Cabeceras HTTP necesarias para SharedArrayBuffer (expo-sqlite web WASM)
config.server = config.server || {};

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    return middleware(req, res, next);
  };
};

config.resolver.assetExts = [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'wasm'];

config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Mapa de alias → carpeta física
const aliasMap = {
  '@': `${__dirname}/src`,
  '@db': `${__dirname}/src/db`,
  '@components': `${__dirname}/src/components`,
  '@stores': `${__dirname}/src/stores`,
  '@lib': `${__dirname}/src/lib`,
  '@types': `${__dirname}/src/types`,
  '@assets': `${__dirname}/assets`,
};

// Soporte para resolver alias de tsconfig en web.
// Firma moderna de Metro: (context, moduleName, platform).
// Se delega en `context.resolveRequest` para no entrar en bucle.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.match(/^@/) && platform !== 'ios' && platform !== 'android') {
    const prefix = moduleName.split('/')[0];
    const aliasRoot = aliasMap[prefix];

    if (aliasRoot) {
      const remainder = moduleName.slice(prefix.length);
      const resolved = path.join(aliasRoot, remainder);

      return context.resolveRequest(context, resolved, platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;