import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../i18n/locales');
const REFERENCE_LANG = 'en';

function flattenObject(obj, prefix = '') {
  let result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}

function runLint() {
  console.log('🌐 Starting Enterprise Namespace i18n Key Parity Check...');

  const refLangDir = path.join(LOCALES_DIR, REFERENCE_LANG);
  if (!fs.existsSync(refLangDir)) {
    console.error(`❌ Reference language directory not found at: ${refLangDir}`);
    process.exit(1);
  }

  // 1. Gather all namespaces from reference language 'en'
  const namespaces = fs.readdirSync(refLangDir).filter(file => file.endsWith('.json'));
  console.log(`ℹ️ Reference language '${REFERENCE_LANG}' has ${namespaces.length} namespaces: ${namespaces.join(', ')}`);

  // Load and flatten reference namespaces
  const referenceData = {};
  for (const ns of namespaces) {
    const filePath = path.join(refLangDir, ns);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    referenceData[ns] = flattenObject(content);
  }

  // 2. Scan all other languages
  const targetLanguages = fs.readdirSync(LOCALES_DIR).filter(
    item => fs.statSync(path.join(LOCALES_DIR, item)).isDirectory() && item !== REFERENCE_LANG
  );

  console.log(`ℹ️ Found ${targetLanguages.length} target locales to validate: ${targetLanguages.join(', ')}`);

  let totalErrors = 0;

  for (const lang of targetLanguages) {
    const langDir = path.join(LOCALES_DIR, lang);
    console.log(`\nValidating locale '${lang.toUpperCase()}'...`);

    // Verify all reference namespaces exist
    for (const ns of namespaces) {
      const nsPath = path.join(langDir, ns);
      
      if (!fs.existsSync(nsPath)) {
        console.error(`   ❌ Missing namespace file: ${ns}`);
        totalErrors++;
        continue;
      }

      let content;
      try {
        content = JSON.parse(fs.readFileSync(nsPath, 'utf8'));
      } catch (e) {
        console.error(`   ❌ Failed to parse ${ns}: ${e.message}`);
        totalErrors++;
        continue;
      }

      const flatKeys = flattenObject(content);
      const keys = Object.keys(flatKeys);
      const keySet = new Set(keys);

      const refKeysMap = referenceData[ns];
      const refKeys = Object.keys(refKeysMap);

      const missing = refKeys.filter(k => !keySet.has(k));
      const extra = keys.filter(k => !refKeysMap.hasOwnProperty(k));
      const empty = keys.filter(k => flatKeys[k] === '');

      if (missing.length > 0 || extra.length > 0 || empty.length > 0) {
        console.error(`   ❌ Parity discrepancies in namespace '${ns}':`);
        if (missing.length > 0) {
          console.error(`      ⚠️  Missing keys (${missing.length}):`);
          missing.forEach(k => console.error(`         - ${k}`));
        }
        if (extra.length > 0) {
          console.error(`      ⚠️  Extra keys (${extra.length}):`);
          extra.forEach(k => console.error(`         - ${k}`));
        }
        if (empty.length > 0) {
          console.error(`      ⚠️  Empty keys (${empty.length}):`);
          empty.forEach(k => console.error(`         - ${k}`));
        }
        totalErrors += (missing.length + extra.length + empty.length);
      }
    }

    // Check if there are namespaces in target language that aren't in English
    const targetNamespaces = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
    const extraNamespaces = targetNamespaces.filter(ns => !namespaces.includes(ns));
    if (extraNamespaces.length > 0) {
      console.error(`   ❌ Extra namespace files found (${extraNamespaces.length}): ${extraNamespaces.join(', ')}`);
      totalErrors += extraNamespaces.length;
    }
  }

  if (totalErrors > 0) {
    console.error(`\n❌ i18n Key Parity Check Failed. Total structural discrepancies: ${totalErrors}`);
    process.exit(1);
  } else {
    console.log('\n✨ i18n Key Parity Check Passed successfully. All files across all locales are fully aligned!\n');
    process.exit(0);
  }
}

runLint();
