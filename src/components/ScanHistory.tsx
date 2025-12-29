"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Share2, Calendar, ArrowRight, ExternalLink, Search, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InspectionResult } from '@/types';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

interface ScanHistoryItem {
    id: string;
    url: string;
    result: InspectionResult;
    created_at: string;
}

interface ScanHistoryProps {
    user: User | null;
    onSelectScan: (result: InspectionResult) => void;
}

export default function ScanHistory({ user, onSelectScan }: ScanHistoryProps) {
    const [scans, setScans] = useState<ScanHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScans = async () => {
            if (!user) {
                setLoading(false);
                return;
            };

            try {
                const supabase = createClient();
                const query = supabase
                    .from('scans')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Scans timeout')), 5000));
                const { data, error } = await Promise.race([query, timeout]) as any;

                if (!error && data) {
                    setScans(data as ScanHistoryItem[]);
                }
            } catch (e) {
                console.error("Fetch scans error", e);
            } finally {
                setLoading(false);
            }
        };

        fetchScans();
    }, [user]);

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="py-20 text-center">
                <h3 className="text-xl font-bold text-slate-900">Please Sign In</h3>
                <p className="text-slate-500 mt-2">Log in to view your scan history.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Scan History</h1>
                    <p className="text-slate-500 font-medium mt-2">Manage and revisit your past audits.</p>
                </div>
            </div>

            {scans.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <Search size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">No scans found</h3>
                    <p className="text-slate-500 mb-8 max-w-sm mx-auto">You haven't performed any scans yet. Analyze your first URL to see it here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scans.map((scan) => (
                        <div
                            key={scan.id}
                            onClick={() => onSelectScan(scan.result)}
                            className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col cursor-pointer"
                        >
                            {/* Preview Image Header */}
                            <div className="aspect-[1.91/1] bg-slate-100 relative border-b border-slate-100">
                                {scan.result.metadata.ogImage ? (
                                    <img
                                        src={scan.result.metadata.ogImage}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium bg-slate-50">
                                        No Image
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                    Score:
                                    <span className={cn(
                                        scan.result.score >= 90 ? "text-green-600" :
                                            scan.result.score >= 50 ? "text-yellow-600" : "text-red-600"
                                    )}>
                                        {scan.result.score}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-900 line-clamp-1 mb-1" title={scan.result.metadata.title}>
                                    {scan.result.metadata.title || "Untitled Page"}
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
                    ))}
                </div>
            )}
        </div>
    );
}
