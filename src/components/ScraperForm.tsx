"use client";

import { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { InspectionResult } from '@/types';
import { cn } from '@/lib/utils';
import { useScrape } from '@/hooks/useScrape';

interface ScraperFormProps {
    onResult: (data: InspectionResult) => void;
    variant?: 'hero' | 'compact';
    limitReached?: boolean;
    align?: 'left' | 'right';
    prefillUrl?: string; // New prop for sample audits
}

export default function ScraperForm({ onResult, variant = 'hero', limitReached = false, align = 'right', prefillUrl = '' }: ScraperFormProps) {
    const [url, setUrl] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const { loading, error, scrape } = useScrape();

    // Handle prefill and auto-trigger
    useEffect(() => {
        if (prefillUrl) {
            setUrl(prefillUrl);
            const performScrape = async () => {
                const data = await scrape(prefillUrl);
                if (data) {
                    onResult(data);
                    setUrl('');
                    setIsOpen(false);
                }
            };
            performScrape();
        }
    }, [prefillUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (limitReached) return;

        const data = await scrape(url);
        if (data) {
            onResult(data);
            setUrl('');
            setIsOpen(false);
        }
    };

    const isCompact = variant === 'compact';

    if (isCompact) {
        return (
            <div className="relative font-sans">
                <button
                    onClick={() => !limitReached && setIsOpen(!isOpen)}
                    className={cn(
                        "px-5 md:px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2",
                        isOpen && "ring-4 ring-blue-500/20 bg-blue-700",
                        limitReached && "opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400 shadow-none pointer-events-none"
                    )}
                >
                    <Search className="w-4 h-4" />
                    <span>{limitReached ? "Daily Limit Reached" : "Scan New URL"}</span>
                </button>

                {isOpen && (
                    <div className={cn(
                        "absolute top-full mt-3 w-full md:w-[450px] z-50 animate-in fade-in zoom-in-95 duration-200 ease-out",
                        align === 'right' ? "right-0 origin-top-right" : "left-0 origin-top-left"
                    )}>
                        {/* Overlay to close on click outside */}
                        <div className="fixed inset-0 z-0 h-screen w-screen cursor-default" onClick={() => setIsOpen(false)} role="button" />

                        <div className="relative z-10 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xl shadow-blue-900/10 flex items-center gap-2 ring-4 ring-slate-50">
                            <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Enter website URL..."
                                    autoFocus
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className={cn(
                                        "flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400",
                                        error && "border-red-300 bg-red-50"
                                    )}
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    data-track="compact-audit-btn"
                                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-md shadow-blue-500/20"
                                >
                                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Scan"}
                                </button>
                            </form>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>

                            {/* Error Popover */}
                            {error && (
                                <div className="absolute top-full mt-2 left-0 right-0 bg-red-50 text-red-600 text-[10px] font-bold px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2 shadow-lg mb-2">
                                    <AlertCircle className="w-3 h-3" /> {error}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto transition-all duration-500 relative">
            <form onSubmit={handleSubmit} className="relative group">
                <input
                    id="url-input"
                    type="text"
                    placeholder={limitReached ? "Daily limit reached." : "e.g. yoursite.com"}
                    value={url}
                    disabled={limitReached}
                    onChange={(e) => {
                        setUrl(e.target.value);
                    }}
                    className={cn(
                        "w-full rounded-2xl border-2 outline-none transition-all px-6 py-5 text-xs md:text-lg focus:ring-4 focus:ring-blue-500/10 shadow-xl shadow-blue-500/5 bg-white",
                        error ? "border-red-400 focus:border-red-500 bg-red-50/30" : "border-slate-200 focus:border-blue-500",
                        limitReached && "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                    )}
                />
                <button
                    type="submit"
                    disabled={loading || limitReached}
                    data-track="hero-audit-btn"
                    className={cn(
                        "absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-all flex items-center justify-center gap-2 px-2 md:px-6 text-xs md:text-base",
                        limitReached && "bg-slate-400 hover:bg-slate-400"
                    )}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4" />
                    )}
                    <span className={cn(loading && "animate-pulse")}>
                        {loading ? "Scanning..." : limitReached ? "Limit Reached" : "Audit URL"}
                    </span>
                </button>
            </form>

            {/* Custom Error Indicator */}
            <div className={cn(
                "absolute left-0 right-0 transition-all duration-300 pointer-events-none",
                error ? "top-full mt-2 opacity-100 translate-y-0" : "top-full mt-0 opacity-0 -translate-y-2"
            )}>
                <div className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-bold shadow-xl shadow-red-500/10 flex items-center gap-2 w-fit mx-auto md:mx-0">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {error}
                </div>
            </div>

            {!error && !limitReached && (
                <p className="mt-4 text-slate-400 text-sm text-center font-medium">
                    Audit any URL to find preview issues and fix them in minutes.
                </p>
            )}
            {limitReached && (
                <p className="mt-4 text-red-500 text-sm text-center font-bold animate-pulse">
                    You have reached your daily limit of 3 free scans.
                </p>
            )}
        </div>
    );
}
