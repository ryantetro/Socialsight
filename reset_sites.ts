
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

async function resetSites() {
    console.log('--- RESETTING DASHBOARD: Deleting all sites ---');

    // Delete all records from analytics_sites
    const { data, error } = await supabase
        .from('analytics_sites')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

    if (error) {
        console.error('Error deleting sites:', error.message);
        return;
    }

    console.log('✅ SUCCESS: All sites have been removed from the database.');
    console.log('You can now refresh the dashboard and start fresh.');
}

resetSites();
