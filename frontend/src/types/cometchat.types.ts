/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ClassRoomProps {
  sessionId: string;
  classId: string;
  groupId: string;
  userRole: 'teacher' | 'student';
  onLeave?: () => void;
  onError?: (error: Error) => void;
}

export interface InCallChatProps {
  groupId: string;
  currentUserId: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export interface ParticipantListProps {
  participants: any[];
  teacherId: string;
  currentUserId: string;
}

export interface WaitingRoomProps {
  sessionId: string;
  classId: string;
  scheduledStartTime: Date | string;
  onJoinReady?: () => void;
  userRole: 'teacher' | 'student';
}

export interface CometChatConfig {
  appId: string;
  region: string;
  authKey?: string;
}

export interface CometChatUser {
  uid: string;
  name: string;
  avatar?: string;
  role?: string;
  [key: string]: any;
}

export interface CometChatError {
  code: string;
  message: string;
  details?: any;
}
