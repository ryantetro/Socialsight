import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Revalidate stats every minute
export const revalidate = 60;

export async function GET() {
    // Determine the Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Default stats (fallback)
    let stats = {
        linksAudited: '18,715',
        avgPulseScore: '77',
        brokenImagesFound: '2.4k',
        clicksSaved: '84k'
    };

    let leaderboard = undefined;

    if (supabaseUrl && supabaseServiceKey) {
        try {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);

            // 1. Get exact count of scans
            const { count: realCount, error: countError } = await supabase
                .from('scans')
                .select('*', { count: 'exact', head: true });

            if (!countError && realCount !== null) {
                // Add base offset for social proof (13,530 as per stats.ts)
                const totalScans = realCount + 13530;

                // 2. Fetch recent scans to calculate average score and broken images
                const { data: recentScans, error: recentError } = await supabase
                    .from('scans')
                    .select('result')
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (!recentError && recentScans && recentScans.length > 0) {
                    let totalScore = 0;
                    let brokenImages = 0;

                    recentScans.forEach(scan => {
                        const score = scan.result?.score || 0;
                        const ogImage = scan.result?.metadata?.ogImage;

                        totalScore += score;
                        if (!ogImage || ogImage.trim() === '') {
                            brokenImages++;
                        }
                    });

                    // Calculate Avg Score
                    const averageScore = Math.round(totalScore / recentScans.length);

                    // Extrapolate broken images ratio to total scans
                    const brokenRatio = brokenImages / recentScans.length;
                    const estimatedBrokenImages = Math.round(totalScans * brokenRatio);

                    // Estimate clicks saved (e.g. 10 clicks per fix or just simply links audited * multiplier)
                    const estimatedClicksSaved = totalScans * 8; // Assuming meaningful impact per scan

                    // Set calculated stats
                    stats = {
                        linksAudited: totalScans.toLocaleString(),
                        avgPulseScore: averageScore.toString(),
                        brokenImagesFound: estimatedBrokenImages > 999
                            ? (estimatedBrokenImages / 1000).toFixed(1) + 'k'
                            : estimatedBrokenImages.toLocaleString(),
                        clicksSaved: estimatedClicksSaved > 999
                            ? (estimatedClicksSaved / 1000).toFixed(0) + 'k'
                            : estimatedClicksSaved.toLocaleString()
                    };
                }
            }

            // 3. Fetch Leaderboard (Top 5 Scans in recent history)
            // We fetch more items and sort in memory to ensure we get meaningful high scores
            // This avoids complicated JSONB indexing for now
            const { data: topScans, error: leaderboardError } = await supabase
                .from('scans')
                .select('*')
                .limit(100) // Look at last 100 scans for candidates
                .order('created_at', { ascending: false });

            if (!leaderboardError && topScans) {
                const processedLeaderboard = topScans
                    .map(scan => {
                        const metadata = scan.result?.metadata || {};
                        const date = new Date(scan.created_at);
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - date.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        let timeAgo = 'Today';
                        if (diffDays > 30) timeAgo = Math.floor(diffDays / 30) + ' months ago';
                        else if (diffDays > 1) timeAgo = diffDays + ' days ago';
                        else if (diffDays === 1) timeAgo = '1 day ago';

                        return {
                            domain: new URL(scan.url).hostname.replace('www.', ''),
                            url: scan.url,
                            score: scan.result?.score || 0,
                            date: timeAgo,
                            checks: {
                                title: !!(metadata.title || metadata.ogTitle),
                                image: !!(metadata.ogImage || metadata.twitterImage),
                                description: !!(metadata.description || metadata.ogDescription)
                            }
                        };
                    })
                    // Filter out duplicates (keep highest score for domain)
                    .reduce((acc: any[], current) => {
                        const existing = acc.find((item: any) => item.domain === current.domain);
                        if (!existing) {
                            acc.push(current);
                        } else if (current.score > existing.score) {
                            // Replace with higher score if found
                            const index = acc.indexOf(existing);
                            acc[index] = current;
                        }
                        return acc;
                    }, [])
                    .sort((a: any, b: any) => b.score - a.score)
                    .slice(0, 5);

                leaderboard = processedLeaderboard;
            }

        } catch (error) {
            console.error('Error fetching analytics for A/B page:', error);
            // Fallback to defaults is already set
        }
    }

    return NextResponse.json({
        stats,
        leaderboard
    }, {
        headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
        }
    });
}
