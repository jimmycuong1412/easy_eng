/**
 * CometChat Auth Token API
 *
 * Generates CometChat auth tokens for users
 * POST /api/cometchat/auth-token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const COMETCHAT_API_URL = 'https://{{COMETCHAT_APP_ID}}.api-{{COMETCHAT_REGION}}.cometchat.io/v3';
const APP_ID = process.env.NEXT_PUBLIC_COMETCHAT_APP_ID!;
const REGION = process.env.NEXT_PUBLIC_COMETCHAT_REGION!;
const API_KEY = process.env.COMETCHAT_API_KEY!;

interface CometChatUserResponse {
  data: {
    uid: string;
    name: string;
    authToken: string;
  };
}

export async function POST(request: NextRequest) {
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
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.full_name || user.email?.split('@')[0] || 'User';

    // Build CometChat API URL
    const apiUrl = COMETCHAT_API_URL
      .replace('{{COMETCHAT_APP_ID}}', APP_ID)
      .replace('{{COMETCHAT_REGION}}', REGION);

    // Create or update user in CometChat
    const createUserResponse = await fetch(`${apiUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apiKey': API_KEY,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        uid: user.id,
        name: userName,
      }),
    });

    if (!createUserResponse.ok && createUserResponse.status !== 400) {
      // 400 might mean user already exists, which is fine
      const errorData = await createUserResponse.json();
      console.error('[CometChat API] Create user failed:', errorData);
      throw new Error('Failed to create CometChat user');
    }

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
