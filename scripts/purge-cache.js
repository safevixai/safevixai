// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
#!/usr/bin/env node
/**
 * CDN cache purge script for SafeVixAI.
 * Supports: Vercel, Cloudflare, AWS CloudFront
 *
 * Usage:
 *   node scripts/purge-cache.js           # Purge all (uses env vars for provider)
 *   node scripts/purge-cache.js --url /challan  # Purge specific path
 *   node scripts/purge-cache.js --dry-run       # Dry run mode
 */

const https = require('https');

const PROVIDER = process.env.CDN_PROVIDER || 'vercel';
const DRY_RUN = process.argv.includes('--dry-run');
const URL_INDEX = process.argv.indexOf('--url');
const TARGET_URL = URL_INDEX >= 0 ? process.argv[URL_INDEX + 1] : undefined;

async function purgeVercel(path) {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token) throw new Error('VERCEL_TOKEN not set');

  const body = path ? { paths: [path] } : { paths: ['/'] };

  return apiRequest('api.vercel.com', `/v1/edge-cache/purge${teamId ? `?teamId=${teamId}` : ''}`, 'POST', token, body);
}

async function purgeCloudflare(path) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID required');

  const body = path
    ? { files: [path.startsWith('http') ? path : `https://safevixai.com${path}`] }
    : { purge_everything: true };

  return apiRequest(`api.cloudflare.com`, `/client/v4/zones/${zoneId}/purge_cache`, 'POST', token, body);
}

async function purgeCloudFront(path) {
  const { execSync } = require('child_process');
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (!distributionId) throw new Error('CLOUDFRONT_DISTRIBUTION_ID not set');

  const items = path ? [path.startsWith('/') ? path : `/${path}`] : ['/*'];
  const batch = { Paths: { Quantity: items.length, Items: items }, CallerReference: `purge-${Date.now()}` };

  const cmd = [
    'aws cloudfront create-invalidation',
    `--distribution-id ${distributionId}`,
    `--invalidation-batch '${JSON.stringify(batch)}'`,
    '--region ap-south-1',
  ].join(' ');

  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would run: ${cmd}`);
    return { success: true, dryRun: true };
  }

  const result = execSync(cmd, { timeout: 30000 }).toString();
  return { success: true, output: result.trim() };
}

function apiRequest(host, path, method, token, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: host,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, statusCode: res.statusCode, data: JSON.parse(responseData) });
        } else {
          reject(new Error(`Purge failed: ${res.statusCode} ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log(`SafeVixAI CDN Cache Purge — Provider: ${PROVIDER}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  if (TARGET_URL) console.log(`  Target: ${TARGET_URL}`);

  try {
    let result;
    switch (PROVIDER) {
      case 'vercel':
        result = await purgeVercel(TARGET_URL);
        break;
      case 'cloudflare':
        result = await purgeCloudflare(TARGET_URL);
        break;
      case 'cloudfront':
        result = await purgeCloudFront(TARGET_URL);
        break;
      default:
        throw new Error(`Unknown provider: ${PROVIDER}`);
    }
    console.log(`✓ Cache purge ${DRY_RUN ? 'simulated' : 'completed'} successfully`);
  } catch (err) {
    console.error(`✗ Cache purge failed: ${err.message}`);
    process.exit(1);
  }
}

main();
