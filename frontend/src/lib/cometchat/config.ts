/**
 * CometChat Configuration
 *
 * Configuration settings for CometChat SDK initialization
 */

export const COMETCHAT_CONFIG = {
  appId: process.env.NEXT_PUBLIC_COMETCHAT_APP_ID!,
  region: process.env.NEXT_PUBLIC_COMETCHAT_REGION!,
  authKey: process.env.NEXT_PUBLIC_COMETCHAT_AUTH_KEY!,
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

if (!COMETCHAT_CONFIG.authKey) {
  throw new Error('NEXT_PUBLIC_COMETCHAT_AUTH_KEY is not defined');
}
