const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// The problematic component definition
const gasSyncComponent = `const GasSyncDataView = ({ gasData, members, forcedMemberId, hideHeader, onEditGasRecord, onDeleteGasRecord, initialPeriod = "本日" }) => {
  const [period, setPeriod] = useState(initialPeriod);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = gasData || [];
    if (forcedMemberId) {
      const m = members.find(mem => mem.id === forcedMemberId);
      list = list.filter(d => d.memberId === m?.spreadsheetName || d.memberId === m?.name);
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
  }, [gasData, members, forcedMemberId, search, period]);

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
           <h2 className="text-xl font-black flex items-center gap-3"><Icon p={I.Zap} size={20}/> GAS 同期データ</h2>
           <div className="flex gap-2">
              <select value={period} onChange={e=>setPeriod(e.target.value)} className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs rounded-xl outline-none shadow-sm">
                 <option value="本日">本日</option>
                 <option value="今週">今週</option>
                 <option value="全期間">全期間</option>
              </select>
              <input placeholder="検索..." value={search} onChange={e=>setSearch(e.target.value)} className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs rounded-xl outline-none focus:border-slate-900 shadow-sm" />
           </div>
        </div>
      )}
      <div className="space-y-3">
        {filtered.map(d => (
          <div key={d.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div className="flex items-center gap-4">
               <div className={'w-2 h-10 rounded-full ' + (d.type === 'アポ獲得' ? 'bg-blue-600' : d.type?.includes('資料請求') ? 'bg-emerald-500' : 'bg-slate-200')}></div>
               <div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase">
                       {d.timestamp ? (d.timestamp.toDate ? d.timestamp.toDate().toLocaleString() : (d.timestamp.seconds ? new Date(d.timestamp.seconds * 1000).toLocaleString() : new Date(d.timestamp).toLocaleString())) : '---'}
                     </span>
                     <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{d.memberId}</span>
                  </div>
                  <div className="font-black text-slate-900">{d.type}</div>
                  {d.memo && <div className="text-[10px] text-slate-400 font-bold mt-1">{d.memo}</div>}
               </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => {
                 const m = prompt("メモを入力してください", d.memo || "");
                 if (m !== null) onEditGasRecord(d.id, { memo: m });
               }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Icon p={I.Edit} size={14}/></button>
               <button onClick={() => {
                 if (window.confirm("このレコードを削除しますか？")) onDeleteGasRecord(d.id);
               }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Icon p={I.Trash} size={14}/></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="py-10 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">同期データはありません</div>}
      </div>
    </div>
  );
};`;

// Regex to find the corrupted component definition
const regex = /const GasSyncDataView = [\s\S]+?同期データはありません<\/div>\}[\s\r\n]+<\/div>[\s\r\n]+<\/div>[\s\r\n]+\);\s+\};/;
// Fallback regex if characters are corrupted
const fallbackRegex = /const GasSyncDataView = [\s\S]+?<\/div>\}[\s\r\n]+<\/div>[\s\r\n]+<\/div>[\s\r\n]+\);\s+\};/;

if (regex.test(content)) {
    content = content.replace(regex, gasSyncComponent);
    console.log("Replaced corrupted GasSyncDataView (Strict)");
} else if (fallbackRegex.test(content)) {
    content = content.replace(fallbackRegex, gasSyncComponent);
    console.log("Replaced corrupted GasSyncDataView (Fallback)");
} else {
    console.log("Could NOT find component to replace");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Repair attempt complete");
