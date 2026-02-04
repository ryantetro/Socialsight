"use client";

import { useEffect, useState, useCallback } from 'react';
import { Calendar, ArrowRight, Globe, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface GeoScanRow {
  id: string;
  url: string;
  overall_score: number;
  created_at: string;
  og_image?: string | null;
}

interface GeoScanHistoryProps {
  onSelectScan?: (scanId: string) => void;
}

export default function GeoScanHistory({ onSelectScan }: GeoScanHistoryProps) {
  const [scans, setScans] = useState<GeoScanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrored, setImageErrored] = useState<Record<string, boolean>>({});
  const markImageErrored = useCallback((id: string) => {
    setImageErrored((s) => ({ ...s, [id]: true }));
  }, []);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('geo_scans')
          .select('id, url, overall_score, created_at, og_image')
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
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
          <Calendar size={32} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">No GEO scans yet</h3>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Run a GEO scan from the main scan flow to see AI-readability reports here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scans.map((scan) => {
        const displayUrl = scan.url.replace(/^https?:\/\//, '');
        const title = (() => {
          try {
            return new URL(scan.url).hostname.replace('www.', '');
          } catch {
            return displayUrl.slice(0, 40);
          }
        })();
        return (
          <div
            key={scan.id}
            onClick={() => onSelectScan?.(scan.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectScan?.(scan.id)}
            className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col cursor-pointer"
          >
            {/* Preview image area - OG image when available */}
            <div className="aspect-[1.91/1] bg-slate-100 relative border-b border-slate-100 flex items-center justify-center overflow-hidden">
              {scan.og_image && !imageErrored[scan.id] ? (
                <img
                  src={scan.og_image}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => markImageErrored(scan.id)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                  <Globe size={48} className="text-slate-300" />
                </div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                Score:
                <span className={cn(
                  scan.overall_score >= 70 ? 'text-green-600' :
                    scan.overall_score >= 40 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {scan.overall_score}
                </span>
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              <h3 className="font-bold text-slate-900 line-clamp-1 mb-1" title={title}>
                {title}
              </h3>
              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium mb-4 truncate">
                <ExternalLink size={12} />
                {scan.url}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-300" />
                  {new Date(scan.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                  View Report <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
