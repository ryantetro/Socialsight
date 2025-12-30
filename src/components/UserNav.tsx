"use client";

import { User } from '@supabase/supabase-js';
import { UserTier } from '@/hooks/useProfile';
import { LogOut, ChevronDown, User as UserIcon, LayoutDashboard, Zap, FileText, Activity, PieChart, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import PlanPill from './PlanPill';
import { createClient } from '@/lib/supabase/client';

interface UserNavProps {
    user: User;
    tier: UserTier;
    isPaid: boolean;
    onViewReport?: () => void;
    onViewHistory?: () => void;
    onViewDashboard?: () => void;
    onViewAnalytics?: () => void;
    isLoading?: boolean;
}

export default function UserNav({ user, tier, isPaid, onViewReport, onViewHistory, onViewDashboard, onViewAnalytics, isLoading }: UserNavProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.reload();
    };

    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
    const email = user.email;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                onBlur={() => setTimeout(() => setIsOpen(false), 200)}
                className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                    {name.charAt(0)}
                </div>
                <div className="flex flex-col items-start text-left">
                    <span className="text-xs font-bold text-slate-700 leading-none">{name}</span>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight">
                        {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
                    </span>
                </div>
                <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>

            {/* Dropdown */}
            <div className={cn(
                "absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 transition-all origin-top-right z-50",
                isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
            )}>
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800">{email}</p>
                    <div className="mt-1 flex justify-start">
                        <PlanPill plan={tier} />
                    </div>
                </div>

                <div className="px-3 pt-2 pb-1 space-y-1">
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            if (onViewDashboard) {
                                onViewDashboard();
                            } else {
                                window.location.href = '/?view=monitor';
                            }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <Activity size={14} />
                        Monitor
                    </button>
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            if (onViewAnalytics) {
                                onViewAnalytics();
                            } else {
                                window.location.href = '/?view=analytics';
                            }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <PieChart size={14} />
                        Analytics
                    </button>
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            if (onViewHistory) {
                                onViewHistory();
                            } else {
                                window.location.href = '/?view=history';
                            }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <LayoutDashboard size={14} />
                        Scan History
                    </button>
                    <button
                        onClick={() => {
                            if (isLoading) return;
                            setIsOpen(false);
                            // If on home page with results, this might need to trigger state, but for now scrolling to top or dashboard if accessible
                            if (onViewReport) {
                                onViewReport();
                            } else {
                                window.location.href = '/dashboard';
                            }
                        }}
                        disabled={isLoading}
                        className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors",
                            isLoading ? "text-slate-400 bg-slate-50 cursor-not-allowed" : "text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {isLoading ? (
                            <Loader2 size={14} className="animate-spin text-blue-600" />
                        ) : (
                            <FileText size={14} />
                        )}
                        Last Report
                    </button>
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            window.location.href = '/#pricing';
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                        <Zap size={14} className="text-blue-600 fill-blue-600" />
                        Upgrade Plan
                    </button>
                </div>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                    <LogOut size={14} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
