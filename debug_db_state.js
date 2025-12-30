const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load Env
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
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']; // Use Admin Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugState() {
    console.log('🔍 Debugging DB State...');

    // 1. Check Site
    const { data: site, error: siteError } = await supabase
        .from('analytics_sites')
        .select('*')
        .ilike('domain', '%socialsight.dev%')
        .single();

    if (site) {
        console.log('\n✅ Site Found in DB:');
        console.log(`   ID: ${site.id}`);
        console.log(`   Domain: ${site.domain}`);
        console.log(`   Verified: ${site.is_verified}`);
    } else {
        console.error('\n❌ Site NOT found in DB:', siteError?.message);
    }

    // 2. Check Events for this Site
    if (site) {
        const { data: events, error: eventsError } = await supabase
            .from('analytics_events')
            .select('*')
            .eq('site_id', site.id)
            .order('created_at', { ascending: false })
            .limit(10);

        console.log(`\n📊 Recent Events for Site ${site.id}:`);
        if (events && events.length > 0) {
            events.forEach(e => {
                console.log(`   - [${e.created_at}] Type: ${e.event_type} | Source: ${e.source} | Bot: ${e.is_bot} | Path: ${e.path}`);
            });
        } else {
            console.log('   (No events found)');
        }

        // 3. Count total events
        const { count } = await supabase
            .from('analytics_events')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', site.id);

        console.log(`\n   Total Events Count: ${count}`);
    }
}

debugState();
