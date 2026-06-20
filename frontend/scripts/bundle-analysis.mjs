import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_BUNDLE_SIZE_BYTES = 300 * 1024;
const BUILD_DIR = path.join(__dirname, '..', '.next');

const CRITICAL_CHUNKS = [
  { pattern: /^framework-/ },
  { pattern: /^main-/ },
  { pattern: /^_buildManifest/ },
  { pattern: /^_ssgManifest/ },
  { pattern: /\/pages\/_app-/ },
  { pattern: /\/app\/layout-/ },
];

function getChunkSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch { return 0; }
}

function getAppDirChunks(dir) {
  const chunks = [];
  const appDir = path.join(dir, 'static', 'chunks', 'app');
  if (!fs.existsSync(appDir)) return chunks;

  for (const file of fs.readdirSync(appDir)) {
    const filePath = path.join(appDir, file);
    if (file.endsWith('.js')) {
      chunks.push({ name: `app/${file}`, size: getChunkSize(filePath), path: filePath });
    }
  }
  return chunks;
}

function getCriticalChunks(dir) {
  const chunks = [];
  const chunkDir = path.join(dir, 'static', 'chunks');
  if (!fs.existsSync(chunkDir)) return chunks;

  for (const file of fs.readdirSync(chunkDir)) {
    const filePath = path.join(chunkDir, file);
    if (!file.endsWith('.js')) continue;
    for (const pattern of CRITICAL_CHUNKS) {
      if (pattern.pattern.test(file)) {
        chunks.push({ name: file, size: getChunkSize(filePath), path: filePath, critical: true });
        break;
      }
    }
  }
  return chunks;
}

function main() {
  const chunks = [
    ...getCriticalChunks(BUILD_DIR),
    ...getAppDirChunks(BUILD_DIR),
  ];

  chunks.sort((a, b) => b.size - a.size);

  console.log('=== Bundle Analysis ===\n');
  let totalSize = 0;
  let failed = false;

  for (const chunk of chunks) {
    const sizeKB = (chunk.size / 1024).toFixed(1);
    const flag = chunk.size > MAX_BUNDLE_SIZE_BYTES ? ' ⚠️ OVER LIMIT' : '';
    const critical = chunk.critical ? ' [CRITICAL]' : '';
    console.log(`  ${sizeKB} kB${critical}${flag} — ${chunk.name}`);
    totalSize += chunk.size;
  }

  const totalKB = (totalSize / 1024).toFixed(1);
  console.log(`\n  Total: ${totalKB} kB across ${chunks.length} chunks`);

  const overLimit = chunks.filter(c => c.size > MAX_BUNDLE_SIZE_BYTES);
  if (overLimit.length > 0) {
    console.log(`\n⚠️  ${overLimit.length} chunk(s) exceed ${MAX_BUNDLE_SIZE_BYTES / 1024} kB limit:`);
    for (const chunk of overLimit) {
      console.log(`    - ${chunk.name} (${(chunk.size / 1024).toFixed(1)} kB)`);
    }
    failed = true;
  } else {
    console.log('\n✓ All chunks within budget');
  }

  if (failed) {
    console.log('\n❌ Bundle size budget check FAILED');
    process.exit(1);
  } else {
    console.log('\n✓ Bundle size budget check PASSED');
  }
}

main();
