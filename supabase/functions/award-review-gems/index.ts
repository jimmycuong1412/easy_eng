// Edge Function: Award Review Gems
// Purpose: Award 50 gems when student submits their first class review
// Note: This is now handled by the submit_review() database function
// This Edge Function provides an alternative HTTP endpoint if needed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitReviewRequest {
  booking_id: string;
  rating: number;
  comment?: string;
  is_anonymous?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { booking_id, rating, comment, is_anonymous = false }: SubmitReviewRequest =
      await req.json();

    // Validate inputs
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: 'rating must be between 1 and 5' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Submitting review for booking: ${booking_id}`);

    // Call submit_review function (includes gem award logic)
    const { data, error } = await supabase.rpc('submit_review', {
      p_booking_id: booking_id,
      p_rating: rating,
      p_comment: comment || null,
      p_is_anonymous: is_anonymous,
    });

    if (error) {
      console.error('Error submitting review:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = data[0];

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Review submitted successfully:`, result);

    return new Response(
      JSON.stringify({
        success: true,
        review_id: result.review_id,
        is_first_review: result.is_first_review,
        gems_awarded: result.gems_awarded,
        message: result.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* Example Usage:

POST /award-review-gems

{
  "booking_id": "uuid-here",
  "rating": 5,
  "comment": "Great class! Very helpful teacher.",
  "is_anonymous": false
}

Response (First Review):
{
  "success": true,
  "review_id": "uuid",
  "is_first_review": true,
  "gems_awarded": 50,
  "message": "Review submitted! You earned 50 gems for your first review."
}

Response (Subsequent Review):
{
  "success": true,
  "review_id": "uuid",
  "is_first_review": false,
  "gems_awarded": 0,
  "message": "Review submitted successfully!"
}

Response (Already Reviewed):
{
  "success": false,
  "message": "Review already submitted for this class"
}

Response (Class Not Completed):
{
  "success": false,
  "message": "Can only review completed classes"
}

*/
