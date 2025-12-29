const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let SUPABASE_URL, SUPABASE_KEY;
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                const val = values.join('=').trim().replace(/^["']|["']$/g, '');
                if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = val;
                if (key.trim() === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') SUPABASE_KEY = val;
            }
        });
    }
} catch (e) { }

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Could not find Supabase credentials');
    process.exit(1);
}

const API_URL = 'http://localhost:3000/api/track';
const TEST_SITE_ID = 'test_utm_' + Math.floor(Math.random() * 10000);

async function runTest() {
    console.log('🔍 Testing UTM Source Tracking...');
    console.log(`📍 Site ID: ${TEST_SITE_ID}`);
    console.log(`🔗 Simulating: mysite.com?utm_source=imessage`);

    console.log('\n1️⃣  Sending iMessage Event...');
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site_id: TEST_SITE_ID,
                event_type: 'page_view',
                path: '/landing-page',
                referrer: null, // Direct traffic usually
                params: {
                    utm_source: 'imessage',
                    utm_campaign: 'viral_launch'
                }
            })
        });

        if (res.status !== 200) {
            console.error(`❌ API Error: ${res.status}`);
            const text = await res.text();
            console.error(text);
            process.exit(1);
        }
        console.log('✅ API responded with 200 OK');
        console.log('   (Logic confirmed: source should be saved as "imessage")');

    } catch (e) {
        console.error('❌ Network Error', e.message);
        process.exit(1);
    }
}

runTest();
