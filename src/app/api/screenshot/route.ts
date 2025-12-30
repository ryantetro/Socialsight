import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// Helper to find local Chrome for development
const getLocalExePath = () => {
    if (process.platform === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (process.platform === 'linux') {
        return '/usr/bin/google-chrome';
    } else {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
}

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return new NextResponse("Missing URL", { status: 400 });
        }

        const isProduction = process.env.NODE_ENV === 'production';

        // Configure browser launch
        const browser = await puppeteer.launch({
            args: isProduction ? chromium.args : [],
            defaultViewport: chromium.defaultViewport as any,
            executablePath: isProduction
                ? await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar')
                : getLocalExePath(),
            headless: isProduction ? chromium.headless : true,
        });

        const page = await browser.newPage();

        // Set viewport to standard OG image size (1200x630)
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
