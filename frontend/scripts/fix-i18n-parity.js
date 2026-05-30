import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../i18n/locales');
const REFERENCE_LANG = 'en';

function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

function syncKeys(source, target) {
  const result = { ...target };
  
  // 1. Add missing keys from source
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        result[key] = syncKeys(source[key], target[key] || {});
      } else if (target[key] === undefined || target[key] === '') {
        result[key] = source[key];
      }
    }
  }

  // 2. Remove extra keys not in source
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      if (source[key] === undefined) {
        delete result[key];
      } else if (typeof target[key] === 'object' && target[key] !== null) {
        if (typeof source[key] !== 'object') {
          result[key] = source[key];
        }
      }
    }
  }

  return result;
}

function main() {
  console.log('🔄 Starting BOM Stripper and i18n Key Synchronizer...');

  const refLangDir = path.join(LOCALES_DIR, REFERENCE_LANG);
  const namespaces = fs.readdirSync(refLangDir).filter(file => file.endsWith('.json'));

  // Load and clean reference namespaces
  const referenceData = {};
  for (const ns of namespaces) {
    const filePath = path.join(refLangDir, ns);
    let contentText = fs.readFileSync(filePath, 'utf8');
    contentText = stripBOM(contentText);
    referenceData[ns] = JSON.parse(contentText);
    // Write back clean reference files
    fs.writeFileSync(filePath, JSON.stringify(referenceData[ns], null, 2), 'utf8');
  }

  const targetLanguages = fs.readdirSync(LOCALES_DIR).filter(
    item => fs.statSync(path.join(LOCALES_DIR, item)).isDirectory() && item !== REFERENCE_LANG
  );

  for (const lang of targetLanguages) {
    const langDir = path.join(LOCALES_DIR, lang);
    console.log(`Syncing locale: ${lang.toUpperCase()}`);

    for (const ns of namespaces) {
      const nsPath = path.join(langDir, ns);
      let targetData = {};

      if (fs.existsSync(nsPath)) {
        let contentText = fs.readFileSync(nsPath, 'utf8');
        contentText = stripBOM(contentText);
        try {
          targetData = JSON.parse(contentText);
        } catch (e) {
          console.warn(`  ⚠️ Failed to parse ${lang}/${ns}. Rebuilding from reference English. Error: ${e.message}`);
          targetData = {};
        }
      }

      const synced = syncKeys(referenceData[ns], targetData);

      // Write synced file back cleanly without BOM
      fs.writeFileSync(nsPath, JSON.stringify(synced, null, 2), 'utf8');
    }

    // Clean up any extra namespace files not in reference
    const targetNamespaces = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));
    for (const ns of targetNamespaces) {
      if (!namespaces.includes(ns)) {
        console.log(`  🗑️ Removing extra namespace file: ${lang}/${ns}`);
        fs.unlinkSync(path.join(langDir, ns));
      }
    }
  }

  console.log('✨ Clean and fully synced locales written successfully!');
}

main();
