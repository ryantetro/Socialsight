
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSite() {
    console.log('--- Checking site: pp_c402949b ---');
    const { data, error } = await supabase
        .from('analytics_sites')
        .select('id, domain, is_verified, last_verified_at')
        .eq('id', 'pp_c402949b')
        .single();

    if (error) {
        console.error('Error fetching site:', error.message);
        return;
    }

    console.log('Site Data:', data);

    if (data.is_verified) {
        console.log('✅ SUCCESS: Site is verified in the database.');
    } else {
        console.log('❌ FAILURE: Site is still unverified.');
    }
}

checkSite();
