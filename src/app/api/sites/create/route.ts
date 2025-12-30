import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { domain, site_id, user_id, logo_url, site_title, favicon_url } = body;

        if (!domain || !site_id) {
            return NextResponse.json({ error: 'Missing domain or site_id' }, { status: 400 });
        }

        console.log('Creating site:', { domain, site_id, user_id, logo_url, site_title, favicon_url });

        const { data, error } = await supabase
            .from('analytics_sites')
            .insert({
                id: site_id,
                domain,
                user_id: user_id || null,
                logo_url: logo_url || null,
                site_title: site_title || null,
                favicon_url: favicon_url || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating site:', error);
            return NextResponse.json({ error: 'Failed to register site' }, { status: 500 });
        }

        return NextResponse.json({ success: true, site: data });

    } catch (e) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
