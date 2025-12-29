import { Image as ImageIcon, Sparkles, RefreshCw, Wand2, Download, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageStudioProps {
    initialTitle: string;
    hostname: string;
    url?: string; // Add url prop
}

export default function ImageStudio({ initialTitle, hostname, url }: ImageStudioProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!url) return;
        setIsGenerating(true);
        try {
            const response = await fetch('/api/screenshot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);
                setGeneratedImage(imageUrl);
            } else {
                setGeneratedImage('/postgame-hero.png'); // Fallback if API fails (or for demo if no URL)
            }
        } catch (error) {
            console.error("Screenshot error", error);
            setGeneratedImage('/postgame-hero.png');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm overflow-hidden relative group">
            {/* Removed Background Decoration */}

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Sparkles size={20} className="fill-blue-600" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Pro Feature</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 leading-tight">OG Image Studio</h3>
                    <p className="text-slate-500 font-medium">Create high-converting social preview images.</p>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
                >
                    {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />}
                    {isGenerating ? 'Optimizing...' : 'Generate Optimized Image'}
                </button>
            </div>

            <div className="relative z-10">
                {/* Preview Area - Full Width */}
                <div className="space-y-4">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Live Workspace</span>
                    <div className="aspect-[1.91/1] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group/card transition-all hover:border-blue-200 max-w-4xl mx-auto">
                        {generatedImage ? (
                            <div className="relative w-full h-full group/img">
                                <img src={generatedImage} alt="AI Generated" className="w-full h-full object-cover animate-fade-in" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4">
                                    <button
                                        onClick={() => {
                                            if (generatedImage) {
                                                const link = document.createElement('a');
                                                link.href = generatedImage;
                                                link.download = `og-image-${hostname}.png`;
                                                link.click();
                                            }
                                        }}
                                        className="w-full max-w-xs py-3 bg-blue-600 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-blue-700 hover:scale-105 transition-all"
                                    >
                                        <Download size={16} /> Download Image
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-slate-300 group-hover/card:text-blue-300 transition-colors">
                                <ImageIcon size={64} strokeWidth={1} />
                                <p className="text-sm font-bold opacity-60">Ready to visualize your brand...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
