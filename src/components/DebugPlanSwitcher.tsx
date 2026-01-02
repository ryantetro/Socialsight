"use client";

import { useState, useEffect } from 'react';
import { UserTier } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import { Settings, X } from 'lucide-react';

interface DebugPlanSwitcherProps {
    currentTier: UserTier | 'signed-out';
    onTierChange: (tier: UserTier | 'signed-out') => void;
    currentVariant: 'A' | 'B' | null;
    onVariantChange: (variant: 'A' | 'B') => void;
    currentPricingVariant: 'A' | 'B' | null;
    onPricingVariantChange: (variant: 'A' | 'B') => void;
    isStealth: boolean;
    onStealthChange: (active: boolean) => void;
}

export default function DebugPlanSwitcher({
    currentTier,
    onTierChange,
    currentVariant,
    onVariantChange,
    currentPricingVariant,
    onPricingVariantChange,
    isStealth,
    onStealthChange
}: DebugPlanSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show in development or if a special query param is present
        if (process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && window.location.search.includes('debug=true'))) {
            setIsVisible(true);
        }
    }, []);

    if (!isVisible) return null;

    const tiers: UserTier[] = ['free', 'founder', 'growth', 'agency'];

    return (
        <div className="fixed bottom-4 left-4 z-[100] font-sans">
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-slate-900 text-white p-3 rounded-full shadow-xl hover:scale-110 transition-transform border border-slate-700"
                    title="Debug Settings"
                >
                    <Settings size={20} />
                </button>
            )}

            {isOpen && (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl w-64 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold text-xs uppercase tracking-wider">Debug Settings</h3>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <section>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Force Tier</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {tiers.map((tier) => (
                                    <button
                                        key={tier}
                                        onClick={() => onTierChange(tier)}
                                        className={cn(
                                            "px-3 py-2 text-xs font-bold rounded-lg transition-colors border",
                                            currentTier === tier
                                                ? "bg-blue-600 text-white border-blue-500"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                        )}
                                    >
                                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                                    </button>
                                ))}
                                <button
                                    onClick={() => onTierChange('signed-out')}
                                    className={cn(
                                        "px-3 py-2 text-xs font-bold rounded-lg transition-colors border col-span-2",
                                        currentTier === 'signed-out'
                                            ? "bg-red-600 text-white border-red-500"
                                            : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                    )}
                                >
                                    Force Signed Out
                                </button>
                            </div>
                        </section>

                        <section className="pt-3 border-t border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Home Variant</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {['A', 'B'].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => onVariantChange(v as 'A' | 'B')}
                                        className={cn(
                                            "px-3 py-2 text-xs font-bold rounded-lg transition-colors border",
                                            currentVariant === v
                                                ? "bg-purple-600 text-white border-purple-500"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                        )}
                                    >
                                        Variant {v}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="pt-3 border-t border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Pricing Variant</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {['A', 'B'].map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => onPricingVariantChange(v as 'A' | 'B')}
                                        className={cn(
                                            "px-3 py-2 text-xs font-bold rounded-lg transition-colors border",
                                            currentPricingVariant === v
                                                ? "bg-emerald-600 text-white border-emerald-500"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                        )}
                                    >
                                        Variant {v}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="pt-3 border-t border-slate-800">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Analytics</h4>
                            <button
                                onClick={() => onStealthChange(!isStealth)}
                                className={cn(
                                    "w-full px-3 py-2 text-xs font-bold rounded-lg transition-colors border",
                                    isStealth
                                        ? "bg-blue-600 text-white border-blue-500"
                                        : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white"
                                )}
                            >
                                {isStealth ? "Stealth Mode: ON" : "Stealth Mode: OFF"}
                            </button>
                            <p className="mt-1.5 text-[9px] text-slate-500 leading-tight">
                                {isStealth ? "Tracking disabled for this browser." : "Your visits are being tracked."}
                            </p>
                        </section>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center italic">
                        Visible in DEV or ?debug=true
                    </div>
                </div>
            )}
        </div>
    );
}
