'use client';

import { useEffect, useState, useCallback } from 'react';
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
  /** Re-fetch the user profile from the database (e.g. after updating preferences). */
  refetchProfile: () => Promise<void>;
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

  const supabase = getSupabaseClient();

  // Fetch user profile
  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as Profile;
    },
    [supabase]
  );

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
        // Resolve loading as soon as auth state is known — don't block on profile fetch
        setIsLoading(false);

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setProfile(profile);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Resolve loading immediately — profile loads independently
      setIsLoading(false);

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setProfile(profile);
      } else {
        setProfile(null);
      }
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

    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error);
      throw error;
    }

    // Redirect to login page after successful logout
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

  // Manually re-fetch the profile (e.g. after updating language/timezone preferences)
  const refetchProfile = useCallback(async () => {
    const currentUser = user;
    if (!currentUser) return;
    const updated = await fetchProfile(currentUser.id);
    if (updated) setProfile(updated);
  }, [user, fetchProfile]);

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
    refetchProfile,
  };
}
