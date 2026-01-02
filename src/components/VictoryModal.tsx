import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Shield, BarChart3, X, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VictoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void; // Path A: Guardian
    onEnableAnalytics: () => void; // Path B: Analytics
    pricingVariant?: 'A' | 'B' | null;
}

export default function VictoryModal({ isOpen, onClose, onUpgrade, onEnableAnalytics, pricingVariant }: VictoryModalProps) {
    useEffect(() => {
        if (isOpen) {
            // Fire confetti!
            const duration = 3000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }; // Higher z-index for modal

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-scale-in">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-colors z-20"
                >
                    <X size={20} />
                </button>

                {/* Header Section */}
                <div className="bg-slate-900 text-white p-8 pb-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-white/10 backdrop-blur-md">
                            <span className="animate-pulse">🏆</span> Elite Status Achieved
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                            You Scored 100/100.
                        </h2>
                        <p className="text-slate-300 text-lg max-w-md mx-auto leading-relaxed">
                            Your links are pixel-perfect. But a single code deploy could break this tomorrow.
                        </p>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full blur-[100px] -ml-32 -mb-32" />
                    </div>
                </div>

                {/* Body Section: The Choice */}
                <div className="p-8 -mt-6 bg-white rounded-t-[2rem] relative z-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Option 1: The Guardian */}
                        <div
                            onClick={onUpgrade}
                            className="bg-slate-50 rounded-2xl p-6 border-2 border-transparent hover:border-blue-600 cursor-pointer group transition-all hover:bg-blue-50/30 relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors -mr-10 -mt-10 pointer-events-none" />

                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">The Protector</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6 h-10">
                                "I want to prevent regressions and stay perfect forever."
                            </p>
                            <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/30 transition-all">
                                {pricingVariant === 'B' ? 'Unlock All-Access ($9)' : 'Start 7-Day Free Trial'}
                            </button>
                            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <Zap size={10} className="fill-slate-300" />
                                Instant Setup
                            </div>
                        </div>

                        {/* Option 2: Analytics */}
                        <div
                            onClick={onEnableAnalytics}
                            className="bg-slate-50 rounded-2xl p-6 border-2 border-transparent hover:border-slate-900 cursor-pointer group transition-all hover:bg-slate-100 relative overflow-hidden"
                        >
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-900 mb-4 group-hover:scale-110 transition-transform">
                                <BarChart3 size={24} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 mb-2">The Optimizer</h3>
                            <p className="text-sm text-slate-500 leading-relaxed mb-6 h-10">
                                "I want to track who is clicking these beautiful links."
                            </p>
                            <button className="w-full py-3 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors">
                                Install Tracking Pixel
                            </button>
                            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <CheckCircle2 size={10} />
                                No Credit Card
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        No thanks, I'll risk it
                    </button>
                </div>
            </div>
        </div>
    );
}
