import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers });
        }

        // Feature 1: Bot Filtering
        const userAgent = request.headers.get('user-agent') || '';
        const botPattern = /bot|crawler|spider|crawling/i;
        const isBot = botPattern.test(userAgent);

        // Feature 2: Privacy-First Location
        // Vercel passes the country in this header. We store only the country code, no IP.
        const country = request.headers.get('x-vercel-ip-country') || 'Unknown';

        // Feature 3: Source Detection
        // Priority: UTM Params > Referrer > Direct
        let source = 'direct';

        const utmSource = params?.utm_source || params?.source || params?.ref;

        if (utmSource) {
            source = utmSource.toLowerCase();
        } else if (referrer) {
            if (referrer.includes('t.co') || referrer.includes('twitter')) source = 'twitter';
            else if (referrer.includes('linkedin')) source = 'linkedin';
            else if (referrer.includes('facebook')) source = 'facebook';
            else if (referrer.includes('google')) source = 'search';
            else source = 'referral';
        }

        // Insert into Supabase
        const { error } = await supabase
            .from('analytics_events')
            .insert({
                site_id,
                event_type,
                path,
                referrer,
                user_agent: userAgent, // Optional: store generic UA string if needed, or truncate for privacy
                country,
                is_bot: isBot,
                source
            });

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: 'Error recording event' }, { status: 500, headers });
        }

        return NextResponse.json({ success: true }, { status: 200, headers });

    } catch (e) {
        console.error('Tracking API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers });
    }
}

export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
