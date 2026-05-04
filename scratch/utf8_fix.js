const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix common Japanese strings that might have been corrupted
const replacements = [
    { from: /value="\{"/g, to: 'value="本日"' },
    { from: />\{</g, to: '>本日<' },
    { from: /value="T"/g, to: 'value="今週"' },
    { from: />T</g, to: '>今週<' },
    { from: /value="S"/g, to: 'value="全期間"' },
    { from: />S</g, to: '>全期間<' },
    { from: /GAS 蜷梧悄繝・ｼ繧ｿ/g, to: 'GAS 同期データ' },
    { from: /讀懈ｨ｢\.\.\./g, to: '検索...' },
    { from: /繝｡繝｢繧貞・蜉帙＠縺ｦ縺上□縺輔＞/g, to: 'メモを入力してください' },
    { from: /縺薙・繝ｬ繧ｳ繝ｼ繝峨ｒ蜑企勁縺励∪縺吶°・・/g, to: 'このレコードを削除しますか？' },
    { from: /蜷梧悄繝・ｼ繧ｿ縺ｯ縺ゅｊ縺ｾ縺帙ｓ/g, to: '同期データはありません' },
    { from: /繧ｷ繝輔ヨ/g, to: 'シフト' },
    { from: /蜍､諤\/螳溽ｸｾ/g, to: '勤怠/実績' },
    { from: /險ｭ螳・/g, to: '設定' },
    { from: /繝€繝・す繝･繝懊・繝・/g, to: 'ダッシュボード' },
    { from: /蛻・傳統/g, to: '分析' }
];

// If the corruption looks like "", we need a different strategy.
// Let's just target the exact lines found in the build error.
content = content.replace(/<option value="\{">\{<\/option>/g, '<option value="本日">本日</option>');
content = content.replace(/<option value="T">T<\/option>/g, '<option value="今週">今週</option>');
content = content.replace(/<option value="S">S<\/option>/g, '<option value="全期間">全期間</option>');

// Also search for the prompt strings
content = content.replace(/prompt\(".*?",/g, 'prompt("メモを入力してください",');
content = content.replace(/confirm\(".*?"\)/g, (match) => {
    if (match.includes("delete") || match.includes("削除")) return 'confirm("このレコードを削除しますか？")';
    return match;
});

fs.writeFileSync(path, content, 'utf8');
console.log("UTF8 Cleanup complete");
