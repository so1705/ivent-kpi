const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix BREAKDOWN_LABELS
content = content.replace(/const BREAKDOWN_LABELS = \{[\s\S]+?\};/, `const BREAKDOWN_LABELS = {
  calls: "架電数",
  picConnected: "本人接続",
  requests: "資料請求",
  appts: "アポ獲得",
  receptionRefusal: "受付拒否",
  picAbsent: "担当者不在",
  noAnswer: "不在/他"
};`);

// 2. Fix metricLabels in AnalyticsView
content = content.replace(/const metricLabels = \{[\s\S]+?\};[\s\r\n]+const periodLabels/, `const metricLabels = BREAKDOWN_LABELS;
  const periodLabels`);

// 3. Improve ShiftView Bulk UI
// We use a regex that is less sensitive to exact line endings or whitespace
const bulkUITargetRegex = /<div className="flex flex-col md:flex-row items-center justify-between border-t border-rose-100 pt-6 gap-4">[\s\S]+?\{bulkSchedule\.length\} 件選択中<\/p>[\s\S]+?<\/div>[\s\S]+?<button onClick=\{handleBulkRegister\}[\s\S]+?<\/button>[\s\S]+?<\/div>/;

const bulkUIReplacement = `<div className="flex flex-col md:flex-row items-center justify-between border-t border-rose-100 pt-6 gap-4">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-100 text-rose-600 flex items-center justify-center rounded-full font-black">3</div>
                      <p className="text-sm font-bold text-rose-600">選択したすべてのシフトを一括登録します。現在 {bulkSchedule.length} 件選択中</p>
                   </div>
                   <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={()=>setBulkSchedule([])} className="px-6 py-4 bg-white border-2 border-rose-100 text-rose-400 font-bold rounded-2xl hover:bg-rose-50 transition-all">全クリア</button>
                      <button onClick={handleBulkRegister} className="flex-1 md:flex-none px-10 py-4 bg-rose-600 text-white font-black rounded-[1.5rem] shadow-xl hover:bg-rose-700 transition-all transform active:scale-95 flex items-center justify-center gap-2">
                         <Icon p={I.Check} size={20}/> 一括登録を実行する
                      </button>
                   </div>
                </div>`;

if (bulkUITargetRegex.test(content)) {
    content = content.replace(bulkUITargetRegex, bulkUIReplacement);
    console.log("Improved ShiftView Bulk UI");
} else {
    console.log("Bulk UI target NOT found by regex");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Final update complete");
