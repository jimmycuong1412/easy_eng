/**
 * CometChat Configuration
 *
 * Configuration settings for CometChat SDK initialization
 */

export const COMETCHAT_CONFIG = {
  appId: process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || '',
  region: process.env.NEXT_PUBLIC_COMETCHAT_REGION || 'us',
  // authKey intentionally omitted — server-only. Use auth tokens from /api/cometchat/auth-token.
} as const;

export const CALL_SETTINGS = {
  enableDefaultLayout: true,
  showRecordingButton: false,
  showSwitchCameraButton: true,
  showMuteAudioButton: true,
  showPauseVideoButton: true,
  showAudioModeButton: true,
  showSwitchToVideoCallButton: false,
  defaultLayout: {
    showEndCallButton: true,
    showSwitchToVideoCallButton: false,
  },
  audioOnly: false,
  startWithAudioMuted: false,
  startWithVideoMuted: false,
} as const;

export const MESSAGE_SETTINGS = {
  enableSoundForMessages: true,
  enableTypingIndicator: true,
  enableReadReceipts: true,
  enableDeliveryReceipts: true,
} as const;

// Validate required environment variables
if (!COMETCHAT_CONFIG.appId) {
  throw new Error('NEXT_PUBLIC_COMETCHAT_APP_ID is not defined');
}

if (!COMETCHAT_CONFIG.region) {
  throw new Error('NEXT_PUBLIC_COMETCHAT_REGION is not defined');
}

// authKey is server-only — validated in /api/cometchat/auth-token/route.ts at runtime.
