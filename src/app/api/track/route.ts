import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const body = await request.json();
        const { site_id, event_type, path, referrer, params } = body;

        // Basic validation
        if (!site_id || !event_type) {
            console.warn('⚠️ Tracking: Missing fields', { site_id, event_type });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
        }

        // Feature 1: Bot Filtering
        const userAgent = request.headers.get('user-agent') || '';
        const botPattern = /bot|crawler|spider|crawling/i;
        const isBot = botPattern.test(userAgent);

        // Feature 2: Privacy-First Location
        // Vercel passes the country in this header. We store only the country code, no IP.
        const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

        // Feature 3: Robust Source Detection
        let source = 'direct';
        const utmSource = params?.utm_source || params?.source || params?.ref;

        if (utmSource) {
            source = utmSource.toLowerCase();
        } else if (referrer) {
            try {
                const refUrl = new URL(referrer);
                const host = refUrl.hostname.replace('www.', '');

                // Friendly Mappings
                if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) source = 'twitter';
                else if (host.includes('linkedin')) source = 'linkedin';
                else if (host.includes('facebook') || host.includes('fb.com')) source = 'facebook';
                else if (host.includes('google')) source = 'search';
                else if (host.includes('producthunt')) source = 'producthunt';
                else if (host.includes('news.ycombinator.com')) source = 'hacker news';
                else if (host.includes('reddit')) source = 'reddit';
                else if (host.includes('bing') || host.includes('duckduckgo') || host.includes('yahoo')) source = 'search';
                else source = host; // Use the actual domain (e.g. indiehackers.com)
            } catch (e) {
                source = 'referral';
            }
        }

        // Normalize event_type to match DB Enum
        let normalizedEventType = event_type;
        if (event_type === 'pageview') normalizedEventType = 'page_view';

        // Feature 4: A/B Variant
        const abVariant = params?.ab_variant || body.ab_variant || null;
        const pricingVariant = params?.pricing_variant || body.pricing_variant || null;

        // Insert into Supabase
        const { error } = await supabase
            .from('analytics_events')
            .insert({
                site_id,
                event_type: normalizedEventType,
                path,
                referrer,
                user_agent: userAgent,
                country,
                is_bot: isBot,
                source,
                ab_variant: abVariant,
                pricing_variant: pricingVariant
            });

        if (error) {
            console.error('❌ Tracking: Supabase Error:', error);
            return NextResponse.json({ error: 'Error recording event: ' + error.message }, { status: 500, headers });
        }

        console.log(`✅ Tracking: Success for ${site_id} (${normalizedEventType}) from ${source}`);
        return NextResponse.json({ success: true }, { status: 200, headers });

    } catch (e) {
        console.error('Tracking API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}
