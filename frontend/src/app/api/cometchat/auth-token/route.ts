/**
 * CometChat Auth Token API
 *
 * Generates CometChat auth tokens for users
 * POST /api/cometchat/auth-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfRouteProtection } from '@/lib/csrf-server';

const COMETCHAT_API_URL = 'https://{{COMETCHAT_APP_ID}}.api-{{COMETCHAT_REGION}}.cometchat.io/v3';
const APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID || '';
const REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION || 'us';
// COMETCHAT_API_KEY is the admin API key (no NEXT_PUBLIC_ prefix — server only)
const API_KEY = process.env.COMETCHAT_API_KEY || '';

interface CometChatUserResponse {
  data: {
    uid: string;
    name: string;
    authToken: string;
  };
}

/**
 * Ensure a user exists in CometChat by their Supabase profile ID.
 * Uses the admin API key — does not require the user to be authenticated.
 */
async function ensureCometChatUser(
  apiUrl: string,
  userId: string,
  userName: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': API_KEY,
      'Accept': 'application/json',
    },
    body: JSON.stringify({ uid: userId, name: userName }),
  });

  // 400 with ERR_UID_ALREADY_EXISTS means user exists — that's fine
  if (!response.ok && response.status !== 400) {
    const errorData = await response.json().catch(() => ({}));
    // Only throw for non-"already exists" errors
    const code = (errorData as any)?.data?.code || '';
    if (code !== 'ERR_UID_ALREADY_EXISTS') {
      throw new Error(`Failed to create CometChat user ${userId}: ${JSON.stringify(errorData)}`);
    }
  }
}

async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify user is authenticated with Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile for name
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User';

    // Build CometChat API URL
    const apiUrl = COMETCHAT_API_URL
      .replace('{{COMETCHAT_APP_ID}}', APP_ID)
      .replace('{{COMETCHAT_REGION}}', REGION);

    // Optionally pre-register a remote peer (e.g. teacher) so calls can be made to them
    let targetUserId: string | null = null;
    try {
      const body = await request.json();
      targetUserId = body?.targetUserId || null;
    } catch {
      // No body or invalid JSON — that's fine
    }

    if (targetUserId && targetUserId !== user.id) {
      // Fetch target user's profile to get their name
      const { data: targetProfile } = await (supabase as any)
        .from('profiles')
        .select('full_name')
        .eq('id', targetUserId)
        .single();

      const targetName = targetProfile?.full_name || 'User';
      await ensureCometChatUser(apiUrl, targetUserId, targetName);
    }

    // Create or update the calling user in CometChat
    await ensureCometChatUser(apiUrl, user.id, userName);

    // Generate auth token for the user
    const authTokenResponse = await fetch(`${apiUrl}/users/${user.id}/auth_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!authTokenResponse.ok) {
      const errorData = await authTokenResponse.json();
      console.error('[CometChat API] Auth token generation failed:', errorData);
      throw new Error('Failed to generate auth token');
    }

    const tokenData: CometChatUserResponse = await authTokenResponse.json();

    return NextResponse.json({
      success: true,
      userId: user.id,
      authToken: tokenData.data.authToken,
    });
  } catch (error) {
    console.error('[CometChat API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withCsrfRouteProtection(handlePost);
