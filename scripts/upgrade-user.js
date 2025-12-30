
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '4e98cfde-03dd-4cfc-81cc-7c0e7306a7ae';
const targetTier = 'agency';

async function upgradeUser() {
    console.log(`Starting upgrade for user ${userId} to ${targetTier}...`);

    const { data: profile, error } = await supabase
        .from('profiles')
        .update({ tier: targetTier, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error upgrading user:', error);
        return;
    }

    console.log('Successfully upgraded user profile:', profile);
}

upgradeUser();
