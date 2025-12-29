import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return new NextResponse("Missing URL", { status: 400 });
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for some environments
        });

        const page = await browser.newPage();

        // Set viewport to standard OG image size (1200x630) or desktop size
        await page.setViewport({ width: 1200, height: 630 });

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // Capture screenshot
        const screenshot = await page.screenshot({ type: 'png' });

        await browser.close();

        // Return image directly
        return new NextResponse(Buffer.from(screenshot), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error) {
        console.error("Screenshot Failed", error);
        return new NextResponse("Failed to generate screenshot", { status: 500 });
    }
}
