import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFixBundle } from '@/lib/geo/fixGen';

export const maxDuration = 60;

function isFresh(iso?: string, maxAgeMs: number = 1000 * 60 * 60 * 24 * 7) {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && Date.now() - t < maxAgeMs;
}

export async function POST(req: NextRequest) {
  try {
    const { geo_issue_id } = await req.json();
    if (!geo_issue_id) {
      return NextResponse.json({ error: 'geo_issue_id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: issue, error } = await supabase
      .from('geo_issues')
      .select('id, geo_scan_id, page_url, code, category, severity, title, description, fix_payload')
      .eq('id', geo_issue_id)
      .single();

    if (error || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const existing = issue.fix_payload as any;
    if (existing?.generatedAt && existing?.artifact?.content && isFresh(existing.generatedAt)) {
      return NextResponse.json({ ...existing, cached: true });
    }

    const { bundle } = await generateFixBundle({
      issue: {
        code: issue.code,
        category: issue.category,
        severity: issue.severity,
        title: issue.title,
        description: issue.description || undefined,
      },
      pageUrl: issue.page_url,
    });

    const payload = {
      ...existing,
      ...bundle,
    };

    await supabase.from('geo_issues').update({ fix_payload: payload }).eq('id', geo_issue_id);

    return NextResponse.json({ ...payload, cached: false });
  } catch (e) {
    console.error('generate-fix error', e);
    return NextResponse.json({ error: 'Failed to generate fix' }, { status: 500 });
  }
}

