const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');

const selfClosing = ['img', 'br', 'hr', 'input', 'Icon', 'circle', 'polyline', 'polygon', 'path', 'rect', 'ellipse', 'line'];

let openTags = [];
const tagRegex = /<(\/?[a-zA-Z0-9]+)/g;
let match;

console.log("Checking tags...");
while ((match = tagRegex.exec(content)) !== null) {
  const tag = match[1];
  if (tag.startsWith('/')) {
    const closing = tag.slice(1);
    if (openTags.length === 0) {
       console.log(`Extra closing tag </${closing}> at pos ${match.index}`);
       continue;
    }
    const opening = openTags.pop();
    if (opening !== closing) {
      const line = content.substring(0, match.index).split('\n').length;
      console.log(`Mismatch at line \${line}: Found </\${closing}> but expected </\${opening}>`);
      // Try to recover by popping until match
      let temp = [...openTags];
      let found = false;
      while(temp.length > 0) {
        if (temp.pop() === closing) {
          found = true;
          break;
        }
      }
      if (found) {
        openTags = temp;
      }
    }
  } else if (!selfClosing.includes(tag)) {
    openTags.push(tag);
  }
}
console.log("Remaining open tags:", openTags);

// Braces check
let braceStack = [];
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braceStack.push({ pos: i, line: content.substring(0, i).split('\n').length });
  else if (content[i] === '}') {
    if (braceStack.length === 0) console.log(`Extra } at pos \${i}`);
    else braceStack.pop();
  }
}
if (braceStack.length > 0) {
  console.log("Unclosed { at lines:", braceStack.map(b => b.line));
} else {
  console.log("Braces are balanced.");
}
