/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CometChat Type Definitions
 *
 * Extended types for CometChat SDK
 */

import type { CometChat } from '@cometchat/chat-sdk-javascript';

export type CallType = 'audio' | 'video';
export type CallStatus = 'initiated' | 'ongoing' | 'ended' | 'rejected' | 'busy' | 'cancelled' | 'unanswered';

export interface CallSession {
  [key: string]: any;
  sessionId?: string;
  initiator?: string;
  receiver?: string;
  callType?: CallType;
  status?: CallStatus | string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput' | 'videoinput';
}

export interface CallControls {
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
}

export interface NetworkQuality {
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  uploadSpeed: number;
  downloadSpeed: number;
  latency: number;
}

export interface CometChatUser extends CometChat.User {
  // Extended properties
  isOnline?: boolean;
  lastActiveAt?: Date;
}

export interface CometChatMessage extends CometChat.BaseMessage {
  // Extended properties
  isRead?: boolean;
  readAt?: Date;
}

export interface CallMetadata {
  bookingId?: string;
  classId?: string;
  teacherId?: string;
  studentId?: string;
  scheduledAt?: Date;
}

// Hook return types
export interface UseCometChatReturn {
  isInitialized: boolean;
  isLoggedIn: boolean;
  currentUser: CometChat.User | null;
  isLoading: boolean;
  error: Error | null;
  login: (userId: string, authToken?: string, targetUserId?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface UseVideoCallReturn {
  call: CallSession | null;
  isConnecting: boolean;
  isConnected: boolean;
  controls: CallControls;
  networkQuality: NetworkQuality | null;
  startCall: (receiverId: string, callType: CallType, metadata?: CallMetadata) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
}

export interface UseCometChatMessagesReturn {
  messages: CometChat.BaseMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  sendMessage: (text: string, receiverId: string) => Promise<void>;
  markAsRead: (message: CometChat.BaseMessage) => Promise<void>;
}

// Event types
export type CometChatEventType =
  | 'onIncomingCallReceived'
  | 'onOutgoingCallAccepted'
  | 'onOutgoingCallRejected'
  | 'onIncomingCallCancelled'
  | 'onCallEndedMessageReceived'
  | 'onMessageReceived'
  | 'onUserOnline'
  | 'onUserOffline';

export interface CometChatEvent {
  type: CometChatEventType;
  payload: any;
  timestamp: Date;
}
