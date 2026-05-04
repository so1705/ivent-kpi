const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/<Icon p={I.Help} size={20} color="white"\/> [^<]+解説/, '<Icon p={I.Help} size={20} color="white"/> 指標・用語解説');
fs.writeFileSync(path, content, 'utf8');
console.log("Fixed help modal title encoding");
