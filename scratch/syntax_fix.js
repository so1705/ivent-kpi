const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix the main navigation and help modal conditional block
const oldNavBlock = `{(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'shifts' || activeTab === 'attendance' || activeTab === 'gas' || activeTab === 'settings') && (
                {showHelp && <MetricHelpModal onClose={() => setShowHelp(false)} />}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 flex items-center justify-between no-print pt-2 pb-6 px-4">`;

const newNavBlock = `{(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'shifts' || activeTab === 'attendance' || activeTab === 'gas' || activeTab === 'settings') && (
        <>
          {showHelp && <MetricHelpModal onClose={() => setShowHelp(false)} />}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 flex items-center justify-between no-print pt-2 pb-6 px-4">`;

content = content.replace(oldNavBlock, newNavBlock);

// 2. Add closing fragment for the nav block
content = content.replace(/<\/nav>\s*?\)\}/, "</nav></>)}");

// 3. Fix the unauthenticated view artifact
content = content.replace(/業務効率EE最大化する。ログインしてチEEムの目標を確認しましょぁEEEE/g, "業務効率を最大化する。ログインしてチームの目標を確認しましょう。");

// 4. Final check for any dangling持E etc artifacts
content = content.replace(/持EEEEE解説/g, "指標・用語解説");
content = content.replace(/チEEEタがありません/g, "データがありません");

fs.writeFileSync(path, content, 'utf8');
console.log("Syntax fix applied to App.jsx");
