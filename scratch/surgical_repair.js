const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Repair Truncated Tags
// Pattern: some non-whitespace followed by /TAG> where TAG is a common JSX tag
const tags = ['span', 'div', 'button', 'h3', 'h2', 'tr', 'th', 'thead', 'table', 'td', 'h1', 'p', 'i', 'strong', 'em', 'select', 'option'];

tags.forEach(tag => {
    // Match something like "JapaneseChar/tag>" or "Something/tag>" and replace with "Something</tag>"
    // We search for [^<]/tag> (not starting with <)
    const regex = new RegExp(`([^<\\s])/${tag}>`, 'g');
    content = content.replace(regex, `$1</${tag}>`);
});

// 2. Specific fixes for broken Japanese strings that are known to cause truncation
const japReplacements = [
    { from: /実績データ/g, to: '実績データ' }, // Ensure clean
    { from: /同期日時/g, to: '同期日時' },
    { from: /目標差[^\s<]*/g, to: '目標差分' },
    { from: /稼働効[^\s<]*/g, to: '稼働効率' },
    { from: /獲得[^\s<]*/g, to: '獲得' },
    { from: /達成[^\s<]*/g, to: '達成' },
    { from: /全[^\s<]*<\/button>/g, to: '全体</button>' },
    { from: /マイデータ/g, to: 'マイデータ' },
    { from: /管理者データ/g, to: '管理者データ' },
    { from: /チーム[^\s<]*/g, to: 'チーム' },
    { from: /メンバ[^\s<]*/g, to: 'メンバー' }
];

japReplacements.forEach(r => {
    content = content.replace(r.from, r.to);
});

// 3. Fix the specific "Unexpected character" at line 424 if it's still there
// label="獲得"
content = content.replace(/label="獲得[^\"]*"/g, 'label="獲得"');

// 4. Final check for common unclosed patterns
// If we see "something" followed by val={ it's likely a missing quote
content = content.replace(/label="([^"]*)\s+val=\{/g, 'label="$1" val={');

fs.writeFileSync(path, content, 'utf8');
console.log("Surgical tag repair complete");
