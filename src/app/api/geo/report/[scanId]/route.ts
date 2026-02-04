import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { GeoScanResult, GeoIssue } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const { scanId } = await params;
  if (!scanId) return NextResponse.json({ error: 'Missing scan ID' }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: scan, error: scanErr } = await supabase
      .from('geo_scans')
      .select('id, url, overall_score, crawl_score, structure_score, entity_score, schema_score, reference_score')
      .eq('id', scanId)
      .single();

    if (scanErr || !scan) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { data: issues, error: issuesErr } = await supabase
      .from('geo_issues')
      .select('id, page_url, category, code, severity, title, description, fix_type, fix_payload')
      .eq('geo_scan_id', scanId);

    if (issuesErr) {
      return NextResponse.json({ error: 'Failed to load issues' }, { status: 500 });
    }

    const { data: pages } = await supabase
      .from('geo_pages')
      .select('url, page_score, issues_count')
      .eq('geo_scan_id', scanId);

    const data: GeoScanResult = {
      scanId: scan.id,
      overall_score: scan.overall_score ?? 0,
      crawl_score: scan.crawl_score ?? 0,
      structure_score: scan.structure_score ?? 0,
      entity_score: scan.entity_score ?? 0,
      schema_score: scan.schema_score ?? 0,
      reference_score: scan.reference_score ?? 0,
      issuesCount: issues?.length ?? 0,
      issues: (issues ?? []) as GeoIssue[],
      pages: (pages ?? []) as GeoScanResult['pages'],
    };

    return NextResponse.json(data);
  } catch (e) {
    console.error('GET /api/geo/report/[scanId] error', e);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
