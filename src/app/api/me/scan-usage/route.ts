import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    const todayUtc = new Date().toISOString().slice(0, 10);
    const { count, error } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${todayUtc}T00:00:00.000Z`);

    if (error) {
      console.error('scan-usage error', error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (e) {
    console.error('scan-usage error', e);
    return NextResponse.json({ count: 0 });
  }
}
