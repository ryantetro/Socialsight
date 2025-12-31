import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { recordScore } from '@/lib/stats';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const { data: html } = await axios.get(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: 10000,
        });

        const $ = cheerio.load(html);
        const urlObj = new URL(url);
        const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

        const resolveUrl = (path?: string) => {
            if (!path) return undefined;
            if (path.startsWith('http')) return path;
            if (path.startsWith('//')) return `https:${path}`;
            if (path.startsWith('/')) return `${baseUrl}${path}`;
            return `${baseUrl}/${path}`;
        };

        const checkReachability = async (imgUrl?: string) => {
            if (!imgUrl) return false;
            try {
                const response = await axios.head(imgUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; SocialSightBot/1.0)',
                    },
                    timeout: 5000,
                    validateStatus: (status) => status === 200,
                });
                return response.status === 200;
            } catch (e) {
                // If HEAD fails, try a GET with range header or just small timeout
                try {
                    const response = await axios.get(imgUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; SocialSightBot/1.0)',
                            'Range': 'bytes=0-0'
                        },
                        timeout: 5000,
                        validateStatus: (status) => status < 400,
                    });
                    return response.status < 400;
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

        const isOgImageValid = await checkReachability(resolvedOgImage);
        const isTwitterImageValid = await checkReachability(resolvedTwitterImage);

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
            // If OG is valid but Twitter is missing/broken, small penalty or just info
            // For now, let's keep it simple: if OG is good, we are mostly happy.
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
        let siteId = 'pp_' + Math.random().toString(36).substr(2, 9); // Fallback

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

        // 1. Prepare the full result object
        const fullResult = {
            metadata,
            score: finalScore,
            issues,
            siteId
        };

        // 2. Record score (and save full scan result to DB)
        const stats = await recordScore(fullResult, url, supabase);

        // 3. Return combined result
        return NextResponse.json({ ...fullResult, stats });
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Scraping error:', error.message);
        }
        return NextResponse.json({ error: 'Failed to scrape URL' }, { status: 500 });
    }
}
