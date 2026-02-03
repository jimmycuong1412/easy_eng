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
import { CometChatUI } from '@cometchat-pro/chat';
import type { ClassRoomProps } from '@/types/cometchat.types';
import CallControls from './CallControls';
import ParticipantList from './ParticipantList';
import InCallChat from './InCallChat';
import { Loader2, AlertCircle, Video, VideoOff } from 'lucide-react';
import { useCometChat } from '@/hooks/useCometChat';

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
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Refs
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Custom hook for CometChat integration
  const {
    isConnected,
    currentGroup,
    joinGroup,
    leaveGroup,
    startCall,
    endCall,
  } = useCometChat();

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    initializeClassroom();

    return () => {
      cleanup();
    };
  }, [groupId]);

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
      const members = await CometChatService.getGroupMembers(groupId);
      setParticipants(members);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  // ============================================================================
  // Media Controls
  // ============================================================================

  const handleToggleAudio = () => {
    setIsAudioMuted(!isAudioMuted);
    // TODO: Implement actual audio mute/unmute with CometChat
    console.log('Toggle audio:', !isAudioMuted);
  };

  const handleToggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    // TODO: Implement actual video on/off with CometChat
    console.log('Toggle video:', !isVideoOff);
  };

  const handleToggleScreenShare = () => {
    if (userRole !== 'teacher') {
      alert('Only teachers can share screen');
      return;
    }

    setIsScreenSharing(!isScreenSharing);
    // TODO: Implement screen sharing with CometChat
    console.log('Toggle screen share:', !isScreenSharing);
  };

  const handleLeaveCall = async () => {
    try {
      // End the call
      await endCall(sessionId);

      // Clean up
      await cleanup();

      // Notify parent
      onLeave?.();
    } catch (err) {
      console.error('Error leaving call:', err);
      // Force leave anyway
      onLeave?.();
    }
  };

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
          <span className="mx-2">•</span>
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
            {/* CometChat Video UI will be injected here */}
            <div id="cometchat-video-container" className="h-full w-full">
              {/* Placeholder for CometChat UI */}
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
              isAudioMuted={isAudioMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onToggleScreenShare={userRole === 'teacher' ? handleToggleScreenShare : undefined}
              onLeaveCall={handleLeaveCall}
              userRole={userRole}
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
              teacherId={userRole === 'teacher' ? 'current-user-id' : ''}
              currentUserId="current-user-id"
            />
          </div>

          {/* Chat */}
          <div className="h-96">
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

// Placeholder for CometChat Service (will be imported from lib)
const CometChatService = {
  getGroupMembers: async (groupId: string) => {
    // Placeholder implementation
    return [];
  },
};
