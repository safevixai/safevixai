// SPDX-License-Identifier: MIT
// Copyright (c) 2026 SafeVixAI Team
const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // Fix mojibake (Note: replace all occurences)
      content = content.replace(/â€”/g, '-');
      content = content.replace(/Â§/g, '§');
      content = content.replace(/â‚¹/g, '₹');
      content = content.replace(/ï¿½/g, ''); 
      content = content.replace(/ðŸ/g, ''); 
      content = content.replace(/\uFFFD/g, ''); // proper replacement char
      
      // Also looking at output of powershell script:
      content = content.replace(/\?\?/g, ''); // some emojis turned into ??
      // For instance: 'Gen. Penalty: ?500' -> 'Gen. Penalty: ₹500'
      content = content.replace(/\?500/g, '₹500');
      content = content.replace(/\?1,500/g, '₹1,500');
      content = content.replace(/\?2,000/g, '₹2,000');
      
      // Fix tailwind opacity classes like bg-[#1A5C38]/80/15 -> bg-[#1A5C38]/15
      content = content.replace(/(bg|border|text|ring|shadow)-(\[#[A-Fa-f0-9]+\]|[a-z0-9-]+)\/[0-9]+\/([0-9]+)/g, '$1-$2/$3');
      
      // Fix weird classes like border-white/8 -> border-white/10
      content = content.replace(/border-white\/8([^0-9])/g, 'border-white/10$1');
      content = content.replace(/bg-white\/3([^0-9])/g, 'bg-white/5$1');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

processDir('c:\\Hackathons\\IITM\\SafeVixAI\\frontend');
