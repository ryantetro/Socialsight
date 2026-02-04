"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GeoReport from '@/components/GeoReport';
import type { GeoScanResult, GeoIssue } from '@/types';

export default function GeoReportPage() {
  const params = useParams();
  const scanId = params.scanId as string;
  const [data, setData] = useState<GeoScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!scanId) {
      setLoading(false);
      setError('Missing scan ID');
      return;
    }
    const fetchReport = async () => {
      try {
        const supabase = createClient();
        const { data: scan, error: scanErr } = await supabase
          .from('geo_scans')
          .select('id, url, overall_score, crawl_score, structure_score, entity_score, schema_score, reference_score')
          .eq('id', scanId)
          .single();
        if (scanErr || !scan) {
          setError('Report not found');
          return;
        }
        const { data: issues, error: issuesErr } = await supabase
          .from('geo_issues')
          .select('id, page_url, category, code, severity, title, description, fix_type, fix_payload')
          .eq('geo_scan_id', scanId);
        if (issuesErr) {
          setError('Failed to load issues');
          return;
        }
        const { data: pages } = await supabase
          .from('geo_pages')
          .select('url, page_score, issues_count')
          .eq('geo_scan_id', scanId);
        setData({
          scanId: scan.id,
          overall_score: scan.overall_score ?? 0,
          crawl_score: scan.crawl_score ?? 0,
          structure_score: scan.structure_score ?? 0,
          entity_score: scan.entity_score ?? 0,
          schema_score: scan.schema_score ?? 0,
          reference_score: scan.reference_score ?? 0,
          issuesCount: issues?.length ?? 0,
          issues: (issues ?? []) as GeoIssue[],
          pages: (pages ?? []) as any
        });
      } catch (e) {
        console.error('Fetch GEO report error', e);
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [scanId]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16 flex justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-red-600 font-medium">{error || 'Report not found'}</p>
        <a href="/geo/history" className="mt-4 inline-block text-blue-600 font-bold hover:underline">Back to History</a>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <GeoReport
        data={data}
        appliedIds={appliedIds}
        onMarkApplied={async (id) => {
          try {
            await fetch('/api/geo/fixes/applied', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ geo_issue_id: id })
            });
            setAppliedIds((s) => new Set(s).add(id));
          } catch { /* no-op */ }
        }}
      />
    </main>
  );
}
