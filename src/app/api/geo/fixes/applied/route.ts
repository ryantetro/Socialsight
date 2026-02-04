import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { geo_issue_id } = await req.json();
    if (!geo_issue_id) {
      return NextResponse.json({ error: 'geo_issue_id is required' }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { error } = await supabase.from('geo_fixes_applied').insert({
      geo_issue_id,
      user_id: user.id
    });
    if (error) {
      console.error('geo_fixes_applied insert error', error);
      return NextResponse.json({ error: 'Failed to record' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('geo fixes applied error', err);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}
