/**
 * CometChat Type Definitions
 *
 * Shared types for CometChat video integration
 * Task: T113 [P] Create CometChat types
 */

// ============================================================================
// Core CometChat Types
// ============================================================================

export interface CometChatConfig {
  appId: string;
  region: string;
  authKey: string;
}

export interface CometChatUser {
  uid: string;
  name: string;
  avatar?: string;
  role?: 'student' | 'teacher' | 'admin';
  metadata?: Record<string, any>;
}

export interface CometChatAuthToken {
  authToken: string;
  uid: string;
}

// ============================================================================
// Call/Session Types
// ============================================================================

export type CallType = 'video' | 'audio';
export type CallStatus = 'initiated' | 'ongoing' | 'ended' | 'rejected' | 'cancelled' | 'busy';

export interface CallSettings {
  audioOnly?: boolean;
  defaultAudioMode?: string;
  defaultVideoMode?: string;
  showRecordingButton?: boolean;
  showEndCallButton?: boolean;
  showSwitchCameraButton?: boolean;
  showMuteAudioButton?: boolean;
  showPauseVideoButton?: boolean;
}

export interface Call {
  sessionId: string;
  callType: CallType;
  callStatus: CallStatus;
  initiatedAt: number;
  joinedAt?: number;
  endedAt?: number;
  callInitiator: CometChatUser;
  callReceiver: CometChatUser;
}

// ============================================================================
// Group/Class Session Types
// ============================================================================

export type SessionStatus = 'scheduled' | 'waiting' | 'live' | 'ended' | 'cancelled';

export interface ClassSession {
  sessionId: string;
  classId: string;
  groupId: string; // CometChat group ID
  teacherId: string;
  status: SessionStatus;
  scheduledStartTime: Date;
  actualStartTime?: Date;
  endTime?: Date;
  maxParticipants: number;
  currentParticipants: number;
  metadata?: {
    className?: string;
    classDescription?: string;
    duration?: number;
  };
}

export interface GroupMember {
  uid: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'participant';
  joinedAt: number;
  scope?: 'admin' | 'moderator' | 'participant';
}

export interface Group {
  guid: string; // Group Unique ID
  name: string;
  type: 'public' | 'private' | 'password';
  password?: string;
  icon?: string;
  description?: string;
  owner: string; // User UID
  createdAt: number;
  updatedAt?: number;
  metadata?: Record<string, any>;
  membersCount?: number;
  tags?: string[];
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType = 'text' | 'media' | 'custom';
export type MessageCategory = 'message' | 'action' | 'call' | 'custom';

export interface TextMessage {
  id: string;
  text: string;
  sender: CometChatUser;
  receiver: string | Group;
  receiverType: 'user' | 'group';
  category: MessageCategory;
  type: MessageType;
  sentAt: number;
  deliveredAt?: number;
  readAt?: number;
  metadata?: Record<string, any>;
}

export interface CustomMessage {
  id: string;
  customType: string;
  customData: Record<string, any>;
  sender: CometChatUser;
  receiver: string | Group;
  receiverType: 'user' | 'group';
  sentAt: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Event Types
// ============================================================================

export type CallEventType =
  | 'onIncomingCallReceived'
  | 'onOutgoingCallAccepted'
  | 'onOutgoingCallRejected'
  | 'onIncomingCallCancelled'
  | 'onCallEnded';

export type GroupEventType =
  | 'onGroupMemberJoined'
  | 'onGroupMemberLeft'
  | 'onGroupMemberKicked'
  | 'onGroupMemberBanned'
  | 'onGroupMemberScopeChanged'
  | 'onMemberAddedToGroup';

export type MessageEventType =
  | 'onTextMessageReceived'
  | 'onMediaMessageReceived'
  | 'onCustomMessageReceived'
  | 'onMessagesDelivered'
  | 'onMessagesRead'
  | 'onTypingStarted'
  | 'onTypingEnded';

export interface CallEvent {
  type: CallEventType;
  call: Call;
}

export interface GroupEvent {
  type: GroupEventType;
  group: Group;
  action: string;
  actionBy: CometChatUser;
  actionOn: CometChatUser;
}

export interface MessageEvent {
  type: MessageEventType;
  message: TextMessage | CustomMessage;
}

// ============================================================================
// Video Component Props
// ============================================================================

export interface ClassRoomProps {
  sessionId: string;
  classId: string;
  groupId: string;
  userRole: 'teacher' | 'student';
  onLeave?: () => void;
  onError?: (error: Error) => void;
}

export interface CallControlsProps {
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare?: () => void;
  onLeaveCall: () => void;
  userRole: 'teacher' | 'student';
}

export interface ParticipantListProps {
  participants: GroupMember[];
  teacherId: string;
  currentUserId: string;
}

export interface InCallChatProps {
  groupId: string;
  currentUserId: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export interface WaitingRoomProps {
  sessionId: string;
  classId: string;
  scheduledStartTime: Date;
  onJoinReady: () => void;
  userRole: 'teacher' | 'student';
}

// ============================================================================
// API Response Types
// ============================================================================

export interface CometChatAPIResponse<T = any> {
  data: T;
  status?: string;
  message?: string;
}

export interface CometChatError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ============================================================================
// Attendance & Rewards Types
// ============================================================================

export interface AttendanceRecord {
  sessionId: string;
  userId: string;
  joinedAt: Date;
  leftAt?: Date;
  durationSeconds: number;
  isPresent: boolean; // true if attended minimum threshold
}

export interface ClassReward {
  userId: string;
  sessionId: string;
  rewardType: 'attendance' | 'completion' | 'participation';
  gemsAwarded: number;
  xpAwarded?: number;
  awardedAt: Date;
}

// ============================================================================
// Webhook Payload Types
// ============================================================================

export interface CometChatWebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: number;
  appId: string;
}

export interface CallWebhookData {
  sessionId: string;
  action: 'initiated' | 'accepted' | 'rejected' | 'ended' | 'cancelled';
  initiator: string;
  receiver: string;
  callType: CallType;
  timestamp: number;
}

export interface GroupWebhookData {
  guid: string;
  action: 'member-joined' | 'member-left' | 'member-kicked' | 'member-banned';
  user: string;
  actionBy?: string;
  timestamp: number;
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface SessionMetrics {
  sessionId: string;
  totalParticipants: number;
  averageDuration: number;
  messagesSent: number;
  screenSharesCount: number;
  recordingDuration?: number;
}

export interface SessionState {
  isConnected: boolean;
  isInitialized: boolean;
  currentCall?: Call;
  currentGroup?: Group;
  participants: GroupMember[];
  messages: TextMessage[];
  error?: CometChatError;
}
