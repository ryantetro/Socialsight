import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { recordScore } from '@/lib/stats';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';

// Helper to find local Chrome for development (Reuse from screenshot route)
const getLocalExePath = () => {
    if (process.platform === 'win32') {
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else if (process.platform === 'linux') {
        return '/usr/bin/google-chrome';
    } else {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }
}

export const maxDuration = 60; // Increase timeout for Puppeteer fallback

export async function POST(req: NextRequest) {
    let browser: any = null;
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let html = '';
        let usedFallback = false;

        // 1. Try Fast Scrape (Axios)
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 5000, // Short timeout for fast path
            });
            html = data;
        } catch (axiosError: any) {
            console.log(`[Scraper] Fast scrape failed for ${url}: ${axiosError.message}`);

            // define errors that trigger fallback
            const status = axiosError.response?.status;
            const isBlockingError = status === 403 || status === 401 || status === 429 || status === 503;
            const isTimeout = axiosError.code === 'ECONNABORTED';

            if (isBlockingError || isTimeout || !status) {
                console.log(`[Scraper] Attempting fallback (Puppeteer) for ${url}...`);
                usedFallback = true;

                // 2. Fallback Scrape (Puppeteer)
                const isProduction = process.env.NODE_ENV === 'production';

                try {
                    browser = await puppeteer.launch({
                        args: isProduction
                            ? [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox']
                            : ['--no-sandbox', '--disable-setuid-sandbox'],
                        executablePath: isProduction
                            ? await chromium.executablePath(path.join(process.cwd(), 'node_modules/@sparticuz/chromium/bin'))
                            : getLocalExePath(),
                        headless: isProduction ? ((chromium as any).headless as boolean) : true,
                        ignoreHTTPSErrors: true,
                    } as any);

                    const page = await browser.newPage();
                    await page.setViewport({ width: 1280, height: 800 });

                    // Set headers to look real
                    await page.setExtraHTTPHeaders({
                        'Accept-Language': 'en-US,en;q=0.9',
                    });

                    // Navigate and wait for content
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                    // Simple wait for hydration
                    await new Promise(r => setTimeout(r, 2000));

                    html = await page.content();
                } catch (puppeteerError: any) {
                    console.error('[Scraper] Puppeteer fallback failed:', puppeteerError.message);
                    throw axiosError; // Throw original error if fallback also dies
                } finally {
                    if (browser) await browser.close();
                }
            } else {
                throw axiosError;
            }
        }

        const $ = cheerio.load(html);
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

        const resolveUrl = (path?: string) => {
            if (!path) return undefined;
            if (path.startsWith('http')) return path;
            if (path.startsWith('//')) return `https:${path}`;
            if (path.startsWith('data:')) return undefined; // Skip data URIs
            if (path.startsWith('/')) return `${baseUrl}${path}`;
            return `${baseUrl}/${path}`;
        };

        const checkReachability = async (imgUrl?: string, referer?: string) => {
            if (!imgUrl) return false;
            try {
                // Same validation logic as before
                const response = await axios.head(imgUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/webp,*/*',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Referer': referer || '',
                        'Sec-Fetch-Dest': 'image',
                        'Sec-Fetch-Mode': 'no-cors',
                        'Sec-Fetch-Site': 'cross-site'
                    },
                    timeout: 5000,
                    validateStatus: (status) => status === 200 || status === 403,
                });
                return response.status === 200 || response.status === 403;
            } catch (e) {
                try {
                    const response = await axios.get(imgUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'image/webp,*/*',
                            'Accept-Language': 'en-US,en;q=0.5',
                            'Referer': referer || '',
                            'Range': 'bytes=0-0',
                            'Sec-Fetch-Dest': 'image',
                            'Sec-Fetch-Mode': 'no-cors',
                            'Sec-Fetch-Site': 'cross-site'
                        },
                        timeout: 5000,
                        validateStatus: (status) => status < 400 || status === 403,
                    });
                    return response.status < 400 || response.status === 403;
                } catch (e2) {
                    return false;
                }
            }
        };

        // Deep extraction for images
        const rawOgImage = $('meta[property="og:image"]').attr('content') ||
            $('meta[name="og:image"]').attr('content');
        const rawTwitterImage = $('meta[name="twitter:image"]').attr('content') ||
            $('meta[property="twitter:image"]').attr('content');
        const imageSrc = $('link[rel="image_src"]').attr('href');
        const itemPropImage = $('meta[itemprop="image"]').attr('content');

        const resolvedOgImage = resolveUrl(rawOgImage || imageSrc || itemPropImage);
        const resolvedTwitterImage = resolveUrl(rawTwitterImage || rawOgImage || imageSrc);

        const isOgImageValid = await checkReachability(resolvedOgImage, url);
        const isTwitterImageValid = await checkReachability(resolvedTwitterImage, url);

        const metadata = {
            url: url,
            hostname: urlObj.hostname,
            title: ($('head title').text() || $('title').first().text() || $('meta[name="title"]').attr('content') || $('meta[property="og:title"]').attr('content') || '').trim(),
            description: ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim(),
            ogTitle: $('meta[property="og:title"]').attr('content'),
            ogDescription: $('meta[property="og:description"]').attr('content'),
            ogImage: resolvedOgImage,
            twitterCard: $('meta[name="twitter:card"]').attr('content'),
            twitterTitle: $('meta[name="twitter:title"]').attr('content'),
            twitterDescription: $('meta[name="twitter:description"]').attr('content'),
            twitterImage: resolvedTwitterImage,
            favicon: resolveUrl($('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '/favicon.ico'),
            usedFallback: usedFallback
        };

        // Scoring logic
        let score = 100;
        const issues: { priority: 'high' | 'medium' | 'low'; message: string; }[] = [];

        if (!resolvedOgImage || !isOgImageValid) {
            score -= 30;
            issues.push({
                priority: 'high',
                message: !resolvedOgImage ? 'Missing social share image (og:image)' : 'Social share image is broken or inaccessible (404/Restricted)'
            });
        } else if (!resolvedTwitterImage || !isTwitterImageValid) {
            // Keep checks sane
        }

        if (!metadata.description && !metadata.ogDescription) {
            score -= 20;
            issues.push({ priority: 'high', message: 'Missing meta description' });
        }

        if (metadata.title && metadata.title.length > 60) {
            score -= 10;
            issues.push({ priority: 'medium', message: 'Title is too long (> 60 chars)' });
        }

        if (metadata.description && metadata.description.length > 160) {
            score -= 10;
            issues.push({ priority: 'medium', message: 'Description is too long (> 160 chars)' });
        }

        const finalScore = Math.max(0, score);

        // Get/Create Site ID for tracking
        let siteId = 'pp_' + Math.random().toString(36).substr(2, 9);

        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();

        try {
            const { data: existingSite } = await supabase
                .from('analytics_sites')
                .select('id')
                .eq('domain', urlObj.hostname)
                .single();

            if (existingSite) {
                siteId = existingSite.id;
            } else {
                siteId = 'pp_' + Math.random().toString(36).substr(2, 9);
                await supabase.from('analytics_sites').insert({
                    id: siteId,
                    domain: urlObj.hostname
                });
            }
        } catch (e) {
            console.error('Error fetching site ID:', e);
        }

        const fullResult = {
            metadata,
            score: finalScore,
            issues,
            siteId
        };

        const stats = await recordScore(fullResult, url, supabase);

        return NextResponse.json({ ...fullResult, stats });
    } catch (error: unknown) {
        if (browser) {
            try { await browser.close(); } catch { }
        }
        if (error instanceof Error) {
            console.error('Scraping error:', error.message);
        }
        return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 500 });
    }
}
