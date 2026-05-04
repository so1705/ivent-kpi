const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use precise replacements for the nav buttons
const navBlock = `        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 flex items-center justify-between no-print pt-2 pb-6 px-4">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Grid} label="ダッシュボード" />
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.PieChart} label="分析" />
          <NavButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} icon={I.Calendar} label="シフト" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={I.Clock} label="勤怠/実績" />
          <NavButton active={activeTab === 'gas'} onClick={() => setActiveTab('gas')} icon={I.Zap} label="GAS同期" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={I.Settings} label="設定" />
        </nav>`;

content = content.replace(/<nav className="fixed bottom-0[\s\S]+?<\/nav>/, navBlock);

fs.writeFileSync(path, content, 'utf8');
console.log("Nav block restoration complete");
