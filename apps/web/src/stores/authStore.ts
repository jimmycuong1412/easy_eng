'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Profile, UserRole } from '@/types/database';

interface AuthState {
  user: {
    id: string;
    email: string;
  } | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: AuthState['user']) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // Role checks
  isStudent: () => boolean;
  isTeacher: () => boolean;
  isParent: () => boolean;
  isAdmin: () => boolean;
  hasRole: (role: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setProfile: (profile) => set({ profile }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
        }),

      isStudent: () => get().profile?.role === 'student',
      isTeacher: () => get().profile?.role === 'teacher',
      isParent: () => get().profile?.role === 'parent',
      isAdmin: () => get().profile?.role === 'admin',
      hasRole: (role) => get().profile?.role === role,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
