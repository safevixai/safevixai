import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from 'sonner';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { SWRConfig } from 'swr';
import './globals.css';
import { ConnectivityProvider } from '@/components/ConnectivityProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GSAPProvider } from '@/components/providers/GSAPProvider';
import { SentryInit } from '@/components/providers/SentryInit';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });
import { AppFrame } from '@/components/ui/AppFrame';
import { AnalyticsProvider } from '@/lib/analytics-provider';
import { EnterpriseClientAppHooks } from '@/components/EnterpriseClientAppHooks';

export const metadata: Metadata = {
  title: 'SafeVixAI - AI-Powered Road Safety',
  description:
    'Find nearest hospitals, police stations and ambulances instantly. AI chatbot for road laws and first aid. Works offline. IIT Madras Road Safety Hackathon 2026.',
  keywords: ['road safety', 'emergency', 'hospital finder', 'traffic laws', 'first aid', 'accident help', 'India'],
  authors: [{ name: 'SafeVixAI Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title: 'SafeVixAI',
  },
  openGraph: {
    title: 'SafeVixAI - AI-Powered Road Safety',
    description: 'Emergency help, AI legal assistant and road reporter. Works offline.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0E14' },
    { media: '(prefers-color-scheme: light)', color: '#F0F4F8' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable} ${spaceGrotesk.variable} font-sans`}>
      <head>
        <link rel="icon" type="image/png" href="/icons/favicon.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://mt1.google.com" />
        <link rel="preconnect" href="https://api.maptiler.com" />
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
        <link rel="dns-prefetch" href="https://mt1.google.com" />
        <link rel="dns-prefetch" href="https://api.maptiler.com" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Flash-free theme init - runs before React hydration to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var stored = localStorage.getItem('svai-theme');
            var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            var theme = stored === 'system' || !stored ? system : stored;
            document.documentElement.setAttribute('data-theme', theme);
            document.documentElement.classList.add(theme);
          })();
        ` }} />
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-brand-light focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:outline-none">
          Skip to main content
        </a>
        <SentryInit />
        <AnalyticsProvider>
          <SWRConfig value={{
            dedupingInterval: 5000,
            focusThrottleInterval: 30000,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            errorRetryCount: 3,
            errorRetryInterval: 2000,
          }}>
            <ThemeProvider>
            <GSAPProvider>
              <ConnectivityProvider>
                <EnterpriseClientAppHooks />
                <AppFrame>{children}</AppFrame>
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: 'var(--surface-4)',
                    border: '1px solid var(--border-md)',
                    color: 'var(--text-1)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '13px',
                  },
                }}
              />
              </ConnectivityProvider>
            </GSAPProvider>
            </ThemeProvider>
          </SWRConfig>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
