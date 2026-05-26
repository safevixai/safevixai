import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = [
  'en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur',
  'ar', 'fr', 'es'
];
const DEFAULT_LOCALE = 'en';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 0. Skip locale redirect if this is an internal rewrite from the locale handler
  //    (prevents infinite loop: hasLocale → rewrite → no locale → redirect → hasLocale → ...)
  if (request.headers.get('x-middleware-rewrite') !== null) {
    return NextResponse.next();
  }

  // 1. Skip middleware for static assets, public assets, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/offline-data') ||
    pathname.startsWith('/leaflet') ||
    pathname.includes('.') || // static files like manifest.json, sw.js, favicon.png
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  // 2. Check if the pathname already has a supported locale prefix
  const pathParts = pathname.split('/');
  const firstSegment = pathParts[1];
  const hasLocale = SUPPORTED_LOCALES.includes(firstSegment);

  if (hasLocale) {
    // We already have a valid locale prefix.
    // Strip the locale prefix internally so Next.js matches the actual page under app/
    const actualPathname = '/' + pathParts.slice(2).join('/');
    const rewriteUrl = new URL(actualPathname === '/' ? '/' : actualPathname, request.url);
    rewriteUrl.search = search; // Preserve query params

    const response = NextResponse.rewrite(rewriteUrl);
    
    // Pass the locale in a custom header so components/layout can read it
    response.headers.set('x-locale', firstSegment);
    
    // Sync the cookie to persist the preferred language
    response.cookies.set('svai-locale', firstSegment, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
    });

    return response;
  }

  // 3. Path doesn't have a locale. Detect locale and redirect.
  let locale = DEFAULT_LOCALE;

  // Priority A: Check svai-locale cookie
  const cookieLocale = request.cookies.get('svai-locale')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    locale = cookieLocale;
  } else {
    // Priority B: Check Accept-Language header
    const acceptLang = request.headers.get('accept-language');
    if (acceptLang) {
      // Find the first language code in accept-language that we support
      const matched = acceptLang
        .split(',')
        .map((lang) => lang.split(';')[0].trim().substring(0, 2))
        .find((lang) => SUPPORTED_LOCALES.includes(lang));
      
      if (matched) {
        locale = matched;
      }
    }
  }

  // Enforce locale redirect (e.g., /settings -> /en/settings)
  const redirectUrl = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url);
  redirectUrl.search = search; // Preserve query parameters
  
  const response = NextResponse.redirect(redirectUrl);
  
  // Set detected locale in cookie
  response.cookies.set('svai-locale', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });

  return response;
}
