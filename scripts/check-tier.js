
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserTier() {
    // Fetch the most recent profile updated
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('Recent Profiles:', profiles);
}

checkUserTier();
