/**
 * Notify Gem Expiration
 * Task: T133 - Create Gem expiration notification
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    // Get students with expiring Gems
    const { data: expiring } = await supabase
      .from('gems_expiring_soon')
      .select('*');

    if (!expiring || expiring.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let notified = 0;
    for (const student of expiring) {
      // Create notification
      await supabase.functions.invoke('create-notification', {
        body: {
          user_id: student.student_id,
          type: 'gems_earned',
          title: 'Gems Expiring Soon!',
          message: `You have ${student.expiring_gems} Gems expiring soon. Use them before they expire!`,
          action_url: '/student/gems',
          priority: 'high',
          icon: '⏰',
          color: 'orange',
        },
      });
      notified++;
    }

    return new Response(
      JSON.stringify({ success: true, notified }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
