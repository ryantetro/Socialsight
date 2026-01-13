import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        // 1. Authenticate User
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
        }

        // 2. Parse Body
        const { websiteUrl, companyName, description } = await req.json();

        if (!websiteUrl || !companyName) {
            return new NextResponse(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
        }

        console.log(`[CHECKOUT_FEATURED] User ${user.id} requesting feature for ${websiteUrl}`);

        // 3. Insert into Database (Pending Request)
        // We use supabaseAdmin to ensure we can write regardless of RLS quirks, 
        // though RLS should allow insert for own user.
        const { data: requestData, error: dbError } = await supabaseAdmin
            .from('featured_requests')
            .insert({
                user_id: user.id,
                website_url: websiteUrl,
                company_name: companyName,
                description: description || '',
                amount: 2500, // $25.00
                status: 'pending'
            })
            .select()
            .single();

        if (dbError) {
            console.error('[CHECKOUT_FEATURED] DB Insert Error:', dbError);
            return new NextResponse(JSON.stringify({ error: "Database error", details: dbError.message }), { status: 500 });
        }

        const requestId = requestData.id;

        // 4. Create Stripe Session
        const origin = req.headers.get('origin');
        const successUrl = `${origin}/dashboard?success=featured`;
        const cancelUrl = `${origin}/ab?canceled=true`;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            client_reference_id: user.id,
            customer_email: user.email,
            line_items: [
                {
                    price: process.env.NEXT_PUBLIC_STRIPE_PRICE_FEATURED,
                    quantity: 1,
                },
            ],
            metadata: {
                type: 'featured_request',
                requestId: requestId,
                websiteUrl: websiteUrl
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        // 5. Update Request with Session ID (Optional, but good for tracking)
        await supabaseAdmin
            .from('featured_requests')
            .update({ stripe_session_id: session.id })
            .eq('id', requestId);

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error("[CHECKOUT_FEATURED] Error:", error);
        return new NextResponse(JSON.stringify({
            error: "Internal Error",
            message: error.message
        }), { status: 500 });
    }
}
