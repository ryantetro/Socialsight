"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, AlertCircle } from 'lucide-react';

export default function GeoScanPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let target = url.trim();
    if (!target) {
      setError('Please enter a URL.');
      return;
    }
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    try {
      new URL(target);
    } catch {
      setError('Invalid URL.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/geo/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Scan failed.');
        return;
      }
      if (data.scanId) {
        router.push(`/geo/report/${data.scanId}`);
        return;
      }
      setError('No scan ID returned.');
    } catch (err) {
      setError('Request failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-black text-slate-900 mb-2">GEO Scan</h1>
      <p className="text-slate-500 font-medium mb-8">
        Run a Generative Engine Optimization audit. We&apos;ll check crawlability, structure, schema, and more.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            {loading ? 'Scanning…' : 'Scan GEO'}
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </form>
    </main>
  );
}
