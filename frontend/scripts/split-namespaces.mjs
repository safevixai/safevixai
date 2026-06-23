// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = path.join(__dirname, '../public/offline-data/translations');
const LOCALES_DIR = path.join(__dirname, '../i18n/locales');

// Map of top-level keys in monolithic translations to target namespaces
const KEY_TO_NAMESPACE_MAP = {
  nav: 'common',
  emergency: 'common',
  bystander: 'common',
  report: 'common',
  locator: 'common',
  dashboard: 'dashboard',
  map_layers: 'dashboard',
  challan: 'challan',
  chat: 'chat',
  settings: 'settings',
  profile: 'settings',
};

const NAMESPACES = [
  'common',
  'auth',
  'dashboard',
  'challan',
  'chat',
  'settings',
  'errors',
  'validation',
];

async function splitTranslations() {
  console.log('Starting monolithic translation namespace splitting...');
  
  if (!fs.existsSync(TRANSLATIONS_DIR)) {
    console.error(`Translations directory does not exist: ${TRANSLATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(TRANSLATIONS_DIR).filter(file => file.endsWith('.json'));
  console.log(`Found ${files.length} monolithic language files to process.`);

  for (const file of files) {
    const lang = path.basename(file, '.json');
    const langPath = path.join(TRANSLATIONS_DIR, file);
    const content = JSON.parse(fs.readFileSync(langPath, 'utf8'));

    const langLocalesDir = path.join(LOCALES_DIR, lang);
    if (!fs.existsSync(langLocalesDir)) {
      fs.mkdirSync(langLocalesDir, { recursive: true });
    }

    // Initialize all namespaces with empty objects
    const namespacesData = {};
    for (const ns of NAMESPACES) {
      namespacesData[ns] = {};
    }

    // Split the monolithic keys into namespaces
    for (const [key, val] of Object.entries(content)) {
      const ns = KEY_TO_NAMESPACE_MAP[key] || 'common';
      namespacesData[ns][key] = val;
    }

    // Write all namespace JSON files
    for (const ns of NAMESPACES) {
      const nsFilePath = path.join(langLocalesDir, `${ns}.json`);
      fs.writeFileSync(nsFilePath, JSON.stringify(namespacesData[ns], null, 2), 'utf8');
    }

    console.log(`✅ Processed ${lang} -> split into ${NAMESPACES.length} namespaces under ${langLocalesDir}`);
  }

  console.log('Namespace splitting completed successfully!');
}

splitTranslations().catch(err => {
  console.error('Error splitting namespaces:', err);
  process.exit(1);
});
