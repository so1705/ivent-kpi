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
       console.log("Extra closing tag </" + closing + "> at pos " + match.index);
       continue;
    }
    const opening = openTags.pop();
    if (opening !== closing) {
      const line = content.substring(0, match.index).split('\n').length;
      console.log("Mismatch at line " + line + ": Found </" + closing + "> but expected </" + opening + ">");
    }
  } else if (!selfClosing.includes(tag)) {
    openTags.push(tag);
  }
}
console.log("Remaining open tags:", openTags);
