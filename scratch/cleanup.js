const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the mess from the PowerShell script
content = content.replace(/\[System\.Web\.HttpUtility\]::HtmlDecode\("useState"\)/g, 'useState');
content = content.replace(/\[System\.Web\.HttpUtility\]::HtmlDecode\("useMemo"\)/g, 'useMemo');

// Fix any other weirdness
content = content.replace(/`r`n/g, '\n'); // Normalize to LF temporarily for easier cleaning
content = content.replace(/\r\n/g, '\n');

// Standardize labels again just in case
content = content.replace(/const BREAKDOWN_LABELS = \{[\s\S]+?\};/, `const BREAKDOWN_LABELS = {
  calls: "架電数",
  picConnected: "本人接続",
  requests: "資料請求",
  appts: "アポ獲得",
  receptionRefusal: "受付拒否",
  picAbsent: "担当者不在",
  noAnswer: "不在/他"
};`);

fs.writeFileSync(path, content, 'utf8');
console.log("Cleanup complete");
