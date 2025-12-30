
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
    console.log('📊 Fetching Last 20 Events...');

    // Removing 'params' from select
    const { data: events, error } = await supabase
        .from('analytics_events')
        .select('event_type, path, source, created_at, user_agent')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (events.length === 0) {
        console.log('No events found.');
        return;
    }

    console.table(events.map(e => ({
        Type: e.event_type,
        Path: e.path,
        Date: new Date(e.created_at).toLocaleTimeString(),
        UA: e.user_agent ? (e.user_agent.includes('iPhone') ? 'iPhone' : 'Other') : 'Null',
        Source: e.source,
    })));
}

main();
