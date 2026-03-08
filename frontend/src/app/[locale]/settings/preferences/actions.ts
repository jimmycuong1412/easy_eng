'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface UpdatePreferencesInput {
  locale: string;
  timezone: string;
  currency?: string;
}

export interface UpdatePreferencesResult {
  success: boolean;
  error?: string;
}

const VALID_LOCALES = ['vi', 'en'];

export async function updateUserPreferences(
  input: UpdatePreferencesInput
): Promise<UpdatePreferencesResult> {
  try {
    // Validate input
    if (!VALID_LOCALES.includes(input.locale)) {
      return { success: false, error: 'Invalid locale' };
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

    // Update profile (only locale and timezone — no currency column in DB)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        locale: input.locale,
        timezone: input.timezone,
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
