const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

function safeReplace(search, replace) {
  if (content.includes(search)) {
    content = content.split(search).join(replace);
    return true;
  }
  return false;
}

// 1. Upgrade getAIAdvice
const oldAdviceRegex = /const getAIAdvice = \(stats, isPersonal\) => \{[\s\S]+?return advice\.obs \+ "【戦略】" \+ advice\.strategy \+ " 【アクション】" \+ advice\.action;\s*\};/;
const newGetAIAdvice = `const getAIAdvice = (stats, isPersonal) => {
  const { calls, appts, picConnected, requests } = stats;
  const connectRate = calls > 0 ? picConnected / calls : 0;
  const apptRate = picConnected > 0 ? appts / picConnected : 0;
  
  if (calls === 0) return (
    <div className="flex flex-col items-center justify-center py-10 opacity-50">
       <Icon p={I.Info} size={40} className="mb-4" />
       <p className="font-bold text-sm">データが未蓄積です。架電を開始してください。</p>
    </div>
  );

  const categories = [];
  if (isPersonal) {
    if (connectRate < 0.15) {
      categories.push({
        obs: "本人接続率が低迷しています。リストの鮮度か時間帯の不一致が疑われます。",
        strategy: "アプローチタイミングの最適化",
        action: "ターゲット業界が最も電話に出やすい時間帯（例：ITなら10-11時、店舗なら14-16時）へ架電を集中させてください。"
      });
    }
    if (apptRate < 0.05) {
      categories.push({
        obs: "接続はできていますが、アポイントへの転換が弱いです。",
        strategy: "冒頭30秒のフック強化",
        action: "相手が「自分に関係がある」と思えるメリット（他社事例など）を、接続直後の15秒以内に盛り込んでください。"
      });
    }
    if (categories.length === 0) {
      categories.push({
        obs: "安定した推移です。現在のペースを維持しつつ、さらなる効率化を目指しましょう。",
        strategy: "成功パターンのナレッジ化",
        action: "好調な要因（特定のトークやリスト）を分析し、チーム全体に共有することで貢献度を高めてください。"
      });
    }
  } else {
    if (connectRate < 0.20) {
      categories.push({
        obs: "チーム全体の接続率が低下しています。リストの見直しが必要です。",
        strategy: "ターゲットリストの再精査",
        action: "繋がりやすい時間帯への人員配置を再調整し、リストの優先順位を付け直してください。"
      });
    } else {
      categories.push({
        obs: "全体的に高い生産性を維持できています。",
        strategy: "モチベーションの維持",
        action: "成功事例の共有を活発に行い、この勢いを維持したまま目標達成を目指しましょう。"
      });
    }
  }
  const advice = categories[Math.floor(Math.random() * categories.length)];
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-start">
        <div className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
        <p><span className="text-rose-400 font-bold text-[10px] uppercase block mb-0.5">現状分析</span><span className="text-white font-medium leading-relaxed">{advice.obs}</span></p>
      </div>
      <div className="flex gap-3 items-start">
        <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
        <p><span className="text-blue-400 font-bold text-[10px] uppercase block mb-0.5">戦略方針</span><span className="text-white font-medium leading-relaxed">{advice.strategy}</span></p>
      </div>
      <div className="flex gap-3 items-start">
        <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
        <p><span className="text-emerald-400 font-bold text-[10px] uppercase block mb-0.5">具体的アクション</span><span className="text-white font-black leading-relaxed text-base">{advice.action}</span></p>
      </div>
    </div>
  );
};`;
content = content.replace(oldAdviceRegex, newGetAIAdvice);

// 2. Restore MetricHelpModal
const helpModalCode = `const METRIC_HELP = {
  CPH: 'CPH（Calls Per Hour）= 1時間あたりの架電数。稼働効率を示す指標。高いほど効率的です。',
  接続率: '本人接続率 = 架電数のうち担当者本人と会話できた割合。リストの質を測る指標です。',
  アポ率: 'アポ率 = 本人接続数のうちアポイントを獲得できた割合。トークの転換力を測る指標です。',
  期待着地: '期待着地件数 = 過去の実績（アポ率×CPH）×今週の予定稼働時間から算出した予測値です。',
  本人接続: '担当者本人と直接会話できた件数。受付止まりや不在は含まれません。',
};
const MetricHelpModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <h3 className="font-black text-lg flex items-center gap-3"><Icon p={I.Help} size={20} color="white"/>指標ガイド</h3>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors"><Icon p={I.X} size={20} color="white"/></button>
      </div>
      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
        {Object.entries(METRIC_HELP).map(([k, v]) => (
          <div key={k} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">{k}</div>
            <div className="text-sm text-slate-700 leading-relaxed">{v}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);`;
safeReplace("// 3. UI部品コンポーネント (Atomic Components)", helpModalCode + "\n\n// 3. UI部品コンポーネント (Atomic Components)");

// 3. Update GasSyncDataView
const gasViewRegex = /const GasSyncDataView = \(\{ gasData, members, forcedMemberId = null, hideHeader = false, onEditGasRecord, onDeleteGasRecord \}\) => \{[\s\S]+?\};/;
const newGasSyncView = `const GasSyncDataView = ({ gasData, members, forcedMemberId = null, hideHeader = false, onEditGasRecord, onDeleteGasRecord }) => {
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [editingData, setEditingData] = useState(null);
  const now = new Date();
  const effectiveMember = forcedMemberId || selectedMember;
  const filteredData = gasData.filter(d => {
    if (effectiveMember !== 'all') {
       const targetMember = members.find(m => m.id === effectiveMember);
       const isMatch = targetMember ? (d.memberId === targetMember.spreadsheetName || d.memberId === targetMember.name) : (d.memberId === effectiveMember);
       if (!isMatch) return false;
    }
    if (selectedPeriod !== 'all') {
      const dDate = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
      if (selectedPeriod === 'today') { if (dDate.toDateString() !== now.toDateString()) return false; }
      else if (selectedPeriod === 'week') { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); if (dDate < weekAgo) return false; }
    }
    return true;
  });
  const counts = filteredData.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});
  const STATUS_LIST = [
    { key: 'アポ確定', label: 'アポ確定', color: 'text-blue-600' },
    { key: '資料送付予定A', label: '資料A', color: 'text-emerald-600' },
    { key: '資料送付予定B', label: '資料B', color: 'text-emerald-500' },
    { key: '資料送付予定C', label: '資料C', color: 'text-emerald-400' },
    { key: '折り返し', label: '折り返し', color: 'text-orange-500' },
    { key: '再架電🔥', label: '再架電🔥', color: 'text-rose-500' },
    { key: '受付拒否', label: '受付拒否', color: 'text-rose-600' },
    { key: '担当者不在', label: '担当者不在', color: 'text-slate-500' }
  ];
  return (
    <div className="space-y-8 pb-24 font-sans">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
          {!hideHeader && <h2 className="text-xl font-bold flex items-center gap-3"><Icon p={I.Zap} size={24} className="text-blue-600"/> GAS自動同期データ</h2>}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto ml-auto">
            <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm flex-1 md:flex-none">
              <option value="all">全期間</option>
              <option value="today">今日</option>
              <option value="week">直近1週間</option>
            </select>
            {!forcedMemberId && (
              <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm flex-1 md:flex-none min-w-[200px]">
                <option value="all">全員を表示</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          </div>
       </div>
       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
         <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col items-center col-span-2">
             <div className="text-[10px] font-bold text-slate-400 uppercase">アクション総数</div>
             <div className="text-4xl font-black mt-1">{filteredData.length}</div>
         </div>
         {STATUS_LIST.map(st => (
            <div key={st.key} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
               <div className="text-[10px] font-bold text-slate-400 uppercase">{st.label}</div>
               <div className={\`text-xl font-black mt-1 \${st.color}\`}>{counts[st.key] || 0}</div>
            </div>
         ))}
       </div>
       <div className="space-y-2">
          {filteredData.sort((a,b) => (b.timestamp?.seconds||0) - (a.timestamp?.seconds||0)).slice(0, 50).map((d, i) => (
             <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all">
                <div className="flex flex-col">
                   <span className="font-bold text-slate-900">{d.memberId}</span>
                   <span className="text-[10px] text-slate-400 font-bold">{d.industry || '一般'}</span>
                </div>
                <div className="flex items-center gap-4">
                   <span className={\`px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold \${STATUS_LIST.find(s=>s.key===d.type)?.color || 'text-slate-600'}\`}>{d.type}</span>
                   <span className="text-[10px] font-bold text-slate-400">{(d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp)).toLocaleString()}</span>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};`;
content = content.replace(gasViewRegex, newGasSyncView);

// 4. Update Goals in Settings
const goalsRegex = /<h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-600 pl-3 mt-12">全体目標設定<\/h3>[\s\S]+?<\/div>\s*<\/div>/;
const newGoalsUI = `             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-600 pl-3 mt-12">目標・評価基準の詳細設定</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-6 shadow-sm rounded-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">週間アポ獲得目標 (件)</label>
                      <input type="number" id="goal-appts" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.appts} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">週間架電目標 (回)</label>
                      <input type="number" id="goal-calls" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.calls || 1000} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">接続時アポイント率目標 (%)</label>
                      <input type="number" id="goal-conv" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.convRate || 10} />
                   </div>
                </div>
                <button onClick={() => {
                   const appts = Number(document.getElementById('goal-appts').value);
                   const calls = Number(document.getElementById('goal-calls').value);
                   const convRate = Number(document.getElementById('goal-conv').value);
                   onUpdateGoal(getMondayKey(currentBaseDate), null, { ...activeWeeklyGoals, appts, calls, convRate });
                   alert("目標を更新し、チーム全体に適用しました。");
                }} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all">全社目標を保存・適用</button>
             </div>`;
content = content.replace(goalsRegex, newGoalsUI);

// 5. App level state and modal injection
safeReplace("const [activeTab, setActiveTab] = useState('dashboard');", "const [activeTab, setActiveTab] = useState('dashboard');\n  const [showHelp, setShowHelp] = useState(false);");

if (!content.includes("{showHelp && <MetricHelpModal onClose={() => setShowHelp(false)} />}")) {
  content = content.replace(/<nav className="fixed bottom-0/, "{showHelp && <MetricHelpModal onClose={() => setShowHelp(false)} />}\n      <nav className="fixed bottom-0");
}

// 6. Help button on Dashboard
safeReplace(' 稼働効率', ' 稼働効率 <button onClick={()=>setShowHelp(true)} className="text-slate-300 hover:text-blue-600"><Icon p={I.Help} size={14}/></button>');

fs.writeFileSync(path, content, 'utf8');
console.log("UI Restoration success");
