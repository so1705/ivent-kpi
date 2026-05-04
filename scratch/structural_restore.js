const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Helper to replace block
function replaceBlock(regex, newCode) {
    if (regex.test(content)) {
        content = content.replace(regex, newCode);
        return true;
    }
    return false;
}

// 1. Restore Dashboard
const dashboardCode = `const Dashboard = ({ event, totals, memberStats, eventReports, members, currentBaseDate, setCurrentBaseDate, userRole, currentUserEmail, onUpdateGoal, gasData, onEditGasRecord, onDeleteGasRecord }) => {
  const [drilldownMember, setDrilldownMember] = useState(null);
  const [viewMode, setViewMode] = useState('personal'); 
  const [editingGoal, setEditingGoal] = useState(null);

  const currentMember = useMemo(() => members.find(m => m.email === currentUserEmail), [members, currentUserEmail]);
  const myReports = useMemo(() => eventReports.filter(r => r.memberId === currentMember?.id && r.eventId === event.id), [eventReports, currentMember, event]);
  const myTotals = useMemo(() => {
     return myReports.reduce((acc, r) => ({
        appts: acc.appts + (Number(r.appts) || 0),
        calls: acc.calls + (Number(r.calls) || 0),
        picConnected: acc.picConnected + (Number(r.picConnected) || 0),
        hours: acc.hours + (Number(r.hours) || 0),
     }), { appts: 0, calls: 0, picConnected: 0, hours: 0 });
  }, [myReports]);

  const activeWeeklyGoals = event.weeklyGoals?.[getMondayKey(currentBaseDate)] || event.goals?.weekly || {};
  const activeIndivGoals = event.individualWeeklyGoals?.[getMondayKey(currentBaseDate)]?.[currentMember?.id] || activeWeeklyGoals;

  return (
    <div className="space-y-12 pb-24 font-sans">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-slate-100 pb-10">
          <div className="space-y-3">
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{event.name}</h2>
             <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> 実績データ</span>
                <span className="w-px h-3 bg-slate-200"></span>
                <span>同期日時 {new Date().toLocaleString()}</span>
             </div>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-2xl">
             <button onClick={()=>setViewMode('personal')} className={\`px-8 py-3 text-xs font-bold transition-all rounded-xl \${viewMode==='personal'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}\`}>{userRole === 'admin' ? '管理者データ' : 'マイデータ'}</button>
             <button onClick={()=>setViewMode('team')} className={\`px-8 py-3 text-xs font-bold transition-all rounded-xl \${viewMode==='team'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}\`}>チーム全体</button>
          </div>
       </div>

       {viewMode === 'personal' ? (
                  <div className="space-y-10">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 今週の予測
                           </h3>
                           <div className="p-8 bg-white border-2 border-slate-900 rounded-[2rem] shadow-sm space-y-6">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">週次目標/ 件</span>
                                    <button onClick={()=>setEditingGoal(activeIndivGoals)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Icon p={I.Edit} size={14}/></button>
                                 </div>
                                 <span className="text-2xl font-black text-slate-900">{(memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 0)} <span className="text-xs">件</span></span>
                              </div>
                              <MetricBar label="獲得" val={myTotals.appts} tgt={memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 1} />
                           </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> 今週の着地予測
                           </h3>
                           <div className="p-8 bg-emerald-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10"><Icon p={I.TrendingUp} size={100} /></div>
                              <div className="relative z-10 space-y-4">
                                 <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">見込み</div>
                                 <div className="text-5xl font-black">{memberStats.find(m=>m.email===currentUserEmail)?.expectedAppts || 0}<span className="text-sm font-normal ml-2 opacity-50">件</span></div>
                                 <div className="pt-4 border-t border-emerald-800 flex justify-between items-center">
                                    <span className="text-xs font-bold opacity-60">目標差分</span>
                                    <span className="text-lg font-black">
                                       {((memberStats.find(m=>m.email===currentUserEmail)?.expectedAppts || 0) - (memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 0)).toFixed(1)}
                                       <span className="text-xs ml-1">件</span>
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div> 稼働効率
                           </h3>
                           <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm space-y-4">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPH</div>
                              <div className="text-4xl font-black text-slate-900">{memberStats.find(m=>m.email===currentUserEmail)?.cph || "0.0"}<span className="text-xs font-normal ml-2 text-slate-300">c/h</span></div>
                              <div className="pt-4 flex justify-between items-center text-xs font-bold">
                                 <span className="text-slate-400">実績架電</span>
                                 <span className="text-slate-900">{myTotals.calls} 回</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        <div className="space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 直近の稼働状況
                           </h3>
                           <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-sm h-[350px]">
                              <CustomChart data={myReports.slice(-7).map(r=>({ day: r.date.toDate ? r.date.toDate().getDate() : new Date(r.date).getDate(), value: r.appts }))} color="#2563eb" />
                           </div>
                        </div>

                        <div className="space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-slate-900 rounded-full"></div> AIアドバイス
                           </h3>
                           <div className="bg-slate-900 p-10 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[350px] flex flex-col justify-center">
                              <div className="absolute top-0 right-0 p-6 opacity-10"><Icon p={I.Zap} size={120} /></div>
                              <div className="relative z-10">
                                 <p className="text-xl font-bold leading-relaxed">
                                    {getAIAdvice({
                                       calls: myTotals.calls,
                                       appts: myTotals.appts,
                                       picConnected: myTotals.picConnected
                                    }, true)}
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MainMetric label="チーム獲得" icon={I.Target} current={totals.weekly.appts} target={event.weeklyGoals?.[getMondayKey(currentBaseDate)]?.appts || event.goals?.weekly?.appts || 1} />
                        <MainMetric label="着地予測" icon={I.TrendingUp} current={memberStats.reduce((s,m)=>s+Number(m.expectedAppts), 0)} target={event.weeklyGoals?.[getMondayKey(currentBaseDate)]?.appts || event.goals?.weekly?.appts || 1} />
                        <div className="p-8 rounded-[2rem] bg-slate-900 text-white flex flex-col justify-between shadow-xl">
                           <span className="text-xs font-bold opacity-50 uppercase tracking-widest">稼働状況</span>
                           <div className="text-4xl font-black">{memberStats.length} <span className="text-sm font-normal opacity-30">Members Active</span></div>
                        </div>
                     </div>

                     <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                           <span className="flex items-center gap-3"><Icon p={I.Users} size={16}/> メンバー</span>
                           <span className="text-[10px] text-slate-400">CPH / 獲得</span>
                        </div>
                        <div className="divide-y divide-slate-50 overflow-x-auto">
                           <table className="w-full text-left border-collapse min-w-[600px]">
                              <thead className="bg-slate-50/50">
                                 <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                    <th className="p-6">メンバー</th>
                                    <th className="p-6">架電</th>
                                    <th className="p-6">接続</th>
                                    <th className="p-6">資料請求</th>
                                    <th className="p-6 text-blue-600">アポ</th>
                                    <th className="p-6">CPH</th>
                                    <th className="p-6 text-right">詳細</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {memberStats.map(m => (
                                    <tr key={m.id} onClick={()=>setDrilldownMember(m)} className="hover:bg-slate-50 transition-all cursor-pointer group">
                                       <td className="p-6">
                                          <div className="flex items-center gap-4">
                                             <div className={\`w-10 h-10 rounded-xl \${m.role==='closer'?'bg-amber-400':'bg-blue-600'} text-white flex items-center justify-center font-black text-sm shadow-sm\`}>{m.name.slice(0,1)}</div>
                                             <div className="font-bold text-slate-900">{m.name}</div>
                                          </div>
                                       </td>
                                       <td className="p-6 font-bold tabular-nums text-slate-600">{m.calls}</td>
                                       <td className="p-6 font-bold tabular-nums text-slate-600">{m.picConnected}</td>
                                       <td className="p-6 font-bold tabular-nums text-slate-600">{m.requests}</td>
                                       <td className="p-6 font-black tabular-nums text-blue-600 text-lg">{m.appts}</td>
                                       <td className="p-6">
                                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg font-black tabular-nums">{m.cph} <span className="text-[8px]">c/h</span></span>
                                       </td>
                                       <td className="p-6 text-right">
                                          <div className="inline-flex p-2 bg-slate-50 rounded-xl text-slate-200 group-hover:bg-blue-600 group-hover:text-white transition-colors"><Icon p={I.ChevronRight} size={16}/></div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               )}

       {drilldownMember && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-xl">
             <div className="bg-white w-full max-w-md p-10 space-y-10 border-4 border-slate-900 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6">
                   <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl font-black">{drilldownMember.name.slice(0,1)}</div>
                     <div>
                       <h3 className="text-2xl font-black text-slate-900">{drilldownMember.name} 詳細</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{drilldownMember.role} | ¥{drilldownMember.hourlyWage.toLocaleString()}/H</p>
                     </div>
                   </div>
                   <button onClick={()=>setDrilldownMember(null)} className="p-3 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all"><Icon p={I.X}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: '架電', val: drilldownMember.calls, color: 'text-slate-900' },
                     { label: '接続', val: drilldownMember.picConnected, color: 'text-slate-900' },
                     { label: '資料請求', val: drilldownMember.requests, color: 'text-slate-900' },
                     { label: 'アポ', val: drilldownMember.appts, color: 'text-blue-600' },
                     { label: '見込み', val: drilldownMember.expectedAppts, color: 'text-emerald-600' },
                     { label: '予定時間', val: \`\${drilldownMember.scheduledHours}H\`, color: 'text-slate-400' },
                   ].map(stat => (
                      <div key={stat.label} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</div>
                         <div className={\`text-2xl font-black \${stat.color} tabular-nums\`}>{stat.val}</div>
                      </div>
                   ))}
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">内訳</h4>
                   <div className="space-y-3">
                      {[
                        { label: 'アポ', val: drilldownMember.appts || 0, color: 'bg-blue-600' },
                        { label: '資料請求', val: drilldownMember.requests || 0, color: 'bg-emerald-500' },
                        { label: '接続', val: (drilldownMember.picConnected || 0) - (drilldownMember.appts || 0) - (drilldownMember.requests || 0), color: 'bg-slate-400' },
                        { label: '受付拒否', val: drilldownMember.receptionRefusal || 0, color: 'bg-rose-400' },
                        { label: '不在 / その他', val: (drilldownMember.calls || 0) - (drilldownMember.picConnected || 0) - (drilldownMember.receptionRefusal || 0), color: 'bg-slate-100' },
                      ].map(item => {
                         const safeVal = Math.max(0, item.val);
                         const safeCalls = Math.max(1, drilldownMember.calls || 1);
                         const p = Math.max(0, Math.min(100, (safeVal / safeCalls) * 100));
                         if (safeVal <= 0 && item.label !== 'アポ') return null;
                         return (
                            <div key={item.label} className="space-y-1">
                               <div className="flex justify-between text-[9px] font-bold">
                                  <span className="text-slate-500">{item.label}</span>
                                  <span className="text-slate-900">{safeVal}件 ({p.toFixed(1)}%)</span>
                               </div>
                               <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                  <div className={\`h-full \${item.color} transition-all duration-1000\`} style={{ width: \`\${p}%\` }}></div>
                                </div>
                            </div>
                         );
                      })}
                   </div>
                </div>

                <div className="bg-slate-900 p-8 text-white relative rounded-[2rem] overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5"><Icon p={I.Zap} size={80} /></div>
                   <h4 className="text-[10px] font-bold text-white uppercase mb-4 tracking-widest">アドバイザー</h4>
                   <div className="text-sm leading-relaxed font-bold">
                      {getAIAdvice({
                        calls: drilldownMember.calls,
                        appts: drilldownMember.appts,
                        picConnected: drilldownMember.picConnected
                      }, true)}
                   </div>
                </div>

                {gasData && (
                   <div className="pt-6 border-t-2 border-slate-100">
                      <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Icon p={I.Zap} size={20} className="text-blue-600"/> 同期データ</h4>
                      <GasSyncDataView gasData={gasData} members={members} forcedMemberId={drilldownMember.id} hideHeader={true} onEditGasRecord={onEditGasRecord} onDeleteGasRecord={onDeleteGasRecord} />
                   </div>
                )}
                <button onClick={()=>setDrilldownMember(null)} className="w-full bg-slate-900 text-white py-5 font-black rounded-[2rem] shadow-xl hover:bg-black transition-all">閉じる</button>
             </div>
          </div>
       )}

       {editingGoal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 p-4">
             <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
                <h3 className="text-xl font-bold">目標設定</h3>
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">目標獲得</label>
                   <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-2xl outline-none rounded-xl" defaultValue={editingGoal.appts} id="new-indiv-goal" />
                </div>
                <button onClick={()=>{
                   const val = Number(document.getElementById('new-indiv-goal').value);
                   onUpdateGoal(getMondayKey(currentBaseDate), currentMember.id, { ...activeIndivGoals, appts: val });
                   setEditingGoal(null);
                }} className="w-full bg-slate-900 text-white py-4 font-bold shadow-lg rounded-2xl">保存</button>
                <button onClick={()=>setEditingGoal(null)} className="w-full text-slate-400 text-sm font-bold pt-4">キャンセル</button>
             </div>
          </div>
       )}

       {gasData && (
          <div className="mt-16 pt-16 border-t border-slate-200 border-dashed">
             <GasSyncDataView gasData={gasData} members={members} forcedMemberId={viewMode === 'personal' ? currentMember?.id : null} onEditGasRecord={onEditGasRecord} onDeleteGasRecord={onDeleteGasRecord} />
          </div>
       )}
    </div>
  );
};`;

replaceBlock(/const Dashboard = \(stats[\s\S]+?\r?\n\};/g, dashboardCode) || 
replaceBlock(/const Dashboard = \(\{ event[\s\S]+?\r?\n\};/g, dashboardCode);

// 2. Restore AttendanceView
const attendanceViewCode = `const AttendanceView = ({ members, reports, onEdit }) => {
  const [selectedMonth, setSelectedMonth] = useState(toLocalMonthString(new Date()));
  const [selectedMemberId, setSelectedMemberId] = useState('all');

  const fReports = useMemo(() => reports.filter(r => {
    if (!r.date) return false;
    const dateMatch = toLocalMonthString(r.date.toDate ? r.date.toDate() : new Date(r.date)) === selectedMonth;
    const memberMatch = selectedMemberId === 'all' || r.memberId === selectedMemberId;
    return dateMatch && memberMatch;
  }).sort((a,b)=> (b.date.seconds || new Date(b.date).getTime()/1000) - (a.date.seconds || new Date(a.date).getTime()/1000)), [reports, selectedMonth, selectedMemberId]);

  const totalH = fReports.reduce((s, r)=>s+(Number(r.hours)||0), 0);
  const totalCost = fReports.reduce((s, r) => {
    const m = members.find(mem => mem.id === r.memberId);
    return s + (Number(r.hours)||0) * (Number(m?.hourlyWage)||1500);
  }, 0);

  const memberSummary = useMemo(() => {
    const allReports = reports.filter(r => r.date && toLocalMonthString(r.date.toDate ? r.date.toDate() : new Date(r.date)) === selectedMonth);
    return members.map(m => {
      const mReports = allReports.filter(r => r.memberId === m.id);
      const hours = mReports.reduce((s,r)=>s+(Number(r.hours)||0), 0);
      const cost = hours * (Number(m.hourlyWage)||1500);
      return { ...m, hours, cost };
    }).filter(m => m.hours > 0).sort((a,b)=>b.cost-a.cost);
  }, [members, reports, selectedMonth]);

  return (
    <div className="space-y-6 pb-24 font-sans">
       <div className="flex flex-col gap-3 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-3">勤怠実績</h2>
            <input type="month" className="bg-white border border-slate-300 p-2 font-bold text-sm outline-none rounded-xl" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setSelectedMemberId('all')} className={\`px-4 py-2 rounded-xl text-xs font-bold border transition-all \${selectedMemberId==='all'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}\`}>全体</button>
            {members.map(m => (
              <button key={m.id} onClick={()=>setSelectedMemberId(m.id)} className={\`px-4 py-2 rounded-xl text-xs font-bold border transition-all \${selectedMemberId===m.id?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500 border-slate-200'}\`}>{m.name}</button>
            ))}
          </div>
       </div>

       <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 p-6 text-white rounded-2xl">
             <span className="font-bold opacity-60 text-[10px] block mb-1">合計稼働時間</span>
             <span className="text-3xl font-black">{totalH}<span className="text-sm opacity-30 ml-1">H</span></span>
          </div>
          <div className="bg-white border border-slate-200 p-6 rounded-2xl">
             <span className="font-bold text-slate-400 text-[10px] block mb-1">合計報酬額</span>
             <span className="text-2xl font-black">¥{totalCost.toLocaleString()}</span>
          </div>
       </div>

       {selectedMemberId === 'all' && memberSummary.length > 0 && (
         <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
           <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest">メンバー</div>
           {memberSummary.map(m => (
             <div key={m.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center font-bold text-xs rounded-full">{m.name.slice(0,1)}</div>
                 <span className="font-bold text-slate-800 text-sm">{m.name}</span>
               </div>
               <div className="flex items-center gap-4 text-right">
                 <span className="text-xs font-bold text-slate-400">{m.hours}H</span>
                 <span className="font-black text-slate-900 text-sm">¥{m.cost.toLocaleString()}</span>
               </div>
             </div>
           ))}
         </div>
       )}

       <div className="space-y-px bg-slate-200 border border-slate-200 shadow-md rounded-3xl overflow-hidden">
          {fReports.map(r => {
            const m = members.find(mem=>mem.id===r.memberId);
            return (
              <button key={r.id} onClick={()=>onEdit(r)} className="w-full bg-white p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center font-bold text-xs rounded-full">{m?.name?.slice(0,1)}</div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400">{r.date ? toLocalDateString(r.date.toDate ? r.date.toDate() : (r.date.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date))) : "---"}</span>
                        <span className="font-bold text-slate-800 text-sm">{m?.name || '不明'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-slate-400">¥{((Number(r.hours)||0) * (Number(m?.hourlyWage)||1500)).toLocaleString()}</span>
                    <span className="text-xl font-black text-slate-900">{r.hours}<span className="text-xs opacity-20 ml-0.5">H</span></span>
                </div>
              </button>
            );
          })}
          {fReports.length === 0 && <div className="py-12 text-center text-slate-400 font-bold text-sm bg-white">データがありません</div>}
       </div>
    </div>
  );
};`;

replaceBlock(/const AttendanceView = \(\{ members[\s\S]+?\r?\n\};/g, attendanceViewCode);

// 3. Restore InputModal
const inputModalCode = `function InputModal({ members, onAdd, onUpdate, onDelete, onClose, initialData = null }) {
  const [val, setVal] = useState({ memberId: '', date: toLocalDateString(new Date()), calls: '', appts: '', requests: '', hours: '', picConnected: '', noAnswer: '', receptionRefusal: '', picAbsent: '' });
  
  useEffect(() => { 
    if (initialData) { 
      const d = initialData.date?.toDate ? initialData.date.toDate() : new Date(initialData.date); 
      setVal({ ...initialData, date: toLocalDateString(d) }); 
    } 
  }, [initialData]);

  const submit = (e) => { 
    e.preventDefault(); 
    if (!val.memberId) return alert("メンバーを選択してください"); 
    const d = { 
      ...val, 
      calls: Number(val.calls), 
      appts: Number(val.appts), 
      requests: Number(val.requests), 
      hours: Number(val.hours), 
      picConnected: Number(val.picConnected), 
      noAnswer: Number(val.noAnswer), 
      receptionRefusal: Number(val.receptionRefusal), 
      picAbsent: Number(val.picAbsent)
    }; 
    if (initialData) onUpdate(initialData.id, d); else onAdd(d); 
    onClose(); 
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[300] flex flex-col md:items-center md:justify-center p-4 backdrop-blur-sm">
       <div className="w-full h-full md:max-w-2xl md:h-auto bg-white border-4 border-slate-900 flex flex-col overflow-hidden shadow-2xl rounded-[2.5rem]">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <button type="button" onClick={onClose} className="p-3 border border-slate-200 bg-white rounded-2xl hover:bg-slate-50 transition-colors"><Icon p={I.X}/></button>
             <h2 className="font-black text-xl uppercase tracking-widest text-slate-900">{initialData ? '実績を編集' : '新規実績登録'}</h2>
             <div className="w-12"/>
          </div>
          <form onSubmit={submit} className="flex-1 overflow-y-auto p-10 space-y-10 bg-white">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">メンバー</label>
                   <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-2xl transition-all" value={val.memberId} onChange={e=>setVal({...val, memberId: e.target.value})}>
                      <option value="">選択してください</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                   </select>
                </div>
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">日付</label>
                   <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-2xl transition-all" value={val.date} onChange={e=>setVal({...val, date: e.target.value})} />
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                   { label: '架電数', field: 'calls' },
                   { label: '本人接続', field: 'picConnected' },
                   { label: 'アポ獲得', field: 'appts' },
                   { label: '資料請求', field: 'requests' },
                ].map(f => (
                   <div key={f.field} className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase">{f.label}</label>
                     <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none focus:border-blue-600 rounded-xl transition-all" value={val[f.field]} onChange={e=>setVal({...val, [f.field]: e.target.value})} />
                   </div>
                ))}
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                   { label: '受付拒否', field: 'receptionRefusal' },
                   { label: '担当者不在', field: 'picAbsent' },
                   { label: '不在/他', field: 'noAnswer' },
                   { label: '稼働時間', field: 'hours' },
                ].map(f => (
                   <div key={f.field} className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase">{f.label}</label>
                     <input type="number" step="0.5" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none focus:border-blue-600 rounded-xl transition-all" value={val[f.field]} onChange={e=>setVal({...val, [f.field]: e.target.value})} />
                   </div>
                ))}
             </div>

             <div className="pt-8 flex flex-col gap-4">
                <button type="submit" className="w-full bg-slate-900 text-white py-5 font-black text-lg shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] rounded-3xl">
                   {initialData ? '更新する' : '登録する'}
                </button>
                {initialData && (
                  <button type="button" onClick={()=>{if(window.confirm('この実績を削除しますか？')) {onDelete(initialData.id); onClose();}}} className="w-full text-rose-500 font-bold py-2 hover:bg-rose-50 rounded-xl transition-all">削除する</button>
                )}
             </div>
          </form>
       </div>
    </div>
  );
}`;

replaceBlock(/function InputModal\(\{ members[\s\S]+?\r?\n\}/g, inputModalCode);

// 4. Final Nav Cleanup
content = content.replace(/label="ダチEEEュボEチE"/g, 'label="ダッシュボード"');
content = content.replace(/label="分析"/g, 'label="分析"'); // Ensure clean
content = content.replace(/label="設宁E"/g, 'label="設定"');

fs.writeFileSync(path, content, 'utf8');
console.log("Full structural restoration complete");
