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
            envConfig[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        }
    });
}

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envConfig['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Could not find Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('🔍 Checking database for "socialsight.dev"...');

    const { data, error } = await supabase
        .from('analytics_sites')
        .select('*')
        .ilike('domain', '%socialsight.dev%')
        .limit(1)
        .single();

    if (error) {
        console.error('❌ Database Error:', error.message);
        return;
    }

    if (!data) {
        console.error('❌ Error: No site found for "socialsight.dev"!');
        console.log('   The dynamic layout will fail to find an ID.');
    } else {
        console.log('✅ Success! Site found.');
        console.log(`   Internal ID: ${data.id}`);
        console.log(`   Domain:      ${data.domain}`);
        console.log(`   Site Title:  ${data.site_title}`);
        console.log(`   Verified:    ${data.is_verified}`);
        console.log('---------------------------------------------------');
        console.log('ℹ️  The layout.tsx will dynamically pull ID:', data.id);
        console.log('ℹ️  Verify that your pixel script tag uses this ID.');
    }
}

verify();
