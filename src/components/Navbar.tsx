"use client";

import { useState } from 'react';
import { LayoutDashboard, Zap, Scale, Activity, PieChart, Clock } from 'lucide-react';
import { InspectionResult } from '@/types';
import { cn } from '@/lib/utils';
import UserNav from '@/components/UserNav';
import ScraperForm from '@/components/ScraperForm';

interface NavbarProps {
    user: any;
    tier: any;
    isPaid: boolean;
    result: InspectionResult | null;
    activeTab: string;
    setActiveTab: (tab: 'audit' | 'fix' | 'compare' | 'monitor' | 'analytics' | 'history') => void;
    onCheckout: (priceId?: string) => void;
    onViewReport: () => void;
    onReset: () => void;
    isRestoring: boolean;
    onResult: (data: InspectionResult) => void;
    isLimitReached: boolean;
}

export default function Navbar({
    user,
    tier,
    isPaid,
    result,
    activeTab,
    setActiveTab,
    onCheckout,
    onViewReport,
    onReset,
    isRestoring,
    onResult,
    isLimitReached
}: NavbarProps) {

    const tabs = [
        { id: 'audit', icon: LayoutDashboard, label: 'Audit', visible: true },
        { id: 'fix', icon: Zap, label: 'Fix Mode', fill: true, visible: !!result },
        { id: 'compare', icon: Scale, label: 'Compare', visible: !!result },
        { id: 'monitor', icon: Activity, label: 'Monitor', visible: true },
        { id: 'analytics', icon: PieChart, label: 'Analytics', visible: true },
        { id: 'history', icon: Clock, label: 'History', visible: true }
    ].filter(tab => tab.visible);

    return (
        <nav className={cn(
            "max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between transition-all duration-700 ease-in-out z-50",
            result ? "sticky top-0" : "bg-transparent py-6"
        )}>

            {/* SECTION 1: Logo & Scan */}
            <div className="flex items-center gap-4 min-w-0 shrink-0 z-20 md:flex-1">
                <div
                    onClick={onReset}
                    role="button"
                    className="flex items-center gap-2 font-black text-2xl tracking-tighter cursor-pointer group shrink-0"
                >
                    <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20 z-10 relative">
                        <span className="text-lg font-black italic">S</span>
                    </div>

                    {/* Animated Logo Text */}
                    <div className={cn(
                        "overflow-hidden transition-all duration-700 ease-in-out flex flex-col justify-center",
                        result ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                    )}>
                        <span className="hidden lg:inline whitespace-nowrap">Social<span className="text-blue-600">Sight</span></span>
                    </div>
                </div>

                {result && (
                    <div className="hidden lg:block animate-fade-in">
                        <ScraperForm onResult={onResult} variant="compact" limitReached={isLimitReached} align="left" />
                    </div>
                )}
            </div>

            {/* SECTION 2: Center Navigation (Tabs or Links) */}
            <div className="absolute left-1/2 -translate-x-1/2 flex justify-center z-30 w-full pointer-events-none">
                <div className="pointer-events-auto">
                    {(result || activeTab !== 'audit') ? (
                        <div className="hidden md:flex bg-white/80 backdrop-blur-xl border border-slate-200/50 p-1.5 rounded-2xl shadow-sm items-center gap-1 animate-fade-in">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={cn(
                                        "px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-transparent",
                                        activeTab === tab.id
                                            ? "bg-white text-blue-600 shadow-sm border-slate-100"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                                    )}
                                >
                                    <tab.icon size={14} className={cn(tab.fill && activeTab === tab.id && "fill-blue-600")} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="hidden lg:flex bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-full px-6 py-2.5 items-center gap-8 font-bold text-sm text-slate-500 shadow-sm animate-fade-in">
                            <a href="#features" className="hover:text-blue-600 transition-colors">Utility</a>
                            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
                        </div>
                    )}
                </div>
            </div>

            {/* SECTION 3: Right Actions */}
            <div className="flex items-center justify-end gap-3 shrink-0 z-20 flex-1">
                {user ? (
                    <div className="flex items-center gap-3">
                        {result && !isPaid && (
                            <button
                                onClick={() => onCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD)}
                                className="hidden xl:flex px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
                            >
                                Upgrade Plan
                            </button>
                        )}
                        <UserNav
                            user={user}
                            tier={tier}
                            isPaid={isPaid}
                            onViewReport={onViewReport}
                            onViewHistory={() => setActiveTab('history')}
                            onViewDashboard={() => setActiveTab('monitor')}
                            onViewAnalytics={() => setActiveTab('analytics')}
                            isLoading={isRestoring}
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <a href="/login" className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                            Sign In
                        </a>
                        <button
                            onClick={() => {
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                // Focus the input (with a slight delay to let scroll start)
                                setTimeout(() => document.getElementById('url-input')?.focus(), 100);
                            }}
                            data-track="nav-get-started-btn"
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-black/10 hover:translate-y-[-1px] transition-all"
                        >
                            Get Started
                        </button>
                    </div>
                )}
            </div>
        </nav >
    );
}
