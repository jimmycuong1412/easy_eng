'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CometChat } from '@/lib/cometchat/client';
import { logger } from '@/lib/cometchat/logger';
import type { CallSession } from '@/types/cometchat';

interface UseVideoCallReturn {
  callSession: CallSession | null;
  isCallActive: boolean;
  isConnecting: boolean;
  error: Error | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  remoteVideoStream: MediaStream | null;
  localVideoStream: MediaStream | null;
  incomingCall: CometChat.Call | null;
  startCall: (receiverId: string, callType?: 'audio' | 'video') => Promise<void>;
  acceptCall: (call: CometChat.Call) => Promise<void>;
  rejectCall: (call: CometChat.Call) => Promise<void>;
  endCall: (session: CallSession) => Promise<void>;
  toggleMicrophone: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

export function useVideoCall(): UseVideoCallReturn {
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [incomingCall, setIncomingCall] = useState<CometChat.Call | null>(null);
  const callListenerRef = useRef<((call: CometChat.Call) => void) | null>(null);

  // Setup call listeners
  useEffect(() => {
    if (!callListenerRef.current) {
      callListenerRef.current = (call: CometChat.Call) => {
        logger.logCallEvent({
          type: 'call_updated',
          callId: call.getSessionId(),
          status: call.getStatus(),
          timestamp: new Date(),
        });
      };

      CometChat.addCallListener(
        'call_listener_' + Math.random(),
        new CometChat.CallListener({
          onCallReceived: (call: CometChat.Call) => {
            logger.logCallEvent({
              type: 'call_incoming',
              callId: call.getSessionId(),
              fromUser: call.getCallInitiator().getName(),
              timestamp: new Date(),
            });
            setIncomingCall(call);
          },
          onCallRejected: (call: CometChat.Call) => {
            logger.logCallEvent({
              type: 'call_rejected',
              callId: call.getSessionId(),
              status: call.getStatus(),
              timestamp: new Date(),
            });
            setIsCallActive(false);
            setCallSession(null);
          },
          onCallEnded: (call: CometChat.Call) => {
            logger.logCallEvent({
              type: 'call_ended',
              callId: call.getSessionId(),
              timestamp: new Date(),
            });
            setIsCallActive(false);
            setCallSession(null);
            setLocalVideoStream(null);
            setRemoteVideoStream(null);
            setIncomingCall(null);
          },
        })
      );
    }

    return () => {
      // Cleanup is handled when component unmounts
    };
  }, []);

  const startCall = useCallback(
    async (
      receiverId: string,
      callType: 'audio' | 'video' = 'video'
    ): Promise<void> => {
      try {
        setIsConnecting(true);
        setError(null);

        const call = new CometChat.Call(
          receiverId,
          callType === 'video' ? CometChat.CALL_TYPE.VIDEO : CometChat.CALL_TYPE.AUDIO,
          CometChat.RECEIVER_TYPE.USER
        );

        const initiatedCall = await CometChat.initiateCall(call);
        const sessionId = initiatedCall.getSessionId();
        setCallSession({
          id: sessionId,
          callId: sessionId,
          type: callType,
          status: 'initiated',
          startTime: new Date(),
        });
        setIsCallActive(true);

        logger.logCallEvent({
          type: 'call_started',
          callId: sessionId,
          callType,
          timestamp: new Date(),
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to start call');
        setError(error);
        logger.logError('useVideoCall startCall', error);
        throw error;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  const acceptCall = useCallback(async (call: CometChat.Call): Promise<void> => {
    try {
      setIsConnecting(true);
      setError(null);

      // CometChat.acceptCall takes a session ID string
      const sessionId = call.getSessionId();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acceptedCall = await (CometChat as any).acceptCall(sessionId);
      const acceptedSessionId = acceptedCall.getSessionId();
      setCallSession({
        id: acceptedSessionId,
        callId: acceptedSessionId,
        type: acceptedCall.getType() === CometChat.CALL_TYPE.VIDEO ? 'video' : 'audio',
        status: 'accepted',
        startTime: new Date(),
      });
      setIsCallActive(true);
      setIncomingCall(null);

      logger.logCallEvent({
        type: 'call_accepted',
        callId: acceptedSessionId,
        timestamp: new Date(),
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to accept call');
      setError(error);
      logger.logError('useVideoCall acceptCall', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const rejectCall = useCallback(async (call: CometChat.Call): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (CometChat as any).rejectCall(call.getSessionId(), 'rejected');

      logger.logCallEvent({
        type: 'call_rejected',
        callId: call.getSessionId(),
        timestamp: new Date(),
      });

      setIsCallActive(false);
      setCallSession(null);
      setIncomingCall(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reject call');
      setError(error);
      logger.logError('useVideoCall rejectCall', error);
      throw error;
    }
  }, []);

  const endCall = useCallback(async (session: CallSession): Promise<void> => {
    try {
      setIsConnecting(true);

      // Stop media streams
      if (localVideoStream) {
        localVideoStream.getTracks().forEach((track) => track.stop());
        setLocalVideoStream(null);
      }

      // session.id is the sessionId returned from initiateCall/acceptCall
      await CometChat.endCall(session.id);

      logger.logCallEvent({
        type: 'call_ended',
        callId: session.id,
        timestamp: new Date(),
      });

      setIsCallActive(false);
      setCallSession(null);
      setRemoteVideoStream(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to end call');
      setError(error);
      logger.logError('useVideoCall endCall', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [localVideoStream]);

  const toggleMicrophone = useCallback(async (): Promise<void> => {
    try {
      if (!callSession) return;

      const newState = !micEnabled;
      // Use CallController singleton for in-call media controls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CometChat as any).CallController.getInstance().muteAudio(!newState);

      setMicEnabled(newState);
      logger.info(`Microphone ${newState ? 'enabled' : 'disabled'}`, {
        callId: callSession.id,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle microphone');
      setError(error);
      logger.logError('useVideoCall toggleMicrophone', error);
    }
  }, [callSession, micEnabled]);

  const toggleCamera = useCallback(async (): Promise<void> => {
    try {
      if (!callSession) return;

      const newState = !cameraEnabled;
      // Use CallController singleton for in-call media controls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CometChat as any).CallController.getInstance().pauseVideo(!newState);

      setCameraEnabled(newState);
      logger.info(`Camera ${newState ? 'enabled' : 'disabled'}`, {
        callId: callSession.id,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to toggle camera');
      setError(error);
      logger.logError('useVideoCall toggleCamera', error);
    }
  }, [callSession, cameraEnabled]);

  const startScreenShare = useCallback(async (): Promise<void> => {
    try {
      if (!callSession) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CometChat as any).CallController.getInstance().startScreenShare();
      logger.info('Screen sharing started', { callId: callSession.id });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start screen share');
      setError(error);
      logger.logError('useVideoCall startScreenShare', error);
    }
  }, [callSession]);

  const stopScreenShare = useCallback(async (): Promise<void> => {
    try {
      if (!callSession) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CometChat as any).CallController.getInstance().stopScreenShare();
      logger.info('Screen sharing stopped', { callId: callSession.id });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop screen share');
      setError(error);
      logger.logError('useVideoCall stopScreenShare', error);
    }
  }, [callSession]);

  return {
    callSession,
    isCallActive,
    isConnecting,
    error,
    micEnabled,
    cameraEnabled,
    remoteVideoStream,
    localVideoStream,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMicrophone,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
  };
}
