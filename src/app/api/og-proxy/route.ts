import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');
    // const projectId = searchParams.get('id'); // Future Use: Track against project ID

    if (!imageUrl) {
        return new NextResponse("Missing URL parameter", { status: 400 });
    }

    try {
        // 1. Detect User-Agent for Analytics
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const isBot = /bot|facebookexternalhit|whatsapp|slackbot|twitterbot|linkedinbot/i.test(userAgent);

        if (isBot) {
            console.log(`[Analytics] Impression tracked from: ${userAgent}`);
            // TODO: In Phase 4 (with DB), strictly increment 'impressions' table here.
        }

        // 2. Fetch the actual image from the source URL
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
            return new NextResponse("Failed to fetch upstream image", { status: 502 });
        }

        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Serve the image with correct headers
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour to balance performance/tracking
                'X-Analytics-Tracked': 'true',
            },
        });

    } catch (error) {
        console.error("Proxy Error:", error);
        return new NextResponse("Internal Proxy Error", { status: 500 });
    }
}
