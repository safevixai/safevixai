// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { NextRequest, NextResponse } from 'next/server';

const TOMTOM_BASE = 'https://api.tomtom.com';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'TomTom API key not configured' }, { status: 503 });
  }

  const { slug } = await params;
  const path = slug.join('/');
  const url = new URL(`${TOMTOM_BASE}/${path}`);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    headers.set('Access-Control-Allow-Origin', '*');

    return new NextResponse(res.body, { status: res.status, headers });
  } catch {
    return NextResponse.json({ error: 'TomTom proxy failed' }, { status: 502 });
  }
}