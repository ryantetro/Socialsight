import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface MetaSnippetProps {
    title: string;
    description: string;
    image: string;
    url: string;
    siteId?: string;
}

export default function MetaSnippet({ title, description, image, url, siteId = 'pp_demo' }: MetaSnippetProps) {
    const [copied, setCopied] = useState(false);
    const [smartTracking, setSmartTracking] = useState(true);

    const trackingParams = smartTracking
        ? '?utm_source=previewperfect&utm_medium=social&utm_campaign=og_share'
        : '';

    const finalUrl = `${url}${trackingParams}`;

    // Generate Script Snippet
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://socialsight.dev';
    const scriptCode = `<!-- SocialSight Tracking Pixel -->
<script async src="${baseUrl}/pixel.js" data-id="${siteId}"></script>`;

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
<meta property="twitter:image" content="${image}">

${scriptCode}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4 border-b border-slate-800 bg-slate-900/50 gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 border-l border-slate-700/50">
                        meta-tags.html
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                    <label className="flex items-center gap-3 cursor-pointer group select-none shrink-0">
                        <div className={`w-9 h-5 rounded-full transition-all duration-300 relative ${smartTracking ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${smartTracking ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input type="checkbox" className="hidden" checked={smartTracking} onChange={() => setSmartTracking(!smartTracking)} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${smartTracking ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                            Smart Tracking
                        </span>
                    </label>

                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors pl-3 border-l border-slate-700 active:scale-95 origin-center"
                    >
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
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
