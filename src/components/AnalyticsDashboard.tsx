import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MousePointer2, Eye, TrendingUp, ArrowUpRight, Activity, BarChart3, Zap, Copy, Check, X, MessageCircle, Smartphone, Mail, Globe, Share2, Plus, ArrowLeft, ExternalLink, Loader2, Shield, Laptop, Tablet, RefreshCw, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import MetaSnippet from './MetaSnippet';

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
    is_verified?: boolean;
    logo_url?: string;
    favicon_url?: string;
    site_title?: string;
}

interface ABStats {
    variant: string;
    impressions: number;
    audits: number;
    conversionRate: number;
}

export default function AnalyticsDashboard() {
    // View State
    const [view, setView] = useState<'list' | 'detail' | 'setup'>('list');
    const [sites, setSites] = useState<Site[]>([]);
    const [currentSite, setCurrentSite] = useState<Site | null>(null);
    const [isLoadingSites, setIsLoadingSites] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false); // New state for background data fetching

    // Detail View State
    const [timeRange, setTimeRange] = useState('7d');
    const [stats, setStats] = useState<DailyStats[]>([]);
    const [events, setEvents] = useState<EventLog[]>([]);
    const [totals, setTotals] = useState({ impressions: 0, clicks: 0, ctr: 0 });
    const [topSources, setTopSources] = useState<{ name: string, value: number, color: string }[]>([]);

    // New Analytics Features State
    const [topPages, setTopPages] = useState<{ path: string, count: number, percent: number }[]>([]);
    const [deviceStats, setDeviceStats] = useState<{ name: string, value: number, color: string }[]>([]);
    const [countryStats, setCountryStats] = useState<{ code: string, name: string, count: number, percent: number }[]>([]);
    const [abStats, setAbStats] = useState<ABStats[]>([]);
    const [pricingStats, setPricingStats] = useState<ABStats[]>([]);

    // Colors for consistency: Twitter(black), LinkedIn(blue), FB(royal), Direct(slate), Google(red), etc.
    const SOURCE_COLORS: Record<string, string> = {
        'twitter': '#1DA1F2', // Twitter Blue (or X black, user preference? sticking to blue for recognition or black for brand?) User showed black in screenshot initially, but maybe prefers blue? actually X is black. Let's stick to user's 'Twitter' label. 
        'x': '#000000',
        'linkedin': '#0077b5',
        'facebook': '#1877f2',
        'direct': '#64748b',
        'google': '#ea4335',
        'imessage': '#34c759',
        'whatsapp': '#25d366',
        'search': '#fbbc05',
        'referral': '#8b5cf6', // Violet for generic referral
        'other': '#94a3b8'
    };

    // Setup State
    const [setupStep, setSetupStep] = useState<'input' | 'checklist' | 'install'>('input');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [newSiteId, setNewSiteId] = useState('');
    const [installStatus, setInstallStatus] = useState<'waiting' | 'verifying' | 'success' | 'error'>('waiting');
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [isCreatingSite, setIsCreatingSite] = useState(false);

    // Meta Customization State
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDesc, setMetaDesc] = useState('');
    const [metaImage, setMetaImage] = useState('');
    const [metaFavicon, setMetaFavicon] = useState('');
    const [isInspecting, setIsInspecting] = useState(false);

    // Link Builder State
    const [linkBuilderPlatform, setLinkBuilderPlatform] = useState('imessage');
    const [linkCopied, setLinkCopied] = useState(false);

    // Fetch Sites on Mount
    useEffect(() => {
        const fetchSites = async () => {
            setIsLoadingSites(true);

            // 1. Try Local Storage first (for instant feedback)
            const savedSites = localStorage.getItem('analytics_sites_list');
            if (savedSites) {
                try {
                    setSites(JSON.parse(savedSites));
                    setIsLoadingSites(false); // Show cached content immediately
                } catch (e) {
                    console.error('Failed to parse saved sites:', e);
                }
            }

            // 2. Fetch from DB (Source of Truth)
            const { data, error } = await supabase
                .from('analytics_sites')
                .select('*')
                .eq('is_verified', true)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Check if data actually changed before updating state to avoid blink
                // const dataStr = JSON.stringify(data);
                // if (dataStr !== savedSites) {
                setSites(data);
                localStorage.setItem('analytics_sites_list', JSON.stringify(data));
                // }
            }

            setIsLoadingSites(false);
        };
        fetchSites();
    }, []);

    // Sync currentSite with sites array (for background updates)
    useEffect(() => {
        if (currentSite && sites.length > 0) {
            // Priority 1: Match by ID (Normal case)
            let updated = sites.find(s => s.id === currentSite.id);

            // Priority 2: Match by Domain (Migration case: ID changed in DB but local cache has old ID)
            if (!updated) {
                updated = sites.find(s => s.domain === currentSite.domain);
                if (updated) {
                    console.log('🔄 Analytics: Detected ID change for site. Syncing...', { old: currentSite.id, new: updated.id });
                }
            }

            if (updated) {
                const hasChanged = updated.id !== currentSite.id ||
                    updated.site_title !== currentSite.site_title ||
                    updated.logo_url !== currentSite.logo_url ||
                    updated.favicon_url !== currentSite.favicon_url ||
                    updated.is_verified !== currentSite.is_verified;

                if (hasChanged) {
                    setCurrentSite(updated);
                }
            }
        }
    }, [sites, currentSite]);

    // Branding Auto-Repair: Harvest missing favicons/titles for ANY site in the list
    useEffect(() => {
        const repairAllBranding = async () => {
            // Only repair sites that are verified but missing critical branding
            const sitesToRepair = sites.filter(s => s.is_verified && (!s.favicon_url || !s.site_title));
            if (sitesToRepair.length === 0) return;

            // Limit concurrency to prevent creating a massive request waterfall
            const batch = sitesToRepair.slice(0, 3);

            for (const site of batch) {
                try {
                    let inspectUrl = site.domain;
                    if (!inspectUrl.startsWith('http')) inspectUrl = `https://${inspectUrl}`;

                    const res = await fetch('/api/inspect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: inspectUrl })
                    });
                    const json = await res.json();

                    if (json.metadata?.favicon || json.metadata?.title) {
                        await supabase
                            .from('analytics_sites')
                            .update({
                                favicon_url: json.metadata.favicon || null,
                                site_title: json.metadata.title || null,
                                logo_url: json.metadata.ogImage || null
                            })
                            .eq('id', site.id);

                        // Update local state to reflect change immediately
                        setSites(prev => {
                            const newSites = prev.map(ps => ps.id === site.id ? {
                                ...ps,
                                favicon_url: json.metadata.favicon || ps.favicon_url,
                                site_title: json.metadata.title || ps.site_title,
                                logo_url: json.metadata.ogImage || ps.logo_url
                            } : ps);
                            localStorage.setItem('analytics_sites_list', JSON.stringify(newSites));
                            return newSites;
                        });
                    }
                } catch (e) {
                    console.error('Branding repair failed for', site.domain, e);
                }
            }
        };

        if (sites.length > 0) {
            repairAllBranding();
        }
    }, [sites.length]);

    // --- Detail View Logic ---

    // Load Data for Current Site
    useEffect(() => {
        if (view === 'detail' && currentSite) {
            loadDashboardData(currentSite.id);
        }
    }, [view, currentSite, timeRange]);

    const loadDashboardData = async (siteId: string) => {
        setIsRefreshing(true);

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

        // 1. Try Cache First (SWR)
        const cacheKey = `analytics_events_${siteId}_${timeRange}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const { events, totals, stats, topSources, topPages, deviceStats, countryStats } = JSON.parse(cached);
                setEvents(events);
                setTotals(totals);
                setStats(stats);
                setTopSources(topSources || []);
                setTopPages(topPages || []);
                setDeviceStats(deviceStats || []);
                setCountryStats(countryStats || []);
                setAbStats(abStats || []);
                // Don't stop refreshing yet, we still want to fetch fresh data
            } catch (e) {
                console.error('Cache parse error', e);
            }
        }

        // Fetch Stats
        const { data: eventsData } = await supabase
            .from('analytics_events')
            .select('*')
            .eq('site_id', siteId)
            .eq('is_bot', false)
            .gte('created_at', cutoff.toISOString())
            .order('created_at', { ascending: false });

        if (!eventsData) {
            console.log('📊 Dashboard: No Events Return from DB', { siteId });
            setIsRefreshing(false);
            return;
        }

        console.log('📊 Dashboard Data Loaded:', {
            siteId,
            eventsCount: eventsData.length,
            sample: eventsData[0]
        });

        // Process Totals
        // Process Totals
        // For simple OpenGraph tracking, a 'page_view' IS an impression of the page.
        // If we have separate 'impression' events later (e.g. from social cards), we can add them.
        const impressions = eventsData.filter(e => e.event_type === 'impression' || e.event_type === 'page_view').length;
        const clicks = eventsData.filter(e => e.event_type === 'click').length;
        const ctr = impressions > 0 ? ((clicks / impressions) * 100) : 0;

        const newTotals = {
            impressions,
            clicks,
            ctr: parseFloat(ctr.toFixed(1))
        };
        setTotals(newTotals);

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
                if (timeRange === '30d') key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            chartMap.set(key, { name: key, impressions: 0, clicks: 0, timestamp: d.getTime() });
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

            if (chartMap.has(key)) {
                const entry = chartMap.get(key);
                if (e.event_type === 'impression' || e.event_type === 'page_view') entry.impressions++;
                else entry.clicks++;
            }
        });

        const newStats = Array.from(chartMap.values());
        setStats(newStats);

        // Process Top Sources
        const sourceCounts: Record<string, number> = {};
        eventsData.forEach(e => {
            if (e.event_type === 'page_view') {
                const src = e.source || 'direct';
                sourceCounts[src] = (sourceCounts[src] || 0) + 1;
            }
        });

        const sortedSources = Object.entries(sourceCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4)
            .map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: count,
                color: SOURCE_COLORS[name.toLowerCase()] || '#94a3b8'
            }));

        setTopSources(sortedSources);

        // Process Top Pages
        const pageCounts: Record<string, number> = {};
        eventsData.forEach(e => {
            if (e.event_type === 'page_view') {
                const path = e.path || '/';
                pageCounts[path] = (pageCounts[path] || 0) + 1;
            }
        });
        const topPagesList = Object.entries(pageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([path, count]) => ({
                path,
                count,
                percent: impressions > 0 ? Math.round((count / impressions) * 100) : 0
            }));
        setTopPages(topPagesList);

        // Process Devices
        let mobile = 0;
        let desktop = 0;
        eventsData.forEach(e => {
            if (e.event_type === 'page_view') {
                const ua = (e.user_agent || '').toLowerCase();
                const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua);
                if (isMobile) mobile++;
                else desktop++;
            }
        });
        const deviceData = [
            { name: 'Desktop', value: desktop, color: '#3b82f6' }, // Blue
            { name: 'Mobile', value: mobile, color: '#f59e0b' }   // Amber
        ].filter(d => d.value > 0);
        setDeviceStats(deviceData);

        // Process Countries
        const countryCounts: Record<string, number> = {};
        eventsData.forEach(e => {
            if (e.event_type === 'page_view') {
                const c = e.country || 'Unknown';
                countryCounts[c] = (countryCounts[c] || 0) + 1;
            }
        });
        const countryList = Object.entries(countryCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({
                code: 'US', // Simple placeholder, real flag logic requires a mapping lib
                name,
                count,
                percent: impressions > 0 ? Math.round((count / impressions) * 100) : 0
            }));
        setCountryStats(countryList);

        // Process A/B Experiments (Landing vs Pricing)
        const abMap: Record<string, { impressions: number, audits: number }> = {
            'A': { impressions: 0, audits: 0 },
            'B': { impressions: 0, audits: 0 }
        };
        const pMap: Record<string, { impressions: number, audits: number }> = {
            'A': { impressions: 0, audits: 0 },
            'B': { impressions: 0, audits: 0 }
        };

        eventsData.forEach(e => {
            // Landing Variant
            const variant = e.ab_variant || (e.params?.ab_variant as string) || 'none';
            if (variant === 'A' || variant === 'B') {
                if (e.event_type === 'page_view' || e.event_type === 'impression') {
                    abMap[variant].impressions++;
                } else if (e.event_type === 'click' && ((e.params?.text as string)?.includes('audit-btn'))) {
                    abMap[variant].audits++;
                }
            }

            // Pricing Variant
            const pVariant = e.pricing_variant || (e.params?.pricing_variant as string) || 'none';
            if (pVariant === 'A' || pVariant === 'B') {
                if (e.event_type === 'page_view' || e.event_type === 'impression') {
                    pMap[pVariant].impressions++;
                } else if (e.event_type === 'click' && ((e.params?.text as string)?.includes('audit-btn'))) {
                    pMap[pVariant].audits++;
                }
            }
        });

        const abList: ABStats[] = Object.entries(abMap).map(([variant, data]) => ({
            variant: `Landing ${variant}`,
            impressions: data.impressions,
            audits: data.audits,
            conversionRate: data.impressions > 0 ? parseFloat(((data.audits / data.impressions) * 100).toFixed(1)) : 0
        }));
        setAbStats(abList);

        const pList: ABStats[] = Object.entries(pMap).map(([variant, data]) => ({
            variant: `Pricing ${variant}`,
            impressions: data.impressions,
            audits: data.audits,
            conversionRate: data.impressions > 0 ? parseFloat(((data.audits / data.impressions) * 100).toFixed(1)) : 0
        }));
        setPricingStats(pList);

        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
            events: recent,
            totals: newTotals,
            stats: newStats,
            topSources: sortedSources,
            topPages: topPagesList,
            deviceStats: deviceData,
            countryStats: countryList,
            abStats: abList,
            timestamp: Date.now()
        }));

        setIsRefreshing(false);
    };

    // --- Setup Logic ---

    const handleStartSetup = () => {
        setSetupStep('input');
        setView('setup');
    };

    const handleSaveBranding = async () => {
        if (!newSiteId) return;

        try {
            await supabase
                .from('analytics_sites')
                .update({
                    site_title: metaTitle || null,
                    logo_url: metaImage || null,
                    favicon_url: metaFavicon || null
                })
                .eq('id', newSiteId);
        } catch (e) {
            console.error('Failed to save branding:', e);
        }

        setSetupStep('install');
    };

    const handleCreateSite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trackingUrl) return;

        setIsCreatingSite(true);
        const siteId = `pp_${crypto.randomUUID().slice(0, 8)}`;

        try {
            const res = await fetch('/api/sites/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    domain: trackingUrl,
                    site_id: siteId,
                    logo_url: metaImage || null,
                    favicon_url: metaFavicon || null
                })
            });
            const json = await res.json();

            if (json.success) {
                setNewSiteId(siteId);
                setIsInspecting(true);
                try {
                    let inspectUrl = trackingUrl;
                    if (!inspectUrl.startsWith('http')) inspectUrl = `https://${inspectUrl}`;

                    const inspectRes = await fetch('/api/inspect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: inspectUrl })
                    });

                    const inspectJson = await inspectRes.json();

                    if (inspectJson.metadata) {
                        const m = inspectJson.metadata;
                        setMetaTitle(m.title || '');
                        setMetaDesc(m.description || '');
                        setMetaImage(m.ogImage || '');
                        setMetaFavicon(m.favicon || '');
                    }
                } catch (e) {
                    console.error('Inspection failed:', e);
                } finally {
                    setIsInspecting(false);
                }
                setSetupStep('checklist');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreatingSite(false);
        }
    };

    const startVerification = async () => {
        setInstallStatus('verifying');
        setVerificationError(null);

        try {
            const res = await fetch('/api/sites/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: trackingUrl, site_id: newSiteId })
            });

            const json = await res.json();

            if (json.success) {
                setInstallStatus('success');
                const verifiedSite = {
                    id: newSiteId,
                    domain: trackingUrl,
                    created_at: new Date().toISOString(),
                    is_verified: true,
                    site_title: metaTitle || null,
                    logo_url: metaImage || null,
                    favicon_url: metaFavicon || null
                } as Site;

                setSites(prev => [verifiedSite, ...prev]);
                localStorage.setItem('analytics_sites_list', JSON.stringify([verifiedSite, ...sites]));

                setTimeout(() => {
                    setCurrentSite(verifiedSite);
                    setView('detail');
                    setInstallStatus('waiting');
                    setTrackingUrl('');
                    setNewSiteId('');
                }, 1500);
            } else {
                setInstallStatus('error');
                setVerificationError(json.error || 'Could not find the pixel.');
                setTimeout(() => setInstallStatus('waiting'), 3000);
            }
        } catch (err) {
            setInstallStatus('error');
            setVerificationError('Network error.');
            setTimeout(() => setInstallStatus('waiting'), 3000);
        }
    };

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
                                <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Step 1 of 3</div>
                                <h3 className="text-2xl font-black text-slate-900">Where are we installing this?</h3>
                                <p className="text-slate-500 font-medium">Enter the domain you want to track.</p>
                            </div>

                            <form onSubmit={handleCreateSite} className="space-y-4">
                                <input
                                    type="text"
                                    value={trackingUrl}
                                    onChange={(e) => setTrackingUrl(e.target.value)}
                                    placeholder="yourwebsite.com"
                                    className="w-full px-6 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!trackingUrl || isCreatingSite}
                                    className="w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isCreatingSite || isInspecting ? <Loader2 className="animate-spin text-blue-600" /> : 'Continue'}
                                </button>
                            </form>
                        </div>
                    )}

                    {setupStep === 'checklist' && (
                        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 animate-in slide-in-from-right-8 fade-in duration-500 text-left">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 mb-2">
                                        <button onClick={() => setSetupStep('input')} className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-blue-600 transition-colors">
                                            <ArrowLeft size={16} />
                                        </button>
                                        <div className="text-xs font-bold uppercase tracking-widest text-blue-600">Step 2 of 3</div>
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900">Customize Your Tags</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">Fill in the details for your homepage to generate the perfect social meta tags.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Page Title (og:title)</label>
                                        <input
                                            type="text"
                                            value={metaTitle}
                                            onChange={(e) => setMetaTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-600 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Description (og:description)</label>
                                        <textarea
                                            value={metaDesc}
                                            onChange={(e) => setMetaDesc(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-600 transition-all resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Image URL (og:image)</label>
                                        <input
                                            type="text"
                                            value={metaImage}
                                            onChange={(e) => setMetaImage(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-600 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 space-y-4">
                                    <button
                                        onClick={handleSaveBranding}
                                        className="w-full px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        Done! Show me the code <ArrowUpRight size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <MetaSnippet title={metaTitle} description={metaDesc} image={metaImage} url={trackingUrl} siteId={newSiteId} />
                            </div>
                        </div>
                    )}

                    {setupStep === 'install' && (
                        <div className="max-w-4xl w-full space-y-8 animate-in slide-in-from-right-8 fade-in duration-500 text-left">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 mb-2">
                                    <button onClick={() => setSetupStep('checklist')} className="p-1 hover:bg-white rounded-md text-slate-400 hover:text-blue-600 transition-colors">
                                        <ArrowLeft size={16} />
                                    </button>
                                    <div className="text-xs font-bold uppercase tracking-widest text-blue-600">Step 3 of 3</div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">Install Tracking Script</h3>
                                <p className="text-slate-500 font-medium">Add this code to the &lt;head&gt; of {trackingUrl}.</p>
                            </div>

                            <MetaSnippet title={metaTitle} description={metaDesc} image={metaImage} url={trackingUrl} siteId={newSiteId} />

                            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Activity size={18} className="text-blue-600" /> Connection Status
                                </h4>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-3 h-3 rounded-full",
                                                installStatus === 'waiting' ? "bg-yellow-400 animate-pulse" :
                                                    installStatus === 'verifying' ? "bg-blue-600 animate-bounce" :
                                                        installStatus === 'error' ? "bg-red-500" : "bg-green-500"
                                            )} />
                                            <span className="text-sm font-bold text-slate-900">
                                                {installStatus === 'waiting' ? "Waiting..." : installStatus === 'verifying' ? "Checking..." : installStatus === 'error' ? "Failed" : "Connected!"}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={startVerification}
                                        disabled={installStatus === 'verifying' || installStatus === 'success'}
                                        className={cn(
                                            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                                            installStatus === 'success' ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-black"
                                        )}
                                    >
                                        {installStatus === 'waiting' && 'Verify Installation'}
                                        {installStatus === 'verifying' && 'Checking...'}
                                        {installStatus === 'success' && 'Verified'}
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
            <div className="animate-fade-in space-y-6 md:space-y-8 pb-32">
                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                            <Activity className="text-blue-600 shrink-0" /> Analytics Engine
                        </h2>
                        <p className="text-slate-500 font-medium mt-1 text-sm md:text-base">Manage your connected sites and data sources.</p>
                    </div>
                    <button
                        onClick={handleStartSetup}
                        className="relative z-10 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20 active:scale-95 shrink-0"
                    >
                        <Plus size={18} /> Connect New Site
                    </button>
                </div>

                {isLoadingSites ? (
                    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                ) : (
                    <>
                        {sites.length === 0 ? (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] p-8 md:p-20 text-center flex flex-col items-center justify-center min-h-[400px]">
                                <BarChart3 className="w-10 h-10 text-blue-600 mb-6" />
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">Unlock Your Data</h3>
                                <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed max-w-md mx-auto mb-8">
                                    Install our smart tracking pixel to see real-time social traffic and conversion metrics.
                                </p>
                                <button
                                    onClick={handleStartSetup}
                                    className="w-full md:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Zap className="fill-white" /> Connect Your Site
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                {sites.map((site, i) => (
                                    <div
                                        key={site.id}
                                        onClick={() => { setCurrentSite(site); setView('detail'); }}
                                        className="group bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer relative overflow-hidden animate-fade-in-up"
                                        style={{ animationDelay: `${i * 50}ms` }}
                                    >
                                        <div className="absolute top-0 right-0 p-32 bg-slate-50 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-blue-50/50 pointer-events-none" />

                                        <div className="p-6 md:p-8 relative z-10">
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                                    <img
                                                        src={site.favicon_url || (site.domain.includes('socialsight.dev') ? '/favicon.png' : `https://${site.domain}/favicon.ico`)}
                                                        alt=""
                                                        className="w-5 h-5 rounded object-contain"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            if (site.domain.includes('socialsight.dev')) {
                                                                target.src = '/favicon.png';
                                                            } else {
                                                                target.src = `https://www.google.com/s2/favicons?domain=${site.domain}&sz=64`;
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    <ArrowUpRight size={20} />
                                                </div>
                                            </div>

                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1 truncate">
                                                {site.site_title || site.domain}
                                            </h3>
                                            <div className="flex items-center gap-2 mb-6 text-slate-500 font-medium text-xs">
                                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                                                <span className="truncate">{site.domain}</span>
                                            </div>

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
                    </>
                )}
            </div>
        );
    }

    // 3. Detail View (Dashboard)
    if (!currentSite) return null;

    if (!currentSite.is_verified) {
        return (
            <div className="animate-fade-in space-y-8 pb-32">
                <button
                    onClick={() => setView('list')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
                </button>

                <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-12 flex flex-col items-center text-center space-y-6">
                    <Shield className="text-blue-600" size={40} />
                    <div className="space-y-2 max-w-md">
                        <h2 className="text-3xl font-black text-slate-900">Activation Required</h2>
                        <p className="text-slate-500 font-medium">Analytics are locked for <b>{currentSite.domain}</b> because the tracking pixel hasn't been verified yet.</p>
                    </div>
                    <button
                        onClick={() => {
                            setTrackingUrl(currentSite.domain);
                            setNewSiteId(currentSite.id);
                            setSetupStep('checklist');
                            setView('setup');
                        }}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                        Resume Setup
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in pb-32">
            <div className="bg-white p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-200 shadow-sm animate-fade-in relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-3 md:gap-6">
                        <button
                            onClick={() => setView('list')}
                            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all shrink-0 border border-slate-100 shadow-sm"
                        >
                            <ArrowLeft size={18} />
                        </button>

                        <div className="min-w-0 flex-1">
                            <h2 className={cn("text-xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight truncate transition-opacity", isRefreshing && "opacity-50")}>
                                {currentSite?.site_title || currentSite?.domain}
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex items-center text-slate-400 font-medium text-[10px] md:text-sm">
                                    <img
                                        src={currentSite?.favicon_url || (currentSite?.domain.includes('socialsight.dev') ? '/favicon.png' : `https://${currentSite?.domain}/favicon.ico`)}
                                        alt=""
                                        className="w-3.5 h-3.5 md:w-5 md:h-5 rounded-sm mr-2 shrink-0 object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (currentSite?.domain.includes('socialsight.dev')) {
                                                target.src = '/favicon.png';
                                            } else {
                                                target.src = `https://www.google.com/s2/favicons?domain=${currentSite?.domain}&sz=64`;
                                            }
                                        }}
                                    />
                                    <span className="truncate max-w-[120px] md:max-w-none font-semibold text-slate-500">{currentSite?.domain}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-600 text-[10px] font-black uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 w-full lg:w-auto">
                        <div className="flex-1 lg:flex-initial flex bg-slate-50 p-1.5 rounded-xl border border-slate-100/80 shadow-inner">
                            {['24h', '7d', '30d'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={cn(
                                        "flex-1 lg:px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        timeRange === range ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => currentSite && loadDashboardData(currentSite.id)}
                            className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:shadow-md active:scale-95 transition-all shrink-0"
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className={cn(isRefreshing && "animate-spin text-blue-600")} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-2 max-w-lg">
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Share2 className="text-indigo-600" size={20} /> Smart Link Builder
                        </h3>
                        <p className="text-slate-500 font-medium text-sm">Generate a tracked link for sharing.</p>
                    </div>

                    <div className="flex flex-col gap-4 w-full xl:w-auto">
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full">
                            {[{ id: 'imessage', icon: MessageCircle, label: 'iMessage' }, { id: 'whatsapp', icon: Smartphone, label: 'WhatsApp' }, { id: 'email', icon: Mail, label: 'Email' }, { id: 'other', icon: Globe, label: 'Other' }].map((p) => (
                                <button key={p.id} onClick={() => setLinkBuilderPlatform(p.id)} className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", linkBuilderPlatform === p.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500")}>
                                    <p.icon size={16} /> <span className="hidden sm:inline">{p.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-mono flex-1 truncate">?utm_source={linkBuilderPlatform}</code>
                            <button onClick={handleCopyLink} className={cn("px-4 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-lg", linkCopied ? "bg-green-500" : "bg-slate-900")}>
                                {linkCopied ? 'Copied!' : 'Copy Link'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Total Impressions</div>
                        {/* Fix: Don't show X.Xk decimal for small numbers below 1000. It looks like 0.0k. */}
                        <div className="text-5xl font-black">
                            {isRefreshing ? (
                                <div className="h-12 w-32 bg-slate-800 rounded animate-pulse" />
                            ) : (
                                totals.impressions >= 1000
                                    ? `${(totals.impressions / 1000).toFixed(1)}k`
                                    : totals.impressions.toLocaleString()
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Unique Clicks</div>
                    <div className="text-5xl font-black text-slate-900">
                        {isRefreshing ? (
                            <div className="h-12 w-24 bg-slate-100 rounded animate-pulse" />
                        ) : (
                            totals.clicks.toLocaleString()
                        )}
                    </div>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Avg. CTR</div>
                    <div className="text-5xl font-black text-slate-900">
                        {isRefreshing ? (
                            <div className="h-12 w-28 bg-slate-100 rounded animate-pulse" />
                        ) : (
                            `${totals.ctr.toFixed(1)}%`
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <h3 className="text-xl font-bold text-slate-900 mb-8">Performance History</h3>
                    <div className="h-64 w-full">
                        {isRefreshing ? (
                            <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse flex items-center justify-center">
                                <Loader2 className="animate-spin text-slate-200" size={32} />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
                                    <Area type="monotone" dataKey="impressions" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorImpressions)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Traffic Sources</h3>
                        <div className="space-y-4">
                            {isRefreshing ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /><div className="h-4 w-8 bg-slate-100 rounded animate-pulse" /></div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /><div className="h-4 w-8 bg-slate-100 rounded animate-pulse" /></div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /><div className="h-4 w-8 bg-slate-100 rounded animate-pulse" /></div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                                    </div>
                                </>
                            ) : (
                                topSources.map((p, i) => {
                                    // Fix: Sources % should be based on TOTAL Impressions (or page views), not "Unique Clicks" (which are 0)
                                    // If click tracking is sparse, source ratio is better calculated vs total traffic.
                                    const safePercent = totals.impressions > 0 ? Math.round((p.value / totals.impressions) * 100) : 0;
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm font-bold">
                                                <span className="text-slate-600">{p.name}</span>
                                                <span className="text-slate-900">{safePercent}%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${safePercent}%`, backgroundColor: p.color }} />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    <div className="bg-zinc-950 p-6 rounded-[2rem] text-white shadow-xl flex flex-col h-[400px]">
                        <h3 className="font-bold flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 mb-6 shrink-0">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Live Feed
                        </h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {events.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-xs shrink-0">{item.platform[0]}</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="font-bold text-zinc-200">{item.platform}Bot</span>
                                            <span className="text-[10px] text-zinc-600 font-mono">{item.time}</span>
                                        </div>
                                        <div className="text-zinc-500 text-xs">{item.action}</div>
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs italic gap-2 opacity-50">
                                    <div className="w-8 h-8 rounded-full border border-zinc-800 border-dashed animate-spin" />
                                    Waiting for events...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Professional Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Pages Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <ArrowUpRight size={18} />
                        </div>
                        Top Pages
                    </h3>
                    <div className="space-y-5 relative z-10">
                        {isRefreshing ? (
                            <>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between"><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /><div className="h-4 w-12 bg-slate-100 rounded animate-pulse" /></div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                                    </div>
                                ))}
                            </>
                        ) : (
                            topPages.length > 0 ? topPages.map((page, i) => (
                                <div key={i} className="group/item">
                                    <div className="flex justify-between text-sm font-medium mb-2 items-center">
                                        <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 truncate max-w-[180px] group-hover/item:border-blue-200 group-hover/item:text-blue-700 transition-colors">
                                            {page.path}
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-slate-900 font-bold">{page.count}</span>
                                            <span className="text-slate-400 text-xs">({page.percent}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out" style={{ width: `${page.percent}%` }} />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-slate-400 text-sm font-medium italic py-4 flex flex-col items-center justify-center gap-2">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                        <ArrowUpRight size={24} />
                                    </div>
                                    No page views yet
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Device Breakdown Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Smartphone size={18} />
                        </div>
                        Devices
                    </h3>
                    <div className="h-56 relative z-10 flex flex-col items-center justify-center">
                        {isRefreshing ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-32 h-32 rounded-full border-8 border-slate-100 animate-pulse border-t-indigo-100" />
                            </div>
                        ) : (
                            deviceStats.length > 0 ? (
                                <div className="w-full h-full flex flex-col items-center">
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie
                                                data={deviceStats}
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                                cornerRadius={4}
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                {deviceStats.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={entry.name === 'Mobile' ? '#f59e0b' : '#6366f1'}
                                                        stroke="none"
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px' }}
                                                formatter={(value: any) => [`${value} Users`, '']}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex justify-center gap-6 mt-2">
                                        {deviceStats.map((d, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: d.name === 'Mobile' ? '#f59e0b' : '#6366f1' }} />
                                                {d.name} <span className="opacity-50 ml-0.5">({Math.round((d.value / (deviceStats.reduce((a, b) => a + b.value, 0))) * 100)}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm font-medium italic">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                        <Laptop size={24} />
                                    </div>
                                    No device data
                                </div>
                            )
                        )}
                        {/* Center Legend */}
                        {!isRefreshing && deviceStats.length > 0 && (
                            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <span className="font-black text-3xl text-slate-900 block">{deviceStats.reduce((a, b) => a + b.value, 0)}</span>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Total</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Geographic Locations Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 relative z-10">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Globe size={18} />
                        </div>
                        Locations
                    </h3>
                    <div className="space-y-5 relative z-10">
                        {isRefreshing ? (
                            <>
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between"><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /><div className="h-4 w-8 bg-slate-100 rounded animate-pulse" /></div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full animate-pulse" />
                                    </div>
                                ))}
                            </>
                        ) : (
                            countryStats.length > 0 ? countryStats.map((c, i) => (
                                <div key={i} className="group/item">
                                    <div className="flex justify-between text-sm font-medium mb-2">
                                        <span className="text-slate-700 flex items-center gap-2 font-bold">
                                            {c.name}
                                        </span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-slate-900 font-bold">{c.count}</span>
                                            <span className="text-slate-400 text-xs">({c.percent}%)</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${c.percent}%` }} />
                                    </div>
                                </div>
                            )) : (
                                <div className="text-slate-400 text-sm font-medium italic py-4 flex flex-col items-center justify-center gap-2">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-2">
                                        <Globe size={24} />
                                    </div>
                                    No location data
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Active Experiments Section */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm mt-8 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                            <Scale size={20} />
                        </div>
                        Active Experiments
                    </h3>
                    <div className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-100">
                        Live Test
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                    {[...abStats, ...pricingStats].map((stat, i) => (
                        <div key={i} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 space-y-6">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{stat.variant}</span>
                                <div className="text-2xl font-black text-purple-600">{stat.conversionRate}% <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Conv.</span></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impressions</div>
                                    <div className="text-xl font-black text-slate-1000">{stat.impressions.toLocaleString()}</div>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audits</div>
                                    <div className="text-xl font-black text-slate-1000">{stat.audits.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                                <div
                                    className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${stat.conversionRate}%` }}
                                />
                            </div>
                        </div>
                    ))}
                    {abStats.length === 0 && pricingStats.length === 0 && (
                        <div className="col-span-2 py-12 text-center text-slate-400 italic font-medium">
                            Waiting for experimental data...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
