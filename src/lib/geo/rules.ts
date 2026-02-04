import type { GeoRule, RuleContext, FixObject } from './types';

const DEFINITION_PHRASES = ['is a', 'provides', 'helps', 'platform', 'tool'];
const MAX_PARAGRAPH_WORDS = 150;
const DEFINITION_TEXT_LENGTH = 300;

function getMainText($: RuleContext['$'], maxWords: number = DEFINITION_TEXT_LENGTH): string {
  const selectors = ['article', 'main', '[role="main"]', '.content', '.post', 'body'];
  let text = '';
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) {
      text = el.text().replace(/\s+/g, ' ').trim();
      if (text.length > 0) break;
    }
  }
  if (!text) text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.split(/\s+/).slice(0, maxWords).join(' ');
}

function getLinks($: RuleContext['$']): string[] {
  const hrefs: string[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && (href.startsWith('http') || href.startsWith('//'))) hrefs.push(href);
  });
  return hrefs;
}

function hasCitationSignals(ctx: RuleContext): boolean {
  if (ctx.hasBlockquote) return true;
  const lower = ctx.links.join(' ').toLowerCase();
  if (lower.includes('wikipedia') || lower.includes('nih.gov')) return true;
  return /\d+%|\d+\.\d+%|\d+\s*(percent|users|studies)/i.test(ctx.mainText);
}

// ---- Crawl ----
const MISSING_ROBOTS_TXT: GeoRule = {
  code: 'MISSING_ROBOTS_TXT',
  category: 'crawl',
  severity: 'high',
  check: (ctx) => ctx.siteLevel.hasRobots,
  buildFix: () => ({
    type: 'page_create',
    title: 'Add robots.txt',
    explanation: 'robots.txt helps crawlers and AI agents discover and respect your site structure.',
    output: `User-agent: *
Allow: /

Sitemap: {{url}}/sitemap.xml`
  })
};

const ROBOTS_BLOCKS_ALL: GeoRule = {
  code: 'ROBOTS_BLOCKS_ALL',
  category: 'crawl',
  severity: 'high',
  check: (ctx) => !ctx.siteLevel.robotsBlocksAll,
  buildFix: () => ({
    type: 'copy',
    title: 'Allow crawlers in robots.txt',
    explanation: 'Disallow: / blocks all crawlers and AI engines from reading your site.',
    output: 'Update robots.txt to allow at least your main content. Use Allow: / or remove Disallow: /.'
  })
};

const MISSING_SITEMAP: GeoRule = {
  code: 'MISSING_SITEMAP',
  category: 'crawl',
  severity: 'med',
  check: (ctx) => ctx.siteLevel.hasSitemap,
  buildFix: (ctx) => ({
    type: 'page_create',
    title: 'Add sitemap.xml',
    explanation: 'A sitemap helps search and AI engines discover all your pages.',
    output: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${ctx.url}</loc><changefreq>weekly</changefreq></url>
</urlset>`
  })
};

const MISSING_LLMS_TXT: GeoRule = {
  code: 'MISSING_LLMS_TXT',
  category: 'crawl',
  severity: 'high',
  check: (ctx) => ctx.siteLevel.hasLlmsTxt,
  buildFix: (ctx) => ({
    type: 'page_create',
    title: 'Add llms.txt',
    explanation: 'llms.txt helps AI systems understand your product and site structure.',
    output: `# {{siteName}}
{{siteName}} is a {{category}}.

Primary site: ${ctx.url}
Docs: ${ctx.url}/docs
Blog: ${ctx.url}/blog`
  })
};

const CANONICAL_MISSING: GeoRule = {
  code: 'CANONICAL_MISSING',
  category: 'crawl',
  severity: 'med',
  check: (ctx) => ctx.$('link[rel="canonical"]').length > 0,
  buildFix: (ctx) => ({
    type: 'code',
    title: 'Add canonical URL',
    explanation: 'A canonical link tells engines which URL is the preferred version of this page.',
    output: `<link rel="canonical" href="${ctx.url}" />`
  })
};

// ---- Structure ----
const MULTIPLE_H1: GeoRule = {
  code: 'MULTIPLE_H1',
  category: 'structure',
  severity: 'med',
  check: (ctx) => ctx.$('h1').length <= 1,
  buildFix: () => ({
    type: 'copy',
    title: 'Use a single H1 per page',
    explanation: 'Multiple H1s dilute the main topic signal for AI and search engines.',
    output: 'Keep one H1 that states the main topic. Use H2/H3 for sections.'
  })
};

const NO_H1: GeoRule = {
  code: 'NO_H1',
  category: 'structure',
  severity: 'high',
  check: (ctx) => ctx.$('h1').length > 0,
  buildFix: () => ({
    type: 'copy',
    title: 'Add an H1 heading',
    explanation: 'An H1 tells AI and search engines what the page is about.',
    output: 'Add a single <h1> that clearly describes the page topic.'
  })
};

const NO_H2: GeoRule = {
  code: 'NO_H2',
  category: 'structure',
  severity: 'med',
  check: (ctx) => ctx.h2Count > 0,
  buildFix: () => ({
    type: 'copy',
    title: 'Add H2 section headings',
    explanation: 'H2s structure content and help AI summarize your page.',
    output: 'Add <h2> headings for each major section.'
  })
};

const PARAGRAPH_TOO_LONG: GeoRule = {
  code: 'PARAGRAPH_TOO_LONG',
  category: 'structure',
  severity: 'low',
  check: (ctx) => {
    let maxWords = 0;
    ctx.$('p').each((_, el) => {
      const w = ctx.$(el).text().trim().split(/\s+/).length;
      if (w > maxWords) maxWords = w;
    });
    return maxWords <= MAX_PARAGRAPH_WORDS;
  },
  buildFix: () => ({
    type: 'copy',
    title: 'Shorten long paragraphs',
    explanation: 'Short paragraphs are easier for AI to parse and cite.',
    output: 'Split paragraphs longer than ~150 words into smaller blocks with subheadings.'
  })
};

const NO_DEFINITION_BLOCK: GeoRule = {
  code: 'NO_DEFINITION_BLOCK',
  category: 'structure',
  severity: 'med',
  check: (ctx) => {
    const lower = ctx.mainText.toLowerCase();
    return DEFINITION_PHRASES.some((p) => lower.includes(p));
  },
  buildFix: (ctx) => ({
    type: 'copy',
    title: 'Add a clear definition near the top',
    explanation: 'AI engines look for a concise "what is X" near the start of the page.',
    output: `Add a short block in the first 300 words that defines your product, e.g. "${ctx.meta.title || 'Your product'} is a [category] that [helps/provides]..."`
  })
};

// ---- Entity ----
const NO_ABOUT_PAGE: GeoRule = {
  code: 'NO_ABOUT_PAGE',
  category: 'entity',
  severity: 'med',
  check: (ctx) => {
    const aboutPattern = /\/about|\/about-us|\/company|\/who-we-are/i;
    return ctx.siteLevel.crawledUrls.some((u) => aboutPattern.test(new URL(u).pathname));
  },
  buildFix: () => ({
    type: 'page_create',
    title: 'Add an About page',
    explanation: 'An About page helps AI and users understand who you are.',
    output: 'Create a page at /about or /about-us describing your company and product.'
  })
};

const MISSING_ONE_LINER: GeoRule = {
  code: 'MISSING_ONE_LINER',
  category: 'entity',
  severity: 'med',
  check: (ctx) => {
    const desc = (ctx.meta.description || '').trim();
    return desc.length >= 20 && desc.length <= 200;
  },
  buildFix: () => ({
    type: 'code',
    title: 'Add a meta description (one-liner)',
    explanation: 'A short description helps AI and search engines summarize your site.',
    output: '<meta name="description" content="Your product in one sentence (20–160 chars)." />'
  })
};

const NO_CONTACT_INFO: GeoRule = {
  code: 'NO_CONTACT_INFO',
  category: 'entity',
  severity: 'low',
  check: (ctx) => {
    const html = ctx.html.toLowerCase();
    const hasMail = /mailto:|@[a-z0-9.-]+\.[a-z]{2,}/i.test(html);
    const hasContact = /contact|support|help|reach/i.test(html) && ctx.links.some((l) => /contact|support|help|about/i.test(l));
    return hasMail || hasContact;
  },
  buildFix: () => ({
    type: 'copy',
    title: 'Add contact or support info',
    explanation: 'Contact info builds trust and helps AI cite your site correctly.',
    output: 'Add a Contact or Support link, or an email address.'
  })
};

// ---- Schema ----
const NO_JSONLD: GeoRule = {
  code: 'NO_JSONLD',
  category: 'schema',
  severity: 'high',
  check: (ctx) => ctx.jsonLd.length > 0,
  buildFix: (ctx) => ({
    type: 'code',
    title: 'Add JSON-LD structured data',
    explanation: 'Structured data helps AI and search engines understand your content.',
    output: `{"@context":"https://schema.org","@type":"Organization","name":"{{siteName}}","url":"${ctx.url}"}`
  })
};

const MISSING_ORG_SCHEMA: GeoRule = {
  code: 'MISSING_ORG_SCHEMA',
  category: 'schema',
  severity: 'med',
  check: (ctx) => ctx.jsonLd.some((o: any) => o['@type'] === 'Organization' || (Array.isArray(o['@type']) && o['@type'].includes('Organization'))),
  buildFix: (ctx) => ({
    type: 'code',
    title: 'Add Organization schema',
    explanation: 'Organization schema helps AI attribute your brand correctly.',
    output: `{"@context":"https://schema.org","@type":"Organization","name":"{{siteName}}","url":"${ctx.url}"}`
  })
};

const MISSING_SOFTWARE_APP_SCHEMA: GeoRule = {
  code: 'MISSING_SOFTWARE_APP_SCHEMA',
  category: 'schema',
  severity: 'low',
  check: (ctx) => ctx.jsonLd.some((o: any) => o['@type'] === 'SoftwareApplication' || (Array.isArray(o['@type']) && o['@type'].includes('SoftwareApplication'))),
  buildFix: (ctx) => ({
    type: 'code',
    title: 'Add SoftwareApplication schema (if applicable)',
    explanation: 'SoftwareApplication schema helps AI understand your product type.',
    output: `{"@context":"https://schema.org","@type":"SoftwareApplication","name":"{{siteName}}","applicationCategory":"{{category}}","operatingSystem":"Web","url":"${ctx.url}","description":"{{oneLiner}}"}`
  })
};

const INVALID_SCHEMA: GeoRule = {
  code: 'INVALID_SCHEMA',
  category: 'schema',
  severity: 'med',
  check: (ctx) => {
    if (ctx.jsonLd.length === 0) return true;
    return ctx.jsonLd.every((o: any) => o && (o['@context'] || o['@type']));
  },
  buildFix: () => ({
    type: 'code',
    title: 'Fix invalid JSON-LD',
    explanation: 'Invalid structured data can be ignored or misinterpreted by engines.',
    output: 'Ensure each script has @context and @type. Validate at search.google.com/test/rich-results.'
  })
};

// ---- Reference ----
const NO_FAQ: GeoRule = {
  code: 'NO_FAQ',
  category: 'reference',
  severity: 'low',
  check: (ctx) => {
    const hasFaqSchema = ctx.jsonLd.some((o: any) => o['@type'] === 'FAQPage' || (Array.isArray(o['@type']) && o['@type'].includes('FAQPage')));
    const hasFaqContent = /faq|frequently asked|questions?\s*and\s*answers?/i.test(ctx.html);
    return hasFaqSchema || hasFaqContent;
  },
  buildFix: () => ({
    type: 'copy',
    title: 'Add an FAQ section or page',
    explanation: 'FAQs help AI answer user questions with your content.',
    output: 'Add an FAQ section or FAQPage schema with common questions and answers.'
  })
};

const NO_CITATIONS: GeoRule = {
  code: 'NO_CITATIONS',
  category: 'reference',
  severity: 'low',
  check: (ctx) => hasCitationSignals(ctx),
  buildFix: () => ({
    type: 'copy',
    title: 'Add citations or evidence',
    explanation: 'Blockquotes, links to sources, or stats make content more cite-worthy for AI.',
    output: 'Add blockquotes, links to authoritative sources (e.g. Wikipedia, studies), or cited statistics.'
  })
};

// ---- Rule list (site-level run once; page-level run per page) ----
const SITE_LEVEL_CODES = new Set(['MISSING_ROBOTS_TXT', 'ROBOTS_BLOCKS_ALL', 'MISSING_SITEMAP', 'MISSING_LLMS_TXT', 'NO_ABOUT_PAGE']);

export const GEO_RULES: GeoRule[] = [
  MISSING_ROBOTS_TXT,
  ROBOTS_BLOCKS_ALL,
  MISSING_SITEMAP,
  MISSING_LLMS_TXT,
  CANONICAL_MISSING,
  MULTIPLE_H1,
  NO_H1,
  NO_H2,
  PARAGRAPH_TOO_LONG,
  NO_DEFINITION_BLOCK,
  NO_ABOUT_PAGE,
  MISSING_ONE_LINER,
  NO_CONTACT_INFO,
  NO_JSONLD,
  MISSING_ORG_SCHEMA,
  MISSING_SOFTWARE_APP_SCHEMA,
  INVALID_SCHEMA,
  NO_FAQ,
  NO_CITATIONS
];

export function isSiteLevelRule(code: string): boolean {
  return SITE_LEVEL_CODES.has(code);
}

export function runRules(ctx: RuleContext, options?: { siteLevelOnly?: boolean }): Array<{ rule: GeoRule; fix: FixObject }> {
  const failures: Array<{ rule: GeoRule; fix: FixObject }> = [];
  for (const rule of GEO_RULES) {
    const isSite = isSiteLevelRule(rule.code);
    if (options?.siteLevelOnly && !isSite) continue;
    if (!options?.siteLevelOnly && isSite) continue;
    try {
      if (!rule.check(ctx)) {
        failures.push({ rule, fix: rule.buildFix(ctx) });
      }
    } catch {
      // skip rule on error
    }
  }
  return failures;
}

export { getMainText, getLinks };
