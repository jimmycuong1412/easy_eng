'use client';

/**
 * ParticipantList Component
 *
 * Displays list of participants in the video class
 * Task: T120 [P] Create ParticipantList component
 */

import React from 'react';
import type { ParticipantListProps } from '@/types/cometchat.types';
import { User, Crown, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Image from 'next/image';

export default function ParticipantList({
  participants,
  teacherId,
  currentUserId,
}: ParticipantListProps) {
  return (
    <div className="space-y-2">
      {participants.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          <User className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-sm">No participants yet</p>
        </div>
      ) : (
        participants.map((participant) => {
          const isTeacher = participant.uid === teacherId;
          const isCurrentUser = participant.uid === currentUserId;

          return (
            <div
              key={participant.uid}
              className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                isCurrentUser
                  ? 'bg-blue-900/30 ring-1 ring-blue-500/50'
                  : 'hover:bg-gray-800'
              }`}
            >
              {/* User Info */}
              <div className="flex items-center space-x-3">
                {/* Avatar */}
                <div className="relative">
                  {participant.avatar ? (
                    <Image
                      src={participant.avatar}
                      alt={participant.name}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  {/* Teacher Badge */}
                  {isTeacher && (
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-yellow-500 p-1">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Name and Role */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white">
                      {participant.name}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-gray-400">(You)</span>
                      )}
                    </p>
                  </div>
                  {isTeacher && (
                    <p className="text-xs text-yellow-400">Teacher</p>
                  )}
                </div>
              </div>

              {/* Audio/Video Status */}
              <div className="flex items-center space-x-2">
                {/* Audio Status */}
                <div
                  className={`rounded-full p-1 ${
                    participant.audioMuted
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-green-900/50 text-green-400'
                  }`}
                  title={participant.audioMuted ? 'Microphone muted' : 'Microphone active'}
                >
                  {participant.audioMuted ? (
                    <MicOff className="h-3 w-3" />
                  ) : (
                    <Mic className="h-3 w-3" />
                  )}
                </div>

                {/* Video Status */}
                <div
                  className={`rounded-full p-1 ${
                    participant.videoOff
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-green-900/50 text-green-400'
                  }`}
                  title={participant.videoOff ? 'Camera off' : 'Camera on'}
                >
                  {participant.videoOff ? (
                    <VideoOff className="h-3 w-3" />
                  ) : (
                    <Video className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
