import React from 'react';
import { cn } from '@/lib/utils';
import { UserTier } from '@/hooks/useProfile';

interface PlanPillProps {
    plan: UserTier | string | undefined;
}

export default function PlanPill({ plan }: PlanPillProps) {
    const tier = (plan || 'free').toLowerCase();

    const styles = {
        free: "bg-slate-800 text-slate-400 border-slate-700",
        pro: "bg-indigo-500/10 text-indigo-400 border-indigo-500/50 shadow-[0_0_15px_-3px_rgba(99,102,241,0.4)]",
        founder: "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]",
        ltd: "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.4)]",
        growth: "bg-purple-500/10 text-purple-400 border-purple-500/50 shadow-[0_0_15px_-3px_rgba(168,85,247,0.4)]",
        agency: "bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-[0_0_15px_-3px_rgba(245,158,11,0.4)]",
    };

    const activeStyle = (styles as any)[tier] || styles.free;

    const label = tier === 'ltd' ? 'Founder Plan' : `${tier} Plan`;

    return (
        <div className={cn(
            "px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            activeStyle
        )}>
            {label}
        </div>
    );
}
