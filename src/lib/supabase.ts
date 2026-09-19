/**
 * Cliente Supabase — versión Lynx (seam).
 *
 * En la app Expo esto usa `@supabase/supabase-js` con SecureStore/auth-session.
 * En Lynx el SDK JS funciona (es fetch + storage), pero el storage seguro y el
 * flujo OAuth con WebBrowser requieren módulos nativos. Esta seam conserva las
 * firmas y deja el cliente desactivado hasta configurar el backend nativo,
 * de modo que la app sigue siendo 100% funcional offline.
 */

export interface AuthSession {
  user: { id: string; email?: string } | null;
  accessToken?: string;
}

let session: AuthSession | null = null;
const listeners = new Set<(s: AuthSession | null) => void>();

const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function signInWithEmail(_email: string, _password: string): Promise<AuthSession> {
  throw new Error('Supabase no configurado en Lynx todavía. La app funciona offline.');
}

export async function signUpWithEmail(_email: string, _password: string): Promise<AuthSession> {
  throw new Error('Supabase no configurado en Lynx todavía.');
}

export async function resetPassword(_email: string): Promise<void> {
  throw new Error('Supabase no configurado en Lynx todavía.');
}

export async function updatePassword(_newPassword: string): Promise<void> {
  throw new Error('Supabase no configurado en Lynx todavía.');
}

export async function signInWithOAuth(
  _provider: 'google' | 'github',
  _idToken?: string,
): Promise<AuthSession | null> {
  throw new Error('OAuth no disponible en Lynx todavía (requiere native module de browser).');
}

export async function signOut(): Promise<void> {
  session = null;
  listeners.forEach((l) => l(session));
}

export async function getSession(): Promise<AuthSession | null> {
  return session;
}

export function onAuthStateChange(cb: (s: AuthSession | null) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Sube las filas pendientes de sync. Stub: sin backend nativo aún. */
export async function flushSyncQueue(): Promise<{ uploaded: number; failed: number }> {
  return { uploaded: 0, failed: 0 };
}

export async function pullRemoteChanges(): Promise<{ downloaded: number }> {
  return { downloaded: 0 };
}
