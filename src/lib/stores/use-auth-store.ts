'use client';

import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;

  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false });
        return { error: data.error || 'Sign in failed' };
      }
      set({ user: data.user, loading: false });
      return {};
    } catch {
      set({ loading: false });
      return { error: 'Network error' };
    }
  },

  signUp: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false });
        return { error: data.error || 'Sign up failed' };
      }
      set({ user: data.user, loading: false });
      return {};
    } catch {
      set({ loading: false });
      return { error: 'Network error' };
    }
  },

  signOut: async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } catch {
      // ignore
    }
    set({ user: null });
  },

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    // Check if we have a valid session
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          set({ user: data.user, loading: false });
        } else {
          set({ user: null, loading: false });
        }
      })
      .catch(() => {
        set({ user: null, loading: false });
      });
  },
}));
