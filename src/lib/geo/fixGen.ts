import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { fetchHtml } from '@/lib/geo/fetch';

type Confidence = 'high' | 'medium' | 'low';

export type FixArtifact = {
  type: 'file' | 'html' | 'jsonld' | 'config' | 'patch' | 'copy';
  language: string;
  pathHint?: string;
  content: string;
};

export type GeneratedFixBundle = {
  artifact: FixArtifact;
  idePrompt: string;
  explanation: string;
  confidence: Confidence;
  model: string;
  generatedAt: string;
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function cleanJson(text: string): string {
  return text.replace(/```json|```/g, '').trim();
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(cleanJson(raw)) as T;
  } catch {
    return null;
  }
}

function guessFramework(html: string): string {
  const lower = html.toLowerCase();
  if (lower.includes('__next') || lower.includes('nextjs') || lower.includes('next-script')) return 'Next.js';
  if (lower.includes('gatsby')) return 'Gatsby';
  if (lower.includes('wp-content') || lower.includes('wordpress')) return 'WordPress';
  return 'unknown';
}

function pickSiteName($: cheerio.CheerioAPI, url: string): string {
  const title = ($('head title').text() || '').trim();
  const h1 = ($('h1').first().text() || '').trim();
  const fromTitle = title.split('|')[0]?.split('—')[0]?.trim();
  if (fromTitle && fromTitle.length <= 40) return fromTitle;
  if (h1 && h1.length <= 40) return h1;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return 'this site';
  }
}

export async function generateFixBundle(args: {
  issue: { code: string; category: string; severity: string; title: string; description?: string };
  pageUrl: string;
}): Promise<{ bundle: GeneratedFixBundle; pageContext: { html: string; text: string } }> {
  const { issue, pageUrl } = args;
  const { html } = await fetchHtml(pageUrl);
  const $ = cheerio.load(html || '');
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 4000);

  const siteName = pickSiteName($, pageUrl);
  const knownDescription =
    ($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '').trim();
  const frameworkGuess = guessFramework(html || '');
  const headings = {
    h1: $('h1').first().text().trim(),
    h2: $('h2')
      .slice(0, 8)
      .map((_, el) => $(el).text().trim())
      .get(),
  };
  const jsonLdTypes = $('script[type="application/ld+json"]')
    .slice(0, 6)
    .map((_, el) => ($(el).html() || '').slice(0, 600))
    .get();

  const modelName = 'gemini-2.0-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const system = `
You are a senior web engineer and technical writer.

Generate a production-ready fix for a website issue.

Rules:
- Use existing tone and terminology from the page. No marketing language.
- Be concise and factual.
- Output MUST be valid JSON (no markdown fences).
- JSON must match this schema:
{
  "artifact": { "type": "file|html|jsonld|config|patch|copy", "language": "txt|html|json|diff|md|ts|tsx|js", "pathHint": "optional", "content": "string" },
  "idePrompt": "string",
  "explanation": "string",
  "confidence": "high|medium|low"
}
`;

  const user = {
    issue,
    pageUrl,
    siteName,
    knownDescription,
    frameworkGuess,
    headings,
    jsonLdTypes,
    pageTextSnippet: text,
  };

  const prompt = `${system}\n\nContext:\n${JSON.stringify(user, null, 2)}\n`;

  let res: Awaited<ReturnType<typeof model.generateContent>>;
  const maxRetries = 4;
  const backoffMs = [5000, 15000, 25000]; // 5s, 15s, 25s before retries 2–4
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      res = await model.generateContent(prompt);
      break;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      const is429 =
        e?.status === 429 ||
        (typeof e?.message === 'string' &&
          (e.message.includes('429') || e.message.includes('Resource exhausted') || e.message.includes('Too Many Requests')));
      if (is429 && attempt < maxRetries - 1) {
        const delayMs = backoffMs[attempt] ?? 25000;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      throw err;
    }
  }
  const raw = (res!).response.text();
  const parsed = safeJsonParse<{
    artifact: FixArtifact;
    idePrompt: string;
    explanation: string;
    confidence: Confidence;
  }>(raw);

  if (!parsed?.artifact?.content || !parsed.idePrompt || !parsed.explanation || !parsed.confidence) {
    // Fallback: wrap existing suggested fix (if model failed)
    const fallback: GeneratedFixBundle = {
      artifact: {
        type: 'copy',
        language: 'txt',
        content: `Fix suggestion for ${issue.code}: ${issue.title}`,
      },
      idePrompt: `In a web project, implement a fix for ${issue.code} on ${pageUrl}. Do not change anything else.`,
      explanation: issue.description || 'Review and apply the suggested change.',
      confidence: 'low',
      model: modelName,
      generatedAt: new Date().toISOString(),
    };
    return { bundle: fallback, pageContext: { html, text } };
  }

  const bundle: GeneratedFixBundle = {
    artifact: parsed.artifact,
    idePrompt: parsed.idePrompt,
    explanation: parsed.explanation,
    confidence: parsed.confidence,
    model: modelName,
    generatedAt: new Date().toISOString(),
  };

  return { bundle, pageContext: { html, text } };
}

