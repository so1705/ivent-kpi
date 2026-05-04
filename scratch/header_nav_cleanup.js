const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the unclosed strings in the header
content = content.replace(/'管琁E[^']*?権限/g, "'管理者権限'");
content = content.replace(/'アポインター権権限/g, "'アポインター権限'");

// Broad fix for any unclosed strings that might have been missed
// This is dangerous but we need a build
// Let's just fix the known corrupted ones

content = content.replace(/label="ダチEEEュボEチE"/g, 'label="ダッシュボード"');
content = content.replace(/label="分析"/g, 'label="分析"');
content = content.replace(/label="勤怠"/g, 'label="勤怠"');
content = content.replace(/label="シフト"/g, 'label="シフト"');
content = content.replace(/label="設宁E"/g, 'label="設定"');

fs.writeFileSync(path, content, 'utf8');
console.log("Header and Nav cleanup complete");
