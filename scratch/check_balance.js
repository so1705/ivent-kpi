const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

let openTags = [];
const tagRegex = /<(\/?[a-zA-Z0-9]+)/g;
let match;

console.log("Checking tags...");
while ((match = tagRegex.exec(content)) !== null) {
  const tag = match[1];
  if (tag.startsWith('/')) {
    const closing = tag.slice(1);
    const opening = openTags.pop();
    if (opening !== closing) {
      // console.log(`Mismatch: Found </${closing}> but expected </${opening}> around index ${match.index}`);
    }
  } else if (!['img', 'br', 'hr', 'input', 'Icon'].includes(tag)) { // Simplified self-closing check
    openTags.push(tag);
  }
}

// Check for curly braces
let stack = [];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') stack.push({ char: '{', pos: i });
  else if (content[i] === '}') {
    if (stack.length === 0) console.log(`Extra } at pos ${i}`);
    else stack.pop();
  }
}
if (stack.length > 0) console.log(`Unclosed { at pos ${stack[0].pos}`);
else console.log("Braces look balanced.");
