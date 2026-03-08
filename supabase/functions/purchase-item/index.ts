// Edge Function: Purchase Marketplace Item
// Description: Handles marketplace item purchases with row-level locking to prevent concurrent conflicts
// Related to: Phase 10 - Character & Gamification System (T161)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PurchaseRequest {
  itemId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request body
    const { itemId }: PurchaseRequest = await req.json()

    if (!itemId) {
      throw new Error('Missing itemId in request')
    }

    // Execute purchase transaction with row-level locking
    const { data, error } = await supabase.rpc('purchase_marketplace_item', {
      p_student_id: user.id,
      p_item_id: itemId,
    })

    if (error) {
      console.error('Purchase failed:', error)
      throw new Error(error.message || 'Purchase failed')
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Item purchased successfully',
        data: data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in purchase-item function:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
