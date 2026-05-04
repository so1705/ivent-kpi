const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/チEEEタ/g, 'データ');
content = content.replace(/チEEム/g, 'チーム');
content = content.replace(/しましょぁEEEE/g, 'しましょう。');
content = content.replace(/効玁E/g, '効率');

fs.writeFileSync(path, content, 'utf8');
console.log("Cleanup complete");
