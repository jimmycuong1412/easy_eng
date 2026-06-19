import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CallSession } from '@/types/cometchat';

interface CallHistory {
  id: string;
  participantId: string;
  participantName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  type: 'audio' | 'video';
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
}

interface VideoCallState {
  // Current call state
  activeCall: CallSession | null;
  callHistory: CallHistory[];
  lastCallParticipantId: string | null;

  // Call metadata
  isCallVisible: boolean;
  callStartTime: Date | null;

  // Methods
  setActiveCall: (call: CallSession | null) => void;
  addToCallHistory: (history: CallHistory) => void;
  clearCallHistory: () => void;
  setLastCallParticipant: (participantId: string) => void;
  setCallVisible: (visible: boolean) => void;
  setCallStartTime: (time: Date | null) => void;
  endCall: () => void;
}

export const useVideoCallStore = create<VideoCallState>()(
  persist(
    (set, get) => ({
      activeCall: null,
      callHistory: [],
      lastCallParticipantId: null,
      isCallVisible: true,
      callStartTime: null,

      setActiveCall: (call) => set({ activeCall: call }),

      addToCallHistory: (history) =>
        set((state) => ({
          callHistory: [history, ...state.callHistory].slice(0, 50), // Keep last 50 calls
        })),

      clearCallHistory: () => set({ callHistory: [] }),

      setLastCallParticipant: (participantId) =>
        set({ lastCallParticipantId: participantId }),

      setCallVisible: (visible) => set({ isCallVisible: visible }),

      setCallStartTime: (time) => set({ callStartTime: time }),

      endCall: () => {
        const state = get();
        if (state.activeCall && state.callStartTime) {
          const duration = Math.floor(
            (new Date().getTime() - state.callStartTime.getTime()) / 1000
          );

          const callHistory: CallHistory = {
            id: state.activeCall.id ?? state.activeCall.sessionId ?? '',
            participantId: '', // Should be set from context
            participantName: '', // Should be set from context
            startTime: state.callStartTime,
            endTime: new Date(),
            duration,
            type: (state.activeCall.type as 'audio' | 'video') ?? 'video',
          };

          set({
            activeCall: null,
            callStartTime: null,
          });

          // Add to history in next tick to avoid race condition
          setTimeout(() => {
            set((s) => ({
              callHistory: [callHistory, ...s.callHistory].slice(0, 50),
            }));
          }, 0);
        } else {
          set({
            activeCall: null,
            callStartTime: null,
          });
        }
      },
    }),
    {
      name: 'video-call-storage', // localStorage key
      partialize: (state) => ({
        // Only persist call history and last participant
        callHistory: state.callHistory,
        lastCallParticipantId: state.lastCallParticipantId,
      }),
    }
  )
);
