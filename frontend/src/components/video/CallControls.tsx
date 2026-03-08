'use client';

import React from 'react';

interface CallControlsProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void | Promise<void>;
  onToggleCamera: () => void | Promise<void>;
  onToggleScreenShare?: () => void | Promise<void>;
  onEndCall: () => void | Promise<void>;
  isConnecting?: boolean;
}

export function CallControls({
  micEnabled,
  cameraEnabled,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  isConnecting = false,
}: CallControlsProps) {
  const handleButtonClick = async (action: () => void | Promise<void>) => {
    try {
      await action();
    } catch (error) {
      console.error('Control action failed:', error);
    }
  };

  const controlButtonClass = (isActive: boolean) =>
    `flex flex-col items-center gap-1 px-4 py-3 rounded-lg transition-all ${
      isActive
        ? 'bg-gray-700 text-white hover:bg-gray-600'
        : 'bg-red-600 text-white hover:bg-red-700'
    } disabled:opacity-50 disabled:cursor-not-allowed`;

  const endCallButtonClass =
    'flex flex-col items-center gap-1 px-4 py-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="flex justify-center items-center gap-4 flex-wrap">
      {/* Microphone Toggle */}
      <button
        onClick={() => handleButtonClick(onToggleMic)}
        disabled={isConnecting}
        className={controlButtonClass(micEnabled)}
        title={micEnabled ? 'Mute' : 'Unmute'}
      >
        {micEnabled ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 9a1 1 0 10-2 0A5 5 0 015 9a1 1 0 002 0 7.001 7.001 0 006 6.93V17H9a1 1 0 100 2h4a1 1 0 100-2h-2v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span className="text-xs font-medium">
          {micEnabled ? 'Mute' : 'Unmute'}
        </span>
      </button>

      {/* Camera Toggle */}
      <button
        onClick={() => handleButtonClick(onToggleCamera)}
        disabled={isConnecting}
        className={controlButtonClass(cameraEnabled)}
        title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
      >
        {cameraEnabled ? (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12 .5a.5.5 0 11-1 0 .5.5 0 011 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span className="text-xs font-medium">
          {cameraEnabled ? 'Camera' : 'Camera Off'}
        </span>
      </button>

      {/* Screen Share Toggle */}
      <button
        onClick={() => onToggleScreenShare && handleButtonClick(onToggleScreenShare)}
        disabled={isConnecting}
        className={controlButtonClass(isScreenSharing)}
        title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
        </svg>
        <span className="text-xs font-medium">
          {isScreenSharing ? 'Sharing' : 'Share'}
        </span>
      </button>

      {/* End Call Button */}
      <button
        onClick={() => handleButtonClick(onEndCall)}
        disabled={isConnecting}
        className={endCallButtonClass}
        title="End Call"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 10a7 7 0 1114 0 7 7 0 01-14 0zm14.414-7.414a1 1 0 00-1.414-1.414L10 8.586 7.414 6.172A1 1 0 006.172 7.414L8.586 10l-2.414 2.586a1 1 0 101.414 1.414L10 11.414l2.586 2.586a1 1 0 101.414-1.414L11.414 10l2.414-2.586a1 1 0 000-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-medium">End Call</span>
      </button>
    </div>
  );
}
