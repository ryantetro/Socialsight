import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { domain, site_id, user_id } = body;

        if (!domain || !site_id) {
            return NextResponse.json({ error: 'Missing domain or site_id' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('analytics_sites')
            .insert({
                id: site_id,
                domain,
                user_id: user_id || null
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
