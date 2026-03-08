import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withCsrfRouteProtection } from '@/lib/csrf.server';

/**
 * POST /api/payments/gem-purchase
 *
 * Creates a payment URL for purchasing a gem package.
 * Updates the gem_purchases record with the payment URL,
 * then returns the redirect URL to the client.
 */
async function handlePost(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { purchase_id, payment_method, amount, currency, description, return_url, cancel_url } = body;

    if (!purchase_id || !payment_method || !amount) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the purchase belongs to this user
    const { data: purchase, error: purchaseError } = await supabase
      .from('gem_purchases')
      .select('id, user_id, gems_amount, bonus_gems, payment_status')
      .eq('id', purchase_id)
      .eq('user_id', user.id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    if (purchase.payment_status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Purchase already processed' }, { status: 409 });
    }

    // Forward to backend payment service
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const backendResponse = await fetch(`${backendUrl}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET || '',
      },
      body: JSON.stringify({
        purchase_id,
        user_id: user.id,
        amount,
        currency: currency || 'VND',
        payment_method,
        description,
        return_url,
        cancel_url,
        type: 'gem_purchase',
      }),
    });

    if (!backendResponse.ok) {
      // Backend unavailable — create a simulated pending payment for dev/demo
      const simulatedUrl = `${return_url}&purchase_id=${purchase_id}&simulated=true`;

      await supabase
        .from('gem_purchases')
        .update({
          payment_status: 'processing',
          payment_url: simulatedUrl,
        })
        .eq('id', purchase_id);

      return NextResponse.json({
        success: true,
        payment_url: simulatedUrl,
        note: 'Using simulated payment (backend unavailable)',
      });
    }

    const result = await backendResponse.json();

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Payment creation failed' }, { status: 500 });
    }

    // Save payment URL to the purchase record
    await supabase
      .from('gem_purchases')
      .update({
        payment_status: 'processing',
        payment_url: result.payment_url,
        payment_intent_id: result.transaction_id,
      })
      .eq('id', purchase_id);

    return NextResponse.json({ success: true, payment_url: result.payment_url });
  } catch (error: any) {
    console.error('Gem purchase API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withCsrfRouteProtection(handlePost);
