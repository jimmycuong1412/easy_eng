/**
 * useCometChat Hook
 *
 * Manages CometChat SDK initialization and user authentication
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  initCometChat,
  loginCometChatUser,
  logoutCometChatUser,
  getCurrentCometChatUser,
  CometChat,
} from '@/lib/cometchat/client';
import { createClassGroup, joinClassGroup, leaveClassGroup } from '@/lib/cometchat';
import { createClient } from '@/lib/supabase/client';
import { csrfFetch } from '@/lib/csrf';
import { logger } from '@/lib/cometchat/logger';
import type { UseCometChatReturn } from '@/types/cometchat';

export function useCometChat(): UseCometChatReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<CometChat.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize CometChat on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initCometChat();
        setIsInitialized(true);
        logger.info('CometChat initialized successfully');

        // Check if user is already logged in
        const user = await getCurrentCometChatUser();
        if (user) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          logger.info('User already logged in', { userId: user.getUid() });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        logger.logError('useCometChat initialization', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const login = useCallback(async (userId: string, authToken?: string, targetUserId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token from backend if not provided
      let token = authToken;
      if (!token) {
        const response = await csrfFetch('/api/cometchat/auth-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Pass targetUserId so the backend pre-registers the remote peer (e.g. teacher)
          body: JSON.stringify({ targetUserId: targetUserId || null }),
        });

        if (!response.ok) {
          throw new Error('Failed to get auth token');
        }

        const data = await response.json();
        token = data.authToken;
      }

      const user = await loginCometChatUser(userId, token);
      setCurrentUser(user);
      setIsLoggedIn(true);
      logger.info('User logged in successfully', { userId });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      logger.logError('useCometChat login', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await logoutCometChatUser();
      setCurrentUser(null);
      setIsLoggedIn(false);
      logger.info('User logged out successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed');
      setError(error);
      logger.logError('useCometChat logout', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Join a CometChat group, transparently initializing the SDK and logging in
   * the current Supabase user first. Creates the group if it doesn't exist
   * (createClassGroup treats ERR_GUID_ALREADY_EXISTS as success).
   */
  const joinGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      await initCometChat();

      let user = await getCurrentCometChatUser();
      if (!user) {
        const supabase = createClient();
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!sbUser) throw new Error('Not authenticated');

        const response = await csrfFetch('/api/cometchat/auth-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error('Failed to get auth token');
        const data = await response.json();

        user = await loginCometChatUser(sbUser.id, data.authToken);
        setCurrentUser(user);
        setIsLoggedIn(true);
      }

      await createClassGroup(groupId, 'EasyEng Class Session');
      if (await joinClassGroup(groupId)) return true;

      // joinClassGroup returns false for ERR_ALREADY_JOINED — verify membership
      try {
        const group: any = await (CometChat as any).getGroup(groupId);
        return Boolean(group?.getHasJoined?.() ?? group?.hasJoined);
      } catch {
        return false;
      }
    } catch (err) {
      logger.logError('useCometChat joinGroup', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      return await leaveClassGroup(groupId);
    } catch (err) {
      logger.logError('useCometChat leaveGroup', err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, []);

  return {
    isInitialized,
    isLoggedIn,
    currentUser,
    isLoading,
    error,
    login,
    logout,
    joinGroup,
    leaveGroup,
  };
}
