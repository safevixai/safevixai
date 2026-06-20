import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const scanRoots = ['app', 'components', 'lib', 'hooks'].map((dir) => path.join(root, dir));
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

const checks = [
  {
    name: 'invalid Tailwind CSS variable arbitrary value',
    pattern: /[hm](?:in)?-?\[\s*--/g,
  },
  {
    name: 'mojibake / corrupted UTF-8 text',
    pattern: /[ÃÂ�]|â[€�‚„€¦†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g,
  },
  {
    name: 'public What3Words API key exposure',
    pattern: /NEXT_PUBLIC_W3W_API_KEY/g,
  },
  {
    name: 'raw img tag in app/components',
    pattern: /<img\s/gi,
  },
  {
    name: 'blocking browser alert in production UI',
    pattern: /\balert\s*\(/g,
  },
];

function hasGsapInsideUseEffect(text) {
  const effectBlocks = text.match(/useEffect\s*\(\s*(?:async\s*)?\([^)]*\)\s*=>\s*{[\s\S]*?}\s*,\s*\[[\s\S]*?\]\s*\)/g) || [];
  return effectBlocks.some((block) => /\bgsap\./.test(block));
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...await walk(fullPath));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = (await Promise.all(scanRoots.map(walk))).flat();
const failures = [];

for (const file of files) {
  const relativeFile = path.relative(root, file);
  const text = await readFile(file, 'utf8');
  for (const check of checks) {
    check.pattern.lastIndex = 0;
    if (check.pattern.test(text)) {
      failures.push(`${relativeFile}: ${check.name}`);
    }
  }
  const isGsapProvider = relativeFile === path.join('components', 'providers', 'GSAPProvider.tsx');
  const isPageEntry = relativeFile === path.join('hooks', 'usePageEntry.ts');
  if (!isGsapProvider && !isPageEntry && hasGsapInsideUseEffect(text)) {
    failures.push(`${relativeFile}: GSAP animation inside useEffect`);
  }
}

if (failures.length) {
  console.error('Frontend enterprise audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Frontend enterprise audit passed.');
