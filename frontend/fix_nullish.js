// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team

const fs = require('fs');
const glob = require('glob');

// Since we are in the frontend directory, let's process all ts/tsx files.
const files = glob.sync('**/*.{ts,tsx}', { ignore: ['node_modules/**', '.next/**'] });
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/([a-zA-Z0-9_\]\.\)]+)  ([a-zA-Z0-9_'\[\]\{\}\(\)\-]+)/g, (match, p1, p2) => {
    // Exclude cases that are just regular double spaces like 'return  something'
    const exclusions = ['return', 'case', 'const', 'let', 'var', 'import', 'export', 'if', 'else', 'function', 'class', 'interface', 'type', 'async', 'await', 'new', 'yield', 'typeof', 'void'];
    if (exclusions.includes(p1)) return match;
    return p1 + ' ?? ' + p2;
  });
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
    console.log('Fixed', file);
  }
}
console.log('Done fixing ' + changedCount + ' files.');
