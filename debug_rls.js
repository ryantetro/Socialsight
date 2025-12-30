const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load Env
const envPath = path.resolve(__dirname, '.env.local');
const envConfig = {};
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            envConfig[key] = value;
        }
    });
}

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPolicies() {
    console.log('🛡 Checking RLS Policies...');

    // We can't query pg_policies easily via JS client without a stored procedure, 
    // but we can try to Insert/Select as "Anon" to see what happens.

    const anonClient = createClient(supabaseUrl, envConfig['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

    const { data: site } = await supabase.from('analytics_sites').select('id').ilike('domain', '%socialsight.dev%').single();
    if (!site) { console.error('Site not found'); return; }

    console.log(`\nTesting Read Access as ANON (Not Logged In) for Site: ${site.id}...`);
    const { data: anonData, error: anonError } = await anonClient
        .from('analytics_events')
        .select('*')
        .eq('site_id', site.id)
        .limit(1);

    console.log(`- Data returned: ${anonData ? anonData.length : 0} rows`);
    if (anonError) console.log(`- Error: ${anonError.message} (Expected if RLS works)`);

    console.log('\n(Note: Dashboard users are Authenticated, not Anon. To test Authenticated RLS, we need to sign in, which is harder in a script without credentials.)');
    console.log('However, if valid RLS exists, it should probably be:');
    console.log('"Allow authenticated read access" -> USING (true) or Checking ownership.');

    // Let's just create a migration to FORCE the correct policy, 
    // because inspecting it via client is tricky without SQL access.
}

checkPolicies();
