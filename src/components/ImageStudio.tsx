import { Image as ImageIcon, Sparkles, RefreshCw, Wand2, Download, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageStudioProps {
    initialTitle: string;
    hostname: string;
}

export default function ImageStudio({ initialTitle, hostname }: ImageStudioProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Simulate AI generation
        setTimeout(() => {
            setGeneratedImage(`https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1200&h=630`);
            setIsGenerating(false);
        }, 2000);
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-bl-[120px] -z-0" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Sparkles size={20} className="fill-blue-600" />
                        <span className="text-xs font-black uppercase tracking-[0.2em]">Pro Feature</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 leading-tight">AI OG Image Studio</h3>
                    <p className="text-slate-500 font-medium">Generate high-converting preview images with Gemini AI.</p>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 group/btn"
                >
                    {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />}
                    {isGenerating ? 'Generating...' : 'Generate Pro Image'}
                </button>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Preview Area */}
                <div className="space-y-4">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Live Workspace</span>
                    <div className="aspect-[1.91/1] bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center group/card transition-all hover:border-blue-200">
                        {generatedImage ? (
                            <div className="relative w-full h-full group/img">
                                <img src={generatedImage} alt="AI Generated" className="w-full h-full object-cover animate-fade-in" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button className="p-4 bg-white rounded-2xl text-slate-900 font-bold text-sm flex items-center gap-2 shadow-2xl hover:scale-110 transition-transform">
                                        <Download size={18} /> Download
                                    </button>
                                    <button className="p-4 bg-blue-600 rounded-2xl text-white font-bold text-sm flex items-center gap-2 shadow-2xl hover:scale-110 transition-transform">
                                        <Check size={18} /> Use as Default
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

                {/* Control Panel */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Visual Intent</label>
                        <div className="grid grid-cols-2 gap-3">
                            {['Minimalist', 'Vibrant', 'Professional', 'Saas Dark'].map((style) => (
                                <button key={style} className="p-4 text-left border border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all group/opt">
                                    <span className="block text-sm font-black text-slate-900 group-hover/opt:text-blue-700">{style}</span>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-tight">Style Preset</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Branding</label>
                        <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-500">Overlay URL</span>
                                <span className="text-blue-600 uppercase tracking-widest">{hostname}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-500">Primary Color</span>
                                <div className="flex gap-1">
                                    <div className="w-4 h-4 rounded-full bg-blue-600" />
                                    <div className="w-4 h-4 rounded-full bg-slate-900" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
