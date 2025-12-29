"use client";

import { Suspense } from 'react';
import HomeContent from '@/components/HomeContent';

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  );
}
