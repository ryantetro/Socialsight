"use client";

import { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { InspectionResult } from '@/types';
import { cn } from '@/lib/utils';

interface ScraperFormProps {
    onResult: (data: InspectionResult) => void;
    variant?: 'hero' | 'compact';
}

export default function ScraperForm({ onResult, variant = 'hero' }: ScraperFormProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let targetUrl = url.trim();
        if (!targetUrl) {
            setError("Please enter a URL to audit.");
            return;
        }

        // Auto-prepend https if protocol is missing
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        // Basic URL validation
        try {
            new URL(targetUrl);
        } catch {
            setError("That doesn't look like a valid URL.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/inspect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl }),
            });

            if (!response.ok) {
                throw new Error("Failed to reach the website. Is it online?");
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            onResult(data);
            if (variant === 'compact') setUrl(''); // Clear on success only for compact
        } catch (err: any) {
            setError(err.message || "Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const isCompact = variant === 'compact';

    return (
        <div className={cn("w-full transition-all duration-500 relative", !isCompact ? "max-w-2xl mx-auto" : "max-w-3xl")}>
            <form onSubmit={handleSubmit} className="relative group">
                <input
                    type="text"
                    placeholder="e.g. yoursite.com"
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value);
                        if (error) setError(null);
                    }}
                    className={cn(
                        "w-full rounded-2xl border-2 outline-none transition-all",
                        error ? "border-red-400 focus:border-red-500 bg-red-50/30" : "border-slate-200 focus:border-blue-500",
                        isCompact
                            ? "pl-5 pr-24 py-3 text-sm bg-white"
                            : "px-6 py-5 text-lg focus:ring-4 focus:ring-blue-500/10 shadow-xl shadow-blue-500/5 bg-white"
                    )}
                />
                <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                        "absolute right-1.5 top-1.5 bottom-1.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-400 transition-all flex items-center justify-center gap-2",
                        isCompact ? "px-4 text-xs" : "px-6"
                    )}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4" />
                    )}
                    <span className={cn(loading && "animate-pulse")}>
                        {loading ? "Scanning..." : isCompact ? "Scan" : "Audit URL"}
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

            {!isCompact && !error && (
                <p className="mt-4 text-slate-400 text-sm text-center font-medium">
                    Analyze any URL to reveal and fix social sharing leaks.
                </p>
            )}
        </div>
    );
}
