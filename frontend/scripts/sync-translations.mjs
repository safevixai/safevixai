// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '../public/offline-data/translations');
const REFERENCE_FILE = path.join(TRANSLATIONS_DIR, 'en.json');

/**
 * Deep synchronizes a target object structure to match the reference object structure perfectly.
 * - Adds missing keys with a "[UNTRANSLATED]" prefix on the English text.
 * - Prunes extra keys that don't exist in the reference.
 * - Keeps existing translations.
 */
function syncStructures(ref, target, stats = { added: 0, removed: 0, kept: 0 }) {
  if (typeof ref !== 'object' || ref === null) {
    return { synced: ref, stats };
  }

  const synced = {};

  // 1. Align and translate keys from reference
  for (const key in ref) {
    if (Object.prototype.hasOwnProperty.call(ref, key)) {
      const refVal = ref[key];
      const targetVal = target[key];

      if (typeof refVal === 'object' && refVal !== null) {
        // Nested object
        const nestedTarget = (typeof targetVal === 'object' && targetVal !== null) ? targetVal : {};
        const { synced: nestedSynced } = syncStructures(refVal, nestedTarget, stats);
        synced[key] = nestedSynced;
      } else {
        // Leaf value
        if (targetVal !== undefined && typeof targetVal !== 'object') {
          synced[key] = targetVal;
          stats.kept++;
        } else {
          // Key is missing or structural mismatch, copy reference and prefix
          synced[key] = `[UNTRANSLATED] ${refVal}`;
          stats.added++;
        }
      }
    }
  }

  // 2. Count extra keys being pruned
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key) && ref[key] === undefined) {
      stats.removed++;
    }
  }

  return { synced, stats };
}

function runSync() {
  console.log('🔄 Starting Enterprise i18n Key Synchronization...');

  if (!fs.existsSync(REFERENCE_FILE)) {
    console.error(`❌ Reference translation file not found at: ${REFERENCE_FILE}`);
    process.exit(1);
  }

  let referenceContent;
  try {
    referenceContent = JSON.parse(fs.readFileSync(REFERENCE_FILE, 'utf8'));
  } catch (e) {
    console.error(`❌ Failed to parse reference en.json: ${e.message}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TRANSLATIONS_DIR).filter(file => file.endsWith('.json') && file !== 'en.json');

  let totalAdded = 0;
  let totalRemoved = 0;

  for (const file of files) {
    const filePath = path.join(TRANSLATIONS_DIR, file);
    let targetContent = {};

    if (fs.existsSync(filePath)) {
      try {
        targetContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        console.warn(`⚠️  Failed to parse existing ${file}, starting fresh: ${e.message}`);
      }
    }

    const stats = { added: 0, removed: 0, kept: 0 };
    const { synced } = syncStructures(referenceContent, targetContent, stats);

    // Save synced file back with clean formatting
    fs.writeFileSync(filePath, JSON.stringify(synced, null, 2) + '\n', 'utf8');

    console.log(`✅ ${file}: Synced! (Added: ${stats.added}, Removed: ${stats.removed}, Kept: ${stats.kept})`);
    totalAdded += stats.added;
    totalRemoved += stats.removed;
  }

  console.log(`\n✨ Synchronization completed!`);
  console.log(`   ➕ Total Keys Added (as [UNTRANSLATED] placeholders): ${totalAdded}`);
  console.log(`   ➖ Total Extra Keys Pruned: ${totalRemoved}\n`);
}

runSync();
