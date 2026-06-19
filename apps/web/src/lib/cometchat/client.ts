/**
 * CometChat Client Initialization
 *
 * Singleton instance for CometChat SDK
 */

import { CometChat } from '@cometchat/chat-sdk-javascript';
import { COMETCHAT_CONFIG } from './config';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize CometChat SDK
 * This should be called once when the app starts
 */
export async function initCometChat(): Promise<void> {
  // If already initialized, return immediately
  if (isInitialized) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      const appSetting = new CometChat.AppSettingsBuilder()
        .subscribePresenceForAllUsers()
        .setRegion(COMETCHAT_CONFIG.region)
        .autoEstablishSocketConnection(true)
        .build();

      await CometChat.init(COMETCHAT_CONFIG.appId, appSetting);

      isInitialized = true;
      // CometChat SDK initialized successfully
    } catch (error) {
      console.error('[CometChat] Initialization failed:', error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Login user to CometChat
 */
export async function loginCometChatUser(
  userId: string,
  authToken?: string
): Promise<CometChat.User> {
  try {
    // Ensure SDK is initialized
    await initCometChat();

    // Check if user is already logged in
    const loggedInUser = await CometChat.getLoggedinUser();
    if (loggedInUser?.getUid() === userId) {
      // CometChat user already logged in
      return loggedInUser;
    }

    // Logout current user if different
    if (loggedInUser) {
      await CometChat.logout();
    }

    if (!authToken) {
      throw new Error('[CometChat] authToken is required. Obtain it from /api/cometchat/auth-token.');
    }

    // Login with server-generated auth token (secure — auth key never sent to client)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await (CometChat as any).login(authToken);
    // CometChat user logged in with token
    return user;
  } catch (error) {
    console.error('[CometChat] Login failed:', error);
    throw error;
  }
}

/**
 * Logout current user from CometChat
 */
export async function logoutCometChatUser(): Promise<void> {
  try {
    await CometChat.logout();
    // CometChat user logged out
  } catch (error) {
    console.error('[CometChat] Logout failed:', error);
    throw error;
  }
}

/**
 * Get currently logged in user
 */
export async function getCurrentCometChatUser(): Promise<CometChat.User | null> {
  try {
    const user = await CometChat.getLoggedinUser();
    return user;
  } catch (error) {
    console.error('[CometChat] Get user failed:', error);
    return null;
  }
}

/**
 * Check if SDK is initialized
 */
export function isCometChatInitialized(): boolean {
  return isInitialized;
}

// Export CometChat for direct access if needed
export { CometChat };
