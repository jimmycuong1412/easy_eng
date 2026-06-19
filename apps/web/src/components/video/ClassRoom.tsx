'use client';

/**
 * ClassRoom Component
 *
 * Main video classroom interface for live classes
 * Integrates CometChat video calling with UI controls
 *
 * Task: T118 [P] Create ClassRoom component
 */

import React, { useEffect, useState, useRef } from 'react';
// CometChatUI loaded dynamically — webpackIgnore prevents build-time resolution
const CometChatUI: React.ComponentType<any> = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(/* webpackIgnore: true */ '@cometchat/chat-sdk-javascript').CometChatUI ?? (() => null);
  } catch {
    return () => null;
  }
})();
import type { ClassRoomProps } from '@/types/cometchat.types';
import InCallChat from './InCallChat';
import TextbookPanel from './TextbookPanel';
import { Loader2, AlertCircle, Video, VideoOff, Users } from 'lucide-react';
import { useCometChat } from '@/hooks/useCometChat';
import {
  joinCallSession,
  leaveCallSession,
} from '@/lib/cometchat-calls';
import { getGroupMembers } from '@/lib/cometchat';

export default function ClassRoom({
  sessionId,
  classId,
  groupId,
  userRole,
  onLeave,
  onError,
}: ClassRoomProps) {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVideoOff] = useState(false);
  const [isScreenSharing] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isCallActive, setIsCallActive] = useState(false);

  // Refs
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callMountRef = useRef<HTMLDivElement>(null);
  const callStartedRef = useRef(false);

  // Custom hook for CometChat integration
  const cometChat = useCometChat() as any;
  const isConnected = cometChat.isConnected ?? cometChat.isLoggedIn ?? false;
  const currentGroup = cometChat.currentGroup ?? null;
  const joinGroup = cometChat.joinGroup ?? (() => Promise.resolve());
  const leaveGroup = cometChat.leaveGroup ?? (() => Promise.resolve());
  const startCall = cometChat.startCall ?? (() => Promise.resolve());
  const endCall = cometChat.endCall ?? (() => Promise.resolve());

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    initializeClassroom();

    return () => {
      cleanup();
    };
  }, [groupId]);

  // Start the A/V call session once the room UI is mounted (the mount node
  // only exists after isLoading clears, so this can't run inside init).
  useEffect(() => {
    if (isLoading || error || callStartedRef.current) return;
    if (!callMountRef.current) return;
    callStartedRef.current = true;

    joinCallSession(groupId, callMountRef.current, {
      onUserListUpdated: () => loadParticipants(),
      onUserJoined: () => loadParticipants(),
      onUserLeft: () => loadParticipants(),
      onCallEnded: () => onLeave?.(),
      onError: (err) => console.error('Call session error:', err),
    }).then((ok) => {
      if (ok) setIsCallActive(true);
      else console.error('Call session could not be started — chat-only mode');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, groupId]);

  // Fallback: keep the participants panel fresh even if call listener
  // events don't fire (group membership is the source of truth).
  useEffect(() => {
    if (!isCallActive) return;
    const interval = setInterval(() => loadParticipants(), 15000);
    loadParticipants();
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallActive]);

  const initializeClassroom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Join the CometChat group
      const joined = await joinGroup(groupId);
      if (!joined) {
        throw new Error('Failed to join classroom');
      }

      // Fetch current participants
      await loadParticipants();

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize classroom';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      setIsLoading(false);
    }
  };

  const cleanup = async () => {
    try {
      // Stop any ongoing media
      stopLocalMedia();
      await leaveCallSession();

      // Leave the group
      await leaveGroup(groupId);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  // ============================================================================
  // Participant Management
  // ============================================================================

  const loadParticipants = async () => {
    try {
      // This would be implemented using CometChat API
      // For now, using placeholder
      const members = await getGroupMembers(groupId);
      setParticipants((members ?? []).map((m: any) => ({
        uid: m.uid ?? m.getUid?.(),
        name: m.name ?? m.getName?.(),
        avatar: m.avatar ?? m.getAvatar?.(),
      })));
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  // ============================================================================
  // Media Controls — mute / camera / leave are handled by the CometChat Calls
  // SDK's own in-grid control bar; onCallEnded (see joinCallSession) triggers
  // onLeave for cleanup.
  // ============================================================================

  const stopLocalMedia = () => {
    // Stop all media tracks
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // ============================================================================
  // Chat Management
  // ============================================================================

  const handleToggleChat = () => {
    setIsChatMinimized(!isChatMinimized);
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-lg text-gray-300">Joining classroom...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-white">Failed to Join Classroom</h2>
          <p className="mt-2 text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--et-bg)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--et-line)', background: 'var(--et-bg-2)' }}
      >
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5" style={{ color: 'var(--et-coral)' }} />
          <div>
            <h1 className="text-base font-semibold" style={{ color: 'var(--et-fg)' }}>
              Lớp học trực tuyến
            </h1>
            <p className="text-xs" style={{ color: 'var(--et-fg-2)' }}>
              Session {sessionId.slice(0, 8)}…
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--et-fg-2)' }}>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: '#22c55e' }} />
            Đang diễn ra
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            {participants.length}
          </span>
        </div>
      </div>

      {/* Main Content — center textbook + right column (video over chat) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Center: textbook / lesson material */}
        <div className="min-w-0 flex-1">
          <TextbookPanel canChange={true} />
        </div>

        {/* Right column */}
        <div
          className="flex w-[380px] shrink-0 flex-col"
          style={{ borderLeft: '1px solid var(--et-line)', background: 'var(--et-bg-2)' }}
        >
          {/* Video — top right */}
          <div
            ref={videoContainerRef}
            className="relative shrink-0 bg-black"
            style={{ height: 300, borderBottom: '1px solid var(--et-line)' }}
          >
            {/* CometChat Calls SDK renders the A/V grid into this node */}
            <div ref={callMountRef} id="cometchat-video-container" className="absolute inset-0" />

            {!isCallActive && (
              <div className="flex h-full items-center justify-center" style={{ color: 'var(--et-fg-2)' }}>
                <div className="text-center">
                  {isVideoOff ? (
                    <>
                      <VideoOff className="mx-auto h-12 w-12" />
                      <p className="mt-3 text-sm">Camera đang tắt</p>
                    </>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>
            )}

            {isScreenSharing && (
              <div
                className="absolute left-3 top-3 rounded-lg px-2.5 py-1 text-xs text-white"
                style={{ background: 'var(--et-coral)' }}
              >
                Đang chia sẻ màn hình
              </div>
            )}
          </div>

          {/* Call controls (mic / camera / leave) are rendered by the CometChat
              Calls SDK inside the video grid above — no custom strip needed. */}

          {/* Chat — fills the rest of the right column */}
          <div className="min-h-0 flex-1">
            <InCallChat
              groupId={groupId}
              currentUserId="current-user-id"
              isMinimized={isChatMinimized}
              onToggleMinimize={handleToggleChat}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

