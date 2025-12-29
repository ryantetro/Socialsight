"use client";

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedFeatureProps {
    children: React.ReactNode;
    isLocked: boolean;
    blurAmount?: 'sm' | 'md' | 'lg';
    label?: string;
    onUnlock?: () => void;
    className?: string;
}

export default function LockedFeature({
    children,
    isLocked,
    blurAmount = 'md',
    label = "Unlock Premium Features",
    onUnlock,
    className
}: LockedFeatureProps) {
    if (!isLocked) {
        return <>{children}</>;
    }

    const handleUnlock = () => {
        if (onUnlock) {
            onUnlock();
        } else {
            // Default to opening checkout for LTD if no handler provided
            const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD;
            if (priceId) {
                // Find the checkout function or just redirect to login if not available
                // Ideally pass the handler from parent
                window.location.href = '/login?priceId=' + priceId;
            }
        }
    };

    return (
        <div className={cn("relative group overflow-hidden rounded-[inherit]", className)}>
            <div className={cn(
                "transition-all duration-500 select-none pointer-events-none",
                blurAmount === 'sm' && "blur-sm opacity-80",
                blurAmount === 'md' && "blur-md opacity-60",
                blurAmount === 'lg' && "blur-xl opacity-40 grayscale"
            )}>
                {children}
            </div>

            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-transparent via-white/5 to-white/20">
                <div className="bg-slate-900/90 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-2xl text-center max-w-sm transform transition-all duration-300 hover:scale-105 hover:bg-slate-900">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <Lock size={18} />
                    </div>
                    <h3 className="text-white font-bold mb-1">Upgrade to Unlock</h3>
                    <p className="text-slate-400 text-xs mb-4 max-w-[200px] mx-auto leading-relaxed">
                        Get access to AI suggestions, all preview formats, and fixes.
                    </p>
                    <button
                        onClick={handleUnlock}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {label}
                    </button>
                </div>
            </div>
        </div>
    );
}
