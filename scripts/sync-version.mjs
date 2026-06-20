#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const versionPath = join(root, "VERSION");

const version = readFileSync(versionPath, "utf8").trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid VERSION: ${version}`);
  process.exit(1);
}

// Update frontend/package.json
const pkgPath = join(root, "frontend", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
if (pkg.version !== version) {
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`frontend/package.json: ${pkg.version} -> ${version}`);
} else {
  console.log(`frontend/package.json: already ${version}`);
}

// Update pyproject.toml files
for (const dir of ["backend", "chatbot_service"]) {
  const ppPath = join(root, dir, "pyproject.toml");
  const content = readFileSync(ppPath, "utf8");
  const updated = content.replace(
    /^version = ".*"/m,
    `version = "${version}"`,
  );
  if (updated !== content) {
    writeFileSync(ppPath, updated);
    console.log(`${dir}/pyproject.toml: synced to ${version}`);
  } else {
    console.log(`${dir}/pyproject.toml: already at ${version}`);
  }
}
