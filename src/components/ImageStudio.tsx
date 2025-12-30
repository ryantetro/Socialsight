import { Image as ImageIcon, Sparkles, RefreshCw, Wand2, Download, Check, Loader2, AlertCircle } from 'lucide-react';
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
    const [aiError, setAiError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!url) return;
        setIsGenerating(true);
        setAiError(null);
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
                const errorData = await response.json().catch(() => ({}));
                setAiError(errorData.message || `Screenshot Failed (${response.status})`);
                setGeneratedImage('/postgame-hero.png'); // Fallback
            }
        } catch (error: any) {
            console.error("Screenshot error", error);
            setAiError(error.message || "Failed to connect to screenshot service.");
            setGeneratedImage('/postgame-hero.png');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateAI = async () => {
        setIsGenerating(true);
        setAiError(null);
        try {
            const res = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Create a simple, realistic SaaS-style social card for "${initialTitle}". 
                    Layout: Clean, flat design with a single floating UI card and a professional badge. 
                    Elements: Incorporate 2-3 symbolic emojis and clean icon badges. No "AI glow" or neon. 
                    Context: High-quality social card for ${hostname}. 
                    Style: Minimalist, professional, and realistic (not AI-stylized). High-fidelity but simple.`,
                    metadata: { title: initialTitle, hostname, url }
                })
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 429) throw new Error(data.error);
                throw new Error(data.error || 'Generation failed');
            }

            if (data.imageUrl) {
                setGeneratedImage(data.imageUrl);
            } else if (data.text) {
                console.log("AI returned text instead of image:", data.text);
                setAiError("AI returned a description instead of an image. Try again?");
            } else {
                throw new Error("No image data received from AI.");
            }

        } catch (e: any) {
            setAiError(e.message);
        } finally {
            setIsGenerating(false);
        }
    };


    /* ... keeping rest of component ... */

    return (
        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-200 shadow-sm overflow-hidden relative group">
            {/* Added Alert Circle Import */}

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Sparkles size={16} className="fill-blue-600 md:w-5 md:h-5" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">Pro Feature</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">OG Image Studio</h3>
                    <p className="text-slate-500 font-medium text-sm md:text-base">Create high-converting social preview images.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                {/* Original Button */}
                <button
                    onClick={handleGenerate} // Keep original handler or rename
                    disabled={isGenerating}
                    className="flex-1 px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" /> Capture OG Image
                </button>

                {/* New AI Button */}
                <button
                    onClick={handleGenerateAI}
                    disabled={isGenerating}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:opacity-90 transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate with AI
                </button>
            </div>

            {aiError && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-100 animate-fade-in-up">
                    <AlertCircle size={16} />
                    {aiError}
                </div>
            )}

            {/* Preview Area ... */}

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
