'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface UpdatePreferencesInput {
  locale: string;
  timezone: string;
  currency: string;
}

export interface UpdatePreferencesResult {
  success: boolean;
  error?: string;
}

const VALID_LOCALES = ['vi', 'en'];
const VALID_CURRENCIES = ['VND', 'USD', 'EUR'];

export async function updateUserPreferences(
  input: UpdatePreferencesInput
): Promise<UpdatePreferencesResult> {
  try {
    // Validate input
    if (!VALID_LOCALES.includes(input.locale)) {
      return { success: false, error: 'Invalid locale' };
    }

    if (!VALID_CURRENCIES.includes(input.currency)) {
      return { success: false, error: 'Invalid currency' };
    }

    if (!input.timezone) {
      return { success: false, error: 'Timezone is required' };
    }

    // Get Supabase client
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Update profile — cast to `any` for the values to work around Supabase SDK
    // strict generic constraints (the Database type shape triggers `never` inference
    // on the update parameter in supabase-js v2.45+).
    const { error: updateError } = await (supabase as any)
      .from('profiles')
      .update({
        locale: input.locale,
        timezone: input.timezone,
        currency: input.currency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating preferences:', updateError);
      return { success: false, error: 'Failed to update preferences' };
    }

    // Revalidate the settings page
    revalidatePath('/[locale]/settings/preferences', 'page');

    return { success: true };
  } catch (error) {
    console.error('Unexpected error updating preferences:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
