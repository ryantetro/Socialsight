"use client";

import { AlertCircle, CheckCircle2, Info, ArrowRight, Zap, TrendingUp, Users } from 'lucide-react';
import { AuditIssue } from '@/types';
import { cn } from '@/lib/utils';

interface ScoreAuditProps {
    score: number;
    issues: AuditIssue[];
    stats?: {
        totalScans: number;
        percentile: number;
    };
}

export default function ScoreAudit({ score, issues, stats }: ScoreAuditProps) {
    const getScoreColor = (s: number) => {
        if (s >= 90) return 'text-green-500 stroke-green-500';
        if (s >= 70) return 'text-amber-500 stroke-amber-500';
        return 'text-red-500 stroke-red-500';
    };

    const getScoreLabel = (s: number) => {
        if (s >= 90) return 'Excellent';
        if (s >= 70) return 'Good';
        return 'Needs Attention';
    };

    const handleCheckout = async () => {
        const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD;
        if (!priceId) return;
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId })
            });

            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }

            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.url) window.location.href = data.url;
        } catch (e) {
            console.error("Checkout Failed", e);
        }
    };

    const strokeDasharray = 2 * Math.PI * 45;
    const strokeDashoffset = strokeDasharray - (strokeDasharray * score) / 100;

    return (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden relative group">
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 opacity-20" />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Audit Score</h3>
                    <p className="text-slate-500 text-sm font-medium">How &ldquo;share-ready&rdquo; is your URL?</p>
                </div>
                {stats && (
                    <div className="bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <Users size={12} className="text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                            {stats.totalScans.toLocaleString()} Global Scans
                        </span>
                    </div>
                )}
            </div>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center py-10 relative">
                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 100 100">
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="transparent"
                        stroke="#f1f5f9"
                        strokeWidth="8"
                    />
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="transparent"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        strokeWidth="8"
                        className={cn("transition-all duration-1000 ease-out", getScoreColor(score).split(' ')[1])}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                    <span className={cn("text-5xl font-black tracking-tight", getScoreColor(score).split(' ')[0])}>
                        {score}
                    </span>
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">out of 100</span>
                </div>
            </div>

            <div className="text-center mb-10">
                <div className={cn("text-lg font-black uppercase tracking-widest", getScoreColor(score).split(' ')[0])}>
                    {getScoreLabel(score)}
                </div>
                {stats ? (
                    <p className="text-slate-400 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                        <TrendingUp size={12} className="text-blue-500" />
                        Better than <span className="text-blue-600 font-black">{stats.percentile}%</span> of analyzed websites
                    </p>
                ) : (
                    <p className="text-slate-400 text-xs font-bold mt-1">Analyzing competitive benchmarks...</p>
                )}
            </div>

            {/* Actionable Issues */}
            <div className="space-y-4 flex-1">
                {issues.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100">
                        <CheckCircle2 className="text-green-500 w-5 h-5 shrink-0" />
                        <span className="text-sm font-bold text-green-700">Everything looks perfect!</span>
                    </div>
                ) : (
                    issues.map((issue, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "flex items-start gap-4 p-4 rounded-2xl border group/item transition-all hover:scale-[1.02]",
                                issue.priority === 'high' ? "bg-red-50/50 border-red-100" : "bg-amber-50/50 border-amber-100"
                            )}
                        >
                            <div className={cn(
                                "p-2 rounded-xl shrink-0 mt-0.5",
                                issue.priority === 'high' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                            )}>
                                {issue.priority === 'high' ? <AlertCircle size={16} /> : <Info size={16} />}
                            </div>
                            <div className="space-y-1">
                                <div className={cn(
                                    "text-xs font-black uppercase tracking-wider",
                                    issue.priority === 'high' ? "text-red-500" : "text-amber-600"
                                )}>
                                    {issue.priority === 'high' ? 'High Impact' : 'Optimization'}
                                </div>
                                <div className="text-sm font-bold text-slate-800 leading-tight">
                                    {issue.message}
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    {issue.message.toLowerCase().includes('title')
                                        ? "Search engines and social cards will truncate this, killing your CTR."
                                        : "Missing metadata makes your link look untrustworthy and lowers engagement."}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* High-Value CTA */}
            <div className="mt-8 pt-8 border-t border-slate-100">
                <button
                    onClick={handleCheckout}
                    className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-200 group/btn overflow-hidden relative">
                    <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                    <Zap className="w-4 h-4 relative z-10 fill-amber-400 text-amber-400 group-hover/btn:scale-110 transition-transform" />
                    <span className="relative z-10">Fix All Issues Instantly ($149)</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
                    One-time payment • Lifetime impact
                </p>
            </div>
        </div>
    );
}
