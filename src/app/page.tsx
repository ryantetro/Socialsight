"use client";

import { useState } from 'react';
import ScraperForm from '@/components/ScraperForm';
import SocialPreviews from '@/components/SocialPreviews';
import ScoreAudit from '@/components/ScoreAudit';
import AISuggestions from '@/components/AISuggestions';
import MetaSnippet from '@/components/MetaSnippet';
import ImageStudio from '@/components/ImageStudio';
import { Share2, Zap, Shield, BarChart3, ArrowLeft, LayoutDashboard, Code, Image as ImageIcon } from 'lucide-react';
import { InspectionResult } from '@/types';
import { cn } from '@/lib/utils';

export default function Home() {
  const [result, setResult] = useState<InspectionResult | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<'audit' | 'fix'>('audit');

  const handleResult = (data: InspectionResult) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setResult(data);
      setActiveTab('audit');
      setIsTransitioning(false);
    }, 300);
  };

  const reset = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setResult(null);
      setActiveTab('audit');
      setIsTransitioning(false);
    }, 300);
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Dynamic Header/Navbar */}
      <nav className={cn(
        "max-w-7xl mx-auto px-6 py-6 flex justify-between items-center transition-all duration-700 ease-in-out z-50",
        result ? "border-b border-slate-200 bg-white/80 backdrop-blur-xl sticky top-0 py-4" : "bg-transparent"
      )}>
        <div className="flex items-center gap-10 w-full md:w-auto">
          <div
            onClick={reset}
            className="flex items-center gap-2 font-black text-2xl tracking-tighter cursor-pointer group shrink-0"
          >
            <div className="bg-blue-600 text-white p-1 rounded-lg group-hover:scale-110 transition-transform">
              <Share2 size={24} />
            </div>
            <span className="hidden lg:inline">Preview<span className="text-blue-600">Perfect</span></span>
          </div>

          <div className={cn(
            "transition-all duration-700 ease-in-out opacity-0 translate-y-2 pointer-events-none",
            result && "opacity-100 translate-y-0 pointer-events-auto flex-1 max-w-xl mx-8"
          )}>
            <ScraperForm onResult={handleResult} variant="compact" />
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {!result ? (
            <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 uppercase tracking-wide">
              <a href="#features" className="hover:text-blue-600 transition-colors">Utility</a>
              <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
              <button className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-black/10 active:scale-95">
                Get Pro — $9
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:flex bg-slate-100 p-1 rounded-xl mr-4">
                <button
                  onClick={() => setActiveTab('audit')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'audit' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <LayoutDashboard size={14} /> Audit
                </button>
                <button
                  onClick={() => setActiveTab('fix')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === 'fix' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Zap size={14} className={activeTab === 'fix' ? "fill-blue-600" : ""} /> Fix Mode
                </button>
              </div>
              <button className="px-5 md:px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 whitespace-nowrap">
                Unlock Pro
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={cn(
        "transition-all duration-1000 ease-in-out overflow-hidden relative",
        result ? "max-h-0 opacity-0 py-0" : "max-h-[1000px] pt-12 md:pt-16 pb-20 md:pb-32 px-6 opacity-100"
      )}>
        <div className="max-w-4xl mx-auto text-center space-y-10 relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-[13px] font-bold uppercase tracking-wider animate-bounce-subtle">
            <Zap size={14} className="fill-blue-700" />
            Gemini AI-Powered Results
          </div>
          <h1 className="text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-[0.9]">
            Your social previews are <span className="text-blue-600 italic">leaking</span> money.
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Generate pixel-perfect mockups and let Gemini AI rewrite your meta tags for maximum clicks.
          </p>

          <div className="pt-8">
            <ScraperForm onResult={handleResult} />
          </div>
        </div>
      </section>

      {/* Results Mode Dashboard */}
      {result && (
        <section className={cn(
          "py-12 px-6 transition-all duration-700 ease-out",
          isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        )}>
          <div className="max-w-7xl mx-auto">
            {activeTab === 'audit' ? (
              <div className="space-y-10">
                {/* Header Data */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-fade-in">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Scanning Website</span>
                    <h2 className="text-4xl font-black text-slate-900 line-clamp-1">{result.metadata.title || 'Untitled Site'}</h2>
                    <div className="flex items-center text-slate-500 font-semibold italic">
                      {result.metadata.favicon && <img src={result.metadata.favicon} className="w-5 h-5 mr-2 rounded" alt="" />}
                      {result.metadata.hostname}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('fix')}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                    <Zap size={16} fill="white" /> Start Pro Fix
                  </button>
                </div>

                {/* Social Mockups */}
                <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative group overflow-hidden animate-fade-in animate-delay-1">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-bl-[100px] -z-0" />
                  <div className="relative z-10 flex justify-between items-center mb-10">
                    <div>
                      <h3 className="text-3xl font-black text-slate-900">Pixel-Perfect Mockups</h3>
                      <p className="text-slate-500 font-medium text-lg">See exactly how your links appear in the wild.</p>
                    </div>
                    <div className="hidden sm:block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">
                      High Fidelity
                    </div>
                  </div>
                  <SocialPreviews metadata={result.metadata} />
                </div>

                {/* Dynamic Two Column: AI & Score */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-8 animate-fade-in animate-delay-2 h-full">
                    <AISuggestions
                      title={result.metadata.title || ''}
                      description={result.metadata.description || ''}
                    />
                  </div>
                  <div className="lg:col-span-4 animate-fade-in animate-delay-3">
                    <ScoreAudit score={result.score} issues={result.issues} stats={result.stats} />
                  </div>
                </div>
              </div>
            ) : (
              /* PRO FIX MODE */
              <div className="space-y-10 animate-fade-in">
                {/* Pro Fix Header */}
                <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-bl-full blur-3xl" />
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 rounded-2xl">
                        <Zap size={32} fill="white" />
                      </div>
                      <div>
                        <h2 className="text-4xl font-black tracking-tight leading-none">The Solution Center</h2>
                        <p className="text-slate-400 font-medium mt-1 uppercase tracking-widest text-xs">AI-Generated Remediation for {result.metadata.hostname}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  {/* Copy-Paste Code */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Code className="text-blue-600" />
                      <h3 className="text-2xl font-black text-slate-900">1. Optimized Meta Tags</h3>
                    </div>
                    <p className="text-slate-500 font-medium -mt-4">Replace your current meta block with this AI-optimized, high-CTR version.</p>
                    <MetaSnippet
                      title={result.metadata.title || ''}
                      description={result.metadata.description || ''}
                      image={result.metadata.ogImage || ''}
                      url={result.metadata.url || ''}
                    />
                  </div>

                  {/* Image Generation */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="text-blue-600" />
                      <h3 className="text-2xl font-black text-slate-900">2. High-CTR Visuals</h3>
                    </div>
                    <p className="text-slate-500 font-medium -mt-4">Missing or ugly preview images kill clicks. Fix it with one click.</p>
                    <ImageStudio
                      initialTitle={result.metadata.title || ''}
                      hostname={result.metadata.hostname || ''}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Static Features Grid */}
      {!result && (
        <section className="py-48 px-6 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
              {[
                { icon: <BarChart3 className="text-blue-600 w-8 h-8" />, title: "Deep Meta Audit", desc: "Comprehensive scan of 15+ meta tags. We find every tiny error." },
                { icon: <Shield className="text-blue-600 w-8 h-8" />, title: "Brand Consistency", desc: "Ensure your brand looks premium across every platform." },
                { icon: <Zap className="text-blue-600 w-8 h-8" />, title: "Gemini CTR Booster", desc: "Our custom Gemini 1.5 model rewrites your copy for engagement." }
              ].map((f, i) => (
                <div key={i} className="space-y-6 group">
                  <div className="w-20 h-20 bg-blue-50 rounded-[2.5rem] flex items-center justify-center rotate-3 group-hover:rotate-0 transition-all duration-500">
                    {f.icon}
                  </div>
                  <h3 className="text-2xl font-black">{f.title}</h3>
                  <p className="text-slate-500 leading-relaxed font-medium text-lg">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="py-24 border-t border-slate-200 text-center text-slate-400 font-bold uppercase tracking-widest text-xs px-6">
        © 2025 PreviewPerfect — Built for Speed, Optimized for Revenue.
      </footer>
    </main>
  );
}
