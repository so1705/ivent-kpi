const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/mode: 'no-cors',\s*mode: 'no-cors',/g, "mode: 'no-cors',");
fs.writeFileSync(path, content, 'utf8');
console.log("Cleanup complete");
