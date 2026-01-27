'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CometChat } from '@/lib/cometchat/client';
import { logger } from '@/lib/cometchat/logger';
import type { UseVideoCallReturn, CallSession } from '@/types/cometchat';

export function useVideoCall(): UseVideoCallReturn {
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [remoteVideoStream, setRemoteVideoStream] = useState<MediaStream | null>(null);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const callListenerRef = useRef<((call: CometChat.Call) => void) | null>(null);
  const callEndedListenerRef = useRef<((call: CometChat.Call) => void) | null>(null);
  const callIncomingListenerRef = useRef<((call: CometChat.Call) => void) | null>(null);

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
              duration: call.getDuration(),
              timestamp: new Date(),
            });
            setIsCallActive(false);
            setCallSession(null);
            setLocalVideoStream(null);
            setRemoteVideoStream(null);
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
        setCallSession({
          id: initiatedCall.getSessionId(),
          callId: initiatedCall.getCallId(),
          type: callType,
          status: 'initiated',
          startTime: new Date(),
        });
        setIsCallActive(true);

        logger.logCallEvent({
          type: 'call_started',
          callId: initiatedCall.getSessionId(),
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

      const acceptedCall = await CometChat.acceptCall(call);
      setCallSession({
        id: acceptedCall.getSessionId(),
        callId: acceptedCall.getCallId(),
        type: acceptedCall.getType() === CometChat.CALL_TYPE.VIDEO ? 'video' : 'audio',
        status: 'accepted',
        startTime: new Date(),
      });
      setIsCallActive(true);

      logger.logCallEvent({
        type: 'call_accepted',
        callId: acceptedCall.getSessionId(),
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
      await CometChat.rejectCall(call);

      logger.logCallEvent({
        type: 'call_rejected',
        callId: call.getSessionId(),
        timestamp: new Date(),
      });

      setIsCallActive(false);
      setCallSession(null);
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

      const call = await CometChat.getCall(session.callId);
      if (call) {
        await CometChat.endCall(call);
      }

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

      const call = await CometChat.getCall(callSession.callId);
      if (!call) return;

      const newState = !micEnabled;

      if (newState) {
        await CometChat.startAudio(call);
      } else {
        await CometChat.stopAudio(call);
      }

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

      const call = await CometChat.getCall(callSession.callId);
      if (!call) return;

      const newState = !cameraEnabled;

      if (newState) {
        await CometChat.startVideo(call);
      } else {
        await CometChat.stopVideo(call);
      }

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

      const call = await CometChat.getCall(callSession.callId);
      if (!call) return;

      await CometChat.startScreenShare(call);
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

      const call = await CometChat.getCall(callSession.callId);
      if (!call) return;

      await CometChat.stopScreenShare(call);
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
