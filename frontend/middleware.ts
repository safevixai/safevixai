import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = [
  'en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'bn', 'pa', 'ur',
  'ar', 'fr', 'es'
];
const DEFAULT_LOCALE = 'en';

function detectLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('svai-locale')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang) {
    const matched = acceptLang
      .split(',')
      .map((lang) => lang.split(';')[0].trim().substring(0, 2))
      .find((lang) => SUPPORTED_LOCALES.includes(lang));
    if (matched) return matched;
  }
  return DEFAULT_LOCALE;
}

function setLocaleHeaders(response: NextResponse, locale: string): void {
  response.headers.set('x-locale', locale);
  response.cookies.set('svai-locale', locale, {
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  });
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/offline-data') ||
    pathname.startsWith('/leaflet') ||
    pathname.includes('.') ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  const pathParts = pathname.split('/');
  const firstSegment = pathParts[1];
  const hasLocale = SUPPORTED_LOCALES.includes(firstSegment);

  if (hasLocale) {
    const actualPathname = '/' + pathParts.slice(2).join('/');
    const rewriteUrl = new URL(actualPathname === '/' ? '/' : actualPathname, request.url);
    rewriteUrl.search = search;

    const response = NextResponse.rewrite(rewriteUrl);
    setLocaleHeaders(response, firstSegment);
    return response;
  }

  // No locale prefix — serve directly with detected locale (NO redirect)
  const locale = detectLocale(request);
  const response = NextResponse.next();
  setLocaleHeaders(response, locale);
  return response;
}
