
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const update = searchParams.get('update');

    if (!email) {
        return NextResponse.json({ error: 'Missing email param' }, { status: 400 });
    }

    // 1. Get User ID by looking up profile (assuming email is synced or we search auth users - but admin client can query profiles directly if we have email in there)
    // Actually, profiles table has email.

    let { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        return NextResponse.json({ error: 'Profile not found or DB error', details: error }, { status: 404 });
    }

    // 2. Update if requested
    if (update === 'ltd') {
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ tier: 'ltd' })
            .eq('id', profile.id);

        if (updateError) {
            return NextResponse.json({ error: 'Update failed', details: updateError }, { status: 500 });
        }

        // Refetch
        const { data: updatedProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', profile.id)
            .single();

        return NextResponse.json({ message: 'Updated successfully', profile: updatedProfile });
    }

    return NextResponse.json({ profile });
}
