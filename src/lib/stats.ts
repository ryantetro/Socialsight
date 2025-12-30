import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { InspectionResult } from '@/types';

export async function recordScore(fullResult: InspectionResult, url: string, supabase: SupabaseClient) {
    try {
        // 1. Insert the scan (anonymously or authenticated depending on Client)
        // We catch errors here so we don't block the UI if insert fails (e.g. RLS issues)
        const { error: insertError } = await supabase
            .from('scans')
            .insert({
                url: url,
                result: fullResult, // Storing full result for Scan History
                user_id: (await supabase.auth.getUser()).data.user?.id || null
            });

        if (insertError) {
            console.error('Failed to record scan stats:', insertError);
            // Fallback: don't ruin the UX, just return simulated stats
        }

        // 2. Get Real Stats (Bypassing RLS with Admin Client)
        // We need the Service Role key to count *all* rows, regardless of RLS policies for the current user/anon.
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        // Count total scans
        const { count: realCount, error: countError } = await adminClient
            .from('scans')
            .select('*', { count: 'exact', head: true });

        // Calculate Percentile (approximate)
        // Count how many scores are lower than this one
        const { count: lowerCount, error: lowerError } = await adminClient
            .from('scans')
            .select('*', { count: 'exact', head: true })
            .lt('result->score', fullResult.score); // Use ->score to compare as number/json matches our previous fix

        const totalScans = (realCount || 0) + 13530; // Base offset for social proof
        const lower = lowerCount || 0;
        const total = realCount || 1;

        // Default percentile calculation
        let percentile = Math.round((lower / total) * 100);
        if (percentile < 1) percentile = 1;
        if (percentile > 99) percentile = 99;

        // Fallback for empty DB
        if (realCount === 0) {
            percentile = fullResult.score > 80 ? 92 : fullResult.score > 50 ? 65 : 30;
        }

        return {
            totalScans,
            percentile
        };

    } catch (e) {
        console.error('Stats error:', e);
        return {
            totalScans: 13531,
            percentile: fullResult.score > 80 ? 88 : 50
        };
    }
}
