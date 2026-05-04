const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Dashboard's myReports and myTotals to include gasData
const dashboardRestore = `  const currentMember = useMemo(() => members.find(m => m.email === currentUserEmail), [members, currentUserEmail]);
  
  const myReports = useMemo(() => {
    const reps = eventReports.filter(r => r.memberId === currentMember?.id && r.eventId === event.id).map(r => ({
      ...r,
      date: r.date?.toDate ? r.date.toDate() : new Date(r.date)
    }));
    const gas = (gasData || []).filter(d => d.memberId === currentMember?.spreadsheetName || d.memberId === currentMember?.name).map(d => ({
      appts: d.type === 'アポ獲得' ? 1 : 0,
      calls: 1,
      picConnected: (d.type === 'アポ獲得' || d.type?.includes('資料請求') || d.type?.includes('接続')) ? 1 : 0,
      date: d.timestamp?.toDate ? d.timestamp.toDate() : (d.timestamp?.seconds ? new Date(d.timestamp.seconds * 1000) : new Date(d.timestamp))
    }));
    return [...reps, ...gas].sort((a,b) => a.date - b.date);
  }, [eventReports, currentMember, event, gasData]);

  const myTotals = useMemo(() => {
     return myReports.reduce((acc, r) => ({
        appts: acc.appts + (Number(r.appts) || 0),
        calls: acc.calls + (Number(r.calls) || 0),
        picConnected: acc.picConnected + (Number(r.picConnected) || 0),
        hours: acc.hours + (Number(r.hours) || 0),
     }), { appts: 0, calls: 0, picConnected: 0, hours: 0 });
  }, [myReports]);`;

content = content.replace(/const currentMember = useMemo\(\(\) => members\.find\(m => m\.email === currentUserEmail\), \[members, currentUserEmail\]\);[\s\S]+?const myTotals = useMemo\(\(\) => \{[\s\S]+?\}, \[myReports\]\);/, dashboardRestore);

// 2. Fix the chart data to use the corrected myReports dates
content = content.replace(/myReports\.slice\(-7\)\.map\(r=>\(\{ day: r\.date\.toDate \? r\.date\.toDate\(\)\.getDate\(\) : new Date\(r\.date\)\.getDate\(\), value: r\.appts \}\)\)/, "myReports.slice(-7).map(r=>({ day: r.date.getDate(), value: r.appts }))");

// 3. Global label polish to fix any remaining encoding artifacts (Korean-looking chars)
const labelsToFix = [
  { from: /直近の稼働状況/g, to: "直近の稼働状況" },
  { from: /データがありません/g, to: "データがありません" },
  { from: /分析ダッシュボード/g, to: "分析ダッシュボード" },
  { from: /チーム全体の目標達成/g, to: "チーム全体の目標達成" },
  { from: /実績データ/g, to: "実績データ" },
  { from: /同期日時/g, to: "同期日時" },
  { from: /着地予測/g, to: "着地予測" },
  { from: /稼働効率/g, to: "稼働効率" },
  { from: /AIアドバイス/g, to: "AIアドバイス" },
  { from: /メンバー詳細/g, to: "メンバー詳細" },
  { from: /本人接続/g, to: "本人接続" },
  { from: /架電数/g, to: "架電数" },
  { from: /資料請求/g, to: "資料請求" },
  { from: /アポ獲得/g, to: "アポ獲得" }
];

labelsToFix.forEach(l => {
  content = content.split(l.from).join(l.to); // Using split/join to avoid regex literal issues with multi-byte
});

// 4. Specifically check for "Korean characters" artifacts in Chart and Dashboard
// Sometimes "データ" becomes "チEEEタ" or similar. I'll clean those specifically.
content = content.replace(/チEEEタ/g, 'データ');
content = content.replace(/チEEム/g, 'チーム');
content = content.replace(/効玁E/g, '効率');
content = content.replace(/設宁E/g, '設定');

fs.writeFileSync(path, content, 'utf8');
console.log("AI Advice and Label Polish complete");
