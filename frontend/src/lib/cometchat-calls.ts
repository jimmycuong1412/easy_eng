/**
 * CometChat Calls SDK wrapper
 *
 * Direct call sessions for live classes: every participant joins the same
 * session id (the class's cometchat_group_id) and the SDK renders the A/V
 * grid into a host element. Browser-only — the SDK is dynamically imported.
 */

import { CometChat } from '@/lib/cometchat/client';
import { COMETCHAT_CONFIG } from '@/lib/cometchat/config';

let callsModule: any = null;
let callsInitialized = false;
let inSession = false;

async function getCalls(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('Calls SDK is browser-only');
  if (!callsModule) {
    const mod = await import('@cometchat/calls-sdk-javascript');
    callsModule = (mod as any).CometChatCalls;
  }
  return callsModule;
}

async function ensureCallsInit(): Promise<any> {
  const CometChatCalls = await getCalls();
  if (!callsInitialized) {
    const settings = new CometChatCalls.CallAppSettingsBuilder()
      .setAppId(COMETCHAT_CONFIG.appId)
      .setRegion(COMETCHAT_CONFIG.region)
      .build();
    await CometChatCalls.init(settings);
    callsInitialized = true;
  }
  return CometChatCalls;
}

export interface CallSessionHandlers {
  onUserJoined?: (user: unknown) => void;
  onUserLeft?: (user: unknown) => void;
  onUserListUpdated?: (users: unknown[]) => void;
  onCallEnded?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Join (or start) the call session for `sessionId` and render the A/V UI
 * into `container`. Requires the user to already be logged into CometChat.
 */
export async function joinCallSession(
  sessionId: string,
  container: HTMLElement,
  handlers: CallSessionHandlers = {},
  audioOnly = false
): Promise<boolean> {
  try {
    const CometChatCalls = await ensureCallsInit();

    const loggedIn = await CometChat.getLoggedinUser();
    if (!loggedIn) throw new Error('CometChat user not logged in');
    const authToken = (loggedIn as any).getAuthToken();

    const tokenRes = await CometChatCalls.generateToken(sessionId, authToken);

    const listener = new CometChatCalls.OngoingCallListener({
      onUserJoined: handlers.onUserJoined,
      onUserLeft: handlers.onUserLeft,
      onUserListUpdated: handlers.onUserListUpdated,
      onCallEnded: handlers.onCallEnded,
      onCallEndButtonPressed: handlers.onCallEnded,
      onError: handlers.onError,
    });

    const settings = new CometChatCalls.CallSettingsBuilder()
      .enableDefaultLayout(true)
      .setIsAudioOnlyCall(audioOnly)
      .setCallListener(listener)
      .build();

    CometChatCalls.startSession(tokenRes.token, settings, container);
    inSession = true;
    return true;
  } catch (err) {
    console.error('Failed to join call session:', err);
    return false;
  }
}

/** Leave the current call session (no-op when not in one). */
export async function leaveCallSession(): Promise<void> {
  try {
    if (!inSession) return;
    const CometChatCalls = await getCalls();
    CometChatCalls.endSession();
    inSession = false;
  } catch (err) {
    console.error('Failed to leave call session:', err);
  }
}

export async function setCallAudioMuted(muted: boolean): Promise<void> {
  try {
    const CometChatCalls = await getCalls();
    CometChatCalls.muteAudio(muted);
  } catch (err) {
    console.error('Failed to toggle call audio:', err);
  }
}

export async function setCallVideoPaused(paused: boolean): Promise<void> {
  try {
    const CometChatCalls = await getCalls();
    CometChatCalls.pauseVideo(paused);
  } catch (err) {
    console.error('Failed to toggle call video:', err);
  }
}
