"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface GeoScanRow {
  id: string;
  url: string;
  overall_score: number;
  created_at: string;
}

export default function GeoHistoryPage() {
  const [scans, setScans] = useState<GeoScanRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('geo_scans')
          .select('id, url, overall_score, created_at')
          .order('created_at', { ascending: false })
          .limit(50);
        if (!error && data) setScans(data as GeoScanRow[]);
      } catch (e) {
        console.error('Fetch GEO scans error', e);
      } finally {
        setLoading(false);
      }
    };
    fetchScans();
  }, []);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16 flex justify-center">
        <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-black text-slate-900 mb-2">GEO History</h1>
      <p className="text-slate-500 font-medium mb-8">Past GEO scans. Open a report to see scores and issues.</p>
      {scans.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <p className="text-slate-500 font-medium mb-4">No GEO scans yet.</p>
          <Link href="/geo/scan" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
            Run first scan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {scans.map((scan) => (
            <Link
              key={scan.id}
              href={`/geo/report/${scan.id}`}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{scan.url}</p>
                <div className="flex items-center gap-2 text-slate-400 text-sm mt-0.5">
                  <Calendar size={14} />
                  {new Date(scan.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  'font-black text-lg',
                  scan.overall_score >= 70 ? 'text-green-600' : scan.overall_score >= 40 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {scan.overall_score}
                </span>
                <span className="text-slate-400">/100</span>
                <ArrowRight size={18} className="text-slate-400 group-hover:text-blue-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
