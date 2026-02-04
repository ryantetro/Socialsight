"use client";

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import UserNav from '@/components/UserNav';

export default function GeoNavClient() {
  const { user, profile, loading, isPaid } = useProfile();
  if (loading) return <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />;
  if (!user) {
    return (
      <>
        <Link href="/login" className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900">Sign In</Link>
        <Link href="/" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-black">
          Get Started
        </Link>
      </>
    );
  }
  return <UserNav user={user} tier={profile?.tier || 'free'} isPaid={isPaid} />;
}
