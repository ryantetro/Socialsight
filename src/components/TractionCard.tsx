
import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, ExternalLink, Activity, Calendar, Shield } from 'lucide-react';

interface TractionCardProps {
    date: string; // e.g., "Jan 03" or "Day 4"
    impressions: number;
    impressionsDelta: number;
    clicks: number;
    clicksDelta: number;
    ctr: number;
    ctrDelta: number;
    topSource?: { name: string; percent: number };
    chartData: { name: string; value: number }[]; // 7 days of impressions
    streak?: number;
    mode?: 'optimistic' | 'experimental' | 'honest';
}

export const TractionCard = ({
    date,
    impressions,
    impressionsDelta,
    clicks,
    clicksDelta,
    ctr,
    ctrDelta,
    topSource,
    chartData,
    streak = 1,
    mode = 'optimistic'
}: TractionCardProps) => {

    const isPositive = (val: number) => val >= 0;

    const getInsightHeader = () => {
        if (mode === 'honest') {
            if (impressionsDelta === 0 && clicksDelta === 0) return "No growth today. Still shipping.";
            if (impressionsDelta < 0) return "Traffic down slightly. We keep building.";
            return `Day ${streak} of building in public.`;
        }
        if (mode === 'experimental') {
            if (ctrDelta > 0) return `Optimized previews. CTR up +${ctrDelta}%.`;
            if (clicksDelta > 0) return `Experimenting with new sources. Clicks up.`;
            return "Testing new meta tags. Gathering data.";
        }
        // Optimistic (Default)
        if (ctrDelta >= 1) return `CTR surged +${ctrDelta}% today!`;
        if (impressionsDelta > 100) return `Reach is growing. +${impressionsDelta} new eyes.`;
        if (clicksDelta > 0) return `Traffic flowing. +${clicksDelta} clicks vs yesterday.`;
        return `Day ${streak}: Consistency is the only algorithm.`;
    };

    const header = getInsightHeader();

    // Helper for Delta Styles
    const getDeltaColor = (val: number, inverse = false) => {
        if (val === 0) return 'text-slate-500';
        if (val > 0) return inverse ? 'text-red-400' : 'text-green-400';
        return inverse ? 'text-green-400' : 'text-red-400'; // Negative is usually bad, unless inverse logic implies otherwise
    };

    return (
        <div
            id="traction-card"
            className="w-[600px] h-[337px] bg-[#0B1121] text-white p-8 relative overflow-hidden flex flex-col justify-between font-sans shadow-2xl rounded-none"
            style={{ borderRadius: '0px' }}
        >
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -ml-40 -mb-40"></div>

            {/* Insight Header (The Hook) */}
            <div className="z-10 relative mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-0.5 rounded-full bg-slate-800/80 text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-slate-700/50">
                        Day {streak} Update
                    </div>
                    <span className="text-slate-500 text-xs font-semibold">•</span>
                    <span className="text-slate-400 text-xs font-semibold uppercase">{date}</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">
                    {header}
                </h1>
            </div>

            {/* Core Metrics Grid - Flipped Hierarchy */}
            <div className="grid grid-cols-3 gap-4 z-10 relative">
                {/* Impressions */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
                    <div className={`text-xl font-bold mb-1 flex items-center gap-1 ${getDeltaColor(impressionsDelta)}`}>
                        {impressionsDelta > 0 ? '+' : ''}{impressionsDelta}
                        {impressionsDelta !== 0 && (impressionsDelta > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Impressions</div>
                    <div className="text-sm text-slate-500 mt-1 font-mono">{impressions.toLocaleString()} total</div>
                </div>

                {/* CTR */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
                    <div className={`text-xl font-bold mb-1 flex items-center gap-1 ${getDeltaColor(ctrDelta)}`}>
                        {ctrDelta > 0 ? '+' : ''}{ctrDelta}pp
                        {ctrDelta !== 0 && (ctrDelta > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Click Rate</div>
                    <div className="text-sm text-slate-500 mt-1 font-mono">{ctr}% avg</div>
                </div>

                {/* Clicks */}
                <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-sm">
                    <div className={`text-xl font-bold mb-1 flex items-center gap-1 ${getDeltaColor(clicksDelta)}`}>
                        {clicksDelta > 0 ? '+' : ''}{clicksDelta}
                        {clicksDelta !== 0 && (clicksDelta > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />)}
                    </div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Clicks</div>
                    <div className="text-sm text-slate-500 mt-1 font-mono">{clicks.toLocaleString()} total</div>
                </div>
            </div>

            {/* Footer / Context Row */}
            <div className="relative h-12 w-full z-10 flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Activity size={10} />
                        </div>
                        {topSource ? `Top source: ${topSource.name} (${topSource.percent}%)` : 'Direct Traffic'}
                    </div>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <div className="flex items-center gap-1.5">
                        <Shield size={10} />
                        SocialSight
                    </div>
                </div>

                {/* Mini Sparkline (Subtle) */}
                <div className="w-32 h-8 opacity-50">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#chartColor)"
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
