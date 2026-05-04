const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix specific JSX syntax errors
// Line 404-406
content = content.replace(/\{currentUserEmail === ADMIN_EMAIL \? '管琁EEEEEEータ' : 'マイチEEEタ'\}<\/button>\s+<button onClick=\{\(\)=>setViewMode\('team'\)\} className=\{`px-8 py-3 text-xs font-bold transition-all rounded-xl \$\{viewMode==='team'\?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'\}`\}>チEEム全佁E\/button>/, 
    `{currentUserEmail === ADMIN_EMAIL ? '管理者データ' : 'マイデータ'}</button>
             <button onClick={()=>setViewMode('team')} className={\`px-8 py-3 text-xs font-bold transition-all rounded-xl \${viewMode==='team'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}\`}>チーム全体</button>`);

// Line 424
content = content.replace(/<MetricBar label="獲征E val=\{myTotals\.appts\}/, '<MetricBar label="獲得" val={myTotals.appts}');

// Line 450 (and similar)
content = content.replace(/稼働効玁E\s+<\/h3>/, '稼働効率</h3>');

// 2. Broad cleanup of corrupted strings
const replacements = [
    { from: /チEEEタ/g, to: 'データ' },
    { from: /チEEム/g, to: 'チーム' },
    { from: /管琁EEEEEE/g, to: '管理者' },
    { from: /マイチEEEタ/g, to: 'マイデータ' },
    { from: /週次目樁E/g, to: '週次目標' },
    { from: /獲征E/g, to: '獲得' },
    { from: /目標差刁E/g, to: '目標差分' },
    { from: /稼働効玁E/g, to: '稼働効率' },
    { from: /メンバE/g, to: 'メンバー' },
    { from: /開姁E/g, to: '開始' },
    { from: /終亁E/g, to: '終了' },
    { from: /刁EEE/g, to: '分析' },
    { from: /設宁E/g, to: '設定' },
    { from: /ダチEEEュボEチE/g, to: 'ダッシュボード' },
    { from: /同期日晁E/g, to: '同期日時' },
    { from: /達E/g, to: '達成' },
    { from: /陁E/g, to: '権限' }
];

replacements.forEach(r => {
    content = content.split(r.from).join(r.to);
});

// 3. Fix truncated tags
// search for something like </h3 followed by line end or weird chars
content = content.replace(/<\/h3\s+}/g, '</h3>');
content = content.replace(/<\/div\s+}/g, '</div>');

fs.writeFileSync(path, content, 'utf8');
console.log("Cleanup and syntax fix complete");
