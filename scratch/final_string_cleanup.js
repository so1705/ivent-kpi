const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix unclosed strings in App component
content = content.replace(/includes\('賁EEE請汁E\)\)/g, "includes('資料請求'))");
content = content.replace(/if \(d\.type === 'アポ獲得 myTot\.appts \+= 1;/g, "if (d.type === 'アポ獲得') myTot.appts += 1;");
content = content.replace(/if \(d\.type\?\.includes\('賁EEE請汁E\)\) myTot\.requests \+= 1;/g, "if (d.type?.includes('資料請求')) myTot.requests += 1;");

// Broad search for any remaining 賁E or similar and replace with 資料請求
content = content.replace(/賁EEE請汁E/g, '資料請求');
content = content.replace(/接綁E/g, '接続');
content = content.replace(/アチE/g, 'アポ');
content = content.replace(/完亁E/g, '完了');
content = content.replace(/保孁E/g, '保存');
content = content.replace(/設宁E/g, '設定');

fs.writeFileSync(path, content, 'utf8');
console.log("Final string cleanup complete");
