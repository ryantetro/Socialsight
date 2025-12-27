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

    const code = `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}">
<meta name="description" content="${description}">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${url}">
<meta property="twitter:title" content="${title}">
<meta property="twitter:description" content="${description}">
<meta property="twitter:image" content="${image}">`;

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-2 text-slate-400">
                    <Code2 size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Optimized Meta Tags</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
            <div className="p-6 overflow-x-auto">
                <pre className="text-blue-300 font-mono text-sm leading-relaxed">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
}
