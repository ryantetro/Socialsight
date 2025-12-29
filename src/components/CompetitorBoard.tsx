import { useState } from 'react';
import { useScrape } from '@/hooks/useScrape';
import { InspectionResult } from '@/types';
import { Trophy, ArrowRight, Loader2, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SocialPreviews from './SocialPreviews';

interface CompetitorBoardProps {
    currentUrl?: string;
}

export default function CompetitorBoard({ currentUrl }: CompetitorBoardProps) {
    const [urls, setUrls] = useState([currentUrl || '', '', '']);
    const [results, setResults] = useState<(InspectionResult | null)[]>([null, null, null]);
    const { scrape, loading } = useScrape();
    const [scanned, setScanned] = useState(false);

    const handleRunComparison = async () => {
        setScanned(true);
        const newResults = await Promise.all(
            urls.map(async (url) => {
                if (!url) return null;
                return await scrape(url);
            })
        );
        setResults(newResults);
    };

    const getWinRate = (index: number) => {
        if (!results[index]) return 0;
        const myScore = results[index]!.score;
        let wins = 0;
        results.forEach((r, i) => {
            if (i !== index && r && myScore > r.score) wins++;
        });
        return wins;
    };

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Input Section */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Competitor Benchmarking</h2>
                    <p className="text-slate-500 font-medium">See how you stack up against the competition. We'll analyze up to 3 sites side-by-side.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {urls.map((url, i) => (
                        <div key={i} className="space-y-3 relative group">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 pl-4">
                                {i === 0 ? "Your Website" : `Competitor ${i}`}
                            </label>
                            <input
                                type="text"
                                placeholder={i === 0 ? "yoursite.com" : "competitor.com"}
                                value={url}
                                onChange={(e) => {
                                    const newUrls = [...urls];
                                    newUrls[i] = e.target.value;
                                    setUrls(newUrls);
                                }}
                                className={cn(
                                    "w-full px-5 py-4 rounded-xl border-2 border-slate-100 bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition-all",
                                    i === 0 && "border-blue-100 bg-blue-50/30 text-blue-900"
                                )}
                            />
                            {i === 0 && (
                                <div className="absolute top-10 right-4 p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                                    <Trophy size={14} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        onClick={handleRunComparison}
                        disabled={loading || !urls[0]}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : "Run Comparison"}
                    </button>
                </div>
            </div>

            {/* Results Grid */}
            {scanned && !loading && (
                <div className="space-y-8">
                    <div className={cn(
                        "p-6 rounded-2xl border text-center animate-fade-in",
                        getWinRate(0) === 2 ? "bg-green-50 border-green-200 text-green-800" :
                            getWinRate(0) === 1 ? "bg-yellow-50 border-yellow-200 text-yellow-800" :
                                "bg-red-50 border-red-200 text-red-800"
                    )}>
                        <h3 className="text-2xl font-black mb-1">
                            {getWinRate(0) === 2 ? "🏆 You are crushing the competition!" :
                                getWinRate(0) === 1 ? "⚠️ You're beating 1 competitor, but lagging behind the leader." :
                                    "🚨 You are losing the visibility war."}
                        </h3>
                        <p className="font-medium opacity-80">
                            Your social score is higher than {getWinRate(0)} of {results.filter((_, i) => i !== 0 && !!urls[i]).length} tracked competitors.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {results.map((res, i) => (
                            <div key={i} className={cn(
                                "rounded-[2.5rem] overflow-hidden border transition-all duration-500",
                                res ? "bg-white border-slate-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60 border-dashed"
                            )}>
                                {res ? (
                                    <>
                                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    {res.metadata.favicon && <img src={res.metadata.favicon} className="w-5 h-5 rounded" />}
                                                    <span className="font-bold text-slate-900 truncate max-w-[150px]">{res.metadata.hostname}</span>
                                                </div>
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-black",
                                                    res.score >= 90 ? "bg-green-100 text-green-700" :
                                                        res.score >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    Score: {res.score}
                                                </div>
                                            </div>
                                            <div className="aspect-[1.91/1] bg-slate-100 rounded-xl overflow-hidden relative group">
                                                {res.metadata.ogImage ? (
                                                    <img src={res.metadata.ogImage} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <XCircle size={32} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="p-6 space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Title Length</label>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-2 rounded-full flex-1",
                                                        res.metadata.title?.length && res.metadata.title.length >= 50 && res.metadata.title.length <= 60 ? "bg-green-500" : "bg-orange-400"
                                                    )} />
                                                    <span className="text-xs font-bold text-slate-600">{res.metadata.title?.length || 0}/60</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Description</label>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("h-2 rounded-full flex-1",
                                                        res.metadata.description ? "bg-green-500" : "bg-red-200"
                                                    )} />
                                                    <span className="text-xs font-bold text-slate-600">{res.metadata.description ? "Present" : "Missing"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center gap-4">
                                        <AlertCircle size={32} strokeWidth={1.5} />
                                        <p className="text-sm font-medium">No valid data found</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
