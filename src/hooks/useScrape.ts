import { useState } from 'react';
import { InspectionResult } from '@/types';

interface UseScrapeResult {
    loading: boolean;
    error: string | null;
    scrape: (url: string) => Promise<InspectionResult | null>;
}

export function useScrape(): UseScrapeResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const scrape = async (inputUrl: string) => {
        setLoading(true);
        setError(null);

        let targetUrl = inputUrl.trim();
        if (!targetUrl) {
            setError("Please enter a URL.");
            setLoading(false);
            return null;
        }

        // Auto-prepend https if protocol is missing
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`;
        }

        try {
            // Basic URL validation
            new URL(targetUrl);

            const response = await fetch('/api/inspect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl }),
            });

            if (!response.ok) {
                throw new Error("Failed to reach the website. Is it online?");
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            return data as InspectionResult;
        } catch (err: any) {
            setError(err.message || "Something went wrong. Try again.");
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { loading, error, scrape };
}
