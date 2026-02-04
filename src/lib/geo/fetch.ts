import axios from 'axios';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import path from 'path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5'
};

function getLocalChromePath(): string {
  if (process.platform === 'win32') return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (process.platform === 'linux') return '/usr/bin/google-chrome';
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

export async function fetchHtml(url: string): Promise<{ html: string; status: number }> {
  try {
    const { data, status } = await axios.get<string>(url, {
      headers: HEADERS,
      timeout: 8000,
      responseType: 'text',
      validateStatus: () => true
    });
    return { html: typeof data === 'string' ? data : '', status: status || 0 };
  } catch (err: any) {
    const status = err.response?.status;
    const isBlocking = status === 403 || status === 401 || status === 429 || status === 503;
    const isTimeout = err.code === 'ECONNABORTED';
    if (!isBlocking && !isTimeout && status) {
      throw err;
    }
    // Puppeteer fallback
    const isProduction = process.env.NODE_ENV === 'production';
    let browser: any = null;
    try {
      browser = await puppeteer.launch({
        args: isProduction
          ? [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox']
          : ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: isProduction
          ? await chromium.executablePath(path.join(process.cwd(), 'node_modules/@sparticuz/chromium/bin'))
          : getLocalChromePath(),
        headless: isProduction ? (chromium as any).headless !== false : true,
        ignoreHTTPSErrors: true
      } as any);
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise((r) => setTimeout(r, 1500));
      const html = await page.content();
      return { html, status: 200 };
    } finally {
      if (browser) await browser.close();
    }
  }
}

export async function fetchText(url: string): Promise<{ text: string; status: number }> {
  try {
    const { data, status } = await axios.get<string>(url, {
      headers: { ...HEADERS, Accept: 'text/plain,*/*' },
      timeout: 5000,
      responseType: 'text',
      validateStatus: () => true
    });
    return { text: typeof data === 'string' ? data : '', status: status || 0 };
  } catch {
    return { text: '', status: 0 };
  }
}
