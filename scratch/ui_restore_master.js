const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Restore GasSyncDataView with filters and summary cards
const oldGasView = content.match(/const GasSyncDataView = \(.*?\) => \{[\s\S]*?(\n\s*?return \([\s\S]*?\n\s*?\);)\n\s*?\};/);
if (oldGasView) {
  const newGasView = `const GasSyncDataView = ({ gasData, members, forcedMemberId, hideHeader, onEditGasRecord, onDeleteGasRecord, initialPeriod = "本日" }) => {
  const [period, setPeriod] = useState(initialPeriod);
  const [search, setSearch] = useState("");
  const [selectedMid, setSelectedMid] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  const filtered = useMemo(() => {
    let list = gasData || [];
    if (forcedMemberId) {
      const m = members.find(mem => mem.id === forcedMemberId);
      list = list.filter(d => d.memberId === m?.spreadsheetName || d.memberId === m?.name);
    } else if (selectedMid !== "all") {
      const m = members.find(mem => mem.id === selectedMid);
      list = list.filter(d => d.memberId === m?.spreadsheetName || d.memberId === m?.name);
    }
    
    if (selectedType !== "all") {
      list = list.filter(d => d.type === selectedType);
    }

    if (search) {
      list = list.filter(d => d.type?.includes(search) || d.memo?.includes(search) || d.memberId?.includes(search));
    }
    
    const now = new Date();
    if (period === "本日") {
      const today = toLocalDateString(now);
      list = list.filter(d => {
        if (!d.timestamp) return false;
        const dt = d.timestamp.toDate ? d.timestamp.toDate() : (d.timestamp.seconds ? new Date(d.timestamp.seconds * 1000) : new Date(d.timestamp));
        return toLocalDateString(dt) === today;
      });
    } else if (period === "今週") {
      const wr = getWeekRange(now);
      list = list.filter(d => {
        if (!d.timestamp) return false;
        const dt = d.timestamp.toDate ? d.timestamp.toDate() : (d.timestamp.seconds ? new Date(d.timestamp.seconds * 1000) : new Date(d.timestamp));
        return dt >= wr.start && dt <= wr.end;
      });
    }
    return list;
  }, [gasData, members, forcedMemberId, search, period, selectedMid, selectedType]);

  const summary = useMemo(() => {
    const counts = { appts: 0, requests: 0, recalls: 0, others: 0 };
    filtered.forEach(d => {
      if (d.type === 'アポ確定') counts.appts++;
      else if (d.type?.startsWith('資料送付予定')) counts.requests++;
      else if (d.type?.startsWith('再架電')) counts.recalls++;
      else counts.others++;
    });
    return counts;
  }, [filtered]);

  return (
    <div className="space-y-8">
      {!hideHeader && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
             <h2 className="text-xl font-black flex items-center gap-3"><Icon p={I.Zap} size={20} className="text-blue-600"/> 同期実績ログ</h2>
             <div className="flex flex-wrap gap-2">
                <select value={period} onChange={e=>setPeriod(e.target.value)} className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs rounded-xl outline-none shadow-sm">
                   <option value="本日">本日</option>
                   <option value="今週">今週</option>
                   <option value="全期間">全期間</option>
                </select>
                {!forcedMemberId && (
                  <select value={selectedMid} onChange={e=>setSelectedMid(e.target.value)} className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs rounded-xl outline-none shadow-sm">
                    <option value="all">全員</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                )}
                <select value={selectedType} onChange={e=>setSelectedType(e.target.value)} className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs rounded-xl outline-none shadow-sm">
                   <option value="all">全てのステータス</option>
                   <option value="アポ確定">アポ確定</option>
                   <option value="資料送付予定">資料送付予定</option>
                   <option value="再架電🔥">再架電🔥</option>
                   <option value="本人不在">本人不在</option>
                </select>
             </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
              <div className="text-[10px] font-black text-blue-600 uppercase mb-1">アポ確定</div>
              <div className="text-2xl font-black text-blue-900">{summary.appts} <span className="text-xs font-normal">件</span></div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
              <div className="text-[10px] font-black text-emerald-600 uppercase mb-1">資料送付</div>
              <div className="text-2xl font-black text-emerald-900">{summary.requests} <span className="text-xs font-normal">件</span></div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="text-[10px] font-black text-amber-600 uppercase mb-1">再架電</div>
              <div className="text-2xl font-black text-amber-900">{summary.recalls} <span className="text-xs font-normal">件</span></div>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">その他</div>
              <div className="text-2xl font-black text-slate-900">{summary.others} <span className="text-xs font-normal">件</span></div>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {filtered.map(d => (
          <div key={d.id} className="p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm flex items-center justify-between group hover:border-blue-300 hover:shadow-md transition-all">
            <div className="flex items-center gap-5">
               <div className={'w-1.5 h-12 rounded-full ' + (d.type === 'アポ確定' ? 'bg-blue-600' : d.type?.includes('資料送付予定') ? 'bg-emerald-500' : d.type?.includes('再架電') ? 'bg-amber-400' : 'bg-slate-200')}></div>
               <div>
                  <div className="flex items-center gap-3 mb-1">
                     <span className="text-[10px] font-black text-slate-400 tabular-nums">
                       {d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleString() : (d.timestamp.seconds ? new Date(d.timestamp.seconds * 1000).toLocaleString() : new Date(d.timestamp).toLocaleString())) : '---'}
                     </span>
                     <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded-lg">{d.memberId}</span>
                  </div>
                  <div className="font-black text-slate-900 flex items-center gap-2">
                    {d.type}
                    {d.type === 'アポ確定' && <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>}
                  </div>
                  {d.memo && <div className="text-[10px] text-slate-500 font-bold mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">{d.memo}</div>}
               </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => {
                 const m = prompt("メモを入力してください", d.memo || "");
                 if (m !== null) onEditGasRecord(d.id, { memo: m });
               }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Icon p={I.Edit} size={16}/></button>
               <button onClick={() => {
                 if (window.confirm("このレコードを削除しますか？")) onDeleteGasRecord(d.id);
               }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Icon p={I.Trash} size={16}/></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-20 text-center text-slate-300 font-black text-xs uppercase tracking-widest border-4 border-dashed border-slate-50 rounded-[2.5rem]">
            データがありません
          </div>
        )}
      </div>
    </div>
  );
};`;
  content = content.replace(oldGasView[0], newGasView);
}

// 2. Fix AI Advice formatting and labels
const oldAdvice = content.match(/const getAIAdvice = \(stats, isPersonal\) => \{[\s\S]*?(\n\s*?return \([\s\S]*?\n\s*?\);)\n\s*?\};/);
if (oldAdvice) {
  const newAdvice = `const getAIAdvice = (stats, isPersonal) => {
  const { calls, appts, picConnected } = stats;
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
        obs: "本人接続率が平均値を下回っています。リストの鮮度か、架電タイミングの不一致が主な要因と考えられます。",
        strategy: "アプローチタイミングの最適化",
        action: "ターゲット企業の決裁者が在席しやすい時間帯（例：ITなら午前中、店舗なら14時〜16時）へ架電を集中させ、接続効率を改善してください。"
      });
    }
    if (apptRate < 0.05) {
      categories.push({
        obs: "接続後のアポイント転換率に課題があります。冒頭のフックが弱い可能性があります。",
        strategy: "スクリプト冒頭30秒のフック強化",
        action: "相手が「今聞くべきメリット」を即座に理解できる成功事例や数字を、接続直後の15秒以内に盛り込み、関心を惹きつけてください。"
      });
    }
    if (categories.length === 0) {
      categories.push({
        obs: "非常に安定した生産性です。現在のトークスキルとリストの相性が非常に良い状態です。",
        strategy: "成功パターンのナレッジ化と共有",
        action: "現在の成功要因（特定の言い回しや切り返し）をチーム全体に共有し、組織全体の底上げに貢献してください。"
      });
    }
  } else {
    if (connectRate < 0.20) {
      categories.push({
        obs: "チーム全体の接続率が低迷しています。使用しているリスト全体の質を見直す時期です。",
        strategy: "セグメントの再選定",
        action: "反応の良い業界や地域を特定し、リソースを特定のターゲットに集中させることで、チーム全体の生産性を回復させてください。"
      });
    } else {
      categories.push({
        obs: "組織全体として高い目標達成水準を維持しています。",
        strategy: "モチベーションと品質の維持",
        action: "属人的な成功事例を標準化し、誰でも高い成果を出せる体制を強化することで、更なる目標の上積みを目指しましょう。"
      });
    }
  }
  const advice = categories[Math.floor(Math.random() * categories.length)];
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-rose-500 rounded-full"></div>
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">【現状の分析】</span>
        </div>
        <p className="text-white font-medium text-sm leading-relaxed pl-3 border-l border-white/10">{advice.obs}</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">【具体的戦略】</span>
        </div>
        <p className="text-white font-medium text-sm leading-relaxed pl-3 border-l border-white/10">{advice.strategy}</p>
      </div>
      <div className="space-y-2 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">【推奨アクション】</span>
        </div>
        <p className="text-white font-black text-base leading-relaxed">{advice.action}</p>
      </div>
    </div>
  );
};`;
  content = content.replace(oldAdvice[0], newAdvice);
}

// 3. Fix MetricHelpModal title and button artifacts
content = content.replace(/持EEEEE解説/g, "指標・用語解説");
content = content.replace(/達E/g, "達成");
content = content.replace(/チEEEタがありません/g, "データがありません");

// 4. Ensure settings has proper labels and structure
content = content.replace(/週間アポイント獲得目標<\/label>/g, "週間アポイント獲得目標 (件)</label>");
content = content.replace(/週間総架電目標<\/label>/g, "週間総架電目標 (回)</label>");
content = content.replace(/本人接続時アポイント率目標<\/label>/g, "本人接続時アポイント率目標 (%)</label>");

// 5. Final pass for specific syntax issues from previous turns
// Remove the extra </div> that caused whiteouts
content = content.replace(/<\/div>\s*?<\/div>\s*?<\/div>\s*?<\/div>\s*?<\/section>/g, "</div></div></div></section>");

fs.writeFileSync(path, content, 'utf8');
console.log("Master UI/UX restoration applied to App.jsx");
