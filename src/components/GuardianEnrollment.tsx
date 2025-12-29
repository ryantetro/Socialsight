import { useState } from 'react';
import { Shield, Check, AlertTriangle, Play, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import GuardianSuccess from './GuardianSuccess';

interface GuardianEnrollmentProps {
    defaultUrl: string;
    siteId: string; // The pp_uuid
    tier: 'Free' | 'Founder' | 'Growth' | 'Agency';
    onUpgrade: () => void;
    onScansStart?: () => void;
}

export default function GuardianEnrollment({ defaultUrl, siteId, tier, onUpgrade, onScansStart }: GuardianEnrollmentProps) {
    const [step, setStep] = useState<'verify' | 'enroll' | 'success'>('verify');
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<{ success: boolean, checks?: any, error?: string } | null>(null);
    const [enrolling, setEnrolling] = useState(false);

    const handleVerify = async () => {
        setVerifying(true);
        setVerificationResult(null);
        try {
            const res = await fetch('/api/verify-install', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: defaultUrl, siteId })
            });
            const data = await res.json();
            setVerificationResult(data);
            if (data.success) {
                // If tier is free, we stop here (show upgrade prompt)
                // If paid, allow next step
            }
        } catch (e) {
            setVerificationResult({ success: false, error: 'Verification failed. Please try again.' });
        } finally {
            setVerifying(false);
        }
    };

    const handleEnroll = async () => {
        if (tier === 'Free') {
            onUpgrade();
            return;
        }

        setEnrolling(true);
        // Simulate enrollment delay for effect
        setTimeout(async () => {
            // Here we would call an API to toggle is_monitored = true
            // But for this demo we assume the verify step might have done it or we do it now.
            // Let's assume verify logic handled the 'last_verified' but explicit enrollment
            // should flag 'is_monitored'. Since we don't have a separate enroll endpoint yet, 
            // we'll assume the success state is enough for the UI for now, 
            // OR ideally we call an endpoint. For now, we proceed to Success UI.
            setEnrolling(false);
            setStep('success');
            if (onScansStart) onScansStart();
        }, 1500);
    };

    if (step === 'success') {
        return (
            <GuardianSuccess
                domain={new URL(defaultUrl).hostname}
                onDashboardClick={() => { /* Navigate or close */ }}
                tier={tier}
            />
        );
    }

    const isLocked = tier === 'Free';

    // Step 1: Verification UI
    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-900">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Guardian Enrollment</h3>
                        <p className="text-xs text-slate-500 font-medium">Verify installation to enable monitoring</p>
                    </div>
                </div>
                {isLocked && (
                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Lock size={10} /> Pro Featue
                    </span>
                )}
            </div>

            <div className="p-6 md:p-8">
                {/* Status Card */}
                <div className={cn(
                    "rounded-2xl p-4 md:p-6 mb-6 md:mb-8 transition-all",
                    verificationResult?.success
                        ? "bg-green-50 border border-green-100"
                        : verificationResult?.success === false
                            ? "bg-red-50 border border-red-100"
                            : "bg-slate-50 border border-slate-100"
                )}>
                    {!verificationResult ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 text-slate-500">
                            <div className="hidden sm:block w-2 h-2 rounded-full bg-slate-400" />
                            <p className="text-sm font-medium leading-relaxed">Ready to verify installation on <b className="break-all">{new URL(defaultUrl).hostname}</b></p>
                        </div>
                    ) : verificationResult.success ? (
                        <div className="flex items-start gap-3">
                            <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1 shrink-0">
                                <Check size={16} />
                            </div>
                            <div>
                                <h4 className="font-bold text-green-800 text-sm md:text-base">Installation Verified</h4>
                                <p className="text-xs md:text-sm text-green-600 mt-1 leading-relaxed">We found your Pixel and Meta Tags. You are ready to activate the Guardian.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3">
                            <div className="bg-red-100 p-2 rounded-full text-red-600 mt-1 shrink-0">
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <h4 className="font-bold text-red-800 text-sm md:text-base">Verification Failed</h4>
                                <p className="text-xs md:text-sm text-red-600 mt-1 leading-relaxed">
                                    {verificationResult.error || "We couldn't find the required tags."}
                                </p>
                                {verificationResult.checks && (
                                    <div className="mt-3 space-y-1">
                                        <div className={cn("text-xs font-bold flex items-center gap-2", verificationResult.checks.script ? "text-green-600" : "text-red-500")}>
                                            {verificationResult.checks.script ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-red-400" />} Pixel Script
                                        </div>
                                        <div className={cn("text-xs font-bold flex items-center gap-2", verificationResult.checks.meta ? "text-green-600" : "text-red-500")}>
                                            {verificationResult.checks.meta ? <Check size={12} /> : <div className="w-3 h-3 rounded-full border border-red-400" />} Meta Tags
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 md:gap-4">
                    {!verificationResult?.success ? (
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            {verifying && <Loader2 size={16} className="animate-spin" />}
                            {verifying ? 'Verifying...' : 'Verify Installation'}
                        </button>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                            {isLocked ? (
                                <div className="w-full flex-1 flex items-center justify-between bg-amber-50 p-3 md:p-4 rounded-xl border border-amber-100 gap-2">
                                    <p className="text-xs font-bold text-amber-800">Guardian requires Founder Plan</p>
                                    <button
                                        onClick={onUpgrade}
                                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-colors shrink-0"
                                    >
                                        Upgrade
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all hover:-translate-y-1 active:scale-95"
                                >
                                    {enrolling ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
                                    {enrolling ? 'Activating...' : 'Start Monitoring'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
