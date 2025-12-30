
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const getEnv = (key: string) => {
    const match = envLocal.match(new RegExp(`${key}=(.*)`));
    return match ? match[1] : '';
}

const supabase = createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

async function main() {
    // 3:55 PM today (User Local Time -07:00)
    // 2025-12-30T15:55:00-07:00
    const cutoffTimestamp = '2025-12-30T15:55:00-07:00';

    console.log(`🧹 Cleaning up analytics events before ${cutoffTimestamp}...`);

    const { count, error } = await supabase
        .from('analytics_events')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffTimestamp);

    if (error) {
        console.error('❌ Error deleting events:', error);
        return;
    }

    console.log(`✅ Successfully deleted ${count} events.`);
}

main();
