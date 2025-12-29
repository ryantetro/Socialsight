import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { url, siteId } = await req.json();

        if (!url || !siteId) {
            return NextResponse.json({ error: 'URL and Site ID are required' }, { status: 400 });
        }

        // 1. Scrape the live site
        let html = '';
        try {
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'SocialSight-Verifier/1.0',
                    'Cache-Control': 'no-cache'
                },
                timeout: 8000
            });
            html = res.data;
        } catch (scrapeError) {
            return NextResponse.json({
                success: false,
                error: 'Could not access the site. content may be behind a firewall or offline.',
                checks: { script: false, meta: false }
            });
        }

        const $ = cheerio.load(html);

        // 2. Check for Script (Pixel)
        // Look for script with data-id="{siteId}"
        // Also checks if src contains 'pixel.js' to be sure it's ours, though filename might vary if they self-host.
        // Broadest check: any script with the correct data-id.
        const scriptFound = $(`script[data-id="${siteId}"]`).length > 0;

        // 3. Check for Meta Tags (Proxy/Smart)
        // We look for og:image. If they used our proxy, it should contain our domain or 'api/proxy'.
        // For now, strict check on existence of og:image is a good baseline.
        // Ideally we check if it matches the "expected" proxy URL, but that's hard to know exact formatting without regenerating it.
        // Let's check if og:url contains 'utm_source=social' OR if og:image exists.
        const ogImage = $('meta[property="og:image"]').attr('content');
        const ogUrl = $('meta[property="og:url"]').attr('content');

        const hasOgImage = !!ogImage;
        const hasSmartTracking = ogUrl?.includes('utm_source') || false;

        // 4. Update Database if Verified
        if (scriptFound) {
            const supabase = await createClient();

            // Upsert site to ensure it exists (if verify is called before create? unlikely in our flow)
            // Update last_verified_at
            await supabase
                .from('analytics_sites')
                .update({ last_verified_at: new Date().toISOString() })
                .eq('id', siteId);
        }

        return NextResponse.json({
            success: scriptFound && hasOgImage,
            checks: {
                script: scriptFound,
                meta: hasOgImage,
                smartTracking: hasSmartTracking
            }
        });

    } catch (error: any) {
        console.error('Verification error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
