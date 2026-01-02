import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
    try {
        // 1. Get Total Scan Count (with our base offset)
        const { count, error: countError } = await supabase
            .from('scans')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        const totalScans = (count || 0) + 13530; // Consistent with lib/stats.ts

        // 2. Get Recent Anonymous Audits (Last 5 unique domains)
        const { data: recentScans, error: recentError } = await supabase
            .from('scans')
            .select('url, created_at')
            .order('created_at', { ascending: false })
            .limit(20);

        if (recentError) throw recentError;

        // Extract and mask domains (e.g. google.com -> g***.com)
        const activity = [];
        const seenDomains = new Set();

        for (const scan of (recentScans || [])) {
            try {
                const domain = new URL(scan.url).hostname.replace('www.', '');
                if (seenDomains.has(domain)) continue;
                seenDomains.add(domain);

                const maskedDomain = domain.length > 3
                    ? domain[0] + '***' + domain.slice(domain.lastIndexOf('.'))
                    : domain;

                activity.push({
                    domain: maskedDomain,
                    time: scan.created_at
                });

                if (activity.length >= 5) break;
            } catch (e) {
                continue;
            }
        }

        return NextResponse.json({
            totalScans,
            activity
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
            }
        });
    } catch (e) {
        console.error('Stats Summary API Error:', e);
        return NextResponse.json({
            totalScans: 13531,
            activity: []
        }, { status: 500 });
    }
}
