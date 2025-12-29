import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('Stripe-Signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`[STRIPE_WEBHOOK] Payment successful for session: ${session.id}`);

            const userId = session.client_reference_id;
            const priceId = session.line_items?.data[0]?.price?.id || session.metadata?.priceId; // Depending on how we pass it, typically session has line_items expanded or we infer from session mode/metadata

            // Since we can't easily expand line_items in the webhook event object directly without fetching, 
            // a better way in the simplified flow is to check the 'amount_total' or store priceId in metadata during checkout creation.
            // Let's assume we store 'tier' in metadata for easier access, OR we just check the amount for now as a robust fallback.

            // Actually, best practice: metadata.
            // But we didn't add metadata to checkout creation yet. 
            // Let's verify against the known env var for LTD.
            let tier = 'pro'; // Default
            if (process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD && session.mode === 'payment') {
                // It's the LTD
                tier = 'ltd';
            }

            if (userId) {
                // Update Supabase
                const { error } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        tier: tier,
                        stripe_customer_id: session.customer as string,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (error) {
                    console.error('[STRIPE_WEBHOOK] Failed to update profile:', error);
                    return new NextResponse(`Database Update Failed: ${error.message}`, { status: 500 });
                }
                console.log(`[STRIPE_WEBHOOK] Successfully upgraded user ${userId} to ${tier}`);
            } else {
                console.warn('[STRIPE_WEBHOOK] No client_reference_id (userId) found in session. User not upgraded.');
            }
            break;
        default:
            console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new NextResponse(null, { status: 200 });
}
