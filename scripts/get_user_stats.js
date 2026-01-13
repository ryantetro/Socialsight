const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TARGET_USER_ID = process.argv[2] || '1d8cd569-57b9-4003-a87b-602cb7cd8ac4';

async function getUserStats() {
    console.log(`Fetching stats for User ID: ${TARGET_USER_ID}...\n`);

    try {
        // 1. Fetch User Profile (if exists, checking auth.users via admin is harder directly without specialized query, relying on public tables first)
        // Note: We can't query auth.users directly with js client usually unless using rpc. 
        // We'll skip raw auth data and focus on app data.

        // 2. Fetch Scans
        const { data: scans, error: scanError } = await supabase
            .from('scans')
            .select('id, url, result, created_at')
            .eq('user_id', TARGET_USER_ID)
            .order('created_at', { ascending: false });

        if (scanError) throw scanError;

        const totalScans = scans.length;
        const avgScore = totalScans > 0
            ? Math.round(scans.reduce((acc, s) => acc + (s.result?.score || 0), 0) / totalScans)
            : 0;

        // 2b. Fetch Profile (Subscription Tier)
        let tier = 'Free (Unknown)';
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tier')
            .eq('id', TARGET_USER_ID)
            .single();

        if (profile) {
            tier = profile.tier || 'Free';
        } else if (profileError) {
            // If table doesn't exist or other error, we'll see it in logs, but default to unknown
            // console.log('Profile fetch note:', profileError.message);
        }

        // 3. Fetch Sites
        const { data: sites, error: siteError } = await supabase
            .from('analytics_sites')
            .select('id, domain, created_at')
            .eq('user_id', TARGET_USER_ID);

        if (siteError) throw siteError;

        // 4. Fetch AI Images
        const { count: aiCount, error: aiError } = await supabase
            .from('ai_images')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', TARGET_USER_ID);

        if (aiError) throw aiError;

        // 5. Fetch Analytics Traffic (for owned sites)
        let totalEvents = 0;
        if (sites.length > 0) {
            const siteIds = sites.map(s => s.id);
            const { count: eventsCount, error: eventsError } = await supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .in('site_id', siteIds);

            if (!eventsError) totalEvents = eventsCount;
        }

        // --- REPORT ---
        console.log('--- USER STATS REPORT ---');
        console.log(`User ID: ${TARGET_USER_ID}`);
        console.log(`Plan:    ${tier}`);
        console.log('-------------------------');

        console.log('\n📊 SCANS');
        console.log(`Total Scans Run:   ${totalScans}`);
        console.log(`Average Score:     ${avgScore}/100`);
        if (scans.length > 0) {
            console.log('Recent 5 Scans:');
            scans.slice(0, 5).forEach(s => console.log(`  - ${new Date(s.created_at).toISOString().split('T')[0]} [${s.result?.score || 0}]: ${s.url}`));
        }

        console.log('\n🌐 SITES');
        console.log(`Total Sites:       ${sites.length}`);
        if (sites.length > 0) {
            sites.forEach(s => console.log(`  - ${s.domain} (ID: ${s.id})`));
        } else {
            console.log('  (No verified sites)');
        }

        console.log('\n🤖 AI USAGE');
        console.log(`Images Generated:  ${aiCount}`);

        console.log('\n📈 ANALYTICS TRAFFIC');
        console.log(`Total Events:      ${totalEvents}`);
        console.log('-------------------------');

    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

getUserStats();
