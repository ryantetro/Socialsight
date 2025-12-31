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

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Max allowed for Vercel Hobby/Pro

export async function POST(req: Request) {
    let browser: any = null;
    const isProduction = process.env.NODE_ENV === 'production';

    try {
        const { url } = await req.json();

        if (!url) {
            return new NextResponse(JSON.stringify({ error: "Missing URL" }), { status: 400 });
        }

        console.log(`📸 Starting screenshot: ${url}`);

        // Launch Browser
        browser = await puppeteer.launch({
            args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: chromium.defaultViewport as any,
            executablePath: isProduction
                ? await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar')
                : getLocalExePath(),
            headless: isProduction ? chromium.headless : true,
        } as any);

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 630 });

        // Faster wait strategy to prevent Vercel timeouts
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Small delay for settling
        await new Promise(resolve => setTimeout(resolve, 1500));

        const screenshot = await page.screenshot({
            type: 'png',
            encoding: 'binary'
        });

        await browser.close();
        browser = null;

        return new NextResponse(Buffer.from(screenshot), {
            status: 200,
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600',
            },
        });

    } catch (error: any) {
        console.error("❌ Screenshot Failed:", error.message);
        if (browser) {
            try { await browser.close(); } catch (e) { }
        }

        return new NextResponse(JSON.stringify({
            error: "Capture Failed",
            message: error.message,
            stack: isProduction ? undefined : error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
