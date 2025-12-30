import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social Sight | Professional Social Preview Tool',
  description:
    'The ultimate tool for developers and marketers to preview and debug their social media meta tags.',
  keywords: ['OpenGraph', 'SEO', 'Meta Tags', 'Social Preview', 'Next.js'],
  authors: [{ name: 'Antigravity' }],
  openGraph: {
    title: 'Social Sight',
    description: 'Preview how your website looks on social media.',
    type: 'website',
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
      <body>{children}</body>
    </html>
  );
}
