/**
 * CometChat type definitions
 */

export interface CometChatConfig {
  appId: string;
  region: string;
  authKey: string;
}

export interface CometChatUser {
  uid: string;
  name: string;
  avatar?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CometChatError {
  code: string;
  message: string;
  details?: string;
}

export interface ClassRoomProps {
  sessionId: string;
  classId: string;
  groupId: string;
  userRole: 'teacher' | 'student';
  onLeave?: () => void;
  onError?: (error: string | Error) => void;
}

export interface InCallChatProps {
  groupId: string;
  currentUserId: string;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export interface ParticipantListProps {
  participants: {
    uid: string;
    name: string;
    avatar?: string;
    role?: string;
    isMuted?: boolean;
    audioMuted?: boolean;
    videoMuted?: boolean;
    videoOff?: boolean;
    isVideoOff?: boolean;
  }[];
  teacherId: string;
  currentUserId: string;
}

export interface WaitingRoomProps {
  sessionId: string;
  classId: string;
  scheduledStartTime: string | Date;
  onJoinReady: () => void;
  userRole: 'teacher' | 'student';
}
