'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

/**
 * Custom hook for authentication state and operations.
 * Provides user, session, and profile data with auth methods.
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = getSupabaseClient();
  }
  const supabase = supabaseRef.current;

  // Fetch user profile
  const fetchProfile = useCallback(
    async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          return null;
        }

        return data as Profile;
      } catch {
        return null;
      }
    },
    [supabase]
  );

  // Initialize auth state
  useEffect(() => {
    // Subscribe to auth changes first — Supabase fires this immediately with current session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setProfile(profile);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error);
        setIsLoading(false);
        throw error;
      }

      // Set loading to false on success
      setIsLoading(false);
    },
    [supabase]
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setError(null);
      setIsLoading(true);

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error);
        setIsLoading(false);
        throw error;
      }

      // Set loading to false on success
      setIsLoading(false);
    },
    [supabase]
  );

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error);
      throw error;
    }
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    setError(null);

    // 1. Clear server-side HttpOnly cookies FIRST — must happen before
    //    supabase.auth.signOut() because that fires onAuthStateChange(SIGNED_OUT)
    //    which triggers a React re-render/unmount that can abort this async fn
    //    before the fetch completes.
    await fetch('/api/auth/logout', { method: 'POST' });

    // 2. Clear client-side Supabase session (in-memory + localStorage).
    await supabase.auth.signOut();

    window.location.href = '/auth/login';
  }, [supabase]);

  // Reset password
  const resetPassword = useCallback(
    async (email: string) => {
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error);
        throw error;
      }
    },
    [supabase]
  );

  // Update password
  const updatePassword = useCallback(
    async (newPassword: string) => {
      setError(null);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error);
        throw error;
      }
    },
    [supabase]
  );

  return {
    user,
    profile,
    session,
    isLoading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  };
}
