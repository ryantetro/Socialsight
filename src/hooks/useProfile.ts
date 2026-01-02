
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

export type UserTier = 'free' | 'pro' | 'founder' | 'ltd' | 'growth' | 'agency';

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    tier: UserTier;
    stripe_subscription_id?: string | null;
}

export function useProfile() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const supabase = createClient();

    useEffect(() => {
        let mounted = true;

        // OPTIMIZATION: Check for cached profile instantly
        const cachedProfile = localStorage.getItem('socialsight_user_profile');
        if (cachedProfile) {
            try {
                const parsed = JSON.parse(cachedProfile);
                setProfile(parsed);
                // If we have a cached profile, we are "not loading" (optimistic)
                // But we still fetch deeply to update tier if changed
                setLoading(false);
            } catch (e) {
                // Ignore parse errors
            }
        }

        const init = async () => {
            try {
                // Timeout wrapper for getUser
                const getUserPromise = supabase.auth.getUser();
                const timeoutPromise = new Promise((resolve) => {
                    setTimeout(() => resolve({ data: { user: null }, error: { message: 'Auth timeout' } }), 15000);
                });

                const result = await Promise.race([getUserPromise, timeoutPromise]) as any;
                const { data: { user }, error } = result;

                if (mounted) {
                    setUser(user);
                    if (!user) {
                        // If signed out, confirm loading is done
                        setLoading(false);
                        localStorage.removeItem('socialsight_user_profile');
                    }
                }

                if (user) {
                    await fetchProfile(user.id);
                }
            } catch (err) {
                if (mounted) setLoading(false);
            }
        };

        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (mounted) setUser(session?.user ?? null);
            if (session?.user) {
                if (!profile || profile.id !== session.user.id) {
                    await fetchProfile(session.user.id);
                }
            } else {
                if (mounted) {
                    setProfile(null);
                    setLoading(false);
                    localStorage.removeItem('socialsight_user_profile');
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const query = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeout = new Promise((resolve) => {
                setTimeout(() => resolve({ data: null, error: { message: 'Profile timeout' } }), 15000);
            });
            const { data, error } = await Promise.race([query, timeout]) as any;

            if (!error && data) {
                setProfile(data as Profile);
                localStorage.setItem('socialsight_user_profile', JSON.stringify(data));
            }
        } catch (e) {
            console.error("Error fetching profile", e);
        } finally {
            setLoading(false);
        }
    };


    // Permission Logic
    const effectiveTier = profile?.tier || 'free';
    const permissions = {
        canMonitor: effectiveTier !== 'free',
        canBenchmark: effectiveTier !== 'free',
        canAnalyze: effectiveTier === 'growth' || effectiveTier === 'agency' || effectiveTier === 'ltd',
        canFix: effectiveTier !== 'free',
        canRemoveBranding: effectiveTier === 'agency',
        dailyLimit: effectiveTier === 'free' ? 3 : Infinity
    };

    return { user, profile, loading, isPaid: effectiveTier !== 'free', permissions, refresh: () => user && fetchProfile(user.id) };
}
