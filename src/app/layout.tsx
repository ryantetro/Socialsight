import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenGraph Checker | Professional Social Preview Tool',
  description:
    'The ultimate tool for developers and marketers to preview and debug their social media meta tags.',
  keywords: ['OpenGraph', 'SEO', 'Meta Tags', 'Social Preview', 'Next.js'],
  authors: [{ name: 'Antigravity' }],
  openGraph: {
    title: 'OpenGraph Checker',
    description: 'Preview how your website looks on social media.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
