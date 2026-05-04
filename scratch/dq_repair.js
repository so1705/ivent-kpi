const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix unclosed double quotes around Japanese strings
content = content.replace(/"([\u3000-\u9faf\/]+)(?=\s*[,}\)])/g, '"$1"');

// Fix specific line 219
content = content.replace(/appts: "アポ獲得/, 'appts: "アポ獲得",');

// Also fix some common corrupted Japanese labels that might be missing quotes
content = content.replace(/label="獲得(?!\")/, 'label="獲得"');
content = content.replace(/label="目標差分(?!\")/, 'label="目標差分"');

fs.writeFileSync(path, content, 'utf8');
console.log("Double quote repair complete");
