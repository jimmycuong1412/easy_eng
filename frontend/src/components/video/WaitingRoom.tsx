'use client';

/**
 * WaitingRoom Component
 *
 * Pre-class waiting room before session starts
 * Task: T122 [P] Create WaitingRoom component
 */

import React, { useState, useEffect } from 'react';
import type { WaitingRoomProps } from '@/types/cometchat.types';
import { Clock, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow, isBefore, isAfter, addMinutes } from 'date-fns';

export default function WaitingRoom({
  sessionId,
  classId,
  scheduledStartTime,
  onJoinReady,
  userRole,
}: WaitingRoomProps) {
  const [timeUntilStart, setTimeUntilStart] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState({
    camera: 'checking' as 'checking' | 'ready' | 'error',
    microphone: 'checking' as 'checking' | 'ready' | 'error',
  });

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    // Update countdown timer
    const timer = setInterval(() => {
      updateCountdown();
    }, 1000);

    // Check device permissions
    checkDevices();

    return () => clearInterval(timer);
  }, [scheduledStartTime]);

  // ============================================================================
  // Countdown Logic
  // ============================================================================

  const updateCountdown = () => {
    const now = new Date();
    const start = new Date(scheduledStartTime);

    if (isBefore(now, start)) {
      // Before scheduled time
      setTimeUntilStart(formatDistanceToNow(start, { addSuffix: true }));
      setIsReady(false);
    } else if (isAfter(now, addMinutes(start, 15))) {
      // More than 15 minutes late - class may have ended
      setTimeUntilStart('Class may have ended');
      setIsReady(false);
    } else {
      // Within the window - can join
      setTimeUntilStart('Class is live!');
      setIsReady(true);
    }
  };

  // ============================================================================
  // Device Checks
  // ============================================================================

  const checkDevices = async () => {
    try {
      // Check camera
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach((track) => track.stop());
        setDeviceStatus((prev) => ({ ...prev, camera: 'ready' }));
      } catch {
        setDeviceStatus((prev) => ({ ...prev, camera: 'error' }));
      }

      // Check microphone
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
        setDeviceStatus((prev) => ({ ...prev, microphone: 'ready' }));
      } catch {
        setDeviceStatus((prev) => ({ ...prev, microphone: 'error' }));
      }
    } catch (error) {
      console.error('Error checking devices:', error);
    }
  };

  const retryDeviceCheck = () => {
    setDeviceStatus({
      camera: 'checking',
      microphone: 'checking',
    });
    checkDevices();
  };

  // ============================================================================
  // Join Handler
  // ============================================================================

  const handleJoin = () => {
    if (deviceStatus.camera === 'error' || deviceStatus.microphone === 'error') {
      const confirm = window.confirm(
        'Some devices are not accessible. You may experience issues during the call. Continue anyway?'
      );
      if (!confirm) return;
    }

    onJoinReady();
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderDeviceStatus = (
    device: 'camera' | 'microphone',
    status: 'checking' | 'ready' | 'error'
  ) => {
    const deviceName = device === 'camera' ? 'Camera' : 'Microphone';

    if (status === 'checking') {
      return (
        <div className="flex items-center space-x-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking {deviceName.toLowerCase()}...</span>
        </div>
      );
    }

    if (status === 'ready') {
      return (
        <div className="flex items-center space-x-2 text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>{deviceName} ready</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>{deviceName} not accessible</span>
      </div>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  const canJoin =
    isReady &&
    (deviceStatus.camera === 'ready' || deviceStatus.camera === 'error') &&
    (deviceStatus.microphone === 'ready' || deviceStatus.microphone === 'error');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-gray-900/80 p-8 shadow-2xl backdrop-blur-sm">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600">
            <Video className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Waiting Room</h1>
          <p className="mt-2 text-gray-400">
            Session ID: {sessionId.slice(0, 8)}...
          </p>
        </div>

        {/* Countdown */}
        <div className="mt-8 rounded-lg bg-gray-800/50 p-6 text-center">
          <Clock className="mx-auto h-12 w-12 text-blue-400" />
          <p className="mt-4 text-2xl font-semibold text-white">{timeUntilStart}</p>
          <p className="mt-2 text-sm text-gray-400">
            Scheduled: {format(new Date(scheduledStartTime), 'PPp')}
          </p>

          {isReady && (
            <div className="mt-4 rounded-lg bg-green-900/30 p-3 text-green-400">
              <CheckCircle className="mx-auto h-6 w-6" />
              <p className="mt-2 text-sm font-medium">Class is ready to join!</p>
            </div>
          )}
        </div>

        {/* Device Status */}
        <div className="mt-8 space-y-4">
          <h2 className="text-lg font-semibold text-white">Device Check</h2>

          <div className="space-y-3 rounded-lg bg-gray-800/50 p-4">
            {renderDeviceStatus('camera', deviceStatus.camera)}
            {renderDeviceStatus('microphone', deviceStatus.microphone)}

            {(deviceStatus.camera === 'error' || deviceStatus.microphone === 'error') && (
              <div className="mt-4 rounded-lg bg-yellow-900/30 p-4">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <p className="mt-2 text-sm text-yellow-400">
                  Please check your browser permissions and ensure your devices are connected.
                </p>
                <button
                  onClick={retryDeviceCheck}
                  className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white hover:bg-yellow-700"
                >
                  Retry Check
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Join Button */}
        <div className="mt-8">
          <button
            onClick={handleJoin}
            disabled={!canJoin}
            className={`w-full rounded-lg px-6 py-4 text-lg font-semibold text-white transition-all ${
              canJoin
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                : 'cursor-not-allowed bg-gray-700 opacity-50'
            }`}
          >
            {isReady ? (
              userRole === 'teacher' ? (
                'Start Class'
              ) : (
                'Join Class'
              )
            ) : (
              'Waiting for class to start...'
            )}
          </button>

          {!isReady && (
            <p className="mt-3 text-center text-sm text-gray-400">
              {userRole === 'teacher'
                ? 'You can start the class 5 minutes before scheduled time'
                : 'The Join button will be enabled when the teacher starts the class'}
            </p>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800/30 p-4">
          <h3 className="text-sm font-semibold text-white">Tips for a great experience:</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-400">
            <li>• Use headphones to prevent echo</li>
            <li>• Find a quiet, well-lit space</li>
            <li>• Test your camera and microphone before joining</li>
            <li>• Ensure stable internet connection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
