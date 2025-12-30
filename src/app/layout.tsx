import type { Metadata } from 'next';
import './globals.css';
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: 'Social Sight | The best way to track OG tags',
  description: 'Boost your social CTR with real-time analytics and high-fidelity social previews.',
  keywords: ['OpenGraph', 'SEO', 'Meta Tags', 'Social Preview', 'Next.js'],
  authors: [{ name: 'Social Sight' }],
  openGraph: {
    title: 'Social Sight | The best way to track OG tags',
    description: 'Boost your social CTR with real-time analytics and high-fidelity social previews.',
    url: 'socialsight.dev?utm_source=previewperfect&utm_medium=social&utm_campaign=og_share',
    siteName: 'Social Sight',
    images: [
      {
        url: 'https://socialsight.dev/og-image-socialsight.dev.png',
        width: 1200,
        height: 630,
        alt: 'Social Sight Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Social Sight | The best way to track OG tags',
    description: 'Boost your social CTR with real-time analytics and high-fidelity social previews.',
    images: ['https://socialsight.dev/og-image-socialsight.dev.png'],
  },
  icons: {
    icon: '/favicon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dynamic Dogfooding: Fetch the actual ID for socialsight.dev from the DB
  // This ensures that if we reset the DB/dashboard, the pixel stays in sync.
  let trackingId = 'pp_d31c3026'; // Fallback
  try {
    // We import dynamically to avoid build-time static issues if env vars aren't ready
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('analytics_sites')
      .select('id')
      .ilike('domain', '%socialsight.dev%')
      .limit(1)
      .single();

    if (data?.id) {
      trackingId = data.id;
    }
  } catch (e) {
    // console.warn('Could not fetch dynamic tracking ID, using fallback');
  }

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body>
        {children}
        {/* SocialSight Tracking Pixel (Dynamic Dogfooding) */}
        <script async src="https://cdn.previewperfect.ai/pixel.js" data-id={trackingId}></script>
        <Analytics />
      </body>
    </html>
  );
}
