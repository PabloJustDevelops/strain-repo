import { create } from 'zustand';

import { getSession, onAuthStateChange, signOut as supabaseSignOut, isSupabaseConfigured, type AuthSession } from '@lib/supabase';

/** Identidad mínima del usuario autenticado. */
export interface AuthUser {
  id: string;
  email?: string;
}

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  init: () => Promise<void>;
  setSession: (s: AuthSession | null) => void;
  signOut: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isConfigured: isSupabaseConfigured,

  async init() {
    if (!isSupabaseConfigured) {
      set({ isLoading: false, isConfigured: false });
      return;
    }
    const session = await getSession();
    set({ session, user: session?.user ?? null, isLoading: false, isConfigured: true });
    onAuthStateChange((newSession) => {
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
