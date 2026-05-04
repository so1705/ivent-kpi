const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

function replaceBlock(regex, newCode) {
    if (regex.test(content)) {
        content = content.replace(regex, newCode);
        return true;
    }
    return false;
}

// 1. Restore ShiftView
const shiftViewCode = `const ShiftView = ({ members, shifts, onAddShift, onDeleteShift, userRole, myMemberId }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkMemberId, setBulkMemberId] = useState("");
  const [bulkSchedule, setBulkSchedule] = useState([]); // [{ date, startTime, endTime }]
  const [bulkStartTime, setBulkStartTime] = useState("10:00");
  const [bulkEndTime, setBulkEndTime] = useState("19:00");
  const [selectedMemberId, setSelectedMemberId] = useState(myMemberId || "");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("19:00");

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,'0')}-01\`;
  });

  const moveMonth = (delta) => {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + delta);
    setCalendarMonth(toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1)));
  };

  const wr = getWeekRange(selectedDate);
  const calendarData = useMemo(() => {
    const d = new Date(calendarMonth);
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let i = 1; i <= last.getDate(); i++) days.push(toLocalDateString(new Date(y, m, i)));
    return days;
  }, [calendarMonth]);

  const displayShifts = useMemo(() => {
    if (viewMode === 'day') return shifts.filter(s => s.date === selectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    if (viewMode === 'week') return shifts.filter(s => { const d = new Date(s.date); return d >= wr.start && d <= wr.end; }).sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const monthPrefix = calendarMonth.slice(0,7);
    return shifts.filter(s => s.date.startsWith(monthPrefix)).sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, selectedDate, viewMode, wr, calendarMonth]);

  const selectedDateShifts = useMemo(() => {
    return shifts.filter(s => s.date === selectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  }, [shifts, selectedDate]);

  const calYear = new Date(calendarMonth).getFullYear();
  const calMonthNum = new Date(calendarMonth).getMonth() + 1;

  const handleBulkToggleDate = (d) => {
    if (!d) return;
    const existing = bulkSchedule.find(s => s.date === d);
    if (existing) {
      setBulkSchedule(bulkSchedule.filter(s => s.date !== d));
    } else {
      setBulkSchedule([...bulkSchedule, { date: d, startTime: bulkStartTime, endTime: bulkEndTime }]);
    }
  };

  const updateBulkTime = (date, field, value) => {
    setBulkSchedule(bulkSchedule.map(s => s.date === date ? { ...s, [field]: value } : s));
  };

  const handleBulkRegister = async () => {
    if (!bulkMemberId) return alert("メンバーを選択してください");
    if (bulkSchedule.length === 0) return alert("登録する日程を選択してください");
    
    const mName = members.find(m=>m.id===bulkMemberId)?.name;
    if (window.confirm(\`\${mName}さんのシフト\${bulkSchedule.length}件を一括登録しますか？\`)) {
      for (const item of bulkSchedule) {
        await onAddShift({ memberId: bulkMemberId, date: item.date, startTime: item.startTime, endTime: item.endTime });
      }
      alert("一括登録が完了しました");
      setBulkSchedule([]);
      setBulkMode(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 font-sans">
       <div className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">シフト・予定管理</h2>
              {userRole === 'admin' && (
                <button 
                  onClick={() => setBulkMode(!bulkMode)}
                  className={\`px-4 py-2 text-[10px] font-black rounded-full transition-all flex items-center gap-2 \${bulkMode ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}\`}
                >
                  {bulkMode ? <><Icon p={I.X} size={14}/> モード解除</> : <><Icon p={I.Zap} size={14}/> 一括登録モード</>}
                </button>
              )}
            </div>
            {!bulkMode && (
              <div className="flex bg-slate-200 p-1 rounded-full">
                 <button onClick={()=>setViewMode('day')} className={\`px-3 py-1 text-[10px] font-bold rounded-full transition-all \${viewMode==='day'?'bg-slate-900 text-white':'text-slate-500'}\`}>日次</button>
                 <button onClick={()=>setViewMode('week')} className={\`px-3 py-1 text-[10px] font-bold rounded-full transition-all \${viewMode==='week'?'bg-slate-900 text-white':'text-slate-500'}\`}>週次</button>
                 <button onClick={()=>setViewMode('month')} className={\`px-3 py-1 text-[10px] font-bold rounded-full transition-all \${viewMode==='month'?'bg-slate-900 text-white':'text-slate-500'}\`}>月次</button>
              </div>
            )}
          </div>

          {bulkMode && (
            <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-4">
                     <label className="text-xs font-black text-rose-500 uppercase tracking-widest block">1. メンバーを選択</label>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {members.map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => setBulkMemberId(m.id)}
                            className={\`px-4 py-3 text-xs font-bold rounded-2xl border-2 transition-all \${bulkMemberId === m.id ? 'bg-rose-500 border-rose-500 text-white shadow-lg scale-105' : 'bg-white border-rose-100 text-rose-400 hover:border-rose-200'}\`}
                          >
                            {m.name}
                          </button>
                        ))}
                     </div>
                  </div>
                  <div className="space-y-4 bg-white p-6 rounded-3xl border border-rose-100 shadow-sm">
                     <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">デフォルト時間設定</label>
                     <div className="flex gap-4">
                        <div className="space-y-1">
                           <span className="text-[9px] font-bold text-slate-400">開始</span>
                           <input type="time" value={bulkStartTime} onChange={e=>setBulkStartTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-bold text-xs" />
                        </div>
                        <div className="space-y-1">
                           <span className="text-[9px] font-bold text-slate-400">終了</span>
                           <input type="time" value={bulkEndTime} onChange={e=>setBulkEndTime(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg font-bold text-xs" />
                        </div>
                     </div>
                     <p className="text-[9px] text-slate-400 font-bold mt-2">カレンダーから日付をタップして選択してください</p>
                  </div>
               </div>

               {bulkSchedule.length > 0 && (
                 <div className="space-y-4 pt-4 border-t border-rose-100">
                    <label className="text-xs font-black text-rose-500 uppercase tracking-widest block">2. 登録する日程と時間</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                       {bulkSchedule.map(item => (
                         <div key={item.date} className="flex items-center justify-between p-4 bg-white border border-rose-100 rounded-2xl shadow-sm group">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-rose-500">{item.date.slice(5).replace('-', '/')}</span>
                               <span className="text-xs font-bold text-slate-600">
                                 {['日','月','火','水','木','金','土'][new Date(item.date).getDay()]}曜日
                               </span>
                            </div>
                            <div className="flex items-center gap-2">
                               <input type="time" value={item.startTime} onChange={e=>updateBulkTime(item.date, 'startTime', e.target.value)} className="p-2 bg-slate-50 border border-slate-100 rounded-lg font-bold text-[10px] outline-none focus:border-rose-300" />
                               <span className="text-slate-300">-</span>
                               <input type="time" value={item.endTime} onChange={e=>updateBulkTime(item.date, 'endTime', e.target.value)} className="p-2 bg-slate-50 border border-slate-100 rounded-lg font-bold text-[10px] outline-none focus:border-rose-300" />
                               <button onClick={()=>handleBulkToggleDate(item.date)} className="p-2 text-rose-200 hover:text-rose-500 transition-colors"><Icon p={I.X} size={14}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               <div className="flex flex-col md:flex-row items-center justify-between border-t border-rose-100 pt-6 gap-4">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-rose-100 text-rose-600 flex items-center justify-center rounded-full font-black">3</div>
                       <p className="text-sm font-bold text-rose-600">一括登録を実行します。現在 {bulkSchedule.length} 件選択中</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                       <button onClick={()=>setBulkSchedule([])} className="px-6 py-4 bg-white border-2 border-rose-100 text-rose-400 font-bold rounded-2xl hover:bg-rose-50 transition-all">全クリア</button>
                       <button onClick={handleBulkRegister} className="flex-1 md:flex-none px-10 py-4 bg-rose-600 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-rose-700 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                          <Icon p={I.Check} size={20}/> 登録を実行する
                       </button>
                    </div>
                 </div>
            </div>
          )}
          {viewMode === 'month' ? (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-4 py-3">
              <button onClick={()=>moveMonth(-1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><Icon p={I.ChevronLeft} size={20}/></button>
              <span className="font-black text-lg">{calYear}年 {calMonthNum}月</span>
              <button onClick={()=>moveMonth(1)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors"><Icon p={I.ChevronRight} size={20}/></button>
            </div>
          ) : (
            <input type="date" className="w-full bg-white border border-slate-300 p-3 font-bold text-sm outline-none rounded-xl focus:border-slate-900 transition-colors" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
          )}
       </div>

       {viewMode === 'month' ? (
         <div className="space-y-6">
           <div className="p-10 bg-white border border-slate-200 shadow-xl rounded-[2.5rem]">
              <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                 {['日','月','火','水','木','金','土'].map((d, i) => (
                    <div key={d} className={\`bg-slate-50/50 p-4 text-center text-xs font-black uppercase \${i===0?'text-rose-500':i===6?'text-blue-500':'text-slate-400'}\`}>{d}</div>
                 ))}
                 {calendarData.map((d, i) => {
                   if (!d) return <div key={\`empty-\${i}\`} className="bg-white aspect-[4/3]" />;
                   const dayShifts = displayShifts.filter(s => s.date === d);
                   const isSelected = bulkMode ? bulkSchedule.some(s=>s.date===d) : d === selectedDate;
                   const isToday = d === toLocalDateString(new Date());
                   return (
                     <button 
                       key={d} 
                       onClick={() => bulkMode ? handleBulkToggleDate(d) : setSelectedDate(d)} 
                       className={\`bg-white aspect-[4/3] p-2 flex flex-col items-start justify-start transition-all relative border-t border-l border-slate-50 hover:bg-blue-50 group \${isSelected ? (bulkMode ? 'ring-4 ring-inset ring-rose-500 z-10 bg-rose-50/20' : 'ring-2 ring-inset ring-blue-600 z-10 bg-blue-50/30') : ''}\`}
                     >
                       <span className={\`text-sm font-black mb-1 \${isSelected ? (bulkMode ? 'text-rose-600' : 'text-blue-600') : isToday ? 'bg-blue-600 text-white px-2 rounded-full' : ''}\`}>{d.split('-')[2]}</span>
                       <div className="w-full space-y-1">
                          {dayShifts.slice(0, 3).map((s, idx) => {
                             const m = members.find(mem=>mem.id===s.memberId);
                             return <div key={idx} className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate w-full">{m?.name}</div>
                          })}
                       </div>
                     </button>
                   );
                 })}
              </div>
           </div>

           <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-4"><div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><Icon p={I.Calendar} size={20}/></div> {selectedDate.split('-')[1]}月{selectedDate.split('-')[2]}日のシフト詳細</h3>
              </div>
              {selectedDateShifts.length === 0 ? (
                 <div className="text-center py-20 text-slate-400 font-bold text-sm">この日のシフト登録はありません。</div>
              ) : (
                 <div className="divide-y divide-slate-50">
                    {selectedDateShifts.map(s => {
                      const m = members.find(mem=>mem.id===s.memberId);
                      return (
                        <div key={s.id} className="flex items-center justify-between p-8 bg-white hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-6">
                             <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">{m?.name?.slice(0,1)}</div>
                             <div>
                                <div className="font-black text-slate-900 text-lg leading-tight">{m?.name}</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{m?.role}</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-10">
                             <div className="text-right">
                                <div className="text-[10px] font-bold text-slate-300 uppercase mb-1">勤務時間</div>
                                <div className="text-xl font-black text-blue-600 tabular-nums">{s.startTime} - {s.endTime}</div>
                             </div>
                               {(userRole === 'admin' || s.memberId === myMemberId) && (
                                   <button onClick={()=>{if(window.confirm('このシフトを削除しますか？')) onDeleteShift(s.id)}} className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Icon p={I.Trash} size={20}/></button>
                               )}
                          </div>
                        </div>
                      );
                    })}
                 </div>
              )}
           </div>
         </div>
       ) : (
         <div className="space-y-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {displayShifts.map(s => {
               const m = members.find(mem=>mem.id===s.memberId);
               return (
                 <div key={s.id} className="bg-white p-5 flex items-center justify-between hover:bg-slate-50 transition-all border-l-4 border-transparent hover:border-slate-900">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-100 flex items-center justify-center font-bold text-slate-900 rounded-full">{m?.name?.slice(0,1)}</div>
                       <div>
                          <div className="font-bold text-slate-900">{m?.name}</div>
                          <div className="text-[9px] font-bold text-slate-400 flex gap-3 mt-0.5">
                             {viewMode === 'week' && <span className="flex items-center gap-1"><Icon p={I.Calendar} size={10}/>{s.date}</span>}
                             <span className="flex items-center gap-1"><Icon p={I.Clock} size={10}/>{s.startTime} - {s.endTime}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={()=>{if(window.confirm('削除しますか？')) onDeleteShift(s.id)}} className="p-2 text-slate-200 hover:text-rose-600 transition-colors"><Icon p={I.Trash} size={18}/></button>
                 </div>
               );
            })}
         </div>
       )}
       
       {!bulkMode && (
         <button onClick={()=>setShowModal(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-slate-900 text-white flex flex-col items-center justify-center border-4 border-white shadow-2xl z-40 rounded-full hover:scale-105 transition-transform">
           <Icon p={I.Plus} size={24} />
           <span className="text-[7px] font-bold uppercase mt-0.5">登録</span>
         </button>
       )}

       {showModal && (
         <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
               <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                  <h3 className="text-xl font-bold">シフト登録</h3>
                  <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><Icon p={I.X} /></button>
               </div>
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">メンバー</label>
                    <div className="flex flex-wrap gap-2">{members.map(m => (
                      <button key={m.id} onClick={()=>{setSelectedMemberId(m.id);}} className={\`px-4 py-2 border font-bold text-xs transition-all rounded-full \${selectedMemberId===m.id?'bg-slate-900 text-white':'border-slate-200 hover:bg-slate-50'}\`}>{m.name}</button>
                    ))}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">開始</label>
                       <input type="time" className="w-full p-4 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-xl transition-colors" value={startTime} onChange={e=>setStartTime(e.target.value)} />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">終了</label>
                       <input type="time" className="w-full p-4 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-xl transition-colors" value={endTime} onChange={e=>setEndTime(e.target.value)} />
                     </div>
                  </div>
               </div>
               <button onClick={async ()=>{
                  if(!selectedMemberId) return alert("メンバーを選択してください");
                  await onAddShift({ memberId: selectedMemberId, date: selectedDate, startTime, endTime });
                  setShowModal(false);
               }} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl hover:bg-black transition-colors">登録する</button>
            </div>
         </div>
       )}
    </div>
  );
};`;

replaceBlock(/const ShiftView = \(\{ members[\s\S]+?\r?\n\};/g, shiftViewCode);

// 2. Restore METRIC_HELP
const metricHelpCode = `const METRIC_HELP = {
  CPH: 'CPH (Calls Per Hour): 1時間あたりの架電効率',
  接続率: '接続率 = 本人接続 / 架電。担当者に繋がった割合。リストの質や架電時間の有効性を示します。',
  アポ率: 'アポ率 = アポ獲得 / 本人接続。接続した際のアポ打診の成功率。トークスキルやニーズ喚起力を示します。',
  獲得: '今週の個人アポ獲得実績です。',
  見込み: '見込み = 現在のペース・効率と残りの予定時間から算出した、週次着地予測値です。',
  本人接続: '架電して本人（または担当者）に繋がった件数。不在や受付拒否を除いた、対話ができた数です。',
};`;

replaceBlock(/const METRIC_HELP = \{[\s\S]+?\r?\n\};/g, metricHelpCode);

// 3. Restore AnalyticsView
const analyticsViewCode = `const AnalyticsView = ({ members, reports, event, userRole }) => {
  const [selectedMid, setSelectedMid] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [chartMetric, setChartMetric] = useState('appts');
  const [periodMode, setPeriodMode] = useState('daily');
  const [showHelp, setShowHelp] = useState(false);

  const fReports = useMemo(() => {
    return reports.filter(r => {
      const isEventMatch = !r.eventId || r.eventId === event?.id;
      if (selectedMid === 'all') return isEventMatch;
      return isEventMatch && r.memberId === selectedMid;
    });
  }, [reports, selectedMid, event]);

  const stats = useMemo(() => {
    return fReports.reduce((acc, r)=>({
      calls: acc.calls+(Number(r.calls)||0),
      appts: acc.appts+(Number(r.appts)||0),
      requests: acc.requests+(Number(r.requests)||0),
      picConnected: acc.picConnected+(Number(r.picConnected)||0),
      receptionRefusal: acc.receptionRefusal+(Number(r.receptionRefusal)||0),
      picAbsent: acc.picAbsent+(Number(r.picAbsent)||0),
      noAnswer: acc.noAnswer+(Number(r.noAnswer)||0),
    }), { calls: 0, appts: 0, requests: 0, picConnected: 0, receptionRefusal: 0, picAbsent: 0, noAnswer: 0 });
  }, [fReports]);

  const trendData = useMemo(() => {
    const map = {};
    fReports.forEach(r => {
      if (!r.date) return;
      const dateObj = r.date.toDate ? r.date.toDate() : new Date(r.date);
      let key = '';
      if (periodMode === 'daily') key = toLocalDateString(dateObj).slice(-5);
      else if (periodMode === 'weekly') key = getMondayKey(dateObj).slice(5).replace('-', '/');
      else if (periodMode === 'monthly') key = \`\${dateObj.getMonth()+1}月\`;
      else key = \`\${dateObj.getFullYear()}年\`;
      map[key] = (map[key] || 0) + (Number(r[chartMetric]) || 0);
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b)=>a.day.localeCompare(b.day));
  }, [fReports, chartMetric, periodMode]);

  const metricLabels = BREAKDOWN_LABELS;
  const periodLabels = { daily: '日次', weekly: '週次', monthly: '月次', yearly: '年次' };

  return (
    <div className="space-y-10 pb-28">
       {showHelp && <MetricHelpModal onClose={()=>setShowHelp(false)} />}
       <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black flex items-center gap-3"><Icon p={I.PieChart} size={20}/> パフォーマンス分析</h2>
            <button onClick={()=>setShowHelp(true)} className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="指標のヘルプ">
              <Icon p={I.Help} size={16}/>
            </button>
          </div>
          <select className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs outline-none rounded-xl shadow-sm" value={selectedMid} onChange={e=>setSelectedMid(e.target.value)}>
             <option value="all">チーム全体の推移を表示</option>
             {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
       </div>

       <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
          <div className="flex flex-col gap-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">トレンドモニタリング</h3>
                   <div className="text-2xl font-black text-slate-900">{metricLabels[chartMetric]}の推移</div>
                </div>
                <div className="flex flex-wrap gap-2">
                   <select className="px-4 py-2 text-xs font-black rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 shadow-sm" value={chartMetric} onChange={e => setChartMetric(e.target.value)}>{Object.entries(metricLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select>
                </div>
             </div>
             <div className="flex flex-wrap gap-2">
               <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                 {['daily','weekly','monthly','yearly'].map(p => (
                   <button key={p} onClick={()=>setPeriodMode(p)} className={\`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all \${periodMode===p?'bg-slate-900 text-white':'text-slate-400'}\`}>{periodLabels[p]}</button>
                 ))}
               </div>
               <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                 <button onClick={()=>setChartType('line')} className={\`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all \${chartType==='line'?'bg-blue-600 text-white':'text-slate-400'}\`}>折れ線</button>
                 <button onClick={()=>setChartType('area')} className={\`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all \${chartType==='area'?'bg-blue-600 text-white':'text-slate-400'}\`}>エリア</button>
               </div>
             </div>
          </div>
          <div className="h-[300px] w-full">
             <CustomChart data={trendData} color={chartMetric==='appts'?'#4f46e5':chartMetric==='calls'?'#0ea5e9':'#10b981'} type={chartType} />
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">主要コンバージョン率(CVR)</h3>
             <div className="space-y-10">
                <MetricBar label="接続率 (架電あたり)" val={stats.picConnected} tgt={stats.calls} />
                <MetricBar label="アポ率 (本人接続あたり)" val={stats.appts} tgt={stats.picConnected} />
             </div>
          </div>

          <section className="p-10 bg-slate-900 text-white relative rounded-[2.5rem] shadow-xl overflow-hidden min-h-[300px] flex flex-col justify-between border border-slate-800">
             <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Icon p={I.Zap} size={140} /></div>
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                   <h3 className="text-xs font-black text-white uppercase tracking-widest">AIアドバイザー</h3>
                </div>
                <div className="text-sm font-bold leading-relaxed pr-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm text-white">
                   {getAIAdvice(stats, selectedMid !== 'all')}
                </div>
             </div>
             <div className="relative z-10 border-t border-white/10 pt-6 flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> リアルタイム分析エンジン稼働中</span>
                <span className="opacity-40 italic text-white/50">最終更新: {new Date().toLocaleTimeString()}</span>
             </div>
          </section>
       </div>
    </div>
  );
};`;

replaceBlock(/const AnalyticsView = \(\{ members[\s\S]+?\r?\n\};/g, analyticsViewCode);

// 4. Restore Settings
const settingsCode = `const Settings = ({ events, currentEventId, members, onAddEvent, onDeleteEvent, onAddMember, onDelMember, onUpdateMember, onUpdateGoal, currentBaseDate, onClose }) => {
  const [newEName, setNewEName] = useState("");
  const [newMName, setNewMName] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("apo");
  const [newWage, setNewWage] = useState("1500");
  const [editingMember, setEditingMember] = useState(null);
  
  const currentEvent = useMemo(() => {
    if (!events || !currentEventId) return null;
    return events.find(e => e.id === currentEventId) || null;
  }, [events, currentEventId]);

  const activeWeeklyGoals = useMemo(() => {
    if (!currentEvent || !currentBaseDate) return { appts: 0 };
    const mon = getMondayKey(currentBaseDate);
    return currentEvent?.weeklyGoals?.[mon] || currentEvent?.goals?.weekly || { appts: 0 };
  }, [currentEvent, currentBaseDate]);

  const [gasUrl, setGasUrl] = useState(localStorage.getItem('kpi_gas_url') || "");
  const [legacyAppId, setLegacyAppId] = useState(localStorage.getItem('kpi_legacy_appid') || "");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveSyncSettings = () => {
    localStorage.setItem('kpi_gas_url', gasUrl);
    localStorage.setItem('kpi_legacy_appid', legacyAppId);
    alert("保存が完了しました");
  };

  const handleManualSync = async () => {
    if (!gasUrl) return alert("GASのURLを設定してください");
    setIsSyncing(true);
    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify({ action: 'sync', legacyAppId: legacyAppId })
      });
      alert("同期リクエストを送信しました。処理完了までお待ちください。");
    } catch (e) {
      alert("同期エラー: " + e.message);
    }
    setIsSyncing(false);
  };
  
  return (
    <div className="space-y-12 pb-40 font-sans">
       <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
          <div className="flex items-center gap-6">
             <button onClick={onClose} className="p-4 bg-slate-900 text-white rounded-2xl"><Icon p={I.X}/></button>
             <div><h2 className="font-black text-3xl text-slate-900 leading-none">設定・管理</h2></div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <section className="space-y-6">
             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-900 pl-3">イベント・案件管理</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-4 shadow-sm rounded-3xl">
                <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold focus:border-slate-900 outline-none rounded-xl" placeholder="新規イベント名" value={newEName} onChange={e=>setNewEName(e.target.value)} />
                <button onClick={()=>{if(newEName){onAddEvent(newEName); setNewEName("");}}} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl">イベントを追加</button>
             </div>
             <div className="flex flex-col gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {events.map(e => (
                   <div key={e.id} className="flex items-center justify-between p-4 bg-white text-sm font-bold">
                      <span>{e.name}</span>
                      <button onClick={()=>{if(window.confirm('イベントを削除しますか？')) onDeleteEvent(e.id)}} className="text-slate-300 hover:text-rose-600 transition-colors"><Icon p={I.Trash} size={18}/></button>
                   </div>
                ))}
             </div>

             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-600 pl-3 mt-12">全体目標設定</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-6 shadow-sm rounded-3xl">
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">今週の全体獲得目標</label>
                   <div className="flex gap-4">
                      <input type="number" id="admin-global-goal" className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 font-black text-2xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.appts} />
                      <button onClick={() => {
                         const val = Number(document.getElementById('admin-global-goal').value);
                         onUpdateGoal(getMondayKey(currentBaseDate), null, { ...activeWeeklyGoals, appts: val });
                         alert("全体目標を更新しました");
                      }} className="px-8 bg-indigo-600 text-white font-bold rounded-2xl">更新</button>
                   </div>
                </div>
             </div>

             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-600 pl-3 mt-12">外部データ連携 (GAS / スプレッドシート)</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-6 shadow-sm rounded-3xl">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Google Apps Script URL</label>
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl text-xs" placeholder="https://script.google.com/macros/s/..." value={gasUrl} onChange={e=>setGasUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">旧App ID (既存のシート名など)</label>
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl text-xs" placeholder="例: tele-apo-manager-original" value={legacyAppId} onChange={e=>setLegacyAppId(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={handleSaveSyncSettings} className="w-full bg-white border-2 border-slate-200 text-slate-600 py-4 font-bold rounded-2xl">設定を保存</button>
                   <button onClick={handleManualSync} disabled={isSyncing} className="w-full bg-blue-600 text-white py-4 font-bold rounded-2xl flex items-center justify-center gap-2">
                      <Icon p={I.Zap} size={18} /> {isSyncing ? '同期中...' : '手動同期実行'}
                   </button>
                </div>
             </div>
          </section>

          <section className="space-y-6">
             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-emerald-600 pl-3">チームメンバー</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-4 shadow-sm rounded-3xl">
                <div className="grid grid-cols-2 gap-4">
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" placeholder="名前" value={newMName} onChange={e=>setNewMName(e.target.value)} />
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" placeholder="スプレッドシート名" value={newSpreadsheetName} onChange={e=>setNewSpreadsheetName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" placeholder="Gmail" value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
                   <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                      <option value="apo">アポインター</option>
                      <option value="closer">クローザー</option>
                      <option value="admin">管理者</option>
                   </select>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" placeholder="時給" value={newWage} onChange={e=>setNewWage(e.target.value)} />
                </div>
                <button onClick={()=>{if(newMName){onAddMember(newMName, newRole, newWage, newEmail, newSpreadsheetName); setNewMName(""); setNewEmail(""); setNewSpreadsheetName("");}}} className="w-full bg-emerald-600 text-white py-4 font-bold rounded-2xl">メンバーを追加</button>
             </div>
             <div className="flex flex-col gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {members.map(m => (
                   <button key={m.id} onClick={() => setEditingMember(m)} className="p-4 bg-white flex items-center justify-between text-left hover:bg-slate-50 group transition-colors">
                      <div className="flex items-center gap-4">
                         <div className={\`w-10 h-10 flex items-center justify-center font-bold text-white rounded-full \${m.role==='admin'?'bg-slate-900':'bg-slate-400'}\`}>{m.name?.slice(0,1) || '?'}</div>
                         <div>
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">¥{m.hourlyWage}/H | {m.role}</div>
                         </div>
                      </div>
                      <Icon p={I.Settings} size={16} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                   </button>
                ))}
             </div>
          </section>
       </div>

       {editingMember && (
         <div className="fixed inset-0 bg-slate-900/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
               <h3 className="text-xl font-bold border-b-2 border-slate-100 pb-4">メンバー編集</h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" value={editingMember.name} onChange={e=>setEditingMember({...editingMember, name: e.target.value})} placeholder="名前" />
                     <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" value={editingMember.spreadsheetName || ''} onChange={e=>setEditingMember({...editingMember, spreadsheetName: e.target.value})} placeholder="スプレッドシート名" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}>
                        <option value="apo">アポインター</option>
                        <option value="closer">クローザー</option>
                        <option value="admin">管理者</option>
                     </select>
                     <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-200 font-bold outline-none rounded-xl" value={editingMember.hourlyWage} onChange={e=>setEditingMember({...editingMember, hourlyWage: e.target.value})} placeholder="時給" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={()=>{onDelMember(editingMember.id); setEditingMember(null);}} className="bg-rose-50 text-rose-500 py-4 font-bold border border-rose-100 rounded-2xl">削除</button>
                  <button onClick={()=>{onUpdateMember(editingMember.id, editingMember); setEditingMember(null);}} className="bg-slate-900 text-white py-4 font-bold rounded-2xl">更新</button>
               </div>
               <button onClick={()=>setEditingMember(null)} className="w-full text-slate-400 text-sm font-bold pt-4">キャンセル</button>
            </div>
         </div>
       )}
    </div>
  );
};`;

replaceBlock(/const Settings = \(\{ events[\s\S]+?\r?\n\};/g, settingsCode);

// 5. Restore App component internal logic strings
content = content.replace(/if \(r\.type === 'アポ獲得 acc\.appts \+= 1;/g, "if (r.type === 'アポ獲得') acc.appts += 1;");
content = content.replace(/if \(d\.type === 'アポ獲得 myTot\.appts \+= 1;/g, "if (d.type === 'アポ獲得') myTot.appts += 1;");

fs.writeFileSync(path, content, 'utf8');
console.log("Final structural restoration complete");
