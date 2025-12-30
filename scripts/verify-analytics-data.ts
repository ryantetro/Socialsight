
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually to avoid dependencies
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const getEnv = (key: string) => {
    const match = envLocal.match(new RegExp(`${key}=(.*)`));
    return match ? match[1] : '';
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase Credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_ENDPOINT = 'http://localhost:3000/api/track';
const TARGET_DOMAIN = 'socialsight.dev';

async function main() {
    console.log(`🔍 Finding Site ID for ${TARGET_DOMAIN}...`);

    // 1. Get Site ID
    const { data: site, error } = await supabase
        .from('analytics_sites')
        .select('id')
        .ilike('domain', `%${TARGET_DOMAIN}%`)
        .single();

    if (error || !site) {
        console.error('❌ Could not find site for', TARGET_DOMAIN, error);
        return;
    }

    console.log(`✅ Found Site ID: ${site.id}`);
    const siteId = site.id;

    // 2. Define Test Scenarios
    const scenarios = [
        // Twitter / Mobile / US / PageView
        {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', 'x-vercel-ip-country': 'US' },
            body: { site_id: siteId, event_type: 'page_view', path: '/', referrer: 'https://t.co/xyz' } // t.co = Twitter
        },
        // Twitter / Mobile / US / *Click* (Outbound)
        {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)', 'x-vercel-ip-country': 'US' },
            body: {
                site_id: siteId,
                event_type: 'click',
                path: '/',
                referrer: 'https://t.co/xyz',
                params: { destination: 'https://google.com', is_outbound: true }
            }
        },
        // Google / Desktop / UK / PageView
        {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'x-vercel-ip-country': 'GB' },
            body: { site_id: siteId, event_type: 'page_view', path: '/pricing', referrer: 'https://google.com' }
        },
        // Direct / Tablet / CA / PageView
        {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 13_2 like Mac OS X)', 'x-vercel-ip-country': 'CA' },
            body: { site_id: siteId, event_type: 'page_view', path: '/blog', referrer: '' }
        },
        // Referral / Desktop / US / PageView
        {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'x-vercel-ip-country': 'US' },
            body: { site_id: siteId, event_type: 'page_view', path: '/', referrer: 'https://indiehackers.com' }
        },
    ];

    console.log(`🚀 Sending ${scenarios.length} test events to ${API_ENDPOINT}...`);

    for (const s of scenarios) {
        try {
            const res = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...s.headers },
                body: JSON.stringify(s.body)
            });
            if (res.ok) console.log(`  ✅ Sent ${s.body.event_type} (${s.body.referrer || 'Direct'})`);
            else console.log(`  ❌ Failed ${res.status} ${await res.text()}`);
        } catch (e: any) {
            console.error(`  ❌ Network Error: ${e.message}`);
        }
    }

    console.log('⏳ Waiting 2s for propagation...');
    await new Promise(r => setTimeout(r, 2000));

    // 3. Verify in DB
    console.log('📊 Verifying Database Records...');

    // Check Total Count
    const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('site_id', siteId);

    console.log(`  -> Total Events in DB: ${count}`);

    // Check Sources
    const { data: twitterEvents } = await supabase.from('analytics_events').select('source').eq('site_id', siteId).eq('source', 'twitter');
    console.log(`  -> Twitter Events: ${twitterEvents?.length}`);

    // Check Countries
    const { data: usEvents } = await supabase.from('analytics_events').select('country').eq('site_id', siteId).eq('country', 'US');
    console.log(`  -> US Events: ${usEvents?.length}`);

    // Check Clicks
    const { data: clickEvents } = await supabase.from('analytics_events').select('*').eq('site_id', siteId).eq('event_type', 'click');
    console.log(`  -> Click Events: ${clickEvents?.length}`);

    console.log('✅ Verification Complete. Check Dashboard for visual confirmation.');
}

main().catch(console.error);
