import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Session, User } from '@supabase/supabase-js';

import { getSupabase, signOut as supabaseSignOut, getSession } from '@lib/supabase';
import { createSafeAsyncStorage } from '@lib/storage';

/**
 * Estado de autenticación global.
 *
 * - Persiste solo el flag `hasLoggedIn` (no las credenciales).
 * - La sesión real la gestiona Supabase internamente (SecureStore / localStorage).
 * - Escucha onAuthStateChange para reaccionar a login/logout en otras pestañas.
 */

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  init: () => Promise<void>;
  setSession: (s: Session | null) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isConfigured: !!getSupabase(),

  async init() {
    const sb = getSupabase();

    if (!sb) {
      set({ isLoading: false, isConfigured: false });

      return;
    }

    const session = await getSession();
    set({
      session,
      user: session?.user ?? null,
      isLoading: false,
      isConfigured: true,
    });

    // Escuchar cambios (login en otra pestaña, refresh token, etc.)
    sb.auth.onAuthStateChange((_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
    });
  },

  setSession(s) {
    set({ session: s, user: s?.user ?? null });
  },

  async signOut() {
    await supabaseSignOut();
    set({ session: null, user: null });
  },
}));

// Persistencia opcional de un flag (para mostrar/ocultar onboarding, etc.)
export const useAuthFlags = create<{ hasLoggedIn: boolean; setLoggedIn: (v: boolean) => void }>()(
  persist(
    (set) => ({
      hasLoggedIn: false,
      setLoggedIn: (v) => set({ hasLoggedIn: v }),
    }),
    {
      name: 'strain-auth-flags',
      storage: createJSONStorage(() => createSafeAsyncStorage()),
    }
  )
);
