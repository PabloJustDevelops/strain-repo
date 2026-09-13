import Constants from 'expo-constants';

/**
 * Entorno de ejecución de Expo.
 *
 * `isExpoGo()` es true en Expo Go (StoreClient), el cliente donde Expo retiró
 * varios módulos nativos (expo-notifications desde el SDK 53, Health Connect,
 * etc.). Esos módulos lanzan al importarse, así que las features opcionales
 * deben consultar esto antes de cargarlos.
 */
export function isExpoGo(): boolean {
  return (
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo'
  );
}
