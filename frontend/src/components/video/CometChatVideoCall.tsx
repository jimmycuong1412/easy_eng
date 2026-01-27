'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VideoStream } from './VideoStream';
import { CallControls } from './CallControls';
import { useVideoCall } from '@/hooks/useVideoCall';
import { logger } from '@/lib/cometchat/logger';
import type { CallSession } from '@/types/cometchat';

interface CometChatVideoCallProps {
  remoteUserId: string;
  remoteUserName: string;
  remoteUserAvatar?: string;
  onCallEnded?: () => void;
  isIncoming?: boolean;
  incomingCall?: any;
  localUserName: string;
  localUserAvatar?: string;
}

export function CometChatVideoCall({
  remoteUserId,
  remoteUserName,
  remoteUserAvatar,
  onCallEnded,
  isIncoming = false,
  incomingCall,
  localUserName,
  localUserAvatar,
}: CometChatVideoCallProps) {
  const {
    callSession,
    isCallActive,
    isConnecting,
    error,
    micEnabled,
    cameraEnabled,
    remoteVideoStream,
    localVideoStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  } = useVideoCall();

  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start call if not incoming
  useEffect(() => {
    if (!isIncoming && !isCallActive && !isConnecting) {
      startCall(remoteUserId, 'video');
    }
  }, [isIncoming, isCallActive, isConnecting, remoteUserId, startCall]);

  // Handle incoming call
  useEffect(() => {
    if (isIncoming && incomingCall && !isCallActive) {
      // Auto-accept for demo purposes, in production show UI to user
      acceptCall(incomingCall);
    }
  }, [isIncoming, incomingCall, isCallActive, acceptCall]);

  // Call duration timer
  useEffect(() => {
    if (isCallActive && callSession) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => {
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      };
    }
  }, [isCallActive, callSession]);

  const handleEndCall = async () => {
    if (callSession) {
      await endCall(callSession);
      setCallDuration(0);
      onCallEnded?.();
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      logger.logError('Screen share toggle', err as Error);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Call Error</h3>
          <p className="text-red-700 mb-4">{error.message}</p>
          <button
            onClick={handleEndCall}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting && !isCallActive) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to {remoteUserName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden flex flex-col">
      {/* Video Area */}
      <div className="flex-1 grid grid-cols-2 gap-2 p-2 relative">
        {/* Remote Video */}
        <div className="bg-gray-800 rounded-lg overflow-hidden relative">
          <VideoStream
            stream={remoteVideoStream}
            userName={remoteUserName}
            userAvatar={remoteUserAvatar}
            isMuted={false}
          />
        </div>

        {/* Local Video - Picture in Picture */}
        <div className="bg-gray-800 rounded-lg overflow-hidden relative">
          <VideoStream
            stream={localVideoStream}
            userName={localUserName}
            userAvatar={localUserAvatar}
            isMuted={!cameraEnabled}
            isPictureInPicture={true}
          />
        </div>
      </div>

      {/* Call Info & Controls */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {/* Call Duration */}
        <div className="text-center mb-4">
          <p className="text-white text-sm font-medium">
            {isCallActive ? `Duration: ${formatDuration(callDuration)}` : 'Call Ended'}
          </p>
        </div>

        {/* Controls */}
        <CallControls
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          isScreenSharing={isScreenSharing}
          onToggleMic={toggleMicrophone}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onEndCall={handleEndCall}
          isConnecting={isConnecting}
        />
      </div>
    </div>
  );
}
