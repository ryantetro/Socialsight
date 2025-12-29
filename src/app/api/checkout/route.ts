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

        const { priceId } = await req.json();

        if (!priceId) {
            return new NextResponse(JSON.stringify({ error: "Missing priceId" }), { status: 400 });
        }

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
            success_url: `${req.headers.get('origin')}/?success=true`,
            cancel_url: `${req.headers.get('origin')}/?canceled=true`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_ERROR]", error);
        return new NextResponse(JSON.stringify({ error: "Internal Error", details: error instanceof Error ? error.message : "Unknown error" }), { status: 500 });
    }
}
