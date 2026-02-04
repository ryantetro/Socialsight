import type { CheerioAPI } from 'cheerio';

export type GeoCategory = 'crawl' | 'structure' | 'entity' | 'schema' | 'reference';
export type GeoSeverity = 'low' | 'med' | 'high';
export type GeoFixType = 'copy' | 'code' | 'page_create';

export interface FixObject {
  type: GeoFixType;
  title: string;
  explanation: string;
  output: string;
}

export interface SiteLevelContext {
  hasRobots: boolean;
  hasSitemap: boolean;
  hasLlmsTxt: boolean;
  robotsBlocksAll: boolean;
  crawledUrls: string[];
}

export interface RuleContext {
  url: string;
  $: CheerioAPI;
  html: string;
  meta: { title?: string; description?: string };
  wordCount: number;
  h1: string | null;
  h2Count: number;
  mainText: string;
  links: string[];
  hasBlockquote: boolean;
  jsonLd: object[];
  status?: number;
  siteLevel: SiteLevelContext;
}

export interface GeoRule {
  code: string;
  category: GeoCategory;
  severity: GeoSeverity;
  check(ctx: RuleContext): boolean;
  buildFix(ctx: RuleContext): FixObject;
}
