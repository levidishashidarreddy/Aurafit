import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA FIT — Private Gym & Fitness Companion',
  description: 'Mobile-first personal gym workout logger, calorie & macro tracker, progress analytics, and AI fitness assistant.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0B0F17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
