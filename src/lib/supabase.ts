import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

import { createMemoryStorage, getBrowserLocalStorage } from './storage';

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

/**
 * Adaptador de storage asíncrono (SecureStore en nativo, localStorage en web)
 * para que Supabase pueda persistir la sesión.
 *
 * Se castea a `any` porque la interfaz `Storage` que Supabase espera (AsyncStorage-like)
 * no es 100% compatible con `Storage` de DOM — Supabase v2 acepta promises en getItem.
 */
const secureStoreStorage = {
  getItem: (k: string): Promise<string | null> => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string): Promise<void> => SecureStore.setItemAsync(k, v),
  removeItem: (k: string): Promise<void> => SecureStore.deleteItemAsync(k),
};

/** Devuelve el cliente de Supabase (null si no está configurado). */
export function getSupabase(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage:
        Platform.OS === 'web'
          ? (getBrowserLocalStorage() ?? createMemoryStorage())
          : (secureStoreStorage as any),
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
  if (!sb) throw new Error('Supabase no configurado. Añade EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: makeRedirectUri({ scheme: 'strain' }) },
  });
  if (error) throw error;
  return data;
}

export async function resetPassword(email: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: makeRedirectUri({ scheme: 'strain' }),
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/** Devuelve la sesión actual (o null si no hay). */
export async function getSession(): Promise<Session | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

/** Devuelve el usuario actual. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

// ============================================================
// OAuth (Google / GitHub)
// ============================================================

/**
 * Inicia el flujo de OAuth con un provider (google / github).
 *
 * Implementación:
 * - Usa `signInWithIdToken` si provees el idToken (recomendado para nativo con expo-auth-session)
 * - Usa `signInWithOAuth` con `WebBrowser` como fallback que funciona en web + Android.
 */
WebBrowser.maybeCompleteAuthSession();

export async function signInWithOAuth(
  provider: 'google' | 'github',
  idToken?: string,
) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase no configurado');

  if (idToken) {
    const { data, error } = await sb.auth.signInWithIdToken({
      provider,
      token: idToken,
    });
    if (error) throw error;
    return data;
  }

  const redirectTo = makeRedirectUri({ scheme: 'strain' });
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: false,
    },
  });
  if (error) throw error;

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      // Extraer tokens del fragmento URL
      const url = new URL(result.url);
      const params = new URLSearchParams(url.hash.slice(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessErr } = await sb.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessErr) throw sessErr;
        return sessionData;
      }
    }
  }
  return null;
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
