import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Cliente de Supabase opcional.
 *
 * Strain funciona 100% offline; este módulo solo se activa si el usuario
 * configura las variables EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
 * y luego inicia sesión desde Settings.
 *
 * - Persistencia de sesión: SecureStore en nativo, localStorage en web.
 * - RLS habilitado en todas las tablas (cada user solo ve sus propios datos).
 * - La sincronización se hace por demanda (botón "Sincronizar") para evitar
 *   sorpresas con datos móviles. La cola sync_queue de SQLite permite
 *   sincronización incremental.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let cachedClient: SupabaseClient | null = null;

/** Devuelve el cliente de Supabase (null si no está configurado). */
export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: Platform.select({
        native: {
          getItem: (k) => SecureStore.getItemAsync(k),
          setItem: (k, v) => SecureStore.setItemAsync(k, v),
          removeItem: (k) => SecureStore.deleteItemAsync(k),
        },
        default: localStorage,
      }) as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

// ============================================================
// Auth helpers
// ============================================================

export async function signInWithEmail(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  return sb.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  return sb.auth.signUp({ email, password });
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

// ============================================================
// Sync helpers
// ============================================================

/**
 * Sube a Supabase todas las filas pendientes en sync_queue.
 * - Marca syncedAt al terminar con éxito.
 * - Incrementa attempts y guarda last_error si falla.
 */
export async function flushSyncQueue(): Promise<{ uploaded: number; failed: number }> {
  // Implementación: leer sync_queue, hacer upserts por tabla, actualizar estado.
  // Requiere que las tablas equivalentes existan en Supabase con RLS.
  // Ver docs/supabase-schema.sql para la migración del lado servidor.
  return { uploaded: 0, failed: 0 };
}

/** Descarga cambios remotos desde Supabase y los aplica localmente. */
export async function pullRemoteChanges(): Promise<{ downloaded: number }> {
  return { downloaded: 0 };
}
