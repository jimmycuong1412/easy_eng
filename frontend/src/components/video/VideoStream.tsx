'use client';

import React, { useEffect, useRef } from 'react';

interface VideoStreamProps {
  stream?: MediaStream | null;
  userName: string;
  userAvatar?: string;
  isMuted?: boolean;
  isPictureInPicture?: boolean;
}

export function VideoStream({
  stream,
  userName,
  userAvatar,
  isMuted = false,
  isPictureInPicture = false,
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;

  return (
    <div className="w-full h-full relative bg-gray-950 flex items-center justify-center">
      {hasVideo ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {isMuted && (
            <div className="absolute bottom-2 left-2 bg-red-600 px-2 py-1 rounded text-white text-xs font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Camera Off
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full">
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-24 h-24 rounded-full object-cover mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <p className="text-white font-medium">{userName}</p>
          <p className="text-gray-400 text-sm mt-1">Camera Off</p>
        </div>
      )}

      {/* Username Badge */}
      {!isPictureInPicture && (
        <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-70 px-3 py-1 rounded-full">
          <p className="text-white text-sm font-medium">{userName}</p>
        </div>
      )}

      {/* Mute Indicator */}
      {stream && stream.getAudioTracks().length > 0 && !stream.getAudioTracks()[0].enabled && (
        <div className="absolute top-2 right-2 bg-red-600 rounded-full p-2">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17a2 2 0 002 2h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </div>
      )}
    </div>
  );
}
