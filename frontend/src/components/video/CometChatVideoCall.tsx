'use client';

import React, { useEffect, useRef, useState } from 'react';
import { VideoStream } from './VideoStream';
import { CallControls } from './CallControls';
import { useVideoCall } from '@/hooks/useVideoCall';
import { logger } from '@/lib/cometchat/logger';

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
    incomingCall: hookIncomingCall,
    startCall,
    acceptCall,
    rejectCall: _rejectCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  } = useVideoCall() as any;

  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // Use a ref so the "attempted" flag survives React StrictMode double-invoke remounts
  const hasAttemptedCallRef = useRef(false);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start call if not incoming — only attempt once to avoid double-call from StrictMode remount
  useEffect(() => {
    if (!isIncoming && !isCallActive && !isConnecting && !hasAttemptedCallRef.current && remoteUserId) {
      hasAttemptedCallRef.current = true;
      startCall(remoteUserId, 'video').catch(() => {
        // Error is already set in hook state — reset flag so UI can show it
      });
    }
  }, [isIncoming, isCallActive, isConnecting, remoteUserId, startCall]);

  // Handle incoming call — use prop if provided, otherwise fall back to hook state
  const resolvedIncomingCall = incomingCall ?? hookIncomingCall;
  useEffect(() => {
    if (isIncoming && resolvedIncomingCall && !isCallActive) {
      // Auto-accept when teacher receives a student's call
      acceptCall(resolvedIncomingCall);
    }
  }, [isIncoming, resolvedIncomingCall, isCallActive, acceptCall]);

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
    return undefined;
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

  // Teacher waiting for student to call
  if (isIncoming && !isCallActive && !isConnecting && !resolvedIncomingCall) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-4 border-green-500 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </div>
          <p className="text-white text-lg font-medium">Waiting for student to join...</p>
          <p className="text-gray-400 text-sm mt-2">The call will start automatically when the student connects</p>
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
