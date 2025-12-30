import { Shield, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

interface GuardianSuccessProps {
    domain: string;
    onDashboardClick: () => void;
    tier?: 'Free' | 'Founder' | 'Growth' | 'Agency' | 'ltd';
}

export default function GuardianSuccess({ domain, onDashboardClick, tier = 'Founder' }: GuardianSuccessProps) {
    useEffect(() => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    const tierMessage = {
        'Free': "We'll check your tags once a day.", // Fallback, shouldn't occur in valid flow
        'Founder': "We'll check your tags once a day.",
        'Growth': "Priority monitoring active (Checks every 6h).",
        'ltd': "Priority monitoring active (Checks every 6h).",
        'Agency': "Multi-channel alerts enabled."
    };

    return (
        <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-xl text-center max-w-lg mx-auto animate-fade-in relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mt-32 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce-slow">
                    <Shield className="w-10 h-10 text-green-600 fill-green-600/20" />
                </div>

                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                    Your Guardian is on watch!
                </h2>
                <p className="text-slate-500 font-medium mb-8">
                    You've successfully enrolled <span className="text-slate-900 font-bold">{domain}</span> into 24/7 monitoring. We've locked in your "Last Known Good" configuration.
                </p>

                <div className="w-full bg-slate-50 rounded-2xl p-6 mb-8 text-left space-y-4 border border-slate-100">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4">What we guard</h3>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">Daily Health Checks</p>
                            <p className="text-xs text-slate-500 font-medium">{tierMessage[tier]}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">Zero-Downtime Alerts</p>
                            <p className="text-xs text-slate-500 font-medium">Instant notification if your script breaks.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">Impression Tracking</p>
                            <p className="text-xs text-slate-500 font-medium">Log every social view in your analytics.</p>
                        </div>
                    </div>
                </div>

                <p className="text-sm font-bold text-slate-400 mb-6 italic">
                    "Go grab a coffee—we'll take it from here."
                </p>

                <button
                    onClick={onDashboardClick}
                    className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200"
                >
                    View My Dashboard <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
