import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, 
  GoogleAuthProvider, signInWithPopup, signOut 
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, setDoc, 
  deleteDoc, Timestamp, updateDoc 
} from 'firebase/firestore';

// ==========================================
// 1. 髫�E�E�E�・�E�E�E�陞ｳ繝ｻ& 郢晏�E�E�E��E�E�E�晉�E�E�昜ｻ�E�E�E�繝ｻ鬮�E�E�E�・�E�E�E�隰�E�E�E�・�E�E�E�
// ==========================================
const appId = 'tele-apo-manager-v42-date-nav';
const ADMIN_EMAIL = 'sotaro50017@gmail.com'; 

// Helper: Color coding based on targets
const getStatusColor = (val, tgt) => {
  if (!tgt || tgt === 0) return 'text-slate-900';
  return val >= tgt ? 'text-emerald-700' : 'text-rose-600';
};
const getStatusBg = (val, tgt) => {
  if (!tgt || tgt === 0) return 'bg-slate-50 border-slate-200';
  return val >= tgt ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
};

const firebaseConfig = {
  apiKey: "AIzaSyBnvOnuKhldjHQGGpKSpI4TGo4a74_eaj0",
  authDomain: "ivent-kpi.firebaseapp.com",
  projectId: "ivent-kpi",
  storageBucket: "ivent-kpi.firebasestorage.app",
  messagingSenderId: "176584893312",
  appId: "1:176584893312:web:2e431cafad47d8cada1765",
  measurementId: "G-7MMNJREWJ9"
};

let db = null;
let auth = null;
let isOffline = false;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    isOffline = true;
  }
} catch (e) {
  console.error("Firebase Init Failed", e);
  isOffline = true;
}


const getWeekRange = (baseDate) => {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { start, end };
};

const toLocalDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalMonthString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const parseTime = (t) => {
  if (!t || typeof t !== "string" || !t.includes(":")) return [0, 0];
  return t.split(":").map(Number);
};

const GasSyncDataView = ({ gasData, members, forcedMemberId, hideHeader, onEditGasRecord, onDeleteGasRecord, initialPeriod = "本日" }) => {
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
};

const getMondayKey = (dateObj) => {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toLocalDateString(monday);
};

// ==========================================
// 2. Icons & Shared UI Data
// ==========================================
const I = {
  Target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  Users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  Phone: <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>,
  Plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  Chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  Settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  Check: <><polyline points="20 6 9 17 4 12"/></>,
  Trophy: <><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10"/><path d="M17 4v7a5 5 0 0 1-10 0V4"/></>,
  Briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  Clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  X: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  Trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  WifiOff: <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  Calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  ChevronDown: <><polyline points="6 9 12 15 18 9"/></>,
  ChevronLeft: <><polyline points="15 18 9 12 15 6"/></>,
  ChevronRight: <><polyline points="9 18 15 12 9 6"/></>,
  Help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  Ban: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>,
  FileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  Download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  Grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
  Zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  TrendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  PieChart: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
  LogOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  Info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  User: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  Search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  Edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
};

const BREAKDOWN_LABELS = {
  calls: "架電数",
  picConnected: "本人接続",
  requests: "資料請求",
  appts: "アポ獲得",
  receptionRefusal: "受付拒否",
  picAbsent: "担当者不在",
  noAnswer: "不在/他"
};

// ==========================================
// 3. UI Components (Atomic Components)
// ==========================================
const Icon = ({ p, size=24, color="currentColor", className="", strokeWidth=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="square" className={className}>
    {p}
  </svg>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active ? 'text-blue-600 border-t-2 border-blue-600' : 'text-slate-300'}`}>
    <Icon p={icon} size={20} />
    <span className={`text-[9px] font-bold mt-1 ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

const getAIAdvice = (stats, isPersonal) => {
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
};



const MetricBar = ({ label, val, tgt, onHelp }) => {
  const p = Math.min((val / (tgt || 1)) * 100, 100);
  const isOk = val >= (tgt || 0);
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
          {label}
          {onHelp && <button onClick={onHelp} className="text-slate-300 hover:text-blue-600 transition-colors"><Icon p={I.Help} size={12}/></button>}
        </span>
        <span className={`text-sm font-black ${isOk ? 'text-emerald-600' : 'text-blue-600'}`}>
          {val.toLocaleString()} <span className="text-slate-300 font-normal">/ {(tgt||0).toLocaleString()}</span>
        </span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
        <div className={`h-full transition-all duration-1000 ${isOk ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${p}%` }}></div>
      </div>
    </div>
  );
};

const MainMetric = ({ label, icon, current, target }) => {
  const p = Math.min((current / (target || 1)) * 100, 100);
  const isOk = current >= (target || 0);
  return (
    <div className={`p-8 rounded-[2rem] border border-slate-100 bg-white flex flex-col gap-6 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl`}>
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg"><Icon p={icon} size={20}/></div>
             <span className="text-sm font-bold text-slate-900">{label}</span>
          </div>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{isOk ? '達�E' : '目標まで'}</span>
       </div>
       <div className="flex items-end justify-between pt-2">
          <div className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">
            {current.toLocaleString()}
            <span className="text-base font-normal text-slate-300 ml-2">/ {target.toLocaleString()}</span>
          </div>
          <div className={`text-2xl font-black ${isOk ? 'text-emerald-500' : 'text-blue-500'} leading-none`}>{p.toFixed(0)}%</div>
       </div>
       <div className="absolute bottom-0 left-0 h-1.5 bg-slate-50 w-full">
          <div className={`h-full transition-all duration-1000 ${isOk ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${p}%` }}></div>
       </div>
    </div>
  );
};

const CustomChart = ({ data, color, type = 'area' }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">チE�E�Eタがありません</div>;
  const len = data.length - 1 || 1;
  const max = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => `${(i / len) * 100},${100 - (d.value / max) * 100}`).join(' ');
  const areaPoints = `0,100 ${points} 100,100`;

  return (
    <div className="w-full h-full relative flex flex-col pl-4 pb-2">
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-400 tracking-widest">獲得</div>
      <div className="flex-1 relative flex">
        <div className="w-6 flex flex-col justify-between text-[10px] font-bold text-slate-400 pb-1 pr-2 text-right">
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="flex-1 relative border-b-2 border-l-2 border-slate-200">
          <div className="absolute inset-0 flex justify-between">
            {[...Array(5)].map((_, i) => <div key={i} className="w-px h-full bg-slate-100 opacity-50" />)}
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 z-10 overflow-visible">
            {type === 'area' && <polygon fill={`${color}15`} points={areaPoints} />}
            <polyline fill="none" stroke={color} strokeWidth={type === 'line' ? "3" : "2"} strokeLinejoin="round" points={points} vectorEffect="non-scaling-stroke" />
            {data.map((d, i) => (
              <circle key={i} cx={(i / len) * 100} cy={100 - (d.value / max) * 100} r="1.5" fill="white" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </div>
      </div>
      <div className="ml-6 mt-2 relative h-4">
        {data.map((d, i) => {
           const isShow = data.length <= 7 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length/5) === 0;
           return (
             <span key={i} className={`text-[9px] font-bold uppercase whitespace-nowrap absolute transform -translate-x-1/2 ${i===data.length-1?'text-blue-600':'text-slate-400'}`} style={{ left: `${(i/len)*100}%`, opacity: isShow ? 1 : 0 }}>
               {d.day}
             </span>
           );
        })}
      </div>
      <div className="text-center text-[10px] font-bold text-slate-400 tracking-widest mt-1">経過日数</div>
    </div>
  );
};

const Dashboard = ({ event, totals, memberStats, eventReports, members, currentBaseDate, setCurrentBaseDate, userRole, currentUserEmail, onUpdateGoal, gasData, onEditGasRecord, onDeleteGasRecord }) => {
  const [drilldownMember, setDrilldownMember] = useState(null);
  const [viewMode, setViewMode] = useState('personal'); 
  const [editingGoal, setEditingGoal] = useState(null);

    const currentMember = useMemo(() => members.find(m => m.email === currentUserEmail), [members, currentUserEmail]);
  
  const myReports = useMemo(() => {
    const reps = eventReports.filter(r => r.memberId === currentMember?.id && r.eventId === event.id).map(r => ({
      ...r,
      date: r.date?.toDate ? r.date.toDate() : new Date(r.date)
    }));
        const gas = (gasData || []).filter(d => d.memberId === currentMember?.spreadsheetName || d.memberId === currentMember?.name).map(d => ({
      appts: d.type === 'アポ確定' ? 1 : 0,
      calls: 1,
      picConnected: (d.type === 'アポ確定' || d.type?.startsWith('資料送付予定') || d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電')) ? 1 : 0,
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
             <button onClick={()=>setViewMode('personal')} className={`px-8 py-3 text-xs font-bold transition-all rounded-xl ${viewMode==='personal'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>{userRole === 'admin' ? '管理者データ' : 'マイデータ'}</button>
             <button onClick={()=>setViewMode('team')} className={`px-8 py-3 text-xs font-bold transition-all rounded-xl ${viewMode==='team'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>チーム全体</button>
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
                              <MetricBar label="獲得" val={myTotals.appts} tgt={memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 0} onHelp={()=>setShowHelp(true)} />
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
                             <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div> 稼働効率 <button onClick={()=>setShowHelp(true)} className="text-slate-300 hover:text-blue-600"><Icon p={I.Help} size={14}/></button>
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
                              <CustomChart data={myReports.slice(-7).map(r=>({ day: r.date.getDate(), value: r.appts }))} color="#2563eb" />
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
                                             <div className={`w-10 h-10 rounded-xl ${m.role==='closer'?'bg-amber-400':'bg-blue-600'} text-white flex items-center justify-center font-black text-sm shadow-sm`}>{m.name.slice(0,1)}</div>
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
                     { label: '予定時間', val: `${drilldownMember.scheduledHours}H`, color: 'text-slate-400' },
                   ].map(stat => (
                      <div key={stat.label} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</div>
                         <div className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.val}</div>
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
                                  <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${p}%` }}></div>
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
};


const AttendanceView = ({ members, reports, onEdit }) => {
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
            <button onClick={()=>setSelectedMemberId('all')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedMemberId==='all'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>全体</button>
            {members.map(m => (
              <button key={m.id} onClick={()=>setSelectedMemberId(m.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedMemberId===m.id?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500 border-slate-200'}`}>{m.name}</button>
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
};


const ShiftView = ({ members, shifts, onAddShift, onDeleteShift, userRole, myMemberId }) => {
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
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
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
    if (window.confirm(`${mName}さんのシフト${bulkSchedule.length}件を一括登録しますか？`)) {
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
                  className={`px-4 py-2 text-[10px] font-black rounded-full transition-all flex items-center gap-2 ${bulkMode ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {bulkMode ? <><Icon p={I.X} size={14}/> モード解除</> : <><Icon p={I.Zap} size={14}/> 一括登録モード</>}
                </button>
              )}
            </div>
            {!bulkMode && (
              <div className="flex bg-slate-200 p-1 rounded-full">
                 <button onClick={()=>setViewMode('day')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='day'?'bg-slate-900 text-white':'text-slate-500'}`}>日次</button>
                 <button onClick={()=>setViewMode('week')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='week'?'bg-slate-900 text-white':'text-slate-500'}`}>週次</button>
                 <button onClick={()=>setViewMode('month')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='month'?'bg-slate-900 text-white':'text-slate-500'}`}>月次</button>
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
                            className={`px-4 py-3 text-xs font-bold rounded-2xl border-2 transition-all ${bulkMemberId === m.id ? 'bg-rose-500 border-rose-500 text-white shadow-lg scale-105' : 'bg-white border-rose-100 text-rose-400 hover:border-rose-200'}`}
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
                    <div key={d} className={`bg-slate-50/50 p-4 text-center text-xs font-black uppercase ${i===0?'text-rose-500':i===6?'text-blue-500':'text-slate-400'}`}>{d}</div>
                 ))}
                 {calendarData.map((d, i) => {
                   if (!d) return <div key={`empty-${i}`} className="bg-white aspect-[4/3]" />;
                   const dayShifts = displayShifts.filter(s => s.date === d);
                   const isSelected = bulkMode ? bulkSchedule.some(s=>s.date===d) : d === selectedDate;
                   const isToday = d === toLocalDateString(new Date());
                   return (
                     <button 
                       key={d} 
                       onClick={() => bulkMode ? handleBulkToggleDate(d) : setSelectedDate(d)} 
                       className={`bg-white aspect-[4/3] p-2 flex flex-col items-start justify-start transition-all relative border-t border-l border-slate-50 hover:bg-blue-50 group ${isSelected ? (bulkMode ? 'ring-4 ring-inset ring-rose-500 z-10 bg-rose-50/20' : 'ring-2 ring-inset ring-blue-600 z-10 bg-blue-50/30') : ''}`}
                     >
                       <span className={`text-sm font-black mb-1 ${isSelected ? (bulkMode ? 'text-rose-600' : 'text-blue-600') : isToday ? 'bg-blue-600 text-white px-2 rounded-full' : ''}`}>{d.split('-')[2]}</span>
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
                      <button key={m.id} onClick={()=>{setSelectedMemberId(m.id);}} className={`px-4 py-2 border font-bold text-xs transition-all rounded-full ${selectedMemberId===m.id?'bg-slate-900 text-white':'border-slate-200 hover:bg-slate-50'}`}>{m.name}</button>
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
};


const METRIC_HELP = {
  CPH: 'CPH (Calls Per Hour): 1時間あたりの架電効率',
  接続率: '接続率 = 本人接続 / 架電。担当者に繋がった割合。リストの質や架電時間の有効性を示します。',
  アポ率: 'アポ率 = アポ獲得 / 本人接続。接続した際のアポ打診の成功率。トークスキルやニーズ喚起力を示します。',
  獲得: '今週の個人アポ獲得実績です。',
  見込み: '見込み = 現在のペース・効率と残りの予定時間から算出した、週次着地予測値です。',
  本人接続: '架電して本人（または担当者）に繋がった件数。不在や受付拒否を除いた、対話ができた数です。',
};

const MetricHelpModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <h3 className="font-black text-lg flex items-center gap-3"><Icon p={I.Help} size={20} color="white"/> 持E�E��E��E�E解説</h3>
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
);

const AnalyticsView = ({ members, reports, gasData, event, userRole }) => {
  const [selectedMid, setSelectedMid] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [chartMetric, setChartMetric] = useState('appts');
  const [periodMode, setPeriodMode] = useState('daily');
  const [showHelp, setShowHelp] = useState(false);

  const mergedData = useMemo(() => {
    // Manual reports
    const repList = reports.filter(r => !r.eventId || r.eventId === event?.id).map(r => ({
      ...r,
      date: r.date?.toDate ? r.date.toDate() : new Date(r.date)
    }));

    // GAS Data mapped to report format
        const gasList = (gasData || []).map(d => {
      const dt = d.timestamp?.toDate ? d.timestamp.toDate() : (d.timestamp?.seconds ? new Date(d.timestamp.seconds * 1000) : new Date(d.timestamp));
      const m = members.find(mem => mem.spreadsheetName === d.memberId || mem.name === d.memberId);
      return {
        memberId: m?.id || d.memberId,
        date: dt,
        appts: d.type === 'アポ確定' ? 1 : 0,
        requests: d.type?.startsWith('資料送付予定') ? 1 : 0,
        calls: 1,
        picConnected: (d.type === 'アポ確定' || d.type?.startsWith('資料送付予定') || d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電')) ? 1 : 0,
        hours: 0
      };
    });

    const combined = [...repList, ...gasList];
    return combined.filter(r => {
      if (selectedMid === 'all') return true;
      return r.memberId === selectedMid;
    });
  }, [reports, gasData, members, event, selectedMid]);

  const stats = useMemo(() => {
    return mergedData.reduce((acc, r)=>({
      calls: acc.calls+(Number(r.calls)||0),
      appts: acc.appts+(Number(r.appts)||0),
      requests: acc.requests+(Number(r.requests)||0),
      picConnected: acc.picConnected+(Number(r.picConnected)||0),
    }), { calls: 0, appts: 0, requests: 0, picConnected: 0 });
  }, [mergedData]);

  const trendData = useMemo(() => {
    const map = {};
    mergedData.forEach(r => {
      if (!r.date) return;
      const dateObj = r.date;
      let key = '';
      if (periodMode === 'daily') key = toLocalDateString(dateObj).slice(-5);
      else if (periodMode === 'weekly') key = getMondayKey(dateObj).slice(5).replace('-', '/');
      else if (periodMode === 'monthly') key = `${dateObj.getMonth()+1}月`;
      else key = `${dateObj.getFullYear()}年`;
      map[key] = (map[key] || 0) + (Number(r[chartMetric]) || 0);
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b)=>a.day.localeCompare(b.day));
  }, [mergedData, chartMetric, periodMode]);

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
                   <button key={p} onClick={()=>setPeriodMode(p)} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${periodMode===p?'bg-slate-900 text-white':'text-slate-400'}`}>{periodLabels[p]}</button>
                 ))}
               </div>
               <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                 <button onClick={()=>setChartType('line')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${chartType==='line'?'bg-blue-600 text-white':'text-slate-400'}`}>折れ線</button>
                 <button onClick={()=>setChartType('area')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${chartType==='area'?'bg-blue-600 text-white':'text-slate-400'}`}>エリア</button>
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
              <MetricBar label="接続率 (架電あたり)" val={stats.picConnected} tgt={stats.calls} onHelp={()=>setShowHelp(true)} />
              <MetricBar label="アポ率 (本人接続あたり)" val={stats.appts} tgt={stats.picConnected} onHelp={()=>setShowHelp(true)} />
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
};


const Settings = ({ events, currentEventId, members, onAddEvent, onDeleteEvent, onAddMember, onDelMember, onUpdateMember, onUpdateGoal, currentBaseDate, onClose }) => {
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
        body: JSON.stringify({ action: 'sync', appId: appId, legacyAppId: legacyAppId })
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

                          <h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-600 pl-3 mt-12">目標・評価基準の詳細設定</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-6 shadow-sm rounded-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">週間アポイント獲得目標 (件)</label>
                      <input type="number" id="goal-appts" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.appts} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">週間総架電目標 (回)</label>
                      <input type="number" id="goal-calls" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.calls || 1000} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">本人接続時アポイント率目標 (%)</label>
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
                         <div className={`w-10 h-10 flex items-center justify-center font-bold text-white rounded-full ${m.role==='admin'?'bg-slate-900':'bg-slate-400'}`}>{m.name?.slice(0,1) || '?'}</div>
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
};


function InputModal({ members, onAdd, onUpdate, onDelete, onClose, initialData = null }) {
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
}

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('apo');
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [reports, setReports] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [gasData, setGasData] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showHelp, setShowHelp] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("loading"); // loading, authenticated, unauthenticated, offline
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date());

  useEffect(() => {
    if (isOffline) {
      setConnectionStatus("offline");
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setUserRole(u.email === ADMIN_EMAIL ? 'admin' : 'apo');
        setConnectionStatus("authenticated");
      } else {
        setConnectionStatus("unauthenticated");
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(list);
      if (list.length > 0 && !currentEventId) setCurrentEventId(list[0].id);
    });
    const unsubMembers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubReports = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubShifts = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'shifts'), (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubGas = onSnapshot(collection(db, 'kpi_sync'), (snap) => {
      setGasData(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>b.timestamp?.seconds - a.timestamp?.seconds));
    });
    return () => { unsubEvents(); unsubMembers(); unsubReports(); unsubShifts(); unsubGas(); };
  }, []);

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleLogout = () => signOut(auth);

  const addEvent = (name) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { name, goals: { weekly: { appts: 0 } } });
  const deleteEvent = (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
  const updateEventGoals = (id, goals) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), { goals });
  const updateEventWeeklyGoals = (eventId, mondayKey, goals) => {
     updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId), { [`weeklyGoals.${mondayKey}`]: goals });
  };
  const handleUpdateGoal = (mondayKey, memberId, goalObj) => {
    if (memberId) {
       updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', currentEventId), { [`individualWeeklyGoals.${mondayKey}.${memberId}`]: goalObj });
    } else {
       updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', currentEventId), { [`weeklyGoals.${mondayKey}`]: goalObj });
    }
  };

  const addMember = (name, role, wage, email, spreadsheetName) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), { name, role, hourlyWage: Number(wage), email, spreadsheetName });
  const deleteMember = (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id));
  const updateMember = (id, data) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), data);

  const addReport = (data) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { ...data, eventId: currentEventId, createdAt: Timestamp.now() });
  const updateReport = (id, data) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', id), data);
  const deleteReport = (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', id));

  const updateGasRecord = (id, data) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gas_sync', id), data);
  const deleteGasRecord = (id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gas_sync', id));

  const currentEvent = useMemo(() => events.find(e => e.id === currentEventId) || { name: '読み込み中...', goals: { weekly: { appts: 0 } } }, [events, currentEventId]);
  const currentMember = useMemo(() => members.find(m => m.email === user?.email), [members, user]);

    const totals = useMemo(() => {
    const wr = getWeekRange(currentBaseDate);
    
    const sum = (list) => list.reduce((acc, r) => ({
      appts: acc.appts + (Number(r.appts)||0),
      calls: acc.calls + (Number(r.calls)||0),
      requests: acc.requests + (Number(r.requests)||0),
      picConnected: acc.picConnected + (Number(r.picConnected)||0),
    }), { appts: 0, calls: 0, requests: 0, picConnected: 0 });

        const sumGas = (arr) => arr.reduce((acc, d) => {
      acc.calls += 1;
      if (d.type === 'アポ確定') { acc.appts += 1; acc.picConnected += 1; }
      else if (d.type?.startsWith('資料送付予定')) { acc.requests += 1; acc.picConnected += 1; }
      else if (d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電') || d.type === '営業時間外') { acc.picAbsent += 1; acc.picConnected += 1; }
      else if (d.type === '受付拒否') { acc.receptionRefusal += 1; }
      else if (d.type === '担当者拒否') { /* out of target usually not in simple totals */ }
      else if (d.type === '本人接続' || d.type?.includes('接続') || d.type?.includes('通話')) { acc.picConnected += 1; }
      return acc;
    }, { appts: 0, calls: 0, requests: 0, picConnected: 0, picAbsent: 0, receptionRefusal: 0 });

    const wD = reports.filter(r => {
      if (!r.date) return false; 
      const d = r.date.toDate ? r.date.toDate() : (r.date.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date));
      return r.eventId === currentEventId && d >= wr.start && d <= wr.end;
    });
    const s = sum(wD);
    
    const wG = gasData.filter(d => {
       if (!d.timestamp) return false; 
       const dt = d.timestamp.toDate ? d.timestamp.toDate() : (d.timestamp.seconds ? new Date(d.timestamp.seconds * 1000) : new Date(d.timestamp));
       return dt >= wr.start && dt <= wr.end;
    });
    const gWs = sumGas(wG);
    
    s.appts += gWs.appts; s.calls += gWs.calls; s.requests += gWs.requests; s.picConnected += gWs.picConnected;

    const tD = reports.filter(r => r.eventId === currentEventId);
    const t = sum(tD);
    const gTs = sumGas(gasData);
    t.appts += gTs.appts; t.calls += gTs.calls; t.requests += gTs.requests; t.picConnected += gTs.picConnected;

    const weekShifts = shifts.filter(sh => {
      const d = new Date(sh.date);
      return d >= wr.start && d <= wr.end;
    });
    const totalScheduledHours = weekShifts.reduce((acc, sh) => {
      if (!sh.startTime || typeof sh.startTime !== "string") return acc; const [h1, m1] = sh.startTime.split(":").map(Number);
      if (!sh.endTime || typeof sh.endTime !== "string") return acc; const [h2, m2] = sh.endTime.split(":").map(Number);
      return acc + (h2 + m2/60) - (h1 + m1/60);
    }, 0);

    return { weekly: s, total: t, totalScheduledHours };
  }, [reports, currentEventId, currentBaseDate, shifts, gasData]);

    const memberStats = useMemo(() => {
    const wr = getWeekRange(currentBaseDate);
    const activeWeeklyGoals = currentEvent.weeklyGoals?.[getMondayKey(currentBaseDate)] || currentEvent.goals?.weekly || {};
    const uniformGoal = members.length > 0 ? Math.ceil(activeWeeklyGoals.appts / members.length) : 0;

    return members.map(m => {
      const myReps = reports.filter(r => r.memberId === m.id && r.eventId === currentEventId);
      const myTot = myReps.reduce((acc, r) => ({
        appts: acc.appts + (Number(r.appts)||0),
        calls: acc.calls + (Number(r.calls)||0),
        requests: acc.requests + (Number(r.requests)||0),
        hours: acc.hours + (Number(r.hours)||0),
        picConnected: acc.picConnected + (Number(r.picConnected)||0),
        noAnswer: acc.noAnswer + (Number(r.noAnswer)||0),
        receptionRefusal: acc.receptionRefusal + (Number(r.receptionRefusal)||0),
        picAbsent: acc.picAbsent + (Number(r.picAbsent)||0),
      }), { appts: 0, calls: 0, requests: 0, hours: 0, picConnected: 0, noAnswer: 0, receptionRefusal: 0, picAbsent: 0 });
      
            gasData.filter(d => d.memberId === m.spreadsheetName || d.memberId === m.name).forEach(d => {
        myTot.calls += 1;
        if (d.type === 'アポ確定') { myTot.appts += 1; myTot.picConnected += 1; }
        else if (d.type?.startsWith('資料送付予定')) { myTot.requests += 1; myTot.picConnected += 1; }
        else if (d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電') || d.type === '営業時間外') { myTot.picAbsent += 1; myTot.picConnected += 1; }
        else if (d.type === '受付拒否') { myTot.receptionRefusal += 1; }
        else if (d.type === '担当者拒否') { myTot.picAbsent += 1; /* mapping as absent/lost */ }
        else { myTot.picConnected += 1; }
      });

      const cph = myTot.hours > 0 ? (myTot.calls / myTot.hours).toFixed(1) : "0.0";
      const myWeekShifts = shifts.filter(sh => {
        const d = new Date(sh.date);
        return sh.memberId === m.id && d >= wr.start && d <= wr.end;
      });
      const scheduledHours = myWeekShifts.reduce((acc, sh) => {
        if (!sh.startTime || typeof sh.startTime !== "string") return acc; const [h1, m1] = sh.startTime.split(":").map(Number);
        if (!sh.endTime || typeof sh.endTime !== "string") return acc; const [h2, m2] = sh.endTime.split(":").map(Number);
        return acc + (h2 + m2/60) - (h1 + m1/60);
      }, 0);

      const apptRatePerHour = myTot.hours > 0 ? (myTot.appts / myTot.hours) : 0.05; 
      const expectedAppts = (apptRatePerHour * scheduledHours).toFixed(1);

      return { ...m, ...myTot, cph, scheduledHours, expectedAppts, uniformGoal };
    }).sort((a,b) => b.cph - a.cph);
  }, [members, reports, currentEventId, shifts, currentEvent, currentBaseDate, gasData]);

  if (connectionStatus === "unauthenticated" || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
         <div className="w-full max-sm bg-white border border-slate-100 p-12 shadow-2xl space-y-12 text-center rounded-[3rem]">
            <div className="space-y-6">
               <div className="w-24 h-24 bg-blue-600 mx-auto flex items-center justify-center shadow-xl rounded-[2rem]">
                  <Icon p={I.Target} size={48} color="white" />
               </div>
               <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter">KPI SYNC</h1>
                <p className="text-slate-400 text-sm font-bold">業務効率�E��E�最大化する。ログインしてチE��Eムの目標を確認しましょぁE�E��E�E</p>
               </div>
            </div>
            <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-5 font-black text-lg shadow-xl flex items-center justify-center gap-4 hover:shadow-2xl transition-all rounded-[2rem]">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
               Googleでログイン
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900 font-sans selection:bg-blue-100 uppercase-none">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue-600 rounded-2xl shadow-xl"><Icon p={I.Target} size={24} color="white" strokeWidth={2.5} /></div>
           <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">KPI SYNC DASHBOARD</h1>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {connectionStatus === "offline" && <div className="text-rose-500"><Icon p={I.WifiOff} size={20}/></div>}
           <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                 <div className="text-xs font-black">{user.displayName}</div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userRole === 'admin' ? '管理者権限' : 'アポインター権限'}</div>
              </div>
              <button onClick={handleLogout} className="p-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all border border-slate-100 shadow-sm rounded-2xl">
                <Icon p={I.LogOut} size={20} />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10">
        {activeTab === 'dashboard' && (
          <Dashboard 
            event={currentEvent} totals={totals} memberStats={memberStats} 
            eventReports={reports} members={members}
            currentBaseDate={currentBaseDate} setCurrentBaseDate={setCurrentBaseDate}
            userRole={userRole}
            currentUserEmail={user.email}
            onUpdateGoal={handleUpdateGoal}
            gasData={gasData}
            onEditGasRecord={updateGasRecord}
            onDeleteGasRecord={deleteGasRecord}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView members={members} reports={reports} gasData={gasData} event={currentEvent} userRole={userRole} />}
        {activeTab === 'attendance' && <AttendanceView members={members} reports={reports} onEdit={setEditingReport} />}
        {activeTab === 'shifts' && (
          <ShiftView 
            members={members} shifts={shifts} userRole={userRole} myMemberId={currentMember?.id}
            onAddShift={(s) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shifts'), { ...s, createdAt: Timestamp.now() })} 
            onDeleteShift={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', id))} 
          />
        )}
        {activeTab === 'gas' && <GasSyncDataView gasData={gasData} members={members} onEditGasRecord={updateGasRecord} onDeleteGasRecord={deleteGasRecord} />}
        {activeTab === 'settings' && (
          <Settings 
            events={events} currentEventId={currentEventId} 
            onAddEvent={addEvent} onDeleteEvent={deleteEvent}
            onUpdateGoals={updateEventGoals} onUpdateWeeklyGoals={updateEventWeeklyGoals}
            members={members} onAddMember={addMember} onDelMember={deleteMember} onUpdateMember={updateMember}
            onUpdateGoal={handleUpdateGoal}
            currentBaseDate={currentBaseDate}
            onClose={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'shifts' || activeTab === 'attendance' || activeTab === 'gas' || activeTab === 'settings') && (
        <>
          {showHelp && <MetricHelpModal onClose={() => setShowHelp(false)} />}
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 flex items-center justify-between no-print pt-2 pb-6 px-4">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Grid} label="ダッシュボード" />
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.PieChart} label="分析" />
          <NavButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} icon={I.Calendar} label="シフト" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={I.Clock} label="勤怠/実績" />
          <NavButton active={activeTab === 'gas'} onClick={() => setActiveTab('gas')} icon={I.Zap} label="GAS同期" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={I.Settings} label="設定" />
        </nav></>)}

      {showInput && <InputModal members={members} onAdd={addReport} onClose={() => setShowInput(false)} />}
      {editingReport && <InputModal members={members} initialData={editingReport} onUpdate={updateReport} onDelete={deleteReport} onClose={() => setEditingReport(null)} />}
    </div>
  );
}

export default App;
