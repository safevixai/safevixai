const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const publicDir = path.join(frontendRoot, 'public');

// Copy DuckDB-Wasm assets from node_modules to public/duckdb/ so they are served as local
// static files and can be pre-cached by the service worker for offline use.
const duckdbDist = path.join(frontendRoot, 'node_modules', '@duckdb', 'duckdb-wasm', 'dist');
const duckdbPublic = path.join(publicDir, 'duckdb');
if (fs.existsSync(duckdbDist)) {
  if (!fs.existsSync(duckdbPublic)) {
    fs.mkdirSync(duckdbPublic, { recursive: true });
  }
  for (const file of fs.readdirSync(duckdbDist)) {
    if (file.endsWith('.wasm') || file.endsWith('.worker.js')) {
      const src = path.join(duckdbDist, file);
      const dest = path.join(duckdbPublic, file);
      try {
        fs.copyFileSync(src, dest);
      } catch (err) {
        // Windows may lock the destination (UNKNOWN error). Check if already present.
        if (fs.existsSync(dest) && fs.statSync(src).size === fs.statSync(dest).size) {
          console.log(`  ${file} already exists (skipped)`);
        } else {
          console.error(`  Failed to copy ${file}: ${err.code}`);
        }
      }
    }
  }
  console.log('✓ Copied DuckDB-Wasm assets to public/duckdb/');
} else {
  console.warn('⚠ @duckdb/duckdb-wasm dist not found, skipping DuckDB asset copy');
}

const copyRecursive = (src, dest) => {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    try {
      fs.copyFileSync(src, dest);
    } catch (err) {
      console.error(`  Failed to copy ${path.basename(src)}: ${err.code}`);
    }
  }
};

if (fs.existsSync(publicDir)) {
  const standalonePublicDir = path.join(frontendRoot, '.next', 'standalone', 'public');

  // Always re-copy: fresh checkout or rebuild should replace standalone dir
  if (fs.existsSync(standalonePublicDir)) {
    fs.rmSync(standalonePublicDir, { recursive: true, force: true });
    console.log('✓ Removed stale standalone public/');
  }
  if (!fs.existsSync(path.dirname(standalonePublicDir))) {
    fs.mkdirSync(path.dirname(standalonePublicDir), { recursive: true });
  }

  const entries = fs.readdirSync(publicDir);
  for (const entry of entries) {
    try {
      copyRecursive(path.join(publicDir, entry), path.join(standalonePublicDir, entry));
    } catch (err) {
      console.error(`  Failed to copy ${entry} to standalone: ${err.code}`);
    }
  }

  console.log('✓ Copied public/ to .next/standalone/public/');
} else {
  console.warn('⚠ public/ directory not found, skipping copy');
}

// Copy .next/static to standalone build directory
const staticDir = path.join(frontendRoot, '.next', 'static');
if (fs.existsSync(staticDir)) {
  const standaloneStaticDir = path.join(frontendRoot, '.next', 'standalone', '.next', 'static');
  if (fs.existsSync(standaloneStaticDir)) {
    fs.rmSync(standaloneStaticDir, { recursive: true, force: true });
    console.log('✓ Removed stale standalone static/');
  }
  try {
    copyRecursive(staticDir, standaloneStaticDir);
    console.log('✓ Copied static/ to .next/standalone/.next/static/');
  } catch (err) {
    console.error(`  Failed to copy static/ to standalone: ${err.code}`);
  }
} else {
  console.warn('⚠ .next/static directory not found, skipping copy');
}
