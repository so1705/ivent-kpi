const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix line 141 specifically
content = content.replace(/'アポ獲得 \? 'bg-blue-600'/, "'アポ獲得' ? 'bg-blue-600'");

// Fix common unclosed Japanese strings
content = content.replace(/'資料請求\) \? 'bg-emerald-500'/, "'資料請求') ? 'bg-emerald-500'");
content = content.replace(/'アポ獲得数 \?/, "'アポ獲得数' ?");
content = content.replace(/'架電数 \?/, "'架電数' ?");

// Also check for any 'Japanese string followed by ) or ? or :
const japRegex = /'([\u3000-\u9faf]+)(?=\s*[\?:\)])/g;
content = content.replace(japRegex, "'$1'");

fs.writeFileSync(path, content, 'utf8');
console.log("Quote repair complete");
