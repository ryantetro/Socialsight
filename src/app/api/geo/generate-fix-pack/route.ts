import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateFixBundle } from '@/lib/geo/fixGen';

export const maxDuration = 60;

function severityWeight(sev: string) {
  return sev === 'high' ? 3 : sev === 'med' ? 2 : 1;
}

export async function POST(req: NextRequest) {
  try {
    const { geo_scan_id, scope, limit } = await req.json();
    if (!geo_scan_id) return NextResponse.json({ error: 'geo_scan_id is required' }, { status: 400 });
    const max = Math.min(25, Math.max(1, Number(limit) || (scope === 'priority' ? 10 : 20)));
    const effectiveScope = scope === 'all' ? 'all' : 'priority';

    const supabase = await createClient();
    const { data: issues, error } = await supabase
      .from('geo_issues')
      .select('id, page_url, code, category, severity, title, description, fix_payload')
      .eq('geo_scan_id', geo_scan_id);

    if (error || !issues) {
      return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 });
    }

    const sorted = issues
      .slice()
      .sort((a: any, b: any) => severityWeight(b.severity) - severityWeight(a.severity));
    const picked = (effectiveScope === 'all' ? sorted : sorted).slice(0, max);

    const artifacts: any[] = [];
    const prompts: string[] = [];
    const confidences: string[] = [];

    for (const issue of picked as any[]) {
      const existing = issue.fix_payload as any;
      let bundle = existing?.artifact?.content && existing?.idePrompt ? existing : null;
      if (!bundle) {
        const gen = await generateFixBundle({
          issue: {
            code: issue.code,
            category: issue.category,
            severity: issue.severity,
            title: issue.title,
            description: issue.description || undefined,
          },
          pageUrl: issue.page_url,
        });
        bundle = gen.bundle;
        await supabase.from('geo_issues').update({ fix_payload: { ...(existing || {}), ...bundle } }).eq('id', issue.id);
        // Space out Gemini calls to avoid 429 rate limits
        await new Promise((r) => setTimeout(r, 3000));
      }

      artifacts.push({ geo_issue_id: issue.id, ...bundle.artifact });
      prompts.push(`- (${issue.code}) ${bundle.idePrompt}`.trim());
      confidences.push(bundle.confidence || 'medium');
    }

    const combinedIdePrompt = [
      `I am working in a web project.`,
      `Apply the following fixes carefully. Keep changes minimal. Do not modify anything else.`,
      ``,
      ...prompts,
    ].join('\n');

    const confidenceSummary =
      confidences.includes('low') ? 'low' : confidences.includes('medium') ? 'medium' : 'high';

    return NextResponse.json({
      scope: effectiveScope,
      count: artifacts.length,
      combinedIdePrompt,
      artifacts,
      confidenceSummary,
    });
  } catch (e) {
    console.error('generate-fix-pack error', e);
    return NextResponse.json({ error: 'Failed to generate fix pack' }, { status: 500 });
  }
}

