'use client';

/**
 * ClassRoom Component
 *
 * Main video classroom interface for live classes
 * Integrates CometChat video calling with UI controls
 *
 * Task: T118 [P] Create ClassRoom component
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { ClassRoomProps } from '@/types/cometchat.types';
import { CallControls } from './CallControls';
import ParticipantList from './ParticipantList';
import InCallChat from './InCallChat';
import { Loader2, AlertCircle, Video, VideoOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getGroupMembers,
  joinClassGroup,
  leaveClassGroup,
  endCall as endCometChatCall,
} from '@/lib/cometchat';

export default function ClassRoom({
  sessionId,
  classId: _classId,
  groupId,
  userRole,
  onLeave,
  onError,
}: ClassRoomProps) {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Refs
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Auth hook for current user
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    initializeClassroom();

    return () => {
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const initializeClassroom = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Join the CometChat group
      const joined = await joinClassGroup(groupId);
      if (!joined) {
        throw new Error('Failed to join classroom');
      }

      // Start local media
      await startLocalMedia();

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
      stopLocalMedia();
      stopScreenShare();
      await leaveClassGroup(groupId);
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  };

  // ============================================================================
  // Local Media Management
  // ============================================================================

  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to access media devices:', err);
      // Continue without media — user can still participate in chat
    }
  };

  const stopLocalMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  // ============================================================================
  // Participant Management
  // ============================================================================

  const loadParticipants = async () => {
    try {
      const members = await getGroupMembers(groupId);
      setParticipants(members);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  // ============================================================================
  // Media Controls
  // ============================================================================

  const handleToggleAudio = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isAudioMuted; // Toggle: if muted, enable; if unmuted, disable
      setIsAudioMuted(!isAudioMuted);
    }
  }, [isAudioMuted]);

  const handleToggleVideo = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoOff; // Toggle: if off, enable; if on, disable
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  const handleToggleScreenShare = useCallback(async () => {
    if (userRole !== 'teacher') return;

    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShareStream();
    }
  }, [userRole, isScreenSharing]);

  const startScreenShareStream = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Listen for the user stopping screen share via browser UI
      screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenShare();
      });
    } catch (err) {
      // User cancelled the screen share picker — not an error
      if ((err as DOMException).name !== 'AbortError') {
        console.error('Screen share failed:', err);
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  const handleLeaveCall = async () => {
    try {
      await endCometChatCall(sessionId);
      await cleanup();
      onLeave?.();
    } catch (err) {
      console.error('Error leaving call:', err);
      onLeave?.();
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
    <div className="flex h-screen flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950 px-6 py-4">
        <div className="flex items-center space-x-3">
          <Video className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="text-lg font-semibold text-white">Live Class</h1>
            <p className="text-sm text-gray-400">Session ID: {sessionId.slice(0, 8)}...</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span className="flex items-center">
            <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
            Live
          </span>
          <span className="mx-2">&bull;</span>
          <span>{participants.length} participants</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Area */}
        <div className="flex flex-1 flex-col">
          {/* Main Video Container */}
          <div
            ref={videoContainerRef}
            className="relative flex-1 bg-black"
          >
            <div id="cometchat-video-container" className="h-full w-full">
              <div className="flex h-full items-center justify-center text-gray-400">
                <div className="text-center">
                  {isVideoOff ? (
                    <>
                      <VideoOff className="mx-auto h-16 w-16" />
                      <p className="mt-4">Camera is off</p>
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
            </div>

            {/* Screen Share Indicator */}
            {isScreenSharing && (
              <div className="absolute left-4 top-4 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
                Sharing Screen
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="border-t border-gray-800 bg-gray-950 px-6 py-4">
            <CallControls
              micEnabled={!isAudioMuted}
              cameraEnabled={!isVideoOff}
              isScreenSharing={isScreenSharing}
              onToggleMic={handleToggleAudio}
              onToggleCamera={handleToggleVideo}
              onToggleScreenShare={userRole === 'teacher' ? handleToggleScreenShare : undefined}
              onEndCall={handleLeaveCall}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-80 flex-col border-l border-gray-800 bg-gray-950">
          {/* Participants */}
          <div className="flex-1 overflow-y-auto border-b border-gray-800 p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-400">PARTICIPANTS</h3>
            <ParticipantList
              participants={participants}
              teacherId={userRole === 'teacher' ? currentUserId : ''}
              currentUserId={currentUserId}
            />
          </div>

          {/* Chat */}
          <div className="h-96">
            <InCallChat
              groupId={groupId}
              currentUserId={currentUserId}
              isMinimized={isChatMinimized}
              onToggleMinimize={handleToggleChat}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
