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

  const login = useCallback(async (userId: string, authToken?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Get auth token from backend if not provided
      let token = authToken;
      if (!token) {
        const response = await fetch('/api/cometchat/auth-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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

  return {
    isInitialized,
    isLoggedIn,
    currentUser,
    isLoading,
    error,
    login,
    logout,
  };
}
