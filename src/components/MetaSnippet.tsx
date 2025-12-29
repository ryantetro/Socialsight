import { Copy, Check, Code2 } from 'lucide-react';
import { useState } from 'react';

interface MetaSnippetProps {
    title: string;
    description: string;
    image: string;
    url: string;
}

export default function MetaSnippet({ title, description, image, url }: MetaSnippetProps) {
    const [copied, setCopied] = useState(false);
    const [smartTracking, setSmartTracking] = useState(false);

    const trackingParams = smartTracking
        ? '?utm_source=previewperfect&utm_medium=social&utm_campaign=og_share'
        : '';

    const finalUrl = `${url}${trackingParams}`;

    const code = `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}">
<meta name="description" content="${description}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${finalUrl}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${finalUrl}">
<meta property="twitter:title" content="${title}">
<meta property="twitter:description" content="${description}">
<meta property="twitter:image" content="${image}">`;

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 border-l border-slate-700/50 hidden sm:block">
                        meta-tags.html
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                        <div className={`w-8 h-4 rounded-full transition-colors relative ${smartTracking ? 'bg-blue-600' : 'bg-slate-700'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${smartTracking ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={smartTracking} onChange={() => setSmartTracking(!smartTracking)} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${smartTracking ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                            Smart Tracking
                        </span>
                    </label>

                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors pl-4 border-l border-slate-700"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                </div>
            </div>
            <div className="p-6 overflow-x-auto relative">
                {smartTracking && (
                    <div className="absolute top-0 right-0 p-2">
                        <span className="text-[10px] font-mono text-blue-500 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 animate-pulse">
                            UTM Parameters Active
                        </span>
                    </div>
                )}
                <pre className="text-blue-300 font-mono text-sm leading-relaxed">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
}
