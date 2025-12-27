"use client";

import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2 } from 'lucide-react';
import { AISuggestion } from '@/types';

interface AISuggestionsProps {
    title: string;
    description: string;
}

export default function AISuggestions({ title, description }: AISuggestionsProps) {
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState<number | null>(null);

    const getSuggestions = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });
            const data = await response.json();
            setSuggestions(data.suggestions);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopied(index);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Sparkles className="w-6 h-6" />
                        AI Content Rewrite
                    </h2>
                    <p className="text-blue-100">Maximize your CTR with Gemini-powered variations.</p>
                </div>
                {suggestions.length === 0 && !loading && (
                    <button
                        onClick={getSuggestions}
                        className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
                    >
                        Generate Ideas
                    </button>
                )}
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-medium animate-pulse">Consulting Gemini for viral hooks...</p>
                </div>
            )}

            <div className="space-y-4">
                {suggestions.map((suggestion, i) => (
                    <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/20 p-6 rounded-2xl relative group">
                        <div className="pr-12">
                            <div className="font-bold text-lg mb-2">{suggestion.title}</div>
                            <div className="text-blue-50 opacity-80 text-sm leading-relaxed">{suggestion.description}</div>
                        </div>
                        <button
                            onClick={() => copyToClipboard(`Title: ${suggestion.title}\nDescription: ${suggestion.description}`, i)}
                            className="absolute right-4 top-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                            {copied === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                ))}

                {suggestions.length === 0 && !loading && (
                    <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-2xl">
                        <p className="text-blue-100 font-medium">Click &quot;Generate Ideas&quot; to get SEO variations</p>
                    </div>
                )}
            </div>

            {suggestions.length > 0 && (
                <p className="text-center mt-6 text-xs text-blue-200 uppercase tracking-widest font-bold">
                    Pay $9 to unlock unlimited AI variations
                </p>
            )}
        </div>
    );
}
