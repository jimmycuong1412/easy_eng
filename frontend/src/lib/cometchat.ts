/**
 * CometChat Configuration and Initialization
 *
 * Manages CometChat SDK initialization and configuration
 * Task: T112 [P] Create CometChat configuration
 */

import { CometChat } from '@cometchat/chat-sdk-javascript';
import type { CometChatConfig, CometChatUser, CometChatError } from '@/types/cometchat.types';
import { env } from '@/lib/env';

// ============================================================================
// Configuration
// ============================================================================

const COMETCHAT_CONFIG: CometChatConfig = {
  appId: env.NEXT_PUBLIC_COMETCHAT_APP_ID,
  region: env.NEXT_PUBLIC_COMETCHAT_REGION,
  // authKey is server-only — not available in client bundles.
  // User creation is handled server-side in /api/cometchat/auth-token.
  authKey: '',
};

// Validate configuration
if (!COMETCHAT_CONFIG.appId) {
  console.warn('CometChat configuration is missing. Video calling features will be unavailable.');
}

// ============================================================================
// Initialization
// ============================================================================

let isInitialized = false;

/**
 * Initialize CometChat SDK
 * Must be called once before using any CometChat features
 */
export async function initCometChat(): Promise<boolean> {
  if (isInitialized) {
    // CometChat already initialized
    return true;
  }

  try {
    const appSetting = new CometChat.AppSettingsBuilder()
      .subscribePresenceForAllUsers()
      .setRegion(COMETCHAT_CONFIG.region)
      .autoEstablishSocketConnection(true)
      .build();

    await CometChat.init(COMETCHAT_CONFIG.appId, appSetting);
    isInitialized = true;
    // CometChat initialized successfully
    return true;
  } catch (error) {
    console.error('CometChat initialization failed:', error);
    return false;
  }
}

/**
 * Check if CometChat is initialized
 */
export function isCometchatInitialized(): boolean {
  return isInitialized;
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Create a CometChat user
 * Used for syncing Supabase users to CometChat
 */
export async function createCometChatUser(
  uid: string,
  name: string,
  avatar?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const user = new CometChat.User(uid);
    user.setName(name);
    if (avatar) {
      user.setAvatar(avatar);
    }
    if (metadata) {
      user.setMetadata(metadata);
    }

    await CometChat.createUser(user, COMETCHAT_CONFIG.authKey);
    // CometChat user created
    return true;
  } catch (error: any) {
    // User might already exist
    if (error?.code === 'ERR_UID_ALREADY_EXISTS') {
      // CometChat user already exists
      return true;
    }
    console.error('Failed to create CometChat user:', error);
    return false;
  }
}

/**
 * Update CometChat user details
 */
export async function updateCometChatUser(
  uid: string,
  name?: string,
  avatar?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const user = new CometChat.User(uid);
    if (name) user.setName(name);
    if (avatar) user.setAvatar(avatar);
    if (metadata) user.setMetadata(metadata);

    await CometChat.updateUser(user, COMETCHAT_CONFIG.authKey);
    // CometChat user updated
    return true;
  } catch (error) {
    console.error('Failed to update CometChat user:', error);
    return false;
  }
}

/**
 * Login to CometChat with user UID
 */
export async function loginToCometChat(uid: string): Promise<CometChatUser | null> {
  try {
    const user = await CometChat.login(uid, COMETCHAT_CONFIG.authKey);
    // Logged in to CometChat

    return {
      uid: user.getUid(),
      name: user.getName(),
      avatar: user.getAvatar(),
      metadata: user.getMetadata() as Record<string, unknown>,
    };
  } catch (error) {
    console.error('CometChat login failed:', error);
    return null;
  }
}

/**
 * Logout from CometChat
 */
export async function logoutFromCometChat(): Promise<boolean> {
  try {
    await CometChat.logout();
    // Logged out from CometChat
    return true;
  } catch (error) {
    console.error('CometChat logout failed:', error);
    return false;
  }
}

/**
 * Get currently logged in CometChat user
 */
export async function getLoggedInUser(): Promise<CometChatUser | null> {
  try {
    const user = await CometChat.getLoggedinUser();
    if (!user) return null;

    return {
      uid: user.getUid(),
      name: user.getName(),
      avatar: user.getAvatar(),
      metadata: user.getMetadata() as Record<string, unknown>,
    };
  } catch (error) {
    console.error('Failed to get logged in user:', error);
    return null;
  }
}

// ============================================================================
// Group Management
// ============================================================================

/**
 * Create a CometChat group for a class session
 */
export async function createClassGroup(
  groupId: string,
  groupName: string,
  description?: string,
  icon?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const group = new CometChat.Group(
      groupId,
      groupName,
      CometChat.GROUP_TYPE.PUBLIC
    );

    if (description) group.setDescription(description);
    if (icon) group.setIcon(icon);
    if (metadata) group.setMetadata(metadata);

    await CometChat.createGroup(group);
    // CometChat group created
    return true;
  } catch (error: any) {
    // Group might already exist
    if (error?.code === 'ERR_GUID_ALREADY_EXISTS') {
      // CometChat group already exists
      return true;
    }
    console.error('Failed to create CometChat group:', error);
    return false;
  }
}

/**
 * Join a CometChat group
 */
export async function joinClassGroup(
  groupId: string,
  groupType: string = CometChat.GROUP_TYPE.PUBLIC,
  password?: string
): Promise<boolean> {
  try {
    await CometChat.joinGroup(groupId, groupType as CometChat.GroupType, password);
    // Joined CometChat group
    return true;
  } catch (error) {
    console.error('Failed to join CometChat group:', error);
    return false;
  }
}

/**
 * Leave a CometChat group
 */
export async function leaveClassGroup(groupId: string): Promise<boolean> {
  try {
    await CometChat.leaveGroup(groupId);
    // Left CometChat group
    return true;
  } catch (error) {
    console.error('Failed to leave CometChat group:', error);
    return false;
  }
}

/**
 * Delete a CometChat group
 */
export async function deleteClassGroup(groupId: string): Promise<boolean> {
  try {
    await CometChat.deleteGroup(groupId);
    // Deleted CometChat group
    return true;
  } catch (error) {
    console.error('Failed to delete CometChat group:', error);
    return false;
  }
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId: string, limit: number = 30): Promise<any[]> {
  try {
    const membersRequest = new CometChat.GroupMembersRequestBuilder(groupId)
      .setLimit(limit)
      .build();

    const members = await membersRequest.fetchNext();
    return members;
  } catch (error) {
    console.error('Failed to fetch group members:', error);
    return [];
  }
}

// ============================================================================
// Call Management
// ============================================================================

/**
 * Start a video call session
 */
export async function startVideoCall(
  receiverId: string,
  receiverType: string = CometChat.RECEIVER_TYPE.GROUP
): Promise<any> {
  try {
    const call = new CometChat.Call(
      receiverId,
      CometChat.CALL_TYPE.VIDEO,
      receiverType
    );

    const outgoingCall = await CometChat.initiateCall(call);
    // Video call initiated
    return outgoingCall;
  } catch (error) {
    console.error('Failed to start video call:', error);
    throw error;
  }
}

/**
 * Accept an incoming call
 */
export async function acceptCall(sessionId: string): Promise<any> {
  try {
    const call = await CometChat.acceptCall(sessionId);
    // Call accepted
    return call;
  } catch (error) {
    console.error('Failed to accept call:', error);
    throw error;
  }
}

/**
 * Reject an incoming call
 */
export async function rejectCall(
  sessionId: string,
  status: string = CometChat.CALL_STATUS.REJECTED
): Promise<any> {
  try {
    const call = await CometChat.rejectCall(sessionId, status);
    // Call rejected
    return call;
  } catch (error) {
    console.error('Failed to reject call:', error);
    throw error;
  }
}

/**
 * End an ongoing call
 */
export async function endCall(sessionId: string): Promise<boolean> {
  try {
    await CometChat.endCall(sessionId);
    // Call ended
    return true;
  } catch (error) {
    console.error('Failed to end call:', error);
    return false;
  }
}

// ============================================================================
// Messaging
// ============================================================================

/**
 * Send a text message to a group
 */
export async function sendGroupMessage(
  groupId: string,
  messageText: string
): Promise<boolean> {
  try {
    const textMessage = new CometChat.TextMessage(
      groupId,
      messageText,
      CometChat.RECEIVER_TYPE.GROUP
    );

    await CometChat.sendMessage(textMessage);
    // Group message sent
    return true;
  } catch (error) {
    console.error('Failed to send group message:', error);
    return false;
  }
}

/**
 * Fetch previous messages from a group
 */
export async function fetchGroupMessages(
  groupId: string,
  limit: number = 30
): Promise<any[]> {
  try {
    const messagesRequest = new CometChat.MessagesRequestBuilder()
      .setGUID(groupId)
      .setLimit(limit)
      .build();

    const messages = await messagesRequest.fetchPrevious();
    return messages;
  } catch (error) {
    console.error('Failed to fetch group messages:', error);
    return [];
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Parse CometChat error to standardized format
 */
export function parseCometChatError(error: any): CometChatError {
  return {
    code: error?.code || 'UNKNOWN_ERROR',
    message: error?.message || 'An unknown error occurred',
    details: error?.details || {},
  };
}

// ============================================================================
// Exports
// ============================================================================

export const CometChatService = {
  // Initialization
  init: initCometChat,
  isInitialized: isCometchatInitialized,

  // User Management
  createUser: createCometChatUser,
  updateUser: updateCometChatUser,
  login: loginToCometChat,
  logout: logoutFromCometChat,
  getLoggedInUser,

  // Group Management
  createGroup: createClassGroup,
  joinGroup: joinClassGroup,
  leaveGroup: leaveClassGroup,
  deleteGroup: deleteClassGroup,
  getGroupMembers,

  // Call Management
  startVideoCall,
  acceptCall,
  rejectCall,
  endCall,

  // Messaging
  sendMessage: sendGroupMessage,
  fetchMessages: fetchGroupMessages,

  // Error Handling
  parseError: parseCometChatError,
};

export default CometChatService;
