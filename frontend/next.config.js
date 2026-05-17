const isDevelopment = process.env.NODE_ENV !== 'production';
const localConnectOrigins = [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_CHATBOT_URL]
  .filter(Boolean)
  .flatMap((value) => {
    try {
      const url = new URL(value);
      return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
        ? [`${url.protocol}//${url.host}`]
        : [];
    } catch {
      return [];
    }
  });
const allowLocalConnect = isDevelopment || localConnectOrigins.length > 0;
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  "'wasm-unsafe-eval'",
  'https://cdn.jsdelivr.net',
].join(' ');
const connectSrc = [
  "'self'",
  'https:',
  'wss:',
  ...(allowLocalConnect
    ? ['http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*']
    : []),
  ...localConnectOrigins,
].join(' ');
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src ${connectSrc}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: 'unpkg.com' },
      { protocol: 'https', hostname: 'nominatim.openstreetmap.org' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'huggingface.co' },
    ],
  },
  // No orphan redirects needed; /emergency and /settings routes now exist.
  async redirects() {
    return [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=(self), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: `${contentSecurityPolicy};`,
          },
        ],
      },
      {
        source: '/emergency-card/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
      {
        source: '/track/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };

    // Transformers.js runs models via WebAssembly and offloads to Web Workers.
    // Without this, Next.js blocks both and the offline AI will not load.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader', options: { inline: 'no-fallback' } },
    });

    return config;
  },
};

module.exports = nextConfig;
