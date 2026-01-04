
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Copy, Twitter, X, Check, Share2, FileText, Image as ImageIcon, Zap, FlaskConical, BrickWall } from 'lucide-react';
import { TractionCard } from './TractionCard';
import { cn } from '@/lib/utils'; // Assuming this exists based on other files
import html2canvas from 'html2canvas';

interface ShareTractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        date: string;
        impressions: number;
        impressionsDelta: number;
        clicks: number;
        clicksDelta: number;
        ctr: number;
        ctrDelta: number;
        topSource: { name: string; percent: number };
        chartData: { name: string; value: number }[];
        streak: number;
    };
}

type NarrativeMode = 'optimistic' | 'experimental' | 'honest';

export const ShareTractionModal = ({ isOpen, onClose, data }: ShareTractionModalProps) => {
    const [activeTab, setActiveTab] = useState<'card' | 'text'>('card');
    const [mode, setMode] = useState<NarrativeMode>('optimistic');
    const [isDownloading, setIsDownloading] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Tweet Templates
    const templates = [
        `SocialSight.dev — Day ${data.streak} 🛠️\n\n${data.impressions.toLocaleString()} impressions (${data.impressionsDelta >= 0 ? '+' : ''}${data.impressionsDelta})\n${data.clicks.toLocaleString()} clicks (${data.clicksDelta >= 0 ? '+' : ''}${data.clicksDelta})\nCTR: ${data.ctr}% (${data.ctrDelta >= 0 ? '+' : ''}${data.ctrDelta}pp)\n\nTop source: ${data.topSource.name} (${data.topSource.percent}%)\n\nBuilding the "share your traction" card next so founders can flex progress daily.`,

        `Day ${data.streak} shipping SocialSight.dev\n\nImpressions: ${data.impressions.toLocaleString()} (${data.impressionsDelta >= 0 ? '+' : ''}${data.impressionsDelta})\nCTR: ${data.ctr}% (${data.ctrDelta >= 0 ? '+' : ''}${data.ctrDelta}pp)\n\nMost traffic came from ${data.topSource.name} (${data.topSource.percent}%).\n\nTiny wins compound.`,

        `Build in public log — Day ${data.streak}\n\n${data.impressions.toLocaleString()} impressions → ${data.clicks.toLocaleString()} clicks\nCTR ${data.ctr}% (vs ${(data.ctr - data.ctrDelta).toFixed(1)}% yesterday)\n\nIf your link preview looks broken, you're leaking clicks.\nI'm building SocialSight to make that impossible.`
    ];

    const [selectedTemplate, setSelectedTemplate] = useState(0);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleDownload = async () => {
        setIsDownloading(true);
        const element = document.getElementById('traction-card-capture');
        if (element) {
            try {
                const canvas = await html2canvas(element, {
                    scale: 2, // Retina quality
                    backgroundColor: '#0B1121', // Match bg
                    useCORS: true // if external images mostly
                });

                const link = document.createElement('a');
                link.download = `socialsight-day-${data.streak}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error("Screenshot failed", err);
            }
        }
        setIsDownloading(false);
    };

    const copyText = () => {
        navigator.clipboard.writeText(templates[selectedTemplate]);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const openTwitter = () => {
        const text = encodeURIComponent(templates[selectedTemplate]);
        window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
    };

    return createPortal(
        <div
            className="fixed top-0 left-0 w-screen h-[100dvh] z-[9999] grid place-items-center p-4 overflow-hidden"
            style={{ position: 'fixed', top: 0, left: 0 }}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative z-10 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Share2 size={20} className="text-blue-500" />
                        Share Today's Traction
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-slate-950/50 border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('card')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
                            activeTab === 'card'
                                ? "bg-slate-800 text-white shadow-lg"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                        )}
                    >
                        <ImageIcon size={16} /> Share Card
                    </button>
                    <button
                        onClick={() => setActiveTab('text')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
                            activeTab === 'text'
                                ? "bg-slate-800 text-white shadow-lg"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                        )}
                    >
                        <FileText size={16} /> Post Text
                    </button>
                </div>

                <div className="p-8 bg-slate-950 flex-1 flex flex-col items-center justify-center">
                    {activeTab === 'card' && (
                        <div className="flex flex-col items-center gap-6 w-full">
                            {/* Mode Toggle */}
                            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                                <button onClick={() => setMode('optimistic')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all", mode === 'optimistic' ? "bg-green-500/10 text-green-400 border border-green-500/20 shadow" : "text-slate-500 hover:text-slate-300")}>
                                    <Zap size={14} /> Optimistic
                                </button>
                                <button onClick={() => setMode('experimental')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all", mode === 'experimental' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow" : "text-slate-500 hover:text-slate-300")}>
                                    <FlaskConical size={14} /> Experimental
                                </button>
                                <button onClick={() => setMode('honest')} className={cn("px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all", mode === 'honest' ? "bg-slate-700/50 text-slate-300 border border-slate-600 shadow" : "text-slate-500 hover:text-slate-300")}>
                                    <BrickWall size={14} /> Honest
                                </button>
                            </div>

                            {/* Card Display */}
                            <div className="relative group w-full flex items-center justify-center">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                                {/* Wrapper for sizing since card is fixed pixel width */}
                                <div className="relative scale-[0.55] sm:scale-75 md:scale-90 origin-center shadow-2xl">
                                    <div id="traction-card-capture">
                                        <TractionCard {...data} mode={mode} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg shadow-blue-500/10 whitespace-nowrap"
                                >
                                    {isDownloading ? (
                                        <>Creating...</>
                                    ) : (
                                        <><Download size={18} /> Download PNG</>
                                    )}
                                </button>
                                <button
                                    onClick={openTwitter}
                                    className="flex items-center gap-2 px-6 py-3 bg-[#1DA1F2] text-white font-bold rounded-xl hover:bg-[#1a94df] transition-colors shadow-lg shadow-[#1DA1F2]/20 whitespace-nowrap"
                                >
                                    <Twitter size={18} /> Open X Composer
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">Choose a Vibe</label>
                                <div className="grid grid-cols-1 gap-4">
                                    {templates.map((template, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedTemplate(idx)}
                                            className={cn(
                                                "p-4 rounded-xl border-2 cursor-pointer transition-all text-sm leading-relaxed whitespace-pre-wrap font-medium",
                                                selectedTemplate === idx
                                                    ? "bg-slate-900 border-blue-500 text-white shadow-lg shadow-blue-500/10"
                                                    : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                                            )}
                                        >
                                            {template}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={copyText}
                                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors border border-slate-700"
                            >
                                {hasCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                {hasCopied ? 'Copied to Clipboard' : 'Copy Text'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
