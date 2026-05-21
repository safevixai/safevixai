const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const publicDir = path.join(frontendRoot, 'public');
const standalonePublicDir = path.join(frontendRoot, '.next', 'standalone', 'public');

if (fs.existsSync(publicDir)) {
  if (!fs.existsSync(standalonePublicDir)) {
    fs.mkdirSync(standalonePublicDir, { recursive: true });
  }
  
  // Copy all files and directories from public to standalone/public
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
      fs.copyFileSync(src, dest);
    }
  };
  
  const entries = fs.readdirSync(publicDir);
  for (const entry of entries) {
    copyRecursive(path.join(publicDir, entry), path.join(standalonePublicDir, entry));
  }
  
  console.log('✓ Copied public/ to .next/standalone/public/');
} else {
  console.warn('⚠ public/ directory not found, skipping copy');
}
