import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { domain, site_id } = await request.json();

        if (!domain || !site_id) {
            return NextResponse.json({ success: false, error: 'Missing domain or site_id' }, { status: 400 });
        }

        // 1. Ensure domain has protocol
        let url = domain;
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }

        console.log(`[Verify] Checking ${url} for site_id: ${site_id}`);

        // 2. Fetch the site content
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'SocialSight-Verification-Bot/1.0',
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return NextResponse.json({
                    success: false,
                    error: `Site returned status ${response.status}. Make sure it's publicly accessible.`
                });
            }

            const html = await response.text();

            // 3. Search for the pixel script and matching site_id
            // We look for: src="...pixel.js" and data-id="SITE_ID"
            const hasPixel = html.includes('pixel.js');
            const hasSiteId = html.includes(`data-id="${site_id}"`) || html.includes(`data-id='${site_id}'`);

            if (hasPixel && hasSiteId) {
                // Update database to mark as verified
                try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );

                    const { error: updateError } = await supabaseAdmin
                        .from('analytics_sites')
                        .update({ is_verified: true, last_verified_at: new Date().toISOString() })
                        .eq('id', site_id);

                    if (updateError) {
                        console.error('[Verify DB Update Error]:', updateError);
                        return NextResponse.json({
                            success: false,
                            error: 'Pixel found, but failed to update database status. Please try again.'
                        });
                    }
                } catch (dbErr) {
                    console.error('[Verify DB Error]:', dbErr);
                    return NextResponse.json({
                        success: false,
                        error: 'An internal error occurred while saving verification status.'
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Verification successful! Pixel found.'
                });
            }

            if (hasPixel && !hasSiteId) {
                return NextResponse.json({
                    success: false,
                    error: 'Pixel found, but the data-id is incorrect. Please check your installation.'
                });
            }

            return NextResponse.json({
                success: false,
                error: 'Tracking script not found in <head>. Please ensure you have added the code correctly.'
            });

        } catch (fetchErr: any) {
            if (fetchErr.name === 'AbortError') {
                return NextResponse.json({ success: false, error: 'Verification timed out. Is the site active?' });
            }
            throw fetchErr;
        }

    } catch (error: any) {
        console.error('[Verify API Error]:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to connect to the site. Verify the URL is correct and public.'
        }, { status: 500 });
    }
}
