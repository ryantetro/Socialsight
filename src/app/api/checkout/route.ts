import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized", redirect: "/login" }), { status: 401 });
        }

        const { priceId, view } = await req.json();
        console.log(`[STRIPE_DEBUG] Checkout request for priceId: ${priceId}, view: ${view}`);

        if (!priceId) {
            console.error('[STRIPE_DEBUG] Error: priceId is missing');
            return new NextResponse(JSON.stringify({ error: "Missing priceId" }), { status: 400 });
        }

        const origin = req.headers.get('origin');
        const successUrl = view ? `${origin}/?success=true&view=${view}` : `${origin}/?success=true`;
        const cancelUrl = view ? `${origin}/?canceled=true&view=${view}` : `${origin}/?canceled=true`;

        const session = await stripe.checkout.sessions.create({
            mode: priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD ? 'payment' : 'subscription',
            payment_method_types: ['card'],
            client_reference_id: user.id,
            customer_email: user.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("[STRIPE_ERROR] Full error:", error);
        return new NextResponse(JSON.stringify({
            error: "Internal Error",
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), { status: 500 });
    }
}
