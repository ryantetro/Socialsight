"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Code,
  Copy,
  FileText,
  Globe,
  Loader2,
  Sparkles,
  X
} from 'lucide-react';
import { GeoScanResult, GeoIssue } from '@/types';
import { cn } from '@/lib/utils';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createPortal } from 'react-dom';

const BUCKETS = [
  { key: 'crawl_score' as const, label: 'Crawl', icon: Globe },
  { key: 'structure_score' as const, label: 'Structure', icon: FileText },
  { key: 'entity_score' as const, label: 'Entity', icon: Building2 },
  { key: 'schema_score' as const, label: 'Schema', icon: Code },
  { key: 'reference_score' as const, label: 'Reference', icon: BookOpen }
] as const;

const BUCKET_MAX = 20;

const FIX_PACK_STEPS = [
  'Analyzing priority issues',
  'Reading page structure & metadata',
  'Generating fix suggestions',
  'Writing code changes',
  'Validating fixes',
  'Building combined prompt',
  'Almost there…',
];

interface GeoReportProps {
  data: GeoScanResult;
  onMarkApplied?: (geoIssueId: string) => void;
  appliedIds?: Set<string>;
  pageBreakdown?: Array<{ url: string; page_score: number; issues_count: number }>;
}

const CATEGORY_ORDER = ['crawl', 'structure', 'entity', 'schema', 'reference'] as const;

type GeoCategory = (typeof CATEGORY_ORDER)[number];

function severityWeight(sev: string) {
  return sev === 'high' ? 3 : sev === 'med' ? 2 : 1;
}

function severityDotClass(sev: string) {
  if (sev === 'high') return 'bg-red-500';
  if (sev === 'med') return 'bg-amber-500';
  return 'bg-slate-400';
}

function statusForScore(score: number) {
  if (score >= 80) return { label: 'Excellent', tone: 'good' as const };
  if (score >= 60) return { label: 'Good', tone: 'good' as const };
  if (score >= 40) return { label: 'Needs work', tone: 'warn' as const };
  return { label: 'Poor', tone: 'bad' as const };
}

function toneClasses(tone: 'good' | 'warn' | 'bad') {
  if (tone === 'good') return { text: 'text-green-600', ring: 'stroke-green-500', pill: 'bg-green-50 text-green-700 border-green-100' };
  if (tone === 'warn') return { text: 'text-amber-600', ring: 'stroke-amber-500', pill: 'bg-amber-50 text-amber-700 border-amber-100' };
  return { text: 'text-red-600', ring: 'stroke-red-500', pill: 'bg-red-50 text-red-700 border-red-100' };
}

function microcopy(issue: GeoIssue) {
  // Keep existing data, but soften labels.
  // Prefer code-based replacements; fallback to existing title/description.
  const byCode: Record<string, { title?: string; why?: string }> = {
    CANONICAL_MISSING: {
      title: 'Specify the preferred URL for this page',
      why: 'Helps AI and search engines treat one URL as the source of truth and avoid duplicate signals.'
    },
    NO_H1: {
      title: 'Add a primary page title',
      why: 'A single clear H1 makes it obvious what this page is about for AI and search.'
    },
    MULTIPLE_H1: {
      title: 'Use one primary page title',
      why: 'Multiple H1s dilute your main topic and make summaries less accurate.'
    },
    MISSING_LLMS_TXT: {
      title: 'Add llms.txt guidance',
      why: 'Gives AI systems a simple, reliable entry point to understand your product and key pages.'
    },
    MISSING_SITEMAP: {
      title: 'Publish a sitemap',
      why: 'Improves discovery so AI and search engines can find and cite the right pages.'
    },
    MISSING_ROBOTS_TXT: {
      title: 'Add robots.txt',
      why: 'Clarifies what can be crawled and where your sitemap lives.'
    },
    NO_JSONLD: {
      title: 'Add structured data (JSON-LD)',
      why: 'Helps AI identify your organization and product details with less guessing.'
    }
  };

  const mapped = byCode[issue.code] || {};
  return {
    title: mapped.title || issue.title,
    why: mapped.why || issue.description || 'Fixing this makes your site easier to understand and cite.'
  };
}

export default function GeoReport({ data, onMarkApplied, appliedIds = new Set(), pageBreakdown }: GeoReportProps) {
  const status = statusForScore(data.overall_score);
  const tones = toneClasses(status.tone);

  const pages = (pageBreakdown || data.pages || []).slice().sort((a, b) => b.page_score - a.page_score);

  // Right-side panel
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const appliedLocalRef = useRef<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);
  const [fixTab, setFixTab] = useState<'generated' | 'prompt' | 'explanation'>('generated');
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixBundle, setFixBundle] = useState<any>(null);

  const [packOpen, setPackOpen] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [packStep, setPackStep] = useState(0);
  const [packError, setPackError] = useState<string | null>(null);
  const [packResult, setPackResult] = useState<any>(null);

  useEffect(() => {
    if (!packLoading) {
      setPackStep(0);
      return;
    }
    const interval = setInterval(() => {
      setPackStep((s) => Math.min(s + 1, FIX_PACK_STEPS.length - 1));
    }, 14000);
    return () => clearInterval(interval);
  }, [packLoading]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (isPanelOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isPanelOpen, mounted]);

  // On-demand generation when the Fix panel opens or the selected issue changes
  useEffect(() => {
    if (!isPanelOpen || !activeIssue?.id) return;
    const existing = (activeIssue.fix_payload || {}) as any;
    if (existing?.artifact?.content && existing?.idePrompt) {
      setFixBundle(existing);
      setFixLoading(false);
      setFixError(null);
      return;
    }

    let cancelled = false;
    setFixLoading(true);
    setFixError(null);
    setFixBundle(null);

    fetch('/api/geo/generate-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geo_issue_id: activeIssue.id })
    })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) throw new Error(j.error || 'Failed to generate fix');
        setFixBundle(j);
      })
      .catch((e) => {
        if (cancelled) return;
        setFixError(e instanceof Error ? e.message : 'Failed to generate fix');
      })
      .finally(() => {
        if (cancelled) return;
        setFixLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isPanelOpen, activeIssueId]);

  const applied = (id?: string) => {
    if (!id) return false;
    return appliedIds.has(id) || appliedLocalRef.current.has(id);
  };

  const activeIssue = useMemo(() => data.issues.find((i) => i.id === activeIssueId) || null, [data.issues, activeIssueId]);

  // Category sections refs for smooth scroll
  const sectionRefs = useRef<Record<GeoCategory, HTMLDivElement | null>>({
    crawl: null,
    structure: null,
    entity: null,
    schema: null,
    reference: null,
  });

  const scrollToCategory = (cat: GeoCategory) => {
    const el = sectionRefs.current[cat];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startFixing = () => {
    const el = document.getElementById('priority-fix-queue');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Priority queue: top 5 highest-impact issues
  const priorityQueue = useMemo(() => {
    const scored = data.issues
      .slice()
      .sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
    return scored.slice(0, 5);
  }, [data.issues]);

  // Group issues by category (compact cards)
  const issuesByCategory = useMemo(() => {
    const map: Record<GeoCategory, GeoIssue[]> = {
      crawl: [],
      structure: [],
      entity: [],
      schema: [],
      reference: [],
    };
    for (const i of data.issues) {
      const cat = i.category as GeoCategory;
      if (map[cat]) map[cat].push(i);
    }
    // Sort within category: high -> med -> low
    for (const cat of CATEGORY_ORDER) {
      map[cat] = map[cat].slice().sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity));
    }
    return map;
  }, [data.issues]);

  // Circular gauge math (ScoreAudit style)
  const strokeDasharray = 2 * Math.PI * 45;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * Math.max(0, Math.min(100, data.overall_score))) / 100;

  const buckets = [
    { id: 'crawl' as const, label: 'Crawl', value: data.crawl_score, max: BUCKET_MAX, icon: Globe, description: 'Can AI bots reach your content?' },
    { id: 'structure' as const, label: 'Structure', value: data.structure_score, max: BUCKET_MAX, icon: FileText, description: 'Is the page easy to parse?' },
    { id: 'entity' as const, label: 'Entity', value: data.entity_score, max: BUCKET_MAX, icon: Building2, description: 'Is your product clearly defined?' },
    { id: 'schema' as const, label: 'Schema', value: data.schema_score, max: BUCKET_MAX, icon: Code, description: 'Is structured data present/valid?' },
    { id: 'reference' as const, label: 'Reference', value: data.reference_score, max: BUCKET_MAX, icon: BookOpen, description: 'Is content cite-worthy?' },
  ] as const;

  const bucketStatus = (v: number) => {
    if (v >= 16) return { label: 'Strong', tone: 'good' as const };
    if (v >= 10) return { label: 'Okay', tone: 'warn' as const };
    return { label: 'Weak', tone: 'bad' as const };
  };

  const openFix = (issue: GeoIssue) => {
    if (!issue.id) return;
    setActiveIssueId(issue.id);
    setCopiedId(null);
    setFixTab('generated');
    setFixError(null);
    setFixBundle(null);
    setIsPanelOpen(true);
  };

  const closeFix = () => {
    setIsPanelOpen(false);
    setCopiedId(null);
  };

  const copyFix = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const startFixAll = async (scope: 'priority' | 'all' = 'priority') => {
    setPackOpen(true);
    setPackLoading(true);
    setPackError(null);
    setPackResult(null);
    try {
      const res = await fetch('/api/geo/generate-fix-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geo_scan_id: data.scanId, scope, limit: scope === 'priority' ? 10 : 20 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate pack');
      setPackResult(json);
    } catch (e) {
      setPackError(e instanceof Error ? e.message : 'Failed to generate pack');
    } finally {
      setPackLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* 1) HERO SUMMARY CARD */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-green-500 opacity-15" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left: score */}
          <div className="lg:col-span-4 flex items-center gap-8">
            <div className="relative w-44 h-44 shrink-0">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="8"
                  className={cn("transition-all duration-1000 ease-out", tones.ring)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-6xl font-black tracking-tight", tones.text)}>{data.overall_score}</span>
                  <span className="text-slate-400 font-bold text-lg">/100</span>
                </div>
                <span className={cn("mt-2 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest", tones.pill)}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Right: message */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Your site is not AI-readable yet
              </h2>
              <p className="text-slate-500 font-medium text-base max-w-2xl">
                Fix the items below to improve your AI visibility and citations.
              </p>
            </div>

            {/* Horizontal breakdown bars */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {buckets.map(({ id, label, value, max, icon: Icon }) => {
                const s = bucketStatus(value);
                const t = toneClasses(s.tone);
                return (
                  <button
                    key={id}
                    onClick={() => scrollToCategory(id)}
                    className="text-left p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-600">{label}</span>
                      </div>
                      <span className="text-xs font-black text-slate-700">{value}/{max}</span>
                    </div>
                    <div className="mt-3 h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={cn("h-full rounded-full", s.tone === 'good' ? 'bg-green-500' : s.tone === 'warn' ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={startFixing}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg hover:bg-black transition-colors active:scale-95"
              >
                Start Fixing Issues <ArrowRight size={16} />
              </button>
              <button
                onClick={() => startFixAll('priority')}
                className="px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-black text-sm hover:bg-white hover:shadow-sm transition-all active:scale-95"
              >
                Fix all (priority)
              </button>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Focus on High Impact first
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2) PRIORITY FIX QUEUE */}
      <section id="priority-fix-queue" className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Priority fix queue</h3>
            <p className="text-slate-500 font-medium mt-2 max-w-2xl">
              Start here. These are the highest-impact fixes to make your site more cite-worthy.
            </p>
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            5 steps
          </div>
        </div>

        <div className="space-y-3">
          {priorityQueue.map((issue, idx) => {
            const mc = microcopy(issue);
            return (
              <div
                key={issue.id || `${issue.code}-${idx}`}
                className="group flex items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 truncate">{mc.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-red-50 text-red-700 border-red-100">
                        High impact
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium line-clamp-1">{mc.why}</p>
                  </div>
                </div>
                <button
                  onClick={() => openFix(issue)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black transition-colors active:scale-95 shrink-0"
                >
                  View fix
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3) CATEGORY HEALTH GRID */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Category health</h3>
            <p className="text-slate-500 font-medium mt-2">Jump to a category to fix issues sequentially.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {buckets.map(({ id, label, value, max, icon: Icon, description }) => {
            const s = bucketStatus(value);
            const t = toneClasses(s.tone);
            return (
              <button
                key={id}
                onClick={() => scrollToCategory(id)}
                className="p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                    <Icon size={18} />
                  </div>
                  <span className={cn("px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest", t.pill)}>
                    {s.label}
                  </span>
                </div>
                <div className="mt-5">
                  <div className="text-sm font-black uppercase tracking-widest text-slate-500">{label}</div>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900">{value}</span>
                    <span className="text-slate-400 font-bold text-sm">/ {max}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 font-medium">{description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4) ISSUES LIST REDESIGN (grouped + compact cards) */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Issues</h3>
            <p className="text-slate-500 font-medium mt-2">Fix one category at a time. Use the Fix button to open the sidebar.</p>
          </div>
        </div>

        {CATEGORY_ORDER.map((cat) => {
          const issues = issuesByCategory[cat];
          if (!issues.length) return null;
          return (
            <div
              key={cat}
              ref={(el) => { sectionRefs.current[cat] = el; }}
              className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-slate-100">
                <h4 className="text-xl font-black text-slate-900 capitalize">{cat} issues</h4>
                <p className="text-slate-500 font-medium mt-1">{issues.length} items to review</p>
              </div>

              <div className="p-6 md:p-8 space-y-3">
                {issues.map((issue) => {
                  const mc = microcopy(issue);
                  const done = applied(issue.id);
                  return (
                    <div
                      key={issue.id || `${issue.code}-${issue.page_url}`}
                      className={cn(
                        "flex items-center justify-between gap-4 p-5 rounded-2xl bg-[#fafafa] hover:bg-white border border-slate-200 transition-all",
                        done && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", severityDotClass(issue.severity))} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 truncate">{mc.title}</p>
                            {done && <CheckCircle2 size={16} className="text-green-500 shrink-0" />}
                          </div>
                          <p className="text-sm text-slate-500 font-medium line-clamp-1">{mc.why}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openFix(issue)}
                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black transition-colors active:scale-95 shrink-0"
                      >
                        Fix
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* 6) PAGE-LEVEL SCORES (table) */}
      {pages.length > 0 && (
        <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Pages</h3>
              <p className="text-slate-500 font-medium mt-2">Scan summary by page.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  <th className="py-3 pr-4">Page</th>
                  <th className="py-3 pr-4">Score</th>
                  <th className="py-3 pr-4">Issues</th>
                  <th className="py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p, i) => (
                  <tr key={`${p.url}-${i}`} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-4 pr-4">
                      <div className="font-bold text-slate-900 truncate max-w-[520px]">{p.url.replace(/^https?:\/\//, '')}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={cn(
                        "font-black",
                        p.page_score >= 80 ? "text-green-600" : p.page_score >= 50 ? "text-amber-600" : "text-red-600"
                      )}>
                        {p.page_score}
                      </span>
                      <span className="text-slate-400 font-bold">/100</span>
                    </td>
                    <td className="py-4 pr-4 text-slate-600 font-bold">{p.issues_count}</td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => {
                          // Open a representative issue from this page if present
                          const pageIssue = data.issues.find((i) => i.page_url === p.url) || null;
                          if (pageIssue) openFix(pageIssue);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black hover:bg-white transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5) FIX PANEL (RIGHT SIDEBAR) */}
      {isPanelOpen && mounted && createPortal((
        <div className="fixed inset-0 z-[120]">
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={closeFix}
          />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fix panel</p>
                <h3 className="text-xl font-black text-slate-900 mt-1 truncate">
                  {activeIssue ? microcopy(activeIssue).title : 'Fix'}
                </h3>
              </div>
              <button
                onClick={closeFix}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {!activeIssue ? (
                <div className="text-slate-500 font-medium">Select an issue to view the fix.</div>
              ) : (
                <div className="space-y-5">
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl p-1">
                    {[
                      { id: 'generated', label: 'Generated Fix' },
                      { id: 'prompt', label: 'IDE Prompt' },
                      { id: 'explanation', label: 'Explanation' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setFixTab(t.id as any)}
                        className={cn(
                          "px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors",
                          fixTab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Loader */}
                  {fixLoading && (
                    <div className="space-y-3">
                      <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                      <div className="h-24 w-full bg-slate-100 rounded-2xl animate-pulse" />
                      <div className="h-10 w-full bg-slate-100 rounded-2xl animate-pulse" />
                    </div>
                  )}

                  {!fixLoading && fixError && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 font-bold text-sm">
                      {fixError}
                    </div>
                  )}

                  {!fixLoading && !fixError && (
                    <>
                      {fixTab === 'generated' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                              {fixBundle?.artifact?.type || 'artifact'}
                              {fixBundle?.artifact?.pathHint ? ` • ${fixBundle.artifact.pathHint}` : ''}
                            </p>
                            {fixBundle?.artifact?.content && (
                              <button
                                onClick={() => copyFix(fixBundle.artifact.content, 'fix-artifact')}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black transition-colors"
                              >
                                {copiedId === 'fix-artifact' ? <Check size={14} /> : <Copy size={14} />}
                                {copiedId === 'fix-artifact' ? 'Copied' : 'Copy'}
                              </button>
                            )}
                          </div>
                          <pre className="text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto text-slate-800 whitespace-pre-wrap font-mono">
                            {fixBundle?.artifact?.content || 'No generated artifact.'}
                          </pre>
                        </div>
                      )}

                      {fixTab === 'prompt' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Cursor-ready prompt</p>
                            {fixBundle?.idePrompt && (
                              <button
                                onClick={() => copyFix(fixBundle.idePrompt, 'fix-prompt')}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black transition-colors"
                              >
                                {copiedId === 'fix-prompt' ? <Check size={14} /> : <Copy size={14} />}
                                {copiedId === 'fix-prompt' ? 'Copied' : 'Copy'}
                              </button>
                            )}
                          </div>
                          <pre className="text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto text-slate-800 whitespace-pre-wrap font-mono">
                            {fixBundle?.idePrompt || 'No prompt yet.'}
                          </pre>
                        </div>
                      )}

                      {fixTab === 'explanation' && (
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Why this matters</p>
                            <p className="text-slate-600 font-medium leading-relaxed">{microcopy(activeIssue).why}</p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Confidence</p>
                            <span className={cn(
                              "inline-flex items-center px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-widest",
                              fixBundle?.confidence === 'high'
                                ? "bg-green-50 text-green-700 border-green-100"
                                : fixBundle?.confidence === 'low'
                                  ? "bg-amber-50 text-amber-800 border-amber-100"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                            )}>
                              {fixBundle?.confidence || 'medium'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Explanation</p>
                            <p className="text-slate-600 font-medium leading-relaxed">
                              {fixBundle?.explanation || activeIssue.fix_payload?.explanation || 'Review and apply the suggested change.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 space-y-3">
              <button
                disabled={!activeIssue?.id || !onMarkApplied || applied(activeIssue?.id)}
                onClick={() => {
                  if (!activeIssue?.id || !onMarkApplied) return;
                  appliedLocalRef.current.add(activeIssue.id);
                  onMarkApplied(activeIssue.id);
                }}
                className={cn(
                  "w-full px-4 py-3 rounded-2xl font-black text-sm transition-all active:scale-95",
                  applied(activeIssue?.id)
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {applied(activeIssue?.id) ? 'Marked as applied' : 'Mark as Applied'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={closeFix}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-black text-xs hover:bg-white transition-colors"
                >
                  Recheck later
                </button>
                <button
                  onClick={closeFix}
                  className="flex-1 px-4 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-black transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Fix all pack modal */}
      {packOpen && mounted && createPortal((
        <div className="fixed inset-0 z-[110]">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setPackOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fix pack</p>
                <h3 className="text-xl font-black text-slate-900 mt-1">Fix all (priority)</h3>
              </div>
              <button
                onClick={() => setPackOpen(false)}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              {packLoading && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/80">
                      <Loader2 className="h-5 w-5 text-slate-600 animate-spin" />
                      <Sparkles className="absolute -right-0.5 -top-0.5 h-4 w-4 text-amber-500 opacity-90 animate-fix-pack-glow" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">AI is building your fix pack</p>
                      <p className="text-sm text-slate-500 font-medium mt-0.5">
                        This usually takes 1–2 minutes. We’re analyzing each issue and generating code fixes.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {FIX_PACK_STEPS.slice(0, 5).map((label, idx) => {
                      const isDone = idx < packStep;
                      const isActive = idx === packStep;
                      return (
                        <div
                          key={label}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300',
                            isActive && 'border-slate-300 bg-slate-50/80 shadow-sm animate-step-pulse',
                            isDone && 'border-slate-200 bg-white',
                            !isDone && !isActive && 'border-slate-100 bg-slate-50/50'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                              isDone && 'border-green-400 bg-green-50 text-green-600',
                              isActive && 'border-slate-400 bg-slate-100 text-slate-700',
                              !isDone && !isActive && 'border-slate-200 bg-slate-50 text-slate-400'
                            )}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="text-xs font-black">{idx + 1}</span>}
                          </div>
                          <span
                            className={cn(
                              'font-medium transition-colors',
                              isDone && 'text-slate-600',
                              isActive && 'text-slate-900',
                              !isDone && !isActive && 'text-slate-400'
                            )}
                          >
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!packLoading && packError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 font-bold text-sm">
                  {packError}
                </div>
              )}

              {!packLoading && !packError && packResult && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Combined IDE prompt</p>
                      <p className="text-sm text-slate-600 font-medium mt-1">Paste this into Cursor/Windsurf to apply fixes quickly.</p>
                    </div>
                    <button
                      onClick={() => copyFix(packResult.combinedIdePrompt, 'pack-combined')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black transition-colors"
                    >
                      {copiedId === 'pack-combined' ? <Check size={14} /> : <Copy size={14} />}
                      {copiedId === 'pack-combined' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto text-slate-800 whitespace-pre-wrap font-mono">
                    {packResult.combinedIdePrompt}
                  </pre>

                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Artifacts</p>
                    <div className="space-y-3">
                      {(packResult.artifacts || []).map((a: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200">
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">
                                {a.pathHint || a.type}
                              </p>
                              <p className="text-xs text-slate-500 font-medium">{a.language}</p>
                            </div>
                            <button
                              onClick={() => copyFix(a.content, `pack-artifact-${idx}`)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black hover:bg-white transition-colors"
                            >
                              {copiedId === `pack-artifact-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                              {copiedId === `pack-artifact-${idx}` ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                          <pre className="text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4 overflow-x-auto text-slate-800 whitespace-pre-wrap font-mono">
                            {String(a.content || '').slice(0, 1600)}{String(a.content || '').length > 1600 ? '\n…' : ''}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* 7) Trend placeholder (kept subtle, optional) */}
      <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xl font-black text-slate-900">Trend</h3>
            <p className="text-slate-500 font-medium mt-1">Monitoring will show weekly improvements here.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Coming soon</span>
        </div>
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={Array.from({ length: 12 }).map((_, i) => ({ name: `W${i + 1}`, value: data.overall_score }))}
              margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="geoTrendFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#geoTrendFill2)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
