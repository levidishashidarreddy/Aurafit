import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GYM HUB — Futuristic Personal Fitness Ecosystem',
  description: 'AI-driven futuristic gym workout logger, calorie & macro engine, biometrics analytics, and dragon streak gamification.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#070512',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070512] text-[#F6F2FF] antialiased font-sans min-h-screen selection:bg-[#9B5CFF] selection:text-white">
        {children}
      </body>
    </html>
  );
}
