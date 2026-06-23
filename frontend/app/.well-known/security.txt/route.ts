// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const contact = process.env.SECURITY_CONTACT || 'security@safevixai.com';
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const body = [
    `# SafeVixAI Security Contact`,
    ``,
    `# Our security disclosure policy:`,
    `# We appreciate responsible disclosure of vulnerabilities.`,
    `# Please include a detailed description and steps to reproduce.`,
    ``,
    `Contact: mailto:${contact}`,
    `Expires: ${expires}`,
    `Encryption: https://keybase.io/safevixai/pgp_keys.asc`,
    `Preferred-Languages: en, hi, ta`,
    `Canonical: https://safevixai.com/.well-known/security.txt`,
    `Policy: https://safevixai.com/security/policy`,
    `Hiring: https://safevixai.com/careers`,
    `Acknowledgments: https://safevixai.com/security/hall-of-fame`,
  ].join('\n');

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
