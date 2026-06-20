import { NextRequest, NextResponse } from 'next/server';

const MAPTILER_BASE = 'https://api.maptiler.com';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const apiKey = process.env.MAPTILER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MapTiler API key not configured' }, { status: 503 });
  }

  const { slug } = await params;
  const path = slug.join('/');
  const url = new URL(`${MAPTILER_BASE}/${path}`);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json');
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(res.body, { status: res.status, headers });
  } catch {
    return NextResponse.json({ error: 'MapTiler proxy failed' }, { status: 502 });
  }
}