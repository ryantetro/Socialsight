import Link from 'next/link';
import { Search, Clock } from 'lucide-react';
import GeoNavClient from './GeoNavClient';

export default function GeoLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-black text-2xl tracking-tighter group shrink-0">
              <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                <span className="text-lg font-black italic">S</span>
              </div>
              <span className="hidden lg:inline whitespace-nowrap">Social<span className="text-blue-600">Sight</span></span>
            </Link>
            <div className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-sm border border-slate-200/50 p-1.5 rounded-2xl shadow-sm">
              <Link
                href="/geo/scan"
                className="px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              >
                <Search size={14} /> Scan
              </Link>
              <Link
                href="/geo/history"
                className="px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
              >
                <Clock size={14} /> History
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-900">
              Home
            </Link>
            <GeoNavClient />
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
