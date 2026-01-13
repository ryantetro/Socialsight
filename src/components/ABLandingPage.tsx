"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, Star, Shield, Zap, Layout, Lock, ScanFace, Code2, Globe2, ArrowRight, CreditCard, X } from 'lucide-react';
import ScraperForm from '@/components/ScraperForm';
import { InspectionResult } from '@/types';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import { useProfile } from '@/hooks/useProfile';

interface LeaderboardItem {
    domain: string;
    url: string;
    score: number;
    date: string; // e.g., "2 days ago"
    checks: {
        title: boolean;
        image: boolean;
        description: boolean;
    };
}

interface ABLandingPageProps {
    stats?: {
        linksAudited: string;
        avgPulseScore: string;
        brokenImagesFound: string;
        clicksSaved: string;
    };
    leaderboard?: LeaderboardItem[];
    onResult?: (data: InspectionResult) => void;
    user?: any;
    tier?: any;
    isPaid?: boolean;
    onCheckout?: (priceId?: string) => void;
    onViewReport?: () => void;
    onReset?: () => void;
    isRestoring?: boolean;
    isLimitReached?: boolean;
    setActiveTab?: (tab: any) => void;
}

export default function ABLandingPage({
    stats,
    leaderboard,
    onResult,
    user,
    tier,
    isPaid,
    onCheckout = () => { },
    onViewReport = () => { },
    onReset = () => { },
    isRestoring = false,
    isLimitReached = false,
    setActiveTab = () => { }
}: ABLandingPageProps) {
    const { user: profileUser, loading: authLoading } = useProfile();
    const [result, setResult] = useState<InspectionResult | null>(null);
    const [showFeaturedModal, setShowFeaturedModal] = useState(false);

    // Track Page View on Mount
    useEffect(() => {
        // Simple fire-and-forget tracking
        fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                site_id: 'socialsight_landing', // Virtual ID for landing page
                event_type: 'page_view',
                path: window.location.pathname,
                referrer: document.referrer,
                ab_variant: 'C',
                pricing_variant: localStorage.getItem('ss_pricing_variant') || 'A'
            })
        }).catch(err => console.error("Tracking failed", err));
    }, []);

    // Use passed user object or fallback to client-side fetch
    const effectiveUser = user || profileUser;

    const defaultCheckout = async (priceId: string) => {
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, view: 'ab' })
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else if (data.redirect) window.location.href = data.redirect;
            else alert('Checkout Error: ' + (data.error || 'Unknown'));
        } catch (e) {
            console.error(e);
            alert('Something went wrong initiating checkout.');
        }
    };

    const handleCheckout = async (priceId?: string) => {
        console.log("Checking out with priceId:", priceId);
        if (!priceId) {
            alert("Configuration Error: Price ID is missing. Please check .env.local");
            return;
        }
        await defaultCheckout(priceId);
    };

    const handleResult = (data: InspectionResult) => {
        if (onResult) {
            onResult(data);
        } else {
            window.location.href = '/?success=true';
        }
    };

    const displayStats = stats || {
        linksAudited: '18,715',
        avgPulseScore: '77',
        brokenImagesFound: '2.4k',
        clicksSaved: '84k'
    };

    // Fallback data if no real data is passed
    const displayLeaderboard = leaderboard || [
        { domain: 'webstudio.is', url: 'https://webstudio.is', score: 98, date: '1 month ago', checks: { title: true, image: true, description: true } },
        { domain: 'led.spaceproductionsla.com', url: 'https://led.spaceproductionsla.com', score: 98, date: '1 month ago', checks: { title: true, image: true, description: true } },
        { domain: 'kalashvasaniya.com', url: 'https://www.kalashvasaniya.com/', score: 97, date: '13 days ago', checks: { title: true, image: true, description: true } },
        { domain: 'openqr.io', url: 'https://openqr.io', score: 97, date: '28 days ago', checks: { title: true, image: true, description: true } },
        { domain: 'rubixstudios.com.au', url: 'https://rubixstudios.com.au/', score: 97, date: '1 month ago', checks: { title: true, image: true, description: true } },
    ];

    return (
        <main className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">

            {/* Navigation */}
            <Navbar
                user={user}
                tier={tier}
                isPaid={isPaid || false}
                result={result}
                activeTab="audit"
                setActiveTab={setActiveTab as any}
                onCheckout={onCheckout}
                onViewReport={onViewReport}
                onReset={onReset}
                isRestoring={isRestoring || false}
                onResult={handleResult}
                isLimitReached={isLimitReached || false}
            />

            {/* Hero Section */}
            <section className="pt-20 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center space-y-8">

                    {/* Badge / Pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-600 animate-fade-in tracking-wide uppercase">
                        <span>Get your badge + backlink</span>
                        <span className="animate-pulse">👇</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-slate-900">
                        Fix your <br />
                        <span className="text-blue-600">broken link previews</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
                        Don't let ugly links kill your click-through rates. Audit, fix, and monitor your Open Graph tags for X, LinkedIn, and iMessage.
                    </p>

                    {/* URL Input Form */}
                    <div className="max-w-xl mx-auto pt-8">
                        <div className="p-1 bg-gradient-to-r from-blue-100 to-emerald-100 rounded-2xl shadow-xl shadow-blue-900/5">
                            <div className="bg-white rounded-xl p-2">
                                <ScraperForm onResult={handleResult} variant="hero" align="left" />
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500 font-medium">
                            <div className="flex -space-x-2">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden shadow-sm">
                                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            <p>Trusted by <span className="text-slate-900 font-black">2200+ developers</span></p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Scroll ticker */}
            <div className="py-16 overflow-hidden relative max-w-[100vw] border-t border-slate-100/50 bg-white">
                {/* Gradient Masks */}
                <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

                <div className="max-w-6xl mx-auto mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-6">
                        {[
                            {
                                name: 'Signup Momentum',
                                domain: 'signupmomentum.com',
                                score: 100,
                                color: 'bg-emerald-500',
                                description: 'The best way to build your waitlist and grow your audience before launch.'
                            },
                            {
                                name: 'Home QR Code',
                                domain: 'home-qrcode.com',
                                score: 98,
                                color: 'bg-blue-500',
                                description: 'Generate beautiful QR codes for your home WiFi network in seconds.'
                            },
                            {
                                name: 'Momentum Photo',
                                domain: 'momentumphoto.app',
                                score: 99,
                                color: 'bg-indigo-500',
                                description: 'The ultimate photo companion for runners. Overlay your stats on your photos.'
                            },
                            {
                                name: 'PostGame AI',
                                domain: 'getpostgame.ai',
                                score: 97,
                                color: 'bg-violet-500',
                                description: 'Transform your game footage into viral highlights with advanced AI editing.'
                            },
                            {
                                name: 'ZeroToSite',
                                domain: 'zerotosite.app',
                                score: 100,
                                color: 'bg-orange-500',
                                description: 'Go from zero to a fully deployed website in minutes with our starter kits.'
                            },
                        ].map((item, i) => (
                            <div key={i} className="group relative flex flex-col gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-200/50 hover:-translate-y-1 transition-all cursor-default overflow-hidden">
                                {/* Glow Effect */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />

                                <div className="flex items-start justify-between">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                                <img
                                                    src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`}
                                                    alt={item.name}
                                                    className="w-6 h-6 object-contain"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-900 text-sm leading-tight group-hover:text-blue-600 transition-colors">
                                                    {item.name}
                                                </h3>
                                                <p className="text-[10px] font-medium text-slate-400 truncate max-w-[140px]">
                                                    {item.domain}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Premium Badge */}
                                        <div className="relative group/badge">
                                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                                            <div className="relative flex items-center gap-1.5 bg-slate-900 text-white pl-1 pr-2 py-0.5 rounded-full border border-slate-800 shadow-sm overflow-hidden">
                                                {/* Animated Progress Ring */}
                                                <div className="relative w-6 h-6 flex items-center justify-center">
                                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                        <path
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                            fill="none"
                                                            stroke="#334155"
                                                            strokeWidth="4"
                                                        />
                                                        <path
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                            fill="none"
                                                            stroke={
                                                                item.score >= 98 ? '#10b981' :
                                                                    item.score >= 90 ? '#3b82f6' :
                                                                        item.score >= 80 ? '#f59e0b' : '#ef4444'
                                                            }
                                                            strokeWidth="4"
                                                            strokeDasharray={`${item.score}, 100`}
                                                            className="drop-shadow-[0_0_2px_rgba(255,255,255,0.5)]"
                                                        />
                                                    </svg>
                                                    <span className="absolute text-[9px] font-black tracking-tighter">
                                                        {item.score}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col justify-center leading-none">
                                                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wider mb-px">Verified</span>
                                                    <span className="text-[9px] font-bold text-white tracking-tight">SocialSight</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium line-clamp-2">
                                        {item.description}
                                    </p>
                                </div>

                                {/* Mini Scan Visualization */}
                                <div className="space-y-2 pt-2 border-t border-slate-100/50">
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            OG Image
                                        </span>
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Smart Title
                                        </span>
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                        <span className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Tags
                                        </span>
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-10">
                        <button

                            onClick={() => {
                                if (effectiveUser) {
                                    // If logged in, open the modal directly here
                                    setShowFeaturedModal(true);
                                } else {
                                    // If not logged in, go to login
                                    window.location.href = '/login?redirect=featured';
                                }
                            }}
                            className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 bg-white border border-slate-200 hover:border-blue-300 text-slate-600 hover:text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            <span>Get your product featured here</span>
                            <Star size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors mb-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="py-12 border-t border-slate-100 bg-slate-50/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100">
                        {[
                            { label: 'Links Audited', value: displayStats.linksAudited },
                            { label: 'Avg Pulse Score', value: displayStats.avgPulseScore },
                            { label: 'Broken Images Found', value: displayStats.brokenImagesFound },
                            { label: 'Clicks Saved', value: displayStats.clicksSaved },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{stat.value}</div>
                                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Features Section */}
            < section id="features" className="py-24 px-6 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10 translate-x-1/2 -translate-y-1/2" />

                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Everything you need for <br /> <span className="text-blue-600">perfect previews</span></h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                            Stop losing traffic to broken metadata. SocialSight gives you the tools to audit, fix, and monitor your social cards.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 bg-white border border-slate-200 rounded-3xl hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ScanFace size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Audits</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                Scan any URL and see exactly how it looks on X, LinkedIn, Facebook, and iMessage. We flag missing tags, wrong sizes, and broken images instantly.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 bg-white border border-slate-200 rounded-3xl hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Code2 size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Copy-Paste Fixes</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                Don't know how to code the meta tags? We generate the exact HTML code you need. Just copy and paste it into your website's head.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 bg-white border border-slate-200 rounded-3xl hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all group">
                            <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Globe2 size={28} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Competitor Spy</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">
                                See what your competitors are doing. Analyze their tags and see how you stack up. Steal their strategies to boost your own CTR.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Leaderboard Section */}
            < section className="py-24 px-6 bg-slate-950 text-white relative overflow-hidden">
                {/* Dark theme background grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Who has the best <br /> <span className="text-blue-500">social cards?</span></h2>
                        <p className="text-slate-400">Discover the best optimized websites and see how you compare</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 p-6 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-4 md:col-span-5">Site</div>
                            <div className="col-span-2 text-center">Score</div>
                            <div className="col-span-2 text-center hidden md:block">Checks</div>
                            <div className="col-span-5 md:col-span-2 text-right">Date</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-slate-800/50">
                            {displayLeaderboard.map((site, i) => (
                                <div key={i} className="grid grid-cols-12 gap-4 p-6 hover:bg-slate-800/30 transition-colors items-center group">
                                    <div className="col-span-1 text-center font-bold text-slate-600 group-hover:text-blue-500 transition-colors">
                                        {i + 1}
                                    </div>
                                    <div className="col-span-4 md:col-span-5 overflow-hidden">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${site.url}&sz=128`}
                                                alt=""
                                                className="w-8 h-8 rounded-lg bg-slate-800 shrink-0"
                                            />
                                            <div className="overflow-hidden">
                                                <div className="font-bold text-base md:text-lg truncate group-hover:text-blue-400 transition-colors">{site.domain}</div>
                                                <div className="text-xs text-slate-500 truncate hidden md:block">{site.url}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold text-sm">
                                            {site.score}/100
                                        </div>
                                    </div>
                                    <div className="col-span-2 hidden md:flex flex-col gap-1 items-center justify-center text-[10px] font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5 w-full max-w-[80px]">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", site.checks.title ? "bg-emerald-500" : "bg-red-500")}></div>
                                            <span>Title</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 w-full max-w-[80px]">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", site.checks.image ? "bg-emerald-500" : "bg-red-500")}></div>
                                            <span>Image</span>
                                        </div>
                                    </div>
                                    <div className="col-span-5 md:col-span-2 text-right text-xs font-medium text-slate-500 group-hover:text-slate-400 transition-colors">
                                        {site.date}
                                    </div>
                                </div>
                            ))}
                        </div>


                    </div>
                </div>
            </section>

            {/* Certified Websites */}
            < section className="py-24 bg-slate-900 relative text-white">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/20 rounded-full text-xs font-medium text-white mb-6 uppercase tracking-wider">
                        Certified Websites
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black mb-6">Get featured with <br /> <span className="text-red-500">verified badge</span></h2>
                    <p className="text-slate-400 text-lg mb-12">Show your visitors you care about details with a live SocialSight badge</p>

                    <div className="flex flex-wrap justify-center gap-4">
                        {/* Real Badges from Leaderboard */}
                        {displayLeaderboard.map((site, i) => {
                            // Determine color based on score or index to add variety if scores are same
                            const colors = ['emerald', 'blue', 'purple', 'orange', 'pink', 'cyan'];
                            // Use hash of domain to pick consistent color, or just score based
                            // For now, let's keep it simple:>95 emerald,>90 blue, else orange?
                            // Or just cycle through for visual flair as requested "modernism"
                            const color = colors[i % colors.length];

                            return (
                                <div key={i} className="group relative flex items-center gap-4 pl-3 pr-6 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/50 rounded-2xl hover:border-slate-700 hover:bg-slate-800/80 transition-all cursor-default shadow-lg shadow-black/20">
                                    {/* Glow Effect */}
                                    <div className={cn("absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none bg-gradient-to-r via-transparent to-transparent", `from-${color}-500`)} />

                                    {/* Score Circle */}
                                    <div className="relative w-12 h-12 flex items-center justify-center">
                                        {/* Background Ring */}
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                className="text-slate-800"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                            {/* Progress Ring */}
                                            <path
                                                className={cn("drop-shadow-sm transition-all duration-1000 ease-out", `text-${color}-500`)}
                                                strokeDasharray={`${site.score}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className={cn("absolute inset-0 flex items-center justify-center text-sm font-black", `text-${color}-500`)}>
                                            {site.score}
                                        </div>
                                    </div>

                                    {/* Text Content */}
                                    <div className="text-left flex flex-col">
                                        <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors tracking-tight">
                                            {site.domain}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className={cn("w-1 h-1 rounded-full", `bg-${color}-500`)} />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Verified Score</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            < section id="pricing" className="py-24 bg-white border-t border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-600 mb-6 uppercase tracking-wider">
                            Pricing
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 text-slate-900">Get your website to <br /> <span className="text-emerald-500">the next level</span></h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Feature List */}
                        <div className="space-y-6 md:py-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Everything You'll Get</h3>
                            {[
                                "Unlimited social audits",
                                "Competitor comparisons",
                                "Social score badge",
                                "Daily automated monitoring",
                                "Preview refresh alerts",
                                "History tracking",
                                "Certified report page",
                                "Copy to LLM"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />
                                    <span className="font-medium text-slate-600">{item}</span>
                                </div>
                            ))}
                        </div>

                        {/* Monthly Card */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center relative hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 transition-all group">
                            <h3 className="text-xl font-bold mb-2 text-slate-900">Monthly</h3>
                            <div className="text-5xl font-black mb-2 flex items-baseline gap-1 text-slate-900">
                                $5 <span className="text-base font-medium text-slate-500">/month</span>
                            </div>
                            <button
                                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY)}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold mt-8 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                            >
                                Subscribe Monthly
                            </button>
                            <p className="text-xs text-slate-500 mt-4 font-medium">Cancel anytime</p>
                        </div>

                        {/* Lifetime Card */}
                        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-8 flex flex-col items-center text-center relative shadow-2xl shadow-emerald-900/10">
                            <div className="absolute -top-4 px-4 py-1 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/30">
                                Most Popular
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-slate-900">Lifetime</h3>
                            <div className="text-5xl font-black mb-2 flex items-baseline gap-1 text-slate-900">
                                $35 <span className="text-base font-medium text-slate-500">One time</span>
                            </div>
                            <button
                                onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD)}
                                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold mt-8 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                            >
                                Get Lifetime Access
                            </button>
                            <p className="text-xs text-slate-500 mt-4 font-medium">No subscription • One time payment</p>
                        </div>
                    </div>

                    {/* Featured Spot */}
                    <div className="max-w-md mx-auto mt-16 bg-slate-50 border border-slate-200 rounded-3xl p-8 pt-12 text-center relative group hover:border-blue-500/50 transition-colors">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2 shadow-sm shadow-blue-500/10">
                            <Star size={12} className="fill-blue-500 text-blue-500" /> Featured Spot
                        </div>
                        <h3 className="text-xl font-bold mt-2 mb-2 text-slate-900">Be seen where it matters</h3>
                        <p className="text-sm text-slate-500 mb-6">Your website will be featured on the landing page and in the leaderboard</p>
                        <div className="text-4xl font-black mb-6 flex justify-center items-baseline gap-1 text-slate-900">
                            $25 <span className="text-base font-medium text-slate-500">/month</span>
                        </div>
                        <button
                            onClick={() => setShowFeaturedModal(true)}
                            className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform shadow-sm"
                        >
                            Get Featured
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            < footer className="py-12 bg-white border-t border-slate-100 text-center">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2 font-black text-lg tracking-tighter opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full">
                            <span className="text-xs font-black italic">S</span>
                        </div>
                        <span className="text-slate-900">Social<span className="text-blue-600">Sight</span></span>
                    </div>

                    {/* Featured Verification Modal */}
                    {showFeaturedModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                    <h3 className="font-black text-xl text-slate-900">Get Verified</h3>
                                    <button
                                        onClick={() => setShowFeaturedModal(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="p-4 bg-blue-50 text-blue-900 text-sm font-medium rounded-xl border border-blue-100 flex gap-3">
                                        <Shield className="shrink-0 text-blue-600" size={20} />
                                        <p>You verify your site. We grant you the badge. Unlock premium trust signals for your visitors.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Website URL</label>
                                            <input
                                                id="websiteUrl"
                                                type="text"
                                                placeholder="https://yourwebsite.com"
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Company Name</label>
                                        <input
                                            id="companyName"
                                            type="text"
                                            placeholder="Acme Inc."
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Short Description</label>
                                        <textarea
                                            id="description"
                                            placeholder="The best way to..."
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-medium resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="pt-2">
                                        <button
                                            onClick={async (e) => {
                                                const btn = e.currentTarget;
                                                const originalText = btn.innerHTML;
                                                btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>`;
                                                btn.setAttribute('disabled', 'true');

                                                try {
                                                    const websiteUrl = (document.getElementById('websiteUrl') as HTMLInputElement).value;
                                                    const companyName = (document.getElementById('companyName') as HTMLInputElement).value;
                                                    const description = (document.getElementById('description') as HTMLTextAreaElement).value;

                                                    const res = await fetch('/api/checkout-featured', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ websiteUrl, companyName, description })
                                                    });

                                                    const data = await res.json();
                                                    if (data.url) {
                                                        window.location.href = data.url;
                                                    } else {
                                                        alert('Error: ' + (data.error || 'Unknown error'));
                                                        btn.innerHTML = originalText;
                                                        btn.removeAttribute('disabled');
                                                    }
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Something went wrong. Please try again.');
                                                    btn.innerHTML = originalText;
                                                    btn.removeAttribute('disabled');
                                                }
                                            }}
                                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10 disabled:opacity-70 disabled:pointer-events-none"
                                        >
                                            <CreditCard size={18} />
                                            Proceed to Checkout ($25)
                                        </button>
                                        <p className="text-center text-xs text-slate-400 mt-4 font-medium">
                                            Secure payment via Stripe • One-time fee
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="text-slate-500 text-sm font-medium">
                        © {new Date().getFullYear()} SocialSight. All rights reserved.
                    </div>

                    <div className="flex gap-6 text-slate-500 text-sm font-bold">
                        <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-blue-600 transition-colors">Terms</a>
                        <a href="https://x.com/ryan_tetro" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Twitter</a>
                    </div>
                </div>
            </footer>
        </main>
    );
}
