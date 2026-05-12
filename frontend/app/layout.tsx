import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ConnectivityProvider } from '@/components/ConnectivityProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

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
        <meta name="mobile-web-app-capable" content="yes" />
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        <AnalyticsProvider>
          <ThemeProvider>
            <ConnectivityProvider>
              <EnterpriseClientAppHooks />
              <AppFrame>{children}</AppFrame>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 5000,
                  style: {
                    background: 'var(--surface-4)',
                    border: '1px solid var(--border-md)',
                    color: 'var(--text-1)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-panel)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '13px',
                  },
                  success: {
                    iconTheme: {
                      primary: 'var(--brand-light)',
                      secondary: '#0A0E14',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: 'var(--emergency)',
                      secondary: '#FFFFFF',
                    },
                  },
                }}
              />
            </ConnectivityProvider>
          </ThemeProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
