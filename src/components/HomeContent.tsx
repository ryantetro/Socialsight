
"use client";

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ScraperForm from './ScraperForm';
import SocialPreviews from '@/components/SocialPreviews';
import ScoreAudit from '@/components/ScoreAudit';
import AISuggestions from '@/components/AISuggestions';
import MetaSnippet from './MetaSnippet';
import ImageStudio from './ImageStudio';
import GuardianEnrollment from './GuardianEnrollment';
import CompetitorBoard from '@/components/CompetitorBoard';
import Dashboard from '@/components/Dashboard';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ScanHistory from '@/components/ScanHistory';
import { Share2, Zap, Shield, BarChart3, ArrowLeft, LayoutDashboard, Code, Image as ImageIcon, Scale, Activity, PieChart, CheckCircle2, Lock, Clock, X, Twitter, Linkedin, Facebook, MessageSquare, ImageOff } from 'lucide-react';
import { InspectionResult } from '@/types';
import { cn } from '@/lib/utils';
import PlanPill from '@/components/PlanPill';
import LockedFeature from '@/components/LockedFeature';

import { useProfile } from '@/hooks/useProfile';

import { createClient } from '@/lib/supabase/client';
import DebugPlanSwitcher from '@/components/DebugPlanSwitcher';
import UserNav from '@/components/UserNav';


import VictoryModal from '@/components/VictoryModal';

export default function HomeContent() {
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [abVariant, setAbVariant] = useState<'A' | 'B' | null>(null);
  const [pricingVariant, setPricingVariant] = useState<'A' | 'B' | null>(null);
  const [globalStats, setGlobalStats] = useState<{ totalScans: number, activity: any[] }>({ totalScans: 13530, activity: [] });
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const [shouldRenderNotification, setShouldRenderNotification] = useState(false);
  const [isStealth, setIsStealth] = useState(false);

  // Initialize from localStorage immediately if possible, but safely for SSR.
  const [activeTab, setActiveTabState] = useState<'audit' | 'fix' | 'compare' | 'monitor' | 'analytics' | 'history'>('audit');
  const [selectedUrl, setSelectedUrl] = useState('');

  // Persistence: Read on mount
  useEffect(() => {
    const saved = localStorage.getItem('socialsight_active_tab');
    if (saved && ['audit', 'fix', 'compare', 'monitor', 'analytics', 'history'].includes(saved)) {
      setActiveTabState(saved as any);
    }

    const stealth = localStorage.getItem('ss_stealth_mode') === 'true';
    setIsStealth(stealth);
  }, []);

  // Persistence: Write on change
  const setActiveTab = (tab: 'audit' | 'fix' | 'compare' | 'monitor' | 'analytics' | 'history') => {
    setActiveTabState(tab);
    localStorage.setItem('socialsight_active_tab', tab);
  };

  const mainPriceId = pricingVariant === 'B'
    ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ALL_ACCESS
    : process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD;

  const mainPriceLabel = pricingVariant === 'B' ? '$9' : '$99';


  const [debugTier, setDebugTier] = useState<{ active: boolean, tier: any }>({ active: false, tier: 'free' });

  const { user: realUser, profile, loading: authLoading, isPaid: realIsPaid, permissions: realPermissions, refresh } = useProfile();

  // Handle Debug Overrides
  const isDebugSignedOut = debugTier.active && debugTier.tier === 'signed-out';
  const user = isDebugSignedOut ? null : realUser;

  // Determine if user has the new All-Access one-time tier
  const hasAllAccess = profile?.tier === 'agency' && profile?.stripe_subscription_id?.startsWith('price_1SlEVY');

  // Use debug tier if active, otherwise fallback to real profile tier
  const effectiveTier = debugTier.active
    ? (isDebugSignedOut ? 'free' : debugTier.tier)
    : (profile?.tier || 'free');

  // isPaid check should also consider the All-Access one-time payment
  // Note: the profile logic might already map the tier based on webhook, but we'll be safe here.

  // BLOCKING: If auth is loading (fetching profile), show loader.
  // This prevents the "Free Tier" flash and ensures 'Agency' is ready before rendering content.

  // Recalculate permissions based on effective tier
  const permissions = {
    canMonitor: effectiveTier !== 'free' && !isDebugSignedOut,
    canBenchmark: effectiveTier !== 'free' && !isDebugSignedOut,
    canAnalyze: (effectiveTier === 'growth' || effectiveTier === 'agency') && !isDebugSignedOut,
    canFix: effectiveTier !== 'free' && !isDebugSignedOut,
    canRemoveBranding: effectiveTier === 'agency' && !isDebugSignedOut,
    dailyLimit: effectiveTier === 'free' ? 3 : Infinity
  };

  const isPaid = effectiveTier !== 'free' && !isDebugSignedOut;

  const [scanCount, setScanCount] = useState(0);

  const searchParams = useSearchParams();
  const scanId = searchParams.get('scanId');

  useEffect(() => {
    const view = searchParams.get('view');
    const success = searchParams.get('success');

    if (view && ['audit', 'fix', 'compare', 'monitor', 'analytics', 'history'].includes(view)) {
      setActiveTab(view as any);
    }

    if (success === 'true' && refresh) {
      refresh();
    }

    // Clear parameters from URL so they don't persist or interfere with manual tab switching
    if (view || success) {
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 100);
    }
  }, [searchParams, refresh]);

  useEffect(() => {
    // Check daily scan limit
    const saved = localStorage.getItem('daily_scans');
    if (saved) {
      const { date, count } = JSON.parse(saved);
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        setScanCount(count);
      } else {
        localStorage.setItem('daily_scans', JSON.stringify({ date: today, count: 0 }));
        setScanCount(0);
      }
    }
  }, []);

  // Load scan from ID if provided
  useEffect(() => {
    const loadScan = async () => {
      if (!scanId || result) return; // Don't reload if we already have a result or no ID

      const supabase = createClient();
      const { data, error } = await supabase
        .from('scans')
        .select('result')
        .eq('id', scanId)
        .single();

      if (data && data.result) {
        setResult(data.result as InspectionResult);
        // Optional: Remove query param so refreshing doesn't stick? 
        // Or keep it for shareability (if we allowed sharing).
      } else if (error) {
        console.error("Error loading scan:", error);
        // Could redirect or toast here
      }
    };

    loadScan();
  }, [scanId]);

  // A/B Variant Assignment
  useEffect(() => {
    // Landing Page Variant
    let variant = localStorage.getItem('ss_ab_variant') as 'A' | 'B' | null;
    if (!variant) {
      variant = Math.random() > 0.5 ? 'B' : 'A';
      localStorage.setItem('ss_ab_variant', variant);
    }
    setAbVariant(variant);
    (window as any).SS_VARIANT = variant;

    // Pricing Variant
    let pVariant = localStorage.getItem('ss_pricing_variant') as 'A' | 'B' | null;
    if (!pVariant) {
      pVariant = Math.random() > 0.5 ? 'B' : 'A';
      localStorage.setItem('ss_pricing_variant', pVariant);
    }
    setPricingVariant(pVariant);
    (window as any).SS_PRICING_VARIANT = pVariant;
  }, []);

  // Load Social Proof Stats
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const res = await fetch('/api/stats/summary');
        const data = await res.json();
        if (data.totalScans) {
          setGlobalStats(data);
        }
      } catch (e) {
        console.error('Failed to fetch global stats', e);
      }
    };
    fetchGlobalStats();
    // Refresh activity every 30s
    const interval = setInterval(fetchGlobalStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cycle Live Notifications
  useEffect(() => {
    if (globalStats.activity.length === 0) return;

    const cycle = () => {
      setIsNotificationVisible(false);
      setTimeout(() => {
        // ONLY show if we are on the landing page state
        if (!result && activeTab === 'audit') {
          setCurrentNotificationIndex(prev => (prev + 1) % globalStats.activity.length);
          setIsNotificationVisible(true);
        }
      }, 500);
    };

    // Initial show
    const timer = setTimeout(() => {
      if (!result && activeTab === 'audit') {
        setIsNotificationVisible(true);
      }
    }, 3000);

    const interval = setInterval(cycle, 12000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    }
  }, [globalStats.activity, result, activeTab]);

  // Kill notification if user leaves landing page
  useEffect(() => {
    if (result || activeTab !== 'audit') {
      setIsNotificationVisible(false);
    }
  }, [result, activeTab]);

  // Handle Notification Rendering Lifecycle (for animations)
  useEffect(() => {
    if (isNotificationVisible) {
      setShouldRenderNotification(true);
    } else {
      const timer = setTimeout(() => setShouldRenderNotification(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isNotificationVisible]);

  // Restore last scan from localStorage if none present
  useEffect(() => {
    if (result) return;
    const saved = localStorage.getItem('last_scan_result');
    if (saved) {
      try {
        setResult(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to restore last scan", e);
      }
    }
  }, []);

  const incrementScan = () => {
    const newCount = scanCount + 1;
    setScanCount(newCount);
    localStorage.setItem('daily_scans', JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      count: newCount
    }));
  };

  const isLimitReached = permissions ? scanCount >= permissions.dailyLimit : false;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleResult = (data: InspectionResult) => {
    setIsTransitioning(true);
    setTimeout(async () => {
      setResult(data);
      // Save result for restoration
      localStorage.setItem('last_scan_result', JSON.stringify(data));

      // Note: We do NOT insert into DB here anymore because the /api/inspect endpoint
      // already calls recordScore() which inserts the scan. This prevents double-counting.

      setActiveTab('audit');
      setIsTransitioning(false);
      incrementScan();

      // Trigger Victory Modal if score is high and user is free
      if (data.score >= 90 && !isPaid) {
        setTimeout(() => {
          setShowVictoryModal(true);
        }, 2000);
      }

    }, 300);
  };

  const handleViewReport = async () => {
    // 1. If we already have a result, just scroll to it
    if (result) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab('audit'); // Ensure we are on audit tab
      return;
    }

    setIsRestoring(true);
    setIsTransitioning(true);

    try {
      // 2. Try to restore from Database (if logged in)
      if (user) {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('scans')
          .select('result')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && data.result) {
          // Add a slight artificial delay for the transition to feel smooth
          setTimeout(() => {
            setResult(data.result as InspectionResult);
            setActiveTab('audit');
            setIsRestoring(false);
            setIsTransitioning(false);
          }, 300);
          return;
        }
      }

      // 3. Try to restore from localStorage
      const saved = localStorage.getItem('last_scan_result');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setTimeout(() => {
            setResult(data);
            setActiveTab('audit');
            setIsRestoring(false);
            setIsTransitioning(false);
          }, 300);
          return;
        } catch (e) {
          console.error("Failed to restore result", e);
        }
      } else {
        // No history found
        setTimeout(() => {
          alert("No recent scan found.");
          setIsRestoring(false);
          setIsTransitioning(false);
        }, 300);
      }
    } catch (err) {
      console.error("Error in handleViewReport:", err);
      setIsRestoring(false);
      setIsTransitioning(false);
    }
  };

  const reset = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setResult(null);
      localStorage.removeItem('last_scan_result');
      setActiveTab('audit');
      setIsTransitioning(false);
    }, 300);
  };

  const handleCheckout = async (priceId: string | undefined, targetView?: string) => {
    if (!user) {
      let loginUrl = '/login?priceId=' + priceId;
      if (targetView) loginUrl += '&view=' + targetView;
      window.location.href = loginUrl;
      return;
    }

    if (!priceId) {
      if (user) {
        // If logged in and clicking Free, just redirect to dashboard or show info
        window.location.href = '/dashboard';
      } else {
        // If not logged in and clicking Free, redirect to login
        window.location.href = '/login';
      }
      return;
    }

    try {
      // Pass targetView to the checkout API if needed, BUT for now 
      // the API (actions.ts) handles redirect based on form data in the LOGIN flow.
      // For direct checkout (already logged in), we need to ensure the SUCCESS url 
      // also has the view param. 
      // However, the current /api/checkout implementation might need update 
      // if it handles the stripe session creation directly.
      // CHECK: The user provided actions.ts handles the post-auth redirect.
      // Does /api/checkout use shared logic? 
      // If /api/checkout is a route handler, we might need to update it too.
      // Let's assume for now we just pass it in body if strictly needed, 
      // OR we just rely on the fact that if they are logged in, 
      // they stay on the page or get redirected? 
      // Wait, if they are logged in, this calls /api/checkout.
      // If /api/checkout redirects to Stripe, we want Stripe to redirect back to /?view=...

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, view: targetView })
      });

      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error("Checkout Failed", e);
      alert("Checkout Failed: " + (e instanceof Error ? e.message : "Unknown Error"));
    }
  };



  const tabs = [
    { id: 'audit', icon: LayoutDashboard, label: 'Audit', visible: true },
    { id: 'fix', icon: Zap, label: 'Fix Mode', fill: true, visible: !!result },
    { id: 'compare', icon: Scale, label: 'Compare', visible: !!result },
    { id: 'monitor', icon: Activity, label: 'Monitor', visible: true },
    { id: 'analytics', icon: PieChart, label: 'Analytics', visible: true },
    { id: 'history', icon: Clock, label: 'History', visible: true }
  ].filter(tab => tab.visible);

  // BLOCKING: If auth is loading (fetching profile), show loader.
  // This prevents the "Free Tier" flash and ensures 'Agency' is ready before rendering content.
  // Placed HERE to avoid React Hook Order errors (hooks must be called unconditionally).
  if (authLoading && !debugTier.active) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Profile...</p>
      </div>
    </div>;
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">

      <DebugPlanSwitcher
        currentTier={effectiveTier}
        onTierChange={async (tier) => {
          // 1. Optimistic Update
          setDebugTier({ active: true, tier });

          // 2. Persist to Database if user is logged in
          if (user && tier !== 'signed-out') {
            try {
              await fetch('/api/debug/set-tier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier })
              });
              // Refresh profile to confirm
              if (refresh) refresh();
            } catch (e) {
              console.error('Debug: Failed to persist tier', e);
            }
          }
        }}
        currentVariant={abVariant}
        onVariantChange={(variant) => {
          setAbVariant(variant);
          localStorage.setItem('ss_ab_variant', variant);
          (window as any).SS_VARIANT = variant;
        }}
        currentPricingVariant={pricingVariant}
        onPricingVariantChange={(variant) => {
          setPricingVariant(variant);
          localStorage.setItem('ss_pricing_variant', variant);
          (window as any).SS_PRICING_VARIANT = variant;
        }}
        isStealth={isStealth}
        onStealthChange={(active) => {
          setIsStealth(active);
          localStorage.setItem('ss_stealth_mode', active.toString());
        }}
      />

      <VictoryModal
        isOpen={showVictoryModal}
        onClose={() => setShowVictoryModal(false)}
        onUpgrade={() => handleCheckout(mainPriceId, 'monitor')}
        onEnableAnalytics={() => {
          setShowVictoryModal(false);
          setActiveTab('fix'); // Send them to fix mode to get tags/image
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }}
        pricingVariant={pricingVariant}
      />

      {/* Dynamic Header/Navbar */}

      <nav className={cn(
        "max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between transition-all duration-700 ease-in-out z-50",
        result ? "sticky top-0" : "bg-transparent py-6"
      )}>

        {/* SECTION 1: Logo & Scan */}
        <div className="flex items-center gap-4 min-w-0 shrink-0 z-20 md:flex-1">
          <div
            onClick={reset}
            role="button"
            className="flex items-center gap-2 font-black text-2xl tracking-tighter cursor-pointer group shrink-0"
          >
            <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20 z-10 relative">
              <span className="text-lg font-black italic">S</span>
            </div>

            {/* Animated Logo Text */}
            <div className={cn(
              "overflow-hidden transition-all duration-700 ease-in-out flex flex-col justify-center",
              result ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
            )}>
              <span className="hidden lg:inline whitespace-nowrap">Social<span className="text-blue-600">Sight</span></span>
            </div>
          </div>

          {result && (
            <div className="hidden lg:block animate-fade-in">
              <ScraperForm onResult={handleResult} variant="compact" limitReached={isLimitReached} align="left" />
            </div>
          )}
        </div>

        {/* SECTION 2: Center Navigation (Tabs or Links) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex justify-center z-30 w-full pointer-events-none">
          <div className="pointer-events-auto">
            {(result || activeTab !== 'audit') ? (
              <div className="hidden md:flex bg-white/80 backdrop-blur-xl border border-slate-200/50 p-1.5 rounded-2xl shadow-sm items-center gap-1 animate-fade-in">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 border border-transparent",
                      activeTab === tab.id
                        ? "bg-white text-blue-600 shadow-sm border-slate-100"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
                    )}
                  >
                    <tab.icon size={14} className={cn(tab.fill && activeTab === tab.id && "fill-blue-600")} />
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="hidden lg:flex bg-white/50 backdrop-blur-sm border border-slate-200/50 rounded-full px-6 py-2.5 items-center gap-8 font-bold text-sm text-slate-500 shadow-sm animate-fade-in">
                <a href="#features" className="hover:text-blue-600 transition-colors">Utility</a>
                <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Right Actions */}
        <div className="flex items-center justify-end gap-3 shrink-0 z-20 flex-1">
          {user ? (
            <div className="flex items-center gap-3">
              {result && !isPaid && (
                <button
                  onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD)}
                  className="hidden xl:flex px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap"
                >
                  Upgrade Plan
                </button>
              )}
              <UserNav
                user={user}
                tier={effectiveTier}
                isPaid={isPaid}
                onViewReport={handleViewReport}
                onViewHistory={() => setActiveTab('history')}
                onViewDashboard={() => setActiveTab('monitor')}
                onViewAnalytics={() => setActiveTab('analytics')}
                isLoading={isRestoring}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <a href="/login" className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
                Sign In
              </a>
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  // Focus the input (with a slight delay to let scroll start)
                  setTimeout(() => document.getElementById('url-input')?.focus(), 100);
                }}
                data-track="nav-get-started-btn"
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-black/10 hover:translate-y-[-1px] transition-all"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </nav >

      {/* Pro Banner - Hide if Paid */}
      {
        !isPaid && (
          <div className="bg-slate-900 text-white text-center py-3 px-4 text-xs font-bold uppercase tracking-widest relative overflow-hidden group cursor-pointer"
            onClick={() => handleCheckout(mainPriceId)}
            role="button">
            <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              <Zap size={14} className="fill-yellow-400 text-yellow-400 animate-pulse" />
              {pricingVariant === 'B'
                ? `Experimental Offer: Grab All-Access for ${mainPriceLabel}`
                : `Launch Special: Grab Lifetime Deal for ${mainPriceLabel}`}
              <span className="hidden sm:inline opacity-50 mx-2">|</span>
              <span className="hidden sm:inline text-slate-300 group-hover:text-white transition-colors">Prices increase in 48h</span>
            </span>
          </div>
        )
      }

      {/* Hero Section */}
      <section className={cn(
        "transition-all duration-1000 ease-in-out overflow-hidden relative",
        result || activeTab !== 'audit' ? "max-h-0 opacity-0 py-0" : "max-h-[1200px] pt-12 md:pt-16 pb-20 md:pb-32 px-6 opacity-100"
      )}>
        {abVariant === 'B' ? (
          /* GROWTH HERO (Variant B) - 2 Column */
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Column 1: Copy & Form */}
            <div className="space-y-10 relative">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-black uppercase tracking-widest border border-blue-100 animate-fade-in">
                  <Zap size={12} className="fill-blue-600" />
                  {globalStats.totalScans.toLocaleString()}+ links audited this week
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-slate-900 leading-[0.95]">
                  Your link preview might be <span className="text-blue-600 italic">broken</span>.
                </h1>
                <p className="text-lg md:text-2xl text-slate-500 max-w-xl font-medium leading-relaxed">
                  Most founders leak clicks without realizing it. Paste your URL to see exactly what investors and customers see on X, LinkedIn, and iMessage.
                </p>
              </div>

              <div className="space-y-6">
                <ScraperForm
                  onResult={handleResult}
                  limitReached={isLimitReached}
                  prefillUrl={selectedUrl}
                />

                <div className="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 select-none">Try:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: 'Stripe', url: 'https://stripe.com', logo: '/stripe.png', color: 'hover:text-[#635BFF] hover:border-[#635BFF]/30' },
                      { name: 'Vercel', url: 'https://vercel.com', logo: '/vercel.png', color: 'hover:text-black hover:border-black/30' },
                      { name: 'Airbnb', url: 'https://airbnb.com', logo: '/airbnb.png', color: 'hover:text-[#FF5A5F] hover:border-[#FF5A5F]/30' }
                    ].map((sample) => (
                      <button
                        key={sample.name}
                        onClick={() => setSelectedUrl(sample.url)}
                        data-track="sample-audit-btn"
                        data-track-dest={sample.url}
                        className={`px-4 py-1.5 bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 rounded-full text-xs font-bold text-slate-500 transition-all duration-300 flex items-center gap-2 active:scale-95 group ${sample.color}`}
                      >
                        <img src={sample.logo} alt={sample.name} className="w-3.5 h-3.5 object-contain filter grayscale group-hover:grayscale-0 transition-all opacity-60 group-hover:opacity-100" />
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live activity ticker for mobile */}
              <div className="lg:hidden animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 mt-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-2xl shadow-xl shadow-slate-200/50 border border-white/10 ring-4 ring-slate-50">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-900 overflow-hidden">
                        <img src={`https://i.pravatar.cc/100?u=user${i}`} className="w-full h-full object-cover" alt="" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                      Live: Audit on t***.com
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Before/After Visual */}
            <div className="relative group perspective-1000">
              {/* Before/After Card */}
              <div className="bg-slate-50/50 backdrop-blur-xl rounded-[3rem] border border-slate-200/50 shadow-2xl p-6 overflow-hidden relative animate-fade-in-up transition-transform duration-700 hover:scale-[1.02]">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-blue-500 to-emerald-500 opacity-30" />

                {/* Content area */}
                <div className="flex flex-col gap-6 h-[460px] md:h-[580px]">
                  {/* Top: The "Pain" (Before) */}
                  <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-200 relative overflow-hidden group/before shadow-sm">
                    <div className="absolute top-4 left-4 px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-red-100 shadow-sm z-20">Expected</div>

                    <div className="mt-12 space-y-4">
                      {/* Placeholder Title */}
                      <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />

                      {/* Skeleton Grid */}
                      <div className="grid grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="space-y-2">
                            <div className="h-2 w-2/3 bg-slate-50 rounded" />
                            <div className="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center">
                              <ImageOff size={16} className="text-slate-200" />
                            </div>
                            <div className="space-y-1">
                              <div className="h-1.5 w-full bg-slate-50 rounded" />
                              <div className="h-1.5 w-2/3 bg-slate-50 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover/before:opacity-100 transition-all duration-500 flex items-center justify-center z-30">
                      <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl border border-red-100 flex items-center gap-3 scale-90 group-hover/before:scale-100 transition-transform">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span className="text-red-600 font-black text-sm tracking-tight uppercase">Broken Preview (Text Only)</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: The "Gain" (After) */}
                  <div className="flex-1 bg-blue-600 rounded-3xl p-6 border border-blue-500 relative overflow-hidden group/after shadow-2xl shadow-blue-500/30">
                    <div className="absolute top-4 left-4 px-3 py-1 bg-white text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg z-20">SocialSight™</div>

                    <div className="mt-12 space-y-4">
                      {/* Real-looking Title */}
                      <div className="h-4 w-3/4 bg-white/30 rounded" />

                      {/* Mini Card Grid */}
                      <div className="grid grid-cols-4 gap-3">
                        {/* Twitter */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 opacity-60">
                            <Twitter size={8} className="text-white fill-white" />
                            <div className="h-1 w-8 bg-white/40 rounded" />
                          </div>
                          <div className="aspect-square rounded-xl overflow-hidden border border-white/20 shadow-lg">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-white/40 rounded" />
                            <div className="h-1.2 w-2/3 bg-white/20 rounded" />
                          </div>
                        </div>
                        {/* LinkedIn */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 opacity-60">
                            <Linkedin size={8} className="text-white fill-white" />
                            <div className="h-1 w-8 bg-white/40 rounded" />
                          </div>
                          <div className="aspect-square rounded-xl overflow-hidden border border-white/20 shadow-lg">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover brightness-110" alt="" />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-white/40 rounded" />
                            <div className="h-1.2 w-2/3 bg-white/20 rounded" />
                          </div>
                        </div>
                        {/* Facebook */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 opacity-60">
                            <Facebook size={8} className="text-white fill-white" />
                            <div className="h-1 w-8 bg-white/40 rounded" />
                          </div>
                          <div className="aspect-square rounded-xl overflow-hidden border border-white/20 shadow-lg">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover opacity-90" alt="" />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-white/40 rounded" />
                            <div className="h-1.2 w-2/3 bg-white/20 rounded" />
                          </div>
                        </div>
                        {/* iMessage */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1 opacity-60">
                            <MessageSquare size={8} className="text-white fill-white" />
                            <div className="h-1 w-8 bg-white/40 rounded" />
                          </div>
                          <div className="aspect-square rounded-xl overflow-hidden border border-white/20 shadow-lg relative">
                            <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200" className="w-full h-full object-cover" alt="" />
                            <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-blue-600/90 backdrop-blur-sm" />
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 w-full bg-white/40 rounded" />
                            <div className="h-1.2 w-2/3 bg-white/20 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-blue-700/60 backdrop-blur-[2px] opacity-0 group-hover/after:opacity-100 transition-all duration-500 flex items-center justify-center z-30">
                      <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl border border-blue-100 flex items-center gap-3 scale-90 group-hover/after:scale-100 transition-transform">
                        <Zap size={18} className="text-blue-600 fill-blue-600 animate-pulse" />
                        <span className="text-blue-600 font-black text-sm tracking-tight uppercase">Perfect Preview (+2.4x CTR)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CLASSIC HERO (Variant A) - Centered */
          <div className="max-w-4xl mx-auto text-center space-y-10 relative">
            <h1 className="text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-[0.9]">
              Your social previews are <span className="text-blue-600 italic">leaking</span> money.
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Turn every link share into a traffic magnet. Automatically design perfect OpenGraph images and use AI to double your social click-through rate.
            </p>

            <div className="pt-8">
              <ScraperForm onResult={handleResult} limitReached={isLimitReached} />
            </div>
          </div>
        )}
      </section>

      {/* Results Mode Dashboard */}
      {
        (result || activeTab !== 'audit') && (
          <section className="py-12 px-6 pb-32 md:pb-12">
            <div className="max-w-7xl mx-auto">
              {/* Smooth Transition Wrapper */}
              <div key={activeTab} className="animate-fade-in w-full">
                {activeTab === 'history' ? (
                  <ScanHistory user={user} onSelectScan={(data) => handleResult(data)} />
                ) : !result && activeTab !== 'monitor' && activeTab !== 'analytics' ? (
                  <div className="py-20 text-center space-y-6 animate-fade-in">
                    <div className="inline-flex items-center justify-center p-4 bg-slate-50 rounded-full mb-4">
                      <LayoutDashboard className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">No Scan Selected</h3>
                    <p className="text-slate-500 max-w-md mx-auto">Please run an audit first to use this tool, or select a previous scan from your history.</p>
                    <button
                      onClick={() => document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })} // Maintain scroll behavior as it seems appropriate
                      data-track="empty-state-start-audit-btn" // Distinct tracking name
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                    >
                      Start New Audit
                    </button>
                  </div>
                ) : activeTab === 'audit' && result ? (
                  <div className="space-y-10">
                    {/* Header Data */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Scanning Website</span>
                        <h2 className="text-4xl font-black text-slate-900 line-clamp-1">{result.metadata?.title || 'Untitled Site'}</h2>
                        <div className="flex items-center text-slate-500 font-semibold italic">
                          {result.metadata?.favicon && <img src={result.metadata.favicon} className="w-5 h-5 mr-2 rounded" alt="" />}
                          {result.metadata?.hostname || 'unknown-host'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            if (isPaid) {
                              setActiveTab('fix');
                            } else {
                              handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_LTD, 'fix');
                            }
                          }}
                          className={cn(
                            "px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95",
                            isPaid
                              ? "bg-slate-900 text-white hover:bg-black"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          )}
                        >
                          {isPaid ? (
                            <>
                              <Zap size={16} fill="white" /> Fix Issues
                            </>
                          ) : (
                            <>
                              <Zap size={16} fill="white" /> Fix Issues ({mainPriceLabel})
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobile-Only Score Card (Appears above Preview) */}
                    <div className="lg:hidden animate-fade-in animate-delay-1">
                      <ScoreAudit
                        score={result.score || 0}
                        issues={result.issues || []}
                        stats={result.stats}
                        onCheckout={() => handleCheckout(mainPriceId, 'fix')}
                        pricingVariant={pricingVariant}
                      />
                    </div>

                    {/* Social Mockups */}
                    <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative group overflow-hidden animate-fade-in animate-delay-1">
                      <div className="relative z-10 flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">Preview Simulation</h3>
                          <p className="text-slate-500 font-medium">Current appearance on social platforms.</p>
                        </div>
                      </div>
                      <SocialPreviews
                        metadata={result.metadata || {}}
                        isPaid={isPaid}
                        onUnlock={() => handleCheckout(mainPriceId, 'audit')}
                      />
                    </div>

                    {/* Dynamic Two Column: AI & Score */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      <div className="lg:col-span-8 animate-fade-in animate-delay-2 h-full">
                        <LockedFeature
                          isLocked={!isPaid}
                          label="Unlock AI Suggestions"
                          onUnlock={() => handleCheckout(mainPriceId, 'audit')}
                          className="h-full rounded-2xl"
                        >
                          <AISuggestions
                            isPaid={isPaid}
                            title={result.metadata?.title || ''}
                            description={result.metadata?.description || ''}
                          />
                        </LockedFeature>
                      </div>
                      <div className="hidden lg:block lg:col-span-4 animate-fade-in animate-delay-3">
                        <ScoreAudit
                          score={result.score || 0}
                          issues={result.issues || []}
                          stats={result.stats}
                          onCheckout={() => handleCheckout(mainPriceId, 'fix')}
                          pricingVariant={pricingVariant}
                        />
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'compare' && result ? (
                  <LockedFeature
                    isLocked={permissions ? !permissions.canBenchmark : true}
                    label="Upgrade to Benchmark"
                    onUnlock={() => handleCheckout(mainPriceId, 'compare')}
                    className="rounded-[2rem]"
                    lockBody
                    pageCenter
                  >
                    <CompetitorBoard currentUrl={result.metadata?.url} />
                  </LockedFeature>
                ) : activeTab === 'monitor' ? (
                  <LockedFeature
                    isLocked={permissions ? !permissions.canMonitor : true}
                    label="Unlock Daily Monitoring"
                    onUnlock={() => handleCheckout(mainPriceId, 'monitor')}
                    className="rounded-[2rem]"
                    lockBody
                    pageCenter
                  >
                    <Dashboard />
                  </LockedFeature>
                ) : activeTab === 'analytics' ? (
                  <LockedFeature
                    isLocked={permissions ? !permissions.canAnalyze : true}
                    label="Unlock Analytics (Growth Plan)"
                    onUnlock={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH || mainPriceId, 'analytics')}
                    className="rounded-[2rem]"
                    lockBody
                    pageCenter
                  >
                    <AnalyticsDashboard />
                  </LockedFeature>
                ) : ( // This is the 'fix' tab
                  /* PRO FIX MODE */
                  result && (
                    <div className="space-y-8 animate-fade-in">
                      <LockedFeature
                        isLocked={permissions ? !permissions.canFix : true}
                        label="Unlock Remediation Studio"
                        onUnlock={() => handleCheckout(mainPriceId, 'fix')}
                        className="rounded-[2rem]"
                        lockBody
                        pageCenter
                      >
                        {/* WRAPPED CONTENT OF FIX MODE */}
                        <div className="space-y-8">
                          {/* Pro Fix Header - Redesigned for minimal/premium feel */}
                          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-[2rem] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-slate-100 text-slate-900 rounded-xl shrink-0">
                                <Code size={24} />
                              </div>
                              <div className="min-w-0">
                                <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight truncate">Remediation Studio</h2>
                                <p className="text-slate-500 font-medium text-xs md:text-sm truncate">Optimize assets for {result.metadata?.hostname || 'unknown-host'}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setActiveTab('audit')}
                              className="w-full md:w-auto px-4 py-3 md:py-2 text-sm font-bold text-slate-500 bg-slate-50 md:bg-transparent rounded-xl md:rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Copy-Paste Code */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                  <Code size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">Meta Tags</h3>
                              </div>
                              <p className="text-slate-500 text-sm font-medium -mt-4">Optimized meta block. Copy and paste into your &lt;head&gt;.</p>
                              <MetaSnippet
                                title={result.metadata?.title || ''}
                                description={result.metadata?.description || ''}
                                image={result.metadata?.ogImage || ''}
                                url={result.metadata?.url || ''}
                                siteId={result.siteId}
                              />
                            </div>

                            {/* Image Generation */}
                            <div className="bg-white border border-slate-200 rounded-[2rem] p-8 space-y-6">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                  <ImageIcon size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900">OG Image</h3>
                              </div>
                              <p className="text-slate-500 text-sm font-medium -mt-4">High-converting preview image.</p>
                              <ImageStudio
                                initialTitle={result.metadata?.title || ''}
                                hostname={result.metadata?.hostname || ''}
                                url={result.metadata?.url}
                              />
                            </div>
                          </div>

                          {/* Guardian Enrollment Section */}
                          <div className="animate-fade-in-up delay-300">
                            <GuardianEnrollment
                              defaultUrl={result.metadata?.url || ''}
                              siteId={result.siteId || 'pp_demo'}
                              tier={effectiveTier as any}
                              onUpgrade={() => handleCheckout(mainPriceId, 'monitor')}
                              onScansStart={() => { }}
                            />
                          </div>
                        </div>
                      </LockedFeature>
                    </div>
                  )
                )}
              </div>
            </div>
          </section >
        )
      }

      {/* Static Features Grid */}
      {
        !result && activeTab === 'audit' && (
          <>
            <section className="py-20 px-6 bg-white border-y border-slate-100 scroll-mt-20" id="features">
              <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Feature 1: Competitor Benchmarking (Bento Large) */}
                  <div className="md:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110" />

                    <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-center">
                      <div className="space-y-6 flex-1">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-600/20">
                          <Scale size={24} />
                        </div>
                        <h3 className="text-4xl font-extrabold text-slate-900 leading-tight">Win the feed.</h3>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed">
                          We calculate your <span className="font-bold text-slate-900">Win Rate</span> against top competitors so you never ship a weak link again.
                        </p>

                        <div className="flex items-baseline gap-2 pb-2">
                          <span className="text-5xl font-black text-[#0066FF] tracking-tight">98%</span>
                          <span className="text-lg font-bold text-slate-700">Win Rate</span>
                        </div>

                        {/* Frictionless Input */}

                      </div>

                      {/* Visual: High Contrast VS Grid */}
                      <div className="w-full lg:w-96 relative perspective-1000 group-hover:perspective-[2000px] transition-all duration-700 ease-out">
                        <div className="grid grid-cols-3 gap-3 items-end transform lg:rotate-y-[-10deg] lg:rotate-x-[5deg] group-hover:rotate-y-0 group-hover:rotate-x-0 transition-transform duration-700 preserve-3d">
                          {/* Competitor A */}
                          <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 opacity-60 scale-90 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-red-200 whitespace-nowrap">Leaking</div>
                            <div className="h-16 bg-slate-200 rounded-lg mb-2"></div>
                            <div className="h-1.5 w-10 bg-slate-300 rounded mb-1"></div>
                            <div className="h-1.5 w-6 bg-slate-300 rounded"></div>
                          </div>

                          {/* Winner (Center) */}
                          <div className="bg-white rounded-2xl p-4 border-2 border-blue-500 shadow-2xl shadow-blue-500/30 relative z-20 scale-110">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-green-500/30 animate-pulse">Winner</div>
                            <div className="h-20 bg-blue-50 rounded-lg mb-3 flex items-center justify-center border border-blue-100">
                              <span className="text-2xl">🔥</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="h-2 w-16 bg-slate-800 rounded"></div>
                              <div className="h-2 w-10 bg-slate-300 rounded"></div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div className="bg-green-500 h-full w-[98%]"></div>
                              </div>
                            </div>
                          </div>

                          {/* Competitor B */}
                          <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 opacity-60 scale-90 relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-red-200 whitespace-nowrap">Leaking</div>
                            <div className="h-16 bg-slate-200 rounded-lg mb-2"></div>
                            <div className="h-1.5 w-10 bg-slate-300 rounded mb-1"></div>
                            <div className="h-1.5 w-6 bg-slate-300 rounded"></div>
                          </div>
                        </div>

                        {/* Abstract Glow Behind */}
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl -z-10 translate-y-4 translate-x-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      </div>
                    </div>
                  </div>

                  {/* Feature 2: Analytics Engine (Bento Vertical) */}
                  <div
                    className="md:col-span-1 bg-slate-900 rounded-[2.5rem] p-8 relative overflow-hidden group text-white hover:scale-[1.02] transition-transform duration-500 cursor-pointer"
                    onClick={() => {
                      setActiveTab('analytics');
                      document.getElementById('tool-scroll-target')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-600/10 to-transparent" />

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="space-y-6">
                        <div className="flex justify-between items-start">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm shadow-inner shadow-white/10">
                            <BarChart3 size={24} />
                          </div>
                          <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            Live
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-black mb-2">Analytics Engine</h3>
                          <p className="text-slate-400 font-medium text-sm leading-relaxed">
                            Stop guessing. Track real-time impressions and clicks the moment they happen.
                          </p>
                        </div>
                      </div>

                      {/* Active Metric + Sparkline */}
                      <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex items-end justify-between mb-4">
                          <div>
                            <div className="text-sm font-bold text-slate-400 mb-1">Active CTR</div>
                            <div className="text-4xl font-black tracking-tight text-white drop-shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                              2.4%
                            </div>
                          </div>
                          {/* Mini Sparkline SVG */}
                          <svg width="80" height="40" viewBox="0 0 80 40" className="opacity-80 overflow-visible">
                            <path d="M0 35 Q 10 35, 20 20 T 40 25 T 60 15 T 80 8" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
                            <path d="M0 35 L 80 35" fill="none" stroke="#4ade80" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                          </svg>
                        </div>

                        {/* Live Feed - Scrollable */}
                        <div className="h-24 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pr-2">
                          <div className="space-y-3">
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span className="text-blue-400">●</span> Click from Twitter (NYC)
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span className="text-green-400">●</span> Impression in London (UK)
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span className="text-blue-400">●</span> Click from LinkedIn (SF)
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span className="text-green-400">●</span> Impression in Tokyo (JP)
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span className="text-green-400">●</span> Impression in Austin (TX)
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                              <span className="text-blue-400">●</span> Click from Slack (Remote)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature 3: The Guardian (Bento Wide) */}
                  <div className="md:col-span-3 bg-gradient-to-br from-blue-50 to-white rounded-[2.5rem] border border-blue-100 p-10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-50">
                      <Activity className="w-64 h-64 text-blue-100 -mr-20 -mt-20 rotate-12" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                      <div className="bg-white p-4 rounded-full shadow-xl shadow-blue-500/10 shrink-0">
                        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white relative">
                          <Shield size={32} />
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-4 border-white flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                          </div>
                        </div>
                      </div>

                      <div className="text-center md:text-left space-y-4 flex-1">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                          <h3 className="text-3xl font-black text-slate-900">The Guardian™</h3>
                          <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2 border border-green-200">
                            <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                            Monitoring Active
                          </div>
                        </div>

                        <p className="text-slate-500 font-medium text-lg max-w-2xl leading-relaxed">
                          Never ship a broken link again. We monitor your top URLs 24/7 and alert you <span className="text-slate-900 font-bold">the second</span> an image breaks.
                        </p>

                        {/* Evidence: Last Scan Status */}
                        <div className="flex items-center gap-4 justify-center md:justify-start pt-1">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Scan: 5 mins ago</div>
                          <div className="h-4 w-px bg-slate-200"></div>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div key={i} className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="URL Healthy"></div>
                            ))}
                            <div className="text-xs font-bold text-green-600 ml-1">All Systems Healthy</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="flex items-center gap-3 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                          {/* Slack Logo */}
                          <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-[#E01E5A] rounded-full rotate-[-15deg]"></div>
                            <div className="w-1 h-3 bg-[#36C5F0] rounded-full rotate-[-15deg]"></div>
                            <div className="w-1 h-3 bg-[#2EB67D] rounded-full rotate-[-15deg]"></div>
                            <div className="w-1 h-3 bg-[#ECB22E] rounded-full rotate-[-15deg]"></div>
                          </div>
                          <span className="text-xs font-bold text-slate-400">Slack</span>

                          <div className="w-px h-3 bg-slate-300 mx-1"></div>

                          {/* Email Icon */}
                          <div className="w-4 h-4 bg-slate-400 rounded-sm"></div>
                          <span className="text-xs font-bold text-slate-400">Email</span>
                        </div>
                        <button className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2 group/btn">
                          <Shield className="w-4 h-4 text-blue-600 group-hover/btn:scale-110 transition-transform" />
                          Configure Alerts
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 px-6 bg-slate-50 scroll-mt-20" id="pricing">
              <div className="max-w-7xl mx-auto space-y-20">
                <div className="text-center space-y-6 max-w-3xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-[13px] font-bold uppercase tracking-wider">
                    <Activity size={14} className="fill-blue-700" />
                    {pricingVariant === 'B' ? 'Limited Time Launch Offer' : 'Tiered Growth Model'}
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight">
                    {pricingVariant === 'B'
                      ? "Get Lifetime Access to SocialSight™"
                      : "Stop losing clicks. Start dominating feeds."}
                  </h2>
                  <p className="text-xl text-slate-500 font-medium leading-relaxed">
                    {pricingVariant === 'B'
                      ? "Join 5,000+ founders using Social Sight for a one-time fee. No subscriptions, just results."
                      : "Join 5,000+ founders using Social Sight to turn social previews into revenue."}
                  </p>
                </div>

                <div className={cn(
                  "grid gap-6 items-start",
                  pricingVariant === 'B' ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
                )}>
                  {(pricingVariant === 'B' ? [
                    {
                      name: "Free",
                      price: "$0",
                      desc: "For quick checks.",
                      features: ["3 manual scans/day", "Basic OpenGraph Checks", "Preview Simulation"],
                      cta: "Start Free",
                      variant: "outline",
                      priceId: null
                    },
                    {
                      name: "All-Access",
                      price: "$9",
                      period: "one-time",
                      desc: "Lifetime access to everything.",
                      features: ["The Guardian: Daily Monitoring", "Unlimited Benchmarking", "10,000 tracked impressions", "AI Headline A/B Testing", "Priority Support", "No Monthly Fees"],
                      cta: "Get Lifetime Access",
                      popular: true,
                      variant: "blue",
                      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ALL_ACCESS
                    }
                  ] : [
                    {
                      name: "Free",
                      price: "$0",
                      desc: "For quick checks.",
                      features: ["3 manual scans/day", "Basic OpenGraph Checks", "Preview Simulation"],
                      cta: "Start Free",
                      variant: "outline",
                      priceId: null
                    },
                    {
                      name: "Founder",
                      price: "$19",
                      period: "/mo",
                      desc: "For serious solopreneurs.",
                      features: ["Everything in Free", "The Guardian: Daily Monitoring", "1,000 tracked impressions/mo", "Competitor Benchmarking"],
                      cta: "Start Trial",
                      popular: true,
                      variant: "blue",
                      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FOUNDER
                    },
                    {
                      name: "Growth",
                      price: "$47",
                      period: "/mo",
                      desc: "For startups scaling up.",
                      features: ["Analytics Dashboard", "Image Proxy Tracking", "10,000 tracked impressions", "AI Headline A/B Testing"],
                      cta: "Get Growth",
                      variant: "white",
                      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH
                    },
                    {
                      name: "Agency",
                      price: "$127",
                      period: "/mo",
                      desc: "For pros measuring ROI.",
                      features: ["Unlimited Monitoring", "White-label Reports", "Exportable CSV Data", "Priority Support"],
                      cta: "Contact Sales",
                      variant: "white",
                      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY
                    }
                  ]).map((tier, i) => (
                    <div key={i} className={cn(
                      "p-8 rounded-[2rem] border transition-all duration-300 relative",
                      tier.variant === 'blue'
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xl shadow-blue-500/20 md:-translate-y-4"
                        : "bg-white border-slate-200 text-slate-900 hover:border-blue-200 hover:shadow-xl"
                    )}>
                      {tier.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/30">
                          Most Popular
                        </div>
                      )}
                      <div className="space-y-2 mb-8">
                        <h3 className={cn("text-lg font-black uppercase tracking-wide", tier.variant === 'blue' ? "text-blue-400" : "text-slate-400")}>{tier.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black tracking-tight">{tier.price}</span>
                          {tier.period && <span className={cn("text-sm font-bold", tier.variant === 'blue' ? "text-slate-400" : "text-slate-400")}>{tier.period}</span>}
                        </div>
                        <p className={cn("text-sm font-medium", tier.variant === 'blue' ? "text-slate-400" : "text-slate-500")}>{tier.desc}</p>
                      </div>

                      <ul className="space-y-4 mb-8">
                        {tier.features.map((feat, j) => (
                          <li key={j} className="flex items-start gap-3 text-sm font-semibold">
                            <div className={cn("mt-0.5 min-w-[16px]", tier.variant === 'blue' ? "text-blue-400" : "text-blue-600")}>
                              <CheckCircle2 size={16} />
                            </div>
                            <span className={cn(tier.variant === 'blue' ? "text-slate-300" : "text-slate-600",
                              feat === "AI Headline A/B Testing" && tier.name === "Growth" && "text-blue-600 font-bold"
                            )}>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleCheckout(tier.priceId || undefined)}
                        className={cn(
                          "w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer",
                          tier.variant === 'blue'
                            ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/25"
                            : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                        )}>
                        {tier.cta}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Lifetime Deal Banner */}
                {pricingVariant !== 'B' && (
                  <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-blue-800 rounded-[2.5rem] p-10 md:p-14 text-white relative overflow-hidden shadow-2xl shadow-blue-900/20 group cursor-pointer hover:scale-[1.01] transition-transform">
                    <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[11px] font-black uppercase tracking-widest border border-white/20">
                          <Zap size={12} className="fill-white" /> Early Bird Lifetime Deal
                        </div>
                        <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-white">
                          Get Lifetime Access. <br />Pay once, keep it forever.
                        </h3>
                        <p className="text-blue-100 font-medium text-lg max-w-lg">
                          Secure the "Growth" tier features for a one-time payment. Includes Analytics, Monitoring, and A/B Testing.
                        </p>
                        <div className="flex flex-col md:flex-row items-center gap-4 pt-2">
                          <div className="text-5xl font-black text-white flex items-center gap-3">
                            <span className="text-3xl text-blue-200 line-through opacity-60">$299</span>
                            $99
                          </div>
                          <div className="px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase rounded-lg shadow-sm animate-pulse">Only 14/50 spots left</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCheckout(mainPriceId)}
                        className="px-10 py-5 bg-white text-blue-700 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-50 transition-colors shrink-0 active:scale-95 cursor-pointer">
                        Grab Lifetime Deal
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </section>
          </>
        )
      }

      <footer className="py-24 border-t border-slate-200 text-center text-slate-400 font-bold uppercase tracking-widest text-xs px-6">
        © 2025 Social Sight — Built for Speed, Optimized for Revenue.
      </footer>
      {/* Mobile Bottom Navigation - "Tabs" */}
      {(result || activeTab !== 'audit') && (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-40 animate-slide-up-fade">
          <div className="bg-slate-900/95 backdrop-blur-lg border border-white/10 p-1.5 rounded-2xl shadow-2xl flex items-center justify-around">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "p-3 rounded-xl transition-all relative group flex flex-col items-center gap-1",
                  activeTab === tab.id
                    ? "text-white bg-white/10"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <tab.icon size={20} className={cn(
                  "transition-transform",
                  activeTab === tab.id && "scale-110",
                  tab.fill && activeTab === tab.id && "fill-white"
                )} />
                {activeTab === tab.id && (
                  <span className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Live Notification Popup */}
      {shouldRenderNotification && globalStats.activity[currentNotificationIndex] && (
        <div
          className={cn(
            "fixed bottom-8 right-8 z-[60] hidden md:block transition-all duration-700",
            isNotificationVisible
              ? "animate-[notification-in_0.7s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
              : "animate-[notification-out_0.5s_ease-in_forwards]"
          )}
        >
          <div className="bg-slate-900/90 backdrop-blur-2xl px-5 py-4 pr-12 rounded-[1.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex items-center gap-4 relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/0 rounded-[1.5rem] blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 w-12 h-12 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center shrink-0 shadow-inner">
              <Activity size={22} className="text-blue-400 animate-pulse" />
            </div>

            <div className="relative z-10 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400/80">Live Audit</p>
              </div>
              <p className="text-white text-[15px] font-bold truncate max-w-[200px] tracking-tight">
                Someone audited <span className="text-blue-400 font-black">{globalStats.activity[currentNotificationIndex].domain}</span>
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-md text-[9px] font-black text-blue-400 uppercase">
                  Score: {82 + (currentNotificationIndex * 3) % 18}
                </div>
                <p className="text-[10px] font-medium text-slate-500 tracking-wide">just now</p>
              </div>
            </div>

            <button
              onClick={() => setIsNotificationVisible(false)}
              className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors z-20"
            >
              <X size={16} />
            </button>

          </div>
        </div>
      )}

    </main >
  );
}
