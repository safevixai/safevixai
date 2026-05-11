const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next')) {
        results = results.concat(getFiles(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{2934}\u{2935}\u{25B6}\u{23E9}-\u{23EF}\u{23F0}-\u{23F3}\u{23F8}-\u{23FA}\u{20E3}\u{2122}\u{3297}\u{3299}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}\u{1F17F}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}\u{1F201}\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}\u{1F251}\u{25AA}\u{25AB}\u{25FB}-\u{25FE}]/gu;

const files = getFiles('.');
let changed = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (emojiRegex.test(content)) {
    // Remove emojis, but be careful not to leave double spaces or weird formatting.
    const newContent = content.replace(emojiRegex, '').replace(/  +/g, ' ');
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Removed emojis from ${file}`);
    changed++;
  }
});
console.log(`Updated ${changed} files.`);
