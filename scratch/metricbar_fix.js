const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update MetricBar component
const oldMetricBar = `const MetricBar = ({ label, val, tgt }) => {
  const p = Math.min((val / (tgt || 1)) * 100, 100);
  const isOk = val >= (tgt || 0);
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <span className={\`text-sm font-black \${isOk ? 'text-emerald-600' : 'text-blue-600'}\`}>
          {val.toLocaleString()} <span className="text-slate-300 font-normal">/ {tgt.toLocaleString()}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
        <div className={\`h-full transition-all duration-1000 \${isOk ? 'bg-emerald-500' : 'bg-blue-500'}\`} style={{ width: \`\${p}%\` }}></div>
      </div>
    </div>
  );
};`;

const newMetricBar = `const MetricBar = ({ label, val, tgt, onHelp }) => {
  const p = Math.min((val / (tgt || 1)) * 100, 100);
  const isOk = val >= (tgt || 0);
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          {label}
          {onHelp && <button onClick={onHelp} className="text-slate-300 hover:text-blue-600 transition-colors"><Icon p={I.Help} size={12}/></button>}
        </span>
        <span className={\`text-sm font-black \${isOk ? 'text-emerald-600' : 'text-blue-600'}\`}>
          {val.toLocaleString()} <span className="text-slate-300 font-normal">/ {(tgt||0).toLocaleString()}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
        <div className={\`h-full transition-all duration-1000 \${isOk ? 'bg-emerald-500' : 'bg-blue-500'}\`} style={{ width: \`\${p}%\` }}></div>
      </div>
    </div>
  );
};`;

content = content.replace(oldMetricBar, newMetricBar);

// 2. Fix the calls in AnalyticsView
content = content.replace(/<MetricBar label=\{<span className="flex items-center">接続率 \(架電あたり\) <button onClick=\{\(\)=>setShowHelp\(true\)\} className="text-slate-400 hover:text-blue-600 ml-1"><Icon p=\{I\.Help\} size=\{10\}\/><\/button><\/span>\} val=\{stats\.picConnected\} tgt=\{stats\.calls\} \/>/, '<MetricBar label="接続率 (架電あたり)" val={stats.picConnected} tgt={stats.calls} onHelp={()=>setShowHelp(true)} />');
content = content.replace(/<MetricBar label=\{<span className="flex items-center">アポ率 \(本人接続あたり\) <button onClick=\{\(\)=>setShowHelp\(true\)\} className="text-slate-400 hover:text-blue-600 ml-1"><Icon p=\{I\.Help\} size=\{10\}\/><\/button><\/span>\} val=\{stats\.appts\} tgt=\{stats\.picConnected\} \/>/, '<MetricBar label="アポ率 (本人接続あたり)" val={stats.appts} tgt={stats.picConnected} onHelp={()=>setShowHelp(true)} />');

// 3. Fix Dashbord usage too
content = content.replace(/<MetricBar label="獲得" val=\{myTotals\.appts\} tgt=\{memberStats\.find\(m=>m\.email===currentUserEmail\)\?\.uniformGoal \|\| 1\} \/>/, '<MetricBar label="獲得" val={myTotals.appts} tgt={memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 0} onHelp={()=>setShowHelp(true)} />');

fs.writeFileSync(path, content, 'utf8');
console.log("MetricBar upgrade and cleanup complete");
