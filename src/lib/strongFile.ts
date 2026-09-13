import { Platform } from 'react-native';

import type { Repos } from '@db';

import { importStrongCsv, type StrongImportResult } from './exportImport';

/**
 * La cara "archivo" del import de Strong.
 *
 * Es el único módulo del flujo que necesita `react-native` / `expo-file-system`, y
 * `react-native` no carga en Node (usa Flow). Por eso la dependencia va en una
 * sola dirección: **este módulo conoce a `exportImport`, nunca al revés**, y el
 * camino texto → base de datos queda testeable sin mocks de plomería.
 *
 * Sólo lo importa la pantalla de ajustes, así que no entra en el grafo de tests.
 */

/** Lee un ZIP y devuelve el contenido de workouts.csv (o el primer CSV encontrado). */
export async function readCsvFromZip(zipUri: string): Promise<string> {
  // Implementación manual: ZIP central directory + descompresión usando fetch + fflate si está instalado
  // Como evitamos dependencias adicionales, usamos un fallback: el usuario puede extraer manualmente
  // el CSV del ZIP y usar importStrongCsv directamente.
  //
  // Si tienes `fflate` instalado: descomprime aquí.
  // Decodifica base64 → bytes → intenta buscar el header PK\x03\x04 y descomprimir con fflate
  // Como fflate no es dependencia, lanzamos error informativo.
  throw new Error(
    'Importación desde ZIP: descomprime el archivo manualmente y selecciona el workouts.csv extraído. ' +
      'O instala `fflate` (npm i fflate) y ajusta readCsvFromZip() para descomprimir.'
  );
}

export async function readFileAsText(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);

    return resp.text();
  }

  const FileSystem = await import('expo-file-system');

  return FileSystem.readAsStringAsync(uri, { encoding: 'utf8' });
}

/**
 * Importa un export de Strong desde un archivo.
 * Acepta un .zip exportado por Strong (contiene workouts.csv) o un .csv directo.
 */
export async function importStrongZip(
  fileUri: string,
  repos: Repos
): Promise<StrongImportResult> {
  const csvText = fileUri.toLowerCase().endsWith('.zip')
    ? await readCsvFromZip(fileUri)
    : await readFileAsText(fileUri);

  return importStrongCsv(csvText, repos);
}
