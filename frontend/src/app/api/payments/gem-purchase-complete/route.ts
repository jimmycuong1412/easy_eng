import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfRouteProtection } from '@/lib/csrf';

/**
 * POST /api/payments/gem-purchase-complete
 *
 * Called by payment gateway webhook when a gem purchase payment is confirmed.
 * Credits gems to the user's account via gem_transactions.
 *
 * Also used internally when simulated payment is successful.
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify internal secret to prevent abuse
    const secret = request.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_API_SECRET || '';
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const body = await request.json();
    const { purchase_id, transaction_id, gateway_response } = body;

    if (!purchase_id) {
      return NextResponse.json({ success: false, error: 'Missing purchase_id' }, { status: 400 });
    }

    // Fetch the purchase
    const { data: purchase, error: fetchError } = await supabase
      .from('gem_purchases')
      .select('id, user_id, gems_amount, bonus_gems, total_gems, payment_status')
      .eq('id', purchase_id)
      .single();

    if (fetchError || !purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    if (purchase.payment_status === 'completed') {
      return NextResponse.json({ success: true, message: 'Already completed' });
    }

    // Mark purchase as completed
    const { error: updateError } = await supabase
      .from('gem_purchases')
      .update({
        payment_status: 'completed',
        payment_intent_id: transaction_id || null,
        gateway_response: gateway_response || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchase_id)
      .eq('payment_status', 'processing'); // Prevent race conditions

    if (updateError) {
      console.error('Error updating gem purchase:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update purchase' }, { status: 500 });
    }

    // Credit gems to user account
    const totalGems = purchase.total_gems ?? (purchase.gems_amount + purchase.bonus_gems);
    const { error: gemError } = await supabase
      .from('gem_transactions')
      .insert({
        user_id: purchase.user_id,
        amount: totalGems,
        transaction_type: 'gem_purchase',
        description: `Mua ${totalGems} Gems`,
        metadata: { purchase_id, transaction_id },
      });

    if (gemError) {
      console.error('Error crediting gems:', gemError);
      // Rollback the purchase status
      await supabase
        .from('gem_purchases')
        .update({ payment_status: 'processing' })
        .eq('id', purchase_id);
      return NextResponse.json({ success: false, error: 'Failed to credit gems' }, { status: 500 });
    }

    return NextResponse.json({ success: true, gems_credited: totalGems });
  } catch (error: any) {
    console.error('Gem purchase complete error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withCsrfRouteProtection(handlePost);
