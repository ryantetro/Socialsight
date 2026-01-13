"use client";

import { useEffect, useState } from 'react';
import { Share2, Calendar, ArrowRight, ExternalLink, Search, LayoutDashboard, Zap, Scale, Activity, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InspectionResult } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import UserNav from '@/components/UserNav';
import Link from 'next/link';

interface ScanHistoryItem {
    id: string;
    url: string;
    result: InspectionResult;
    created_at: string;
}

export default function DashboardPage() {
    const { user, profile, loading: authLoading, isPaid } = useProfile();
    const [scans, setScans] = useState<ScanHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchScans = async () => {
            if (!user) return;

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

        if (!authLoading) {
            if (!user) {
                window.location.href = '/login';
            } else {
                fetchScans();
            }
        }
    }, [user, authLoading]);

    if (authLoading || (loading && user)) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) return null; // Redirecting...

    return (
        <main className="min-h-screen bg-[#fafafa]">
            {/* Header */}
            {/* Header */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">

                    {/* SECTION 1: Logo */}
                    <div className="flex items-center gap-4 min-w-0 shrink-0 z-20 md:flex-1">
                        <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter cursor-pointer group shrink-0">
                            <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20 z-10 relative">
                                <span className="text-lg font-black italic">P</span>
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="hidden lg:inline whitespace-nowrap">Preview<span className="text-blue-600">Perfect</span></span>
                            </div>
                        </Link>
                    </div>

                    {/* SECTION 2: Center Nav */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex justify-center z-30 w-full pointer-events-none">
                        <div className="pointer-events-auto">
                            <div className="hidden md:flex bg-white/50 backdrop-blur-sm border border-slate-200/50 p-1.5 rounded-2xl shadow-sm items-center gap-1">
                                {[
                                    { id: 'audit', icon: LayoutDashboard, label: 'Audit' },
                                    { id: 'fix', icon: Zap, label: 'Fix Mode', fill: true },
                                    { id: 'compare', icon: Scale, label: 'Compare' },
                                    { id: 'monitor', icon: Activity, label: 'Monitor' },
                                    { id: 'analytics', icon: PieChart, label: 'Analytics' }
                                ].map((tab) => (
                                    <Link
                                        key={tab.id}
                                        href={`/?view=${tab.id}`}
                                        className="px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                    >
                                        <tab.icon size={14} className={cn(tab.fill && "text-blue-600")} />
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: Right Actions */}
                    <div className="flex items-center justify-end gap-3 shrink-0 z-20 flex-1">
                        {!isPaid && (
                            <Link href="/#pricing" className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm hover:bg-blue-700 transition-all">
                                Upgrade Plan
                            </Link>
                        )}
                        <UserNav user={user} tier={profile?.tier || 'free'} isPaid={isPaid} />
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Scan History</h1>
                        <p className="text-slate-500 font-medium mt-2">Manage and revisit your past audits.</p>
                    </div>
                    <Link
                        href="/"
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                    >
                        <Search size={16} /> New Scan
                    </Link>
                </div>

                {scans.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Search size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">No scans found</h3>
                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">You haven't performed any scans yet. Analyze your first URL to see it here.</p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                        >
                            Start First Scan
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scans.map((scan) => (
                            <Link
                                key={scan.id}
                                href={`/?scanId=${scan.id}`}
                                className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col"
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
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
