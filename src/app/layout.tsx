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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body>
        {children}
        {/* SocialSight Tracking Pixel */}
        <script async src="https://cdn.previewperfect.ai/pixel.js" data-id="pp_d31c3026"></script>
        <Analytics />
      </body>
    </html>
  );
}
