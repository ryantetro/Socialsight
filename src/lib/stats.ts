import { SupabaseClient } from '@supabase/supabase-js';

export async function recordScore(score: number, url: string, supabase: SupabaseClient) {
    try {
        // 1. Insert the scan (anonymously or authenticated depending on Client)
        // We catch errors here so we don't block the UI if insert fails (e.g. RLS issues)
        const { error: insertError } = await supabase
            .from('scans')
            .insert({
                url: url,
                result: { score }, // Storing minimal result for stats
                user_id: (await supabase.auth.getUser()).data.user?.id || null
            });

        if (insertError) {
            console.error('Failed to record scan stats:', insertError);
            // Fallback: don't ruin the UX, just return simulated stats
        }

        // 2. Get Real Stats
        // Count total scans
        const { count: realCount, error: countError } = await supabase
            .from('scans')
            .select('*', { count: 'exact', head: true });

        // Calculate Percentile (approximate)
        // Count how many scores are lower than this one
        const { count: lowerCount, error: lowerError } = await supabase
            .from('scans')
            .select('*', { count: 'exact', head: true })
            .lt('result->>score', score); // Assuming result is jsonb and has score

        const totalScans = (realCount || 0) + 13530; // Base offset for social proof
        const lower = lowerCount || 0;
        const total = realCount || 1;

        // Default percentile calculation
        let percentile = Math.round((lower / total) * 100);
        if (percentile < 1) percentile = 1;
        if (percentile > 99) percentile = 99;

        // Fallback for empty DB
        if (realCount === 0) {
            percentile = score > 80 ? 92 : score > 50 ? 65 : 30;
        }

        return {
            totalScans,
            percentile
        };

    } catch (e) {
        console.error('Stats error:', e);
        return {
            totalScans: 13531,
            percentile: score > 80 ? 88 : 50
        };
    }
}
