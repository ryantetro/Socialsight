import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/server';
import { fetchHtml, fetchText } from '@/lib/geo/fetch';
import { runRules, getMainText, getLinks } from '@/lib/geo/rules';
import type { RuleContext, SiteLevelContext } from '@/lib/geo/types';

export const maxDuration = 60;

const CRAWL_PAGE_LIMIT = 5;
const PENALTY_HIGH = 5;
const PENALTY_MED = 2;
const PENALTY_LOW = 1;
const BUCKET_MAX = 20;

function resolveUrl(baseUrl: string, href?: string): string | null {
  if (!href || href.startsWith('#')) return null;
  try {
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    if (href.startsWith('/')) return `${baseUrl}${href}`;
    return `${baseUrl}/${href}`;
  } catch {
    return null;
  }
}

function parseJsonLd($: cheerio.CheerioAPI): object[] {
  const out: object[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed && typeof parsed === 'object') out.push(parsed);
    } catch {
      // skip invalid
    }
  });
  return out;
}

function buildRuleContext(
  url: string,
  html: string,
  siteLevel: SiteLevelContext
): RuleContext {
  const $ = cheerio.load(html);
  const title =
    $('head title').text() ||
    $('meta[property="og:title"]').attr('content') ||
    '';
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';
  const h1El = $('h1').first();
  const h1 = h1El.length ? h1El.text().trim() || null : null;
  const h2Count = $('h2').length;
  const mainText = getMainText($);
  const wordCount = mainText.split(/\s+/).filter(Boolean).length;
  const links = getLinks($);
  const hasBlockquote = $('blockquote').length > 0;
  const jsonLd = parseJsonLd($);

  return {
    url,
    $,
    html,
    meta: { title: title.trim(), description: description.trim() },
    wordCount,
    h1,
    h2Count,
    mainText,
    links,
    hasBlockquote,
    jsonLd,
    siteLevel
  };
}

function extractInternalLinks(html: string, baseUrl: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const originSlash = origin.replace(/\/$/, '');

  function add(href: string) {
    const resolved = resolveUrl(origin, href);
    if (!resolved) return;
    try {
      const u = new URL(resolved);
      if (u.origin !== new URL(origin).origin) return;
      const norm = u.origin + u.pathname.replace(/\/$/, '') || u.origin + '/';
      if (!seen.has(norm)) seen.add(norm);
    } catch {
      //
    }
  }

  $('nav a[href], footer a[href], header a[href], .nav a[href], .menu a[href]').each(
    (_, el) => add($(el).attr('href') || '')
  );
  $('a[href]').each((_, el) => add($(el).attr('href') || ''));

  const list = Array.from(seen).filter((u) => u.startsWith(originSlash) || u === originSlash + '/');
  return list.slice(0, CRAWL_PAGE_LIMIT - 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = (body?.url || '').trim();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    let targetUrl = url;
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = `https://${targetUrl}`;
    let urlObj: URL;
    try {
      urlObj = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    const origin = `${urlObj.protocol}//${urlObj.host}`;

    // 1. Discover
    const [robotsRes, sitemapRes, llmsRes] = await Promise.all([
      fetchText(`${origin}/robots.txt`),
      fetchText(`${origin}/sitemap.xml`),
      fetchText(`${origin}/llms.txt`)
    ]);
    const hasRobots = robotsRes.status === 200 && robotsRes.text.length > 0;
    const hasSitemap = sitemapRes.status === 200 && sitemapRes.text.length > 0;
    const hasLlmsTxt = llmsRes.status === 200 && llmsRes.text.length > 0;
    const robotsBlocksAll =
      hasRobots &&
      /Disallow:\s*\/\s*$/m.test(robotsRes.text) &&
      !/Allow:\s*\//m.test(robotsRes.text);

    // 2. Fetch homepage
    const { html: homeHtml } = await fetchHtml(targetUrl);
    const $0 = cheerio.load(homeHtml);
    const rawOgImage =
      $0('meta[property="og:image"]').attr('content') ||
      $0('meta[name="og:image"]').attr('content') ||
      $0('meta[property="twitter:image"]').attr('content') ||
      $0('meta[name="twitter:image"]').attr('content');
    const resolveOgImage = (path?: string | null): string | null => {
      if (!path || path.startsWith('data:')) return null;
      if (path.startsWith('http')) return path;
      if (path.startsWith('//')) return `https:${path}`;
      try {
        return new URL(path, targetUrl).href;
      } catch {
        return null;
      }
    };
    const og_image = resolveOgImage(rawOgImage) || null;

    const internalLinks = extractInternalLinks(homeHtml, targetUrl, origin);
    const urlsToCrawl = [targetUrl, ...internalLinks].slice(0, CRAWL_PAGE_LIMIT);
    const crawledUrls = urlsToCrawl;

    const siteLevel: SiteLevelContext = {
      hasRobots,
      hasSitemap,
      hasLlmsTxt,
      robotsBlocksAll,
      crawledUrls
    };

    type IssueRow = {
      page_url: string;
      category: string;
      code: string;
      severity: string;
      title: string;
      description: string;
      fix_type: string;
      fix_payload: object;
    };
    const allIssues: IssueRow[] = [];
    const pageData: Array<{
      url: string;
      html_size: number;
      word_count: number;
      h1: string | null;
      h2_count: number;
      schema_types: string[];
      issues_count: number;
      page_score: number;
    }> = [];
    let siteLevelRun = false;

    for (const pageUrl of urlsToCrawl) {
      let pageHtml = pageUrl === targetUrl ? homeHtml : '';
      if (!pageHtml) {
        try {
          const res = await fetchHtml(pageUrl);
          pageHtml = res.html;
        } catch {
          continue;
        }
      }

      const ctx = buildRuleContext(pageUrl, pageHtml, siteLevel);

      if (!siteLevelRun) {
        siteLevelRun = true;
        const siteFailures = runRules(ctx, { siteLevelOnly: true });
        for (const { rule, fix } of siteFailures) {
          allIssues.push({
            page_url: pageUrl,
            category: rule.category,
            code: rule.code,
            severity: rule.severity,
            title: fix.title,
            description: fix.explanation,
            fix_type: fix.type,
            fix_payload: fix
          });
        }
      }

      const pageFailures = runRules(ctx, { siteLevelOnly: false });
      for (const { rule, fix } of pageFailures) {
        allIssues.push({
          page_url: pageUrl,
          category: rule.category,
          code: rule.code,
          severity: rule.severity,
          title: fix.title,
          description: fix.explanation,
          fix_type: fix.type,
          fix_payload: fix
        });
      }

      const byCategory: Record<string, number> = {
        crawl: 0,
        structure: 0,
        entity: 0,
        schema: 0,
        reference: 0
      };
      const pageIssues = pageFailures;
      for (const { rule } of pageIssues) {
        byCategory[rule.category] +=
          rule.severity === 'high' ? PENALTY_HIGH : rule.severity === 'med' ? PENALTY_MED : PENALTY_LOW;
      }
      const pageScore = Math.max(
        0,
        100 -
          (byCategory.crawl + byCategory.structure + byCategory.entity + byCategory.schema + byCategory.reference)
      );
      const $p = cheerio.load(pageHtml);
      const jsonLd = parseJsonLd($p);
      const schemaTypes = jsonLd
        .map((o: any) => (Array.isArray(o['@type']) ? o['@type'] : [o['@type']]).filter(Boolean))
        .flat();
      const mainText = getMainText($p);
      const wordCount = mainText.split(/\s+/).filter(Boolean).length;

      pageData.push({
        url: pageUrl,
        html_size: Buffer.byteLength(pageHtml, 'utf8'),
        word_count: wordCount,
        h1: ctx.h1,
        h2_count: ctx.h2Count,
        schema_types: [...new Set(schemaTypes)],
        issues_count: pageIssues.length,
        page_score: pageScore
      });
    }

    const bucketPenalties: Record<string, number> = {
      crawl: 0,
      structure: 0,
      entity: 0,
      schema: 0,
      reference: 0
    };
    for (const i of allIssues) {
      const p = i.severity === 'high' ? PENALTY_HIGH : i.severity === 'med' ? PENALTY_MED : PENALTY_LOW;
      bucketPenalties[i.category] = (bucketPenalties[i.category] || 0) + p;
    }
    const crawl_score = Math.max(0, BUCKET_MAX - bucketPenalties.crawl);
    const structure_score = Math.max(0, BUCKET_MAX - bucketPenalties.structure);
    const entity_score = Math.max(0, BUCKET_MAX - bucketPenalties.entity);
    const schema_score = Math.max(0, BUCKET_MAX - bucketPenalties.schema);
    const reference_score = Math.max(0, BUCKET_MAX - bucketPenalties.reference);
    const overall_score =
      crawl_score + structure_score + entity_score + schema_score + reference_score;

    const supabase = await createClient();
    let siteId = 'pp_' + Math.random().toString(36).slice(2, 11);
    const { data: existingSite } = await supabase
      .from('analytics_sites')
      .select('id')
      .eq('domain', urlObj.hostname)
      .maybeSingle();
    if (existingSite) {
      siteId = existingSite.id;
    } else {
      await supabase.from('analytics_sites').insert({ id: siteId, domain: urlObj.hostname });
    }

    const { data: scanRow, error: scanError } = await supabase
      .from('geo_scans')
      .insert({
        site_id: siteId,
        url: targetUrl,
        overall_score,
        crawl_score,
        structure_score,
        entity_score,
        schema_score,
        reference_score,
        og_image
      })
      .select('id')
      .single();

    if (scanError || !scanRow) {
      console.error('geo_scans insert error', scanError);
      return NextResponse.json({ error: 'Failed to save scan' }, { status: 500 });
    }
    const scanId = scanRow.id;

    for (const p of pageData) {
      await supabase.from('geo_pages').insert({
        geo_scan_id: scanId,
        url: p.url,
        html_size: p.html_size,
        word_count: p.word_count,
        h1: p.h1,
        h2_count: p.h2_count,
        schema_types: p.schema_types,
        issues_count: p.issues_count,
        page_score: p.page_score
      });
    }

    const issuesWithId: Array<IssueRow & { id?: string }> = [];
    for (const i of allIssues) {
      const { data: inserted } = await supabase
        .from('geo_issues')
        .insert({
          geo_scan_id: scanId,
          page_url: i.page_url,
          category: i.category,
          code: i.code,
          severity: i.severity,
          title: i.title,
          description: i.description,
          fix_type: i.fix_type,
          fix_payload: i.fix_payload
        })
        .select('id')
        .single();
      issuesWithId.push({ ...i, id: inserted?.id });
    }

    return NextResponse.json({
      scanId,
      overall_score,
      crawl_score,
      structure_score,
      entity_score,
      schema_score,
      reference_score,
      issuesCount: issuesWithId.length,
      issues: issuesWithId,
      pages: pageData.map((p) => ({ url: p.url, page_score: p.page_score, issues_count: p.issues_count }))
    });
  } catch (err) {
    console.error('GEO scan error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'GEO scan failed' },
      { status: 500 }
    );
  }
}
