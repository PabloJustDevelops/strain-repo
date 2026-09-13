/**
 * Stub de `react-native-health-connect` para Vitest.
 *
 * Si `globalThis.__NATIVE_THROWS__` está activo, lanza al evaluarse: así el test
 * comprueba que el código no lo importa en Expo Go.
 */
// SAFETY: flag de test que Node no declara.
const g = globalThis as { __NATIVE_THROWS__?: boolean };

if (g.__NATIVE_THROWS__) throw new Error('react-native-health-connect no debe cargarse en Expo Go');

export const getSdkStatus = async () => 3;

export const initialize = async () => true;

export const requestPermission = async () => [];

export const getGrantedPermissions = async () => [];

export const openHealthConnectSettings = () => {};

export const readRecords = async () => ({ records: [] });

export const insertRecords = async () => ['id'];

export const ExerciseType = { WEIGHTLIFTING: 81 };
