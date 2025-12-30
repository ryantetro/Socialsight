const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load Environment Variables
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = {};

if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envConfig[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']; // Use Service Role for DB Verification
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_URL = 'http://localhost:3000/api/track'; // Can change to production URL if needed
const SITE_DOMAIN = 'socialsight.dev';

async function runTest() {
    console.log(`🚀 Starting Analytics Test for ${SITE_DOMAIN}...`);

    // 1. Fetch Site ID
    const { data: site, error } = await supabase
        .from('analytics_sites')
        .select('*')
        .ilike('domain', `%${SITE_DOMAIN}%`)
        .limit(1)
        .single();

    if (error || !site) {
        console.error('❌ Could not find site in DB:', error?.message);
        return;
    }

    console.log(`✅ Site Found: ${site.id} (${site.domain})`);

    // 2. Simulate Events
    const testCases = [
        { name: 'iMessage Source', params: { utm_source: 'imessage' } },
        { name: 'Twitter Referrer', referrer: 'https://t.co/xyz123' },
        { name: 'Direct Visit', referrer: null, params: {} }
    ];

    for (const test of testCases) {
        console.log(`\n📡 Sending Event: ${test.name}...`);

        const payload = {
            site_id: site.id,
            event_type: 'pageview',
            path: '/?test=true',
            referrer: test.referrer || '',
            params: test.params || {}
        };

        try {
            const res = await fetch(TEST_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log(`   ✅ API Status: ${res.status}`);
            } else {
                console.error(`   ❌ API Failed: ${res.status} ${res.statusText}`);
                const txt = await res.text();
                console.error('   ', txt);
            }
        } catch (e) {
            console.error('   ❌ Network Error:', e.message);
        }
    }

    // 3. Verify in DB
    console.log('\n⏳ Waiting 2s for DB ingestion...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('🔍 Verifying Analytics Events in DB...');
    const { data: events, error: eventError } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('site_id', site.id)
        .order('created_at', { ascending: false })
        .limit(5);

    if (eventError) {
        console.error('❌ DB Query Failed:', eventError.message);
        return;
    }

    console.log(`\n📊 Found ${events.length} recent events for ${site.id}:`);
    events.forEach(e => {
        console.log(`   - [${new Date(e.created_at).toLocaleTimeString()}] Source: ${e.source} | Path: ${e.path}`);
    });

    // Check if our test events are there
    const hasIMessage = events.some(e => e.source === 'imessage');
    const hasTwitter = events.some(e => e.source === 'twitter');

    if (hasIMessage && hasTwitter) {
        console.log('\n✅ TEST PASSED: All test events recorded successfully!');
    } else {
        console.log('\n⚠️  TEST PARTIALLY FAILED: Some events missing.');
    }
}

runTest();
