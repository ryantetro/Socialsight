import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { tier } = await req.json();
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Update the user's profile
        const { error } = await supabase
            .from('profiles')
            .update({ tier })
            .eq('id', user.id);

        if (error) {
            console.error('Error updating tier:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Debug API error:', error);
        return NextResponse.json({ error: 'Internal User Error' }, { status: 500 });
    }
}
