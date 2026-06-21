/**
 * Shared CometChat helpers (web + mobile).
 *
 * The CometChat admin API key is server-only; auth tokens are minted by the
 * `cometchat-auth-token` Supabase Edge Function, called here via the injected
 * Supabase client (works on both platforms). The SDK itself (web JS SDK vs RN
 * SDK) is initialized per-platform — only this token-fetch + config is shared.
 */
import { getSupabaseClient } from '../adapters/supabase';

/** Call settings shared across platforms (per-platform UI may extend these). */
export const COMETCHAT_CALL_SETTINGS = {
  audioOnly: false,
  startWithAudioMuted: false,
  startWithVideoMuted: false,
} as const;

export interface CometChatAuthToken {
  userId: string;
  authToken: string;
}

/**
 * Fetch a CometChat auth token for the current user via the edge function.
 * Optionally pre-registers a peer (e.g. the teacher) so calls can reach them.
 */
export async function getCometChatAuthToken(
  targetUserId?: string
): Promise<CometChatAuthToken> {
  const { data, error } = await (getSupabaseClient() as any).functions.invoke(
    'cometchat-auth-token',
    { body: targetUserId ? { targetUserId } : {} }
  );
  if (error) throw error;
  if (!data?.authToken) throw new Error('No auth token returned');
  return { userId: data.userId, authToken: data.authToken };
}
