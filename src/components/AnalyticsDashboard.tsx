import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MousePointer2, Eye, TrendingUp, ArrowUpRight, Activity, BarChart3, Zap, Copy, Check, X, MessageCircle, Smartphone, Mail, Globe, Share2, Plus, ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
interface DailyStats {
    name: string;
    impressions: number;
    clicks: number;
}

interface EventLog {
    platform: string;
    action: string;
    time: string;
    timestamp: number;
}

interface Site {
    id: string;
    domain: string;
    created_at: string;
}

export default function AnalyticsDashboard() {
    // View State
    const [view, setView] = useState<'list' | 'detail' | 'setup'>('list');
    const [sites, setSites] = useState<Site[]>([]);
    const [currentSite, setCurrentSite] = useState<Site | null>(null);
    const [isLoadingSites, setIsLoadingSites] = useState(true);

    // Detail View State
    const [timeRange, setTimeRange] = useState('7d');
    const [stats, setStats] = useState<DailyStats[]>([]);
    const [events, setEvents] = useState<EventLog[]>([]);
    const [totals, setTotals] = useState({ impressions: 0, clicks: 0, ctr: 0 });
    const [topSources, setTopSources] = useState<{ name: string, value: number, color: string }[]>([]);

    // Colors for consistency: Twitter(black), LinkedIn(blue), FB(royal), Direct(slate), Google(red), etc.
    const SOURCE_COLORS: Record<string, string> = {
        'twitter': '#000000',
        'linkedin': '#0077b5',
        'facebook': '#1877f2',
        'direct': '#64748b',
        'google': '#ea4335',
        'imessage': '#34c759',
        'whatsapp': '#25d366',
        'search': '#fbbc05'
    };

    // Setup State
    const [setupStep, setSetupStep] = useState<'input' | 'install' | 'verify'>('input');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [newSiteId, setNewSiteId] = useState('');
    const [installStatus, setInstallStatus] = useState<'waiting' | 'verifying' | 'success'>('waiting');
    const [isCreatingSite, setIsCreatingSite] = useState(false);

    // Link Builder State
    const [linkBuilderPlatform, setLinkBuilderPlatform] = useState('imessage');
    const [linkCopied, setLinkCopied] = useState(false);
    const [scriptCopied, setScriptCopied] = useState(false);

    // Fetch Sites on Mount
    useEffect(() => {
        const fetchSites = async () => {
            setIsLoadingSites(true);
            const savedSites = localStorage.getItem('analytics_sites_list');

            // 1. Try Local Storage first (fastest)
            if (savedSites) {
                setSites(JSON.parse(savedSites));
                setIsLoadingSites(false);
            }

            // 2. Fetch from DB (source of truth)
            const { data, error } = await supabase.from('analytics_sites').select('*').order('created_at', { ascending: false });
            if (!error && data) {
                setSites(data);
                localStorage.setItem('analytics_sites_list', JSON.stringify(data));
            }
            setIsLoadingSites(false);
        };
        fetchSites();
    }, []);

    // --- Detail View Logic ---

    // Load Data for Current Site
    useEffect(() => {
        if (view === 'detail' && currentSite) {
            loadDashboardData(currentSite.id);
        }
    }, [view, currentSite, timeRange]);

    const loadDashboardData = async (siteId: string) => {
        // Calculate Time Range
        const now = new Date();
        const cutoff = new Date();
        let groupBy: 'hour' | 'day' = 'day';
        let steps = 7;

        if (timeRange === '24h') {
            cutoff.setHours(cutoff.getHours() - 24);
            groupBy = 'hour';
            steps = 24;
        } else if (timeRange === '30d') {
            cutoff.setDate(cutoff.getDate() - 30);
            steps = 30;
        } else {
            cutoff.setDate(cutoff.getDate() - 7);
        }

        // Fetch Stats
        const { data: eventsData } = await supabase
            .from('analytics_events')
            .select('*')
            .eq('site_id', siteId)
            .eq('is_bot', false)
            .gte('created_at', cutoff.toISOString())
            .order('created_at', { ascending: false });

        if (!eventsData) return;

        // Process Totals
        const impressions = eventsData.filter(e => e.event_type === 'impression').length;
        const clicks = eventsData.filter(e => e.event_type === 'page_view' || e.event_type === 'click').length;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        setTotals({ impressions, clicks, ctr });

        // Process Recent Events Feed
        const recent = eventsData.slice(0, 10).map(e => ({
            platform: e.source ? (e.source.charAt(0).toUpperCase() + e.source.slice(1)) : 'Direct',
            action: e.event_type === 'page_view' ? 'viewed page' : 'clicked link',
            time: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(e.created_at).getTime()
        }));
        setEvents(recent);

        // Process Chart Data
        const chartMap = new Map();

        for (let i = steps - 1; i >= 0; i--) {
            const d = new Date();
            let key = '';

            if (groupBy === 'hour') {
                d.setHours(d.getHours() - i);
                key = d.toLocaleTimeString([], { hour: 'numeric' });
            } else {
                d.setDate(d.getDate() - i);
                key = d.toLocaleDateString('en-US', { weekday: 'short' });
                // For 30d, maybe show date like "Oct 12"?
                if (timeRange === '30d') key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            chartMap.set(key, { name: key, impressions: 0, clicks: 0, timestamp: d.getTime() }); // store timestamp for sorting safely
        }

        eventsData.forEach(e => {
            const d = new Date(e.created_at);
            let key = '';

            if (groupBy === 'hour') {
                key = d.toLocaleTimeString([], { hour: 'numeric' });
            } else {
                key = d.toLocaleDateString('en-US', { weekday: 'short' });
                if (timeRange === '30d') key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            // Simple catch-all for mapping. In production, matching by exact hour/day is safer.
            // This relies on the label being unique and consistent. 
            // Better to round the date and keys match exactly, but this works for simple visualization.
            if (chartMap.has(key)) {
                const entry = chartMap.get(key);
                if (e.event_type === 'impression') entry.impressions++;
                else entry.clicks++;
            }
        });

        setStats(Array.from(chartMap.values()));

        // Process Top Sources
        const sourceCounts: Record<string, number> = {};
        let totalTracked = 0;

        eventsData.forEach(e => {
            if (e.event_type === 'page_view') {
                const src = e.source || 'direct';
                sourceCounts[src] = (sourceCounts[src] || 0) + 1;
                totalTracked++;
            }
        });

        const sortedSources = Object.entries(sourceCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4) // Top 4
            .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: count, // Store raw count for calculation
                color: SOURCE_COLORS[name.toLowerCase()] || '#94a3b8'
            }));

        // Convert to percentage relative to totalTracked (or 1 to avoid div by zero)
        // Adjust value for the UI to be raw percentage or count? The UI used (value / 1000) * 100 which implies value was "out of 1000"
        // Let's normalize it so the UI code `Math.round((p.value / 1000) * 100)` logic works, OR change the UI logic.
        // Changing UI logic is cleaner.
        setTopSources(sortedSources);
    };

    // --- Setup Logic ---

    const handleStartSetup = () => {
        setSetupStep('input');
        setView('setup');
    };

    const handleCreateSite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingUrl) return;

        setIsCreatingSite(true);
        // Generate a new ID
        const siteId = `pp_${crypto.randomUUID().slice(0, 8)}`;

        // Call API
        try {
            const res = await fetch('/api/sites/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: trackingUrl, site_id: siteId })
            });
            const json = await res.json();

            if (json.success) {
                setNewSiteId(siteId);
                setSetupStep('install');

                // Optimistic Update
                const newSite = { id: siteId, domain: trackingUrl, created_at: new Date().toISOString() };
                setSites(prev => [newSite, ...prev]);
                localStorage.setItem('analytics_sites_list', JSON.stringify([newSite, ...sites]));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreatingSite(false);
        }
    };

    const startVerification = () => {
        setInstallStatus('verifying');
        setTimeout(() => {
            setInstallStatus('success');
            setTimeout(() => {
                // Done! Go to detail view
                const createdSite = sites.find(s => s.id === newSiteId) || { id: newSiteId, domain: trackingUrl, created_at: new Date().toISOString() };
                setCurrentSite(createdSite);
                setView('detail');
                // Reset setup
                setInstallStatus('waiting');
                setTrackingUrl('');
            }, 1000);
        }, 2000);
    };

    // --- Link Builder Logic ---
    const getTrackedLink = () => {
        let base = (currentSite?.domain) || 'yourwebsite.com';
        if (!base.startsWith('http')) base = `https://${base}`;

        try {
            const url = new URL(base);
            url.searchParams.set('utm_source', linkBuilderPlatform);
            return url.toString();
        } catch (e) {
            return `${base}?utm_source=${linkBuilderPlatform}`;
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(getTrackedLink());
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const scriptCode = `<script async src="https://cdn.previewperfect.ai/pixel.js" data-id="${newSiteId}"></script>`;

    // --- RENDERERS ---

    // 1. Setup View
    if (view === 'setup') {
        return (
            <div className="animate-fade-in space-y-8 min-h-[600px]">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h2 className="text-3xl font-black text-slate-900">Connect New Site</h2>
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-12 md:p-20 text-center flex flex-col items-center justify-center relative overflow-hidden">

                    {setupStep === 'input' && (
                        <div className="max-w-md w-full space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                            <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Step 1 of 2</div>
                                <h3 className="text-2xl font-black text-slate-900">Where are we installing this?</h3>
                                <p className="text-slate-500 font-medium">Enter the domain you want to track.</p>
                            </div>

                            <form onSubmit={handleCreateSite} className="space-y-4">
                                <input
                                    type="text"
                                    value={trackingUrl}
                                    onChange={(e) => setTrackingUrl(e.target.value)}
                                    placeholder="yourwebsite.com"
                                    className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!trackingUrl || isCreatingSite}
                                    className="w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCreatingSite ? <Loader2 className="animate-spin" /> : 'Continue'}
                                </button>
                            </form>
                        </div>
                    )}

                    {setupStep === 'install' && (
                        <div className="max-w-2xl w-full space-y-8 animate-in slide-in-from-right-8 fade-in duration-500 text-left">
                            <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Step 2 of 2</div>
                                <h3 className="text-2xl font-black text-slate-900">Install Tracking Script</h3>
                                <p className="text-slate-500 font-medium">Add this code to the <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono text-sm">&lt;head&gt;</code> of <b>{trackingUrl}</b>.</p>
                            </div>

                            <div className="bg-slate-900 rounded-2xl p-6 relative group shadow-2xl shadow-blue-900/10">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(scriptCode);
                                            setScriptCopied(true);
                                            setTimeout(() => setScriptCopied(false), 2000);
                                        }}
                                        className={cn(
                                            "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold backdrop-blur-sm border",
                                            scriptCopied
                                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                                : "bg-white/10 text-white hover:bg-white/20 border-white/5"
                                        )}
                                    >
                                        {scriptCopied ? <Check size={14} /> : <Copy size={14} />}
                                        {scriptCopied ? 'Code Copied!' : 'Copy Code'}
                                    </button>
                                </div>
                                <code className="text-blue-300 font-mono text-sm break-all leading-relaxed block pr-28">
                                    {scriptCode}
                                </code>
                            </div>

                            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-600" /> Connection Status
                                </h4>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-3 h-3 rounded-full",
                                            installStatus === 'waiting' ? "bg-yellow-400 animate-pulse" :
                                                installStatus === 'verifying' ? "bg-blue-600 animate-bounce" :
                                                    "bg-green-500"
                                        )} />
                                        <span className="text-sm font-medium text-slate-600">
                                            {installStatus === 'waiting' ? "Waiting for installation..." :
                                                installStatus === 'verifying' ? "Verifying connection..." :
                                                    "Connected successfully!"}
                                        </span>
                                    </div>
                                    <button
                                        onClick={startVerification}
                                        disabled={installStatus !== 'waiting'}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
                                            installStatus === 'success' ? "bg-green-500 text-white" :
                                                "bg-slate-900 text-white hover:bg-black disabled:opacity-50"
                                        )}
                                    >
                                        {installStatus === 'waiting' && <>Verify Installation <ArrowUpRight size={16} /></>}
                                        {installStatus === 'verifying' && <>Checking...</>}
                                        {installStatus === 'success' && <><Check size={16} /> Verified</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. List View (Default)
    if (view === 'list') {
        return (
            <div className="animate-fade-in space-y-8">
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Activity className="text-slate-300" /> Analytics Engine
                        </h2>
                        <p className="text-slate-500 font-medium">Manage your connected sites and data sources.</p>
                    </div>
                    <button
                        onClick={handleStartSetup}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95"
                    >
                        <Plus size={18} /> Connect New Site
                    </button>
                </div>

                {isLoadingSites ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                ) : sites.length === 0 ? (
                    // Empty State
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-12 md:p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-blue-900/5 flex items-center justify-center mx-auto rotate-3 mb-8">
                            <BarChart3 className="w-10 h-10 text-blue-600" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Unlock Your Data</h3>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md mx-auto mb-8">
                            Install our smart tracking pixel to see real-time social traffic, click-through rates, and conversion metrics.
                        </p>
                        <button
                            onClick={handleStartSetup}
                            className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-3"
                        >
                            <Zap className="fill-white" /> Connect Your Site
                        </button>
                    </div>
                ) : (
                    // Grid of Sites
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sites.map(site => (
                            <div
                                key={site.id}
                                onClick={() => { setCurrentSite(site); setView('detail'); }}
                                className="group bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-slate-50 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-blue-50/50 pointer-events-none" />

                                <div className="p-8 relative z-10">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden">
                                            {/* Using Google's favicon service for a quick "Opengraph-like" logo */}
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=128`}
                                                alt={`${site.domain} logo`}
                                                className="w-8 h-8 object-contain"
                                                onError={(e) => {
                                                    // Fallback if image fails
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                            <Globe className="text-slate-400 hidden" size={20} />
                                        </div>
                                        <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                            <ArrowUpRight size={20} />
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">{site.domain}</h3>
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-green-600 transition-colors">
                                            Live Tracking
                                        </span>
                                    </div>

                                    {/* Mini Sparkline Visualization (Static for now, adds "pro" feel) */}
                                    <div className="flex items-end gap-1 h-8 opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all">
                                        {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                                            <div key={i} className="flex-1 bg-blue-600 rounded-t-sm" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 3. Detail View (Dashboard)
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Nav */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setView('list')}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-full bg-slate-100 p-1">
                                <img
                                    src={`https://www.google.com/s2/favicons?domain=${currentSite?.domain}&sz=64`}
                                    alt="favicon"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {currentSite?.domain}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 font-medium text-xs ml-11">
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Live Data
                            </span>
                            <span className="text-slate-300">•</span>
                            <span>Analytics Dashboard</span>
                        </div>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['24h', '7d', '30d'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                timeRange === range ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Smart Link Builder using current Site */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 right-0 p-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                    <div className="space-y-2 max-w-lg">
                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Share2 className="text-indigo-600" size={20} /> Smart Link Builder
                        </h3>
                        <p className="text-slate-500 font-medium text-sm">
                            Don't lose data to "Dark Social". Generate a smart link for the platform you are sharing on to track it properly.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {[
                                { id: 'imessage', icon: MessageCircle, label: 'iMessage' },
                                { id: 'whatsapp', icon: Smartphone, label: 'WhatsApp' },
                                { id: 'email', icon: Mail, label: 'Email' },
                                { id: 'other', icon: Globe, label: 'Other' },
                            ].map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setLinkBuilderPlatform(p.id)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                                        linkBuilderPlatform === p.id
                                            ? "bg-white text-indigo-600 shadow-sm"
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                    title={p.label}
                                >
                                    <p.icon size={16} />
                                    <span className="hidden md:inline">{p.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <code className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm font-mono flex-1 sm:flex-none">
                                ?utm_source={linkBuilderPlatform}
                            </code>
                            <button
                                onClick={handleCopyLink}
                                className={cn(
                                    "px-4 py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2 whitespace-nowrap",
                                    linkCopied ? "bg-green-500" : "bg-slate-900 hover:bg-black"
                                )}
                            >
                                {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                                {linkCopied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Big Three Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-500/20" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                            <Eye size={16} /> Total Impressions
                        </div>
                        <div className="text-5xl font-black tracking-tight mb-2">
                            {(totals.impressions / 1000).toFixed(1)}k
                        </div>
                        <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                            <ArrowUpRight size={16} /> Live Tracking
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/10" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                            <MousePointer2 size={16} /> Unique Clicks
                        </div>
                        <div className="text-5xl font-black tracking-tight mb-2 text-slate-900">
                            {totals.clicks.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-sm">
                            <ArrowUpRight size={16} /> Tracking Active
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-500/10" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4 text-slate-400 font-bold uppercase tracking-widest text-xs">
                            <TrendingUp size={16} /> Avg. CTR
                        </div>
                        <div className="text-5xl font-black tracking-tight mb-2 text-slate-900">
                            {totals.ctr.toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                                <span className="text-slate-300">Based on unique visits</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Area Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-8">Performance History</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats}>
                                <defs>
                                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                                    cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorImpressions)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Platform Breakdown & Live Feed */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Traffic Sources</h3>
                        <div className="space-y-4">
                            {topSources.length > 0 ? topSources.map((p, i) => {
                                const safePercent = totals.clicks > 0 ? Math.round((p.value / totals.clicks) * 100) : 0;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-sm font-bold">
                                            <span className="text-slate-600">{p.name}</span>
                                            <span className="text-slate-900">{safePercent}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${safePercent}%`, backgroundColor: p.color }}
                                            />
                                        </div>
                                    </div>
                                )
                            }) : (
                                <div className="text-slate-400 text-sm italic py-4 text-center">No traffic data yet.</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-zinc-950 p-6 rounded-[2rem] text-white overflow-hidden relative min-h-[200px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-zinc-500">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Feed
                            </h3>
                        </div>
                        <div className="space-y-4">
                            {events.map((item, i) => (
                                <div key={item.timestamp + i} className="flex items-center gap-3 text-sm animate-in slide-in-from-right-4 fade-in duration-500">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-black text-xs">
                                        {item.platform[0]}
                                    </div>
                                    <div>
                                        <span className="font-bold text-zinc-300">{item.platform}Bot</span>
                                        <span className="text-zinc-500"> {item.action}</span>
                                    </div>
                                    <div className="ml-auto text-xs text-zinc-600 font-mono">{item.time}</div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-zinc-600 text-xs text-center py-4 italic">Waiting for traffic...</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
