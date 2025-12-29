
import { createClient } from '@supabase/supabase-js';

// ADMIN Client - Bypasses RLS (Row Level Security)
// usage: only on the server, for webhooks or admin tasks
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
