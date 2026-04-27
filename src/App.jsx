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
// 1. 設定 & ヘルパー関数
// ==========================================
const appId = 'tele-apo-manager-v42-date-nav';
const ADMIN_EMAIL = 'sotaro50017@gmail.com'; 

// 進捗状況に応じた色判定
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

const getMondayKey = (dateObj) => {
  const d = new Date(dateObj);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return toLocalDateString(monday);
};

// ==========================================
// 2. アイコンデータ (Data)
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
  Search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
};

const BREAKDOWN_LABELS = {
  noAnswer: '不在',
  receptionRefusal: '受付拒否',
  picAbsent: '担当不在',
  picConnected: '本人接続',
  requests: '資料送付',
  appts: 'アポ',
  outOfTarget: '対象外'
};

// ==========================================
// 3. UI部品コンポーネント (Atomic Components)
// ==========================================
const Icon = ({ p, size=24, color="currentColor", className="", strokeWidth=1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" strokeLinejoin="square" className={className}>
    {p}
  </svg>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active ? 'text-indigo-600 border-t-2 border-indigo-600' : 'text-slate-300'}`}>
    <Icon p={icon} size={20} />
    <span className={`text-[9px] font-bold mt-1 ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

const getAIAdvice = (stats, isPersonal) => {
  const { calls, appts, picConnected } = stats;
  const connectRate = (Number(picConnected) || 0) / (Number(calls) || 1);
  const apptRate = (Number(appts) || 0) / (Number(picConnected) || 1);
  
  if (isPersonal) {
    if (calls === 0) return "今日も一日頑張りましょう！まずは50件の架電を目標に、リズムを作っていきましょう。";
    if (apptRate < 0.05) return "架電数は十分ですが、アポイントへの繋ぎで見直しが必要かもしれません。トーク冒頭のインパクトを強めてみてください。";
    if (connectRate < 0.15) return "現在は接続率がやや低い傾向にあります。リストのランクを見直すか、時間帯をずらしての再コールが効果的です。";
    return "非常に良いペースです！この調子で高品質なコミュニケーションを維持し、安定した獲得を目指してください。";
  }
  
  if (calls === 0) return "プロジェクトのデータがまだありません。開始準備を整え、最初の数値を刻みましょう。";
  if (apptRate < 0.08) return "チーム全体として、接続後の有効会話が短くなっているようです。スクリプトの第2セクションの強化を検討してください。";
  if (connectRate < 0.2) return "プロジェクト全体の接続率が目標を下回っています。リストの質を精査し、鮮度の高いターゲットにリソースを集中させましょう。";
  return "順調な運用状況です。現在の獲得効率を維持しつつ、各メンバーの稼働時間に偏りがないか確認し、持続可能な体制を維持してください。";
};

const MetricBar = ({ label, val, tgt }) => {
  const p = Math.min((val / (tgt || 1)) * 100, 100);
  const isOk = val >= (tgt || 0);
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-center px-1">
        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-black ${isOk ? 'text-emerald-600' : 'text-rose-600'}`}>
          {val.toLocaleString()} <span className="text-slate-400 mx-1">/</span> {tgt.toLocaleString()}
          <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[9px]">{p.toFixed(0)}%</span>
        </span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-none overflow-hidden border border-slate-200">
        <div className={`h-full transition-all duration-1000 ${isOk ? 'bg-indigo-600' : 'bg-rose-500'}`} style={{ width: `${p}%` }}></div>
      </div>
    </div>
  );
};

const MainMetric = ({ label, icon, current, target }) => {
  const p = Math.min((current / (target || 1)) * 100, 100);
  const isOk = current >= (target || 0);
  return (
    <div className="p-8 bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-6 relative overflow-hidden">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center"><Icon p={icon} size={20}/></div>
             <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">{label}</span>
          </div>
          <div className={`text-[10px] font-black px-3 py-1 ${isOk ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{isOk ? 'ACHIEVED' : 'IN PROGRESS'}</div>
       </div>
       <div className="flex items-baseline justify-between pt-2">
          <div className="text-6xl font-black text-slate-950 tabular-nums leading-none tracking-tighter">
            {current}
            <span className="text-xl text-slate-300 ml-2">/ {target}</span>
          </div>
          <div className={`text-3xl font-black ${isOk ? 'text-emerald-600' : 'text-rose-600'} leading-none italic underline decoration-4 offset-4`}>{p.toFixed(0)}%</div>
       </div>
    </div>
  );
};

const AreaChart = ({ data, color }) => {
  if (!data || data.length === 0) return <div className="h-32 flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">No Data Logged</div>;
  const max = Math.max(...data.map(d => d.value), 10);
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.value / max) * 100}`).join(' ');
  const areaPoints = `${points} 100,100 0,100`;

  return (
    <div className="w-full h-full relative group">
      <div className="absolute inset-0 grid grid-cols-6 border-b border-l border-slate-100">
        {[...Array(6)].map((_, i) => <div key={i} className="border-r border-slate-50 opacity-20" />)}
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible relative z-10">
        <polygon fill={`${color}15`} points={areaPoints} />
        <polyline fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" points={points} />
        {data.map((d, i) => (
          <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - (d.value / max) * 100} r="2.5" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      <div className="flex justify-between mt-4 px-1">
        {data.map((d, i) => <span key={i} className="text-[10px] font-black text-slate-400 uppercase">{d.day}</span>)}
      </div>
    </div>
  );
};

const Dashboard = ({ event, totals, memberStats, eventReports, members, currentBaseDate, setCurrentBaseDate, userRole, currentUserEmail, onUpdateGoal }) => {
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
     }), { appts: 0, calls: 0, picConnected: 0 });
  }, [myReports]);

  const activeWeeklyGoals = event.weeklyGoals?.[getMondayKey(currentBaseDate)] || event.goals?.weekly || {};
  const activeIndivGoals = event.individualWeeklyGoals?.[getMondayKey(currentBaseDate)]?.[currentMember?.id] || activeWeeklyGoals;

  return (
    <div className="space-y-12 pb-24 font-sans">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-4 border-slate-900 pb-10">
          <div className="space-y-4">
             <h2 className="text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none">{event.name}</h2>
             <div className="flex items-center gap-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                <span>PROJECT PERFORMANCE CORE</span>
             </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
             <button onClick={()=>setViewMode('personal')} className={`px-8 py-3 text-xs font-black transition-all ${viewMode==='personal'?'bg-slate-900 text-white':'text-slate-400 hover:text-slate-900'}`}>{currentUserEmail === ADMIN_EMAIL ? '管理個人' : 'マイ実績'}</button>
             <button onClick={()=>setViewMode('team')} className={`px-8 py-3 text-xs font-black transition-all ${viewMode==='team'?'bg-slate-900 text-white':'text-slate-400 hover:text-slate-900'}`}>全体指標</button>
          </div>
       </div>

       {viewMode === 'personal' ? (
                <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <h3 className="text-sm font-black text-slate-950 tracking-[.2em] uppercase border-l-8 border-indigo-600 pl-4">CORE GOAL</h3>
                         <MainMetric label="週間獲得アポイント" icon={I.Target} current={myTotals.appts} target={activeIndivGoals.appts} />
                         <button onClick={()=>setEditingGoal(activeIndivGoals)} className="w-full py-5 bg-slate-900 text-white text-[12px] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_rgba(79,70,229,1)] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">目標数値を編集する</button>
                      </div>
                      <div className="space-y-6">
                         <h3 className="text-sm font-black text-slate-950 tracking-[.2em] uppercase border-l-8 border-slate-300 pl-4">EFFICIENCY</h3>
                         <div className="flex flex-col gap-10 p-10 bg-white border-2 border-slate-100 shadow-xl">
                            <MetricBar label="接続成功率 (有効架電)" val={myTotals.picConnected} tgt={myTotals.calls} />
                            <MetricBar label="アポ獲得率 (接続比)" val={myTotals.appts} tgt={myTotals.picConnected} />
                         </div>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                         <h3 className="text-sm font-black text-slate-950 tracking-[.2em] uppercase border-l-8 border-indigo-600 pl-4">TEAM GOAL</h3>
                         <MainMetric label="チーム全体のアポ獲得" icon={I.Check} current={totals.weekly.appts} target={activeWeeklyGoals.appts} />
                      </div>
                      <div className="space-y-6">
                         <h3 className="text-sm font-black text-slate-950 tracking-[.2em] uppercase border-l-8 border-slate-300 pl-4">TEAM EFFICIENCY</h3>
                         <div className="flex flex-col gap-10 p-10 bg-white border-2 border-slate-100 shadow-xl">
                            <MetricBar label="全体接続率" val={totals.weekly.picConnected} tgt={totals.weekly.calls} />
                            <MetricBar label="全体アポ獲得率" val={totals.weekly.appts} tgt={totals.weekly.picConnected} />
                         </div>
                      </div>
                   </div>

                   <div className="bg-white border-4 border-slate-950 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] overflow-hidden transition-all hover:shadow-[16px_16px_0px_0px_rgba(15,23,42,1)]">
                      <div className="p-5 bg-slate-950 text-white text-xs font-black uppercase tracking-[.3em] flex items-center justify-between">
                         <span className="flex items-center gap-3"><Icon p={I.Users} size={16}/> MEMBER ANALYTICS</span>
                         <span className="text-[10px] opacity-40 italic">Sorted by Performance</span>
                      </div>
                      <div className="divide-y-2 divide-slate-100">
                         {members.map(m => {
                            const stats = memberStats.find(s=>s.id===m.id);
                            return (
                              <button key={m.id} onClick={()=>setDrilldownMember(m)} className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-all text-left group">
                                 <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 ${m.role==='closer'?'bg-indigo-600':'bg-slate-900'} text-white flex items-center justify-center font-black text-lg`}>{m.name.slice(0,1)}</div>
                                    <div>
                                       <div className="font-black text-2xl text-slate-950 leading-tight group-hover:underline">{m.name}</div>
                                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{m.role}・¥{m.hourlyWage.toLocaleString()}/H</div>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-12">
                                    <div className="text-right">
                                       <div className="text-[10px] font-black text-slate-300 uppercase">APPTS</div>
                                       <div className="text-3xl font-black text-slate-950">{stats?.appts || 0}</div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                       <div className="text-[10px] font-black text-slate-300 uppercase">CPH</div>
                                       <div className="text-3xl font-black text-indigo-600 italic">{stats?.cph || '0.0'}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900 text-white active:bg-indigo-600"><Icon p={I.ChevronRight} size={20}/></div>
                                 </div>
                              </button>
                            );
                         })}
                      </div>
                   </div>
                </div>
             )}

       {drilldownMember && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-xl">
            <div className="bg-white w-full max-w-sm p-10 space-y-10 border-4 border-slate-900 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{drilldownMember.name} 氏</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{drilldownMember.role}</p>
                  </div>
                  <button onClick={()=>setDrilldownMember(null)} className="p-2 border border-slate-200 rounded-full"><Icon p={I.X}/></button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">架電数</div>
                     <div className="text-xl font-black">{memberStats.find(s=>s.id===drilldownMember.id)?.calls || 0}</div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                     <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">アポ</div>
                     <div className="text-xl font-black text-indigo-600">{memberStats.find(s=>s.id===drilldownMember.id)?.appts || 0}</div>
                  </div>
               </div>
               <div className="bg-slate-900 p-8 text-white relative rounded-3xl">
                  <Icon p={I.Zap} className="absolute top-2 right-2 opacity-10" />
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4">個別AI分析</h4>
                  <p className="text-xs leading-relaxed font-bold">
                     切り返しのタイミングに迷いが見られる。冒頭の5秒をプロとして支配せよ。数字は嘘をつかない。
                  </p>
               </div>
               <button onClick={()=>setDrilldownMember(null)} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl">閉じる</button>
            </div>
         </div>
       )}

       {editingGoal && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 p-4">
            <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
               <h3 className="text-xl font-bold">個人目標設定の修正</h3>
               <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">週間アポ目標件数</label>
                  <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-black text-2xl outline-none rounded-xl" defaultValue={editingGoal.appts} id="new-indiv-goal" />
               </div>
               <button onClick={()=>{
                  const val = Number(document.getElementById('new-indiv-goal').value);
                  onUpdateGoal(getMondayKey(currentBaseDate), currentMember.id, { ...activeIndivGoals, appts: val });
                  setEditingGoal(null);
               }} className="w-full bg-slate-900 text-white py-4 font-bold shadow-lg rounded-2xl">設定を保存</button>
               <button onClick={()=>setEditingGoal(null)} className="w-full text-slate-400 text-sm font-bold pt-4">キャンセル</button>
            </div>
         </div>
       )}
    </div>
  );
};


const AttendanceView = ({ members, reports, onEdit }) => {
  const [selectedMonth, setSelectedMonth] = useState(toLocalMonthString(new Date()));
  const fReports = useMemo(() => reports.filter(r => r.date && toLocalMonthString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)) === selectedMonth).sort((a,b)=>b.date.seconds-a.date.seconds), [reports, selectedMonth]);
  const totalH = fReports.reduce((s, r)=>s+(Number(r.hours)||0), 0);
  const totalCost = fReports.reduce((s, r) => {
    const m = members.find(mem => mem.id === r.memberId);
    return s + (Number(r.hours)||0) * (Number(m?.hourlyWage)||1500);
  }, 0);

  return (
    <div className="space-y-8 pb-24 font-sans">
       <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <h2 className="text-xl font-bold flex items-center gap-3">稼働・人件費統計</h2>
          <input type="month" className="bg-white border border-slate-300 p-2 font-bold text-sm outline-none rounded-xl" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} />
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 shadow-lg rounded-3xl overflow-hidden">
          <div className="bg-slate-900 p-8 text-white relative">
             <div className="relative z-10"><span className="font-bold opacity-60 text-[10px] block mb-2">総稼働時間</span><span className="text-4xl font-black">{totalH}<span className="text-sm opacity-30 ml-2">H</span></span></div>
          </div>
          <div className="bg-white p-8 text-slate-900 relative">
             <div className="relative z-10"><span className="font-bold text-slate-400 text-[10px] block mb-2">概算人件費合計</span><span className="text-4xl font-black">¥{totalCost.toLocaleString()}</span></div>
          </div>
       </div>

       <div className="space-y-px bg-slate-200 border border-slate-200 shadow-md rounded-3xl overflow-hidden">
          {fReports.map(r => {
            const m = members.find(mem=>mem.id===r.memberId);
            return (
              <button key={r.id} onClick={()=>onEdit(r)} className="w-full bg-white p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-all group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-bold text-xs rounded-full"> {m?.name?.slice(0,1)} </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 mb-0.5">{toLocalDateString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000))}</span>
                        <span className="font-bold text-slate-800">{m?.name || '不明'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end mr-4">
                        <span className="text-[8px] font-bold text-slate-300">給与算出</span>
                        <span className="font-bold text-xs text-slate-400">¥{((Number(r.hours)||0) * (Number(m?.hourlyWage)||1500)).toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-100 px-3 py-1 text-[10px] font-bold border border-slate-200 rounded-full">{r.startTime || '--:--'} - {r.endTime || '--:--'}</div>
                    <span className="text-2xl font-black text-slate-900">{r.hours}<span className="text-xs opacity-20 ml-1">H</span></span>
                </div>
              </button>
            );
          })}
       </div>
    </div>
  );
};

const ShiftView = ({ members, shifts, onAddShift, onDeleteShift }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('day'); 
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

  const wr = getWeekRange(selectedDate);
  const currentMonthArr = useMemo(() => {
    const d = new Date(selectedDate);
    const y = d.getFullYear(); const m = d.getMonth();
    const first = new Date(y, m, 1); const last = new Date(y, m + 1, 0);
    const days = [];
    for (let i = 1; i <= last.getDate(); i++) days.push(toLocalDateString(new Date(y, m, i)));
    return days;
  }, [selectedDate]);
  
  const displayShifts = useMemo(() => {
    if (viewMode === 'day') return shifts.filter(s => s.date === selectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    if (viewMode === 'week') return shifts.filter(s => { const d = new Date(s.date); return d >= wr.start && d <= wr.end; }).sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const monthPrefix = toLocalMonthString(selectedDate);
    return shifts.filter(s => s.date.startsWith(monthPrefix)).sort((a,b)=>a.date.localeCompare(b.date));
  }, [shifts, selectedDate, viewMode, wr]);

  return (
    <div className="space-y-8 pb-24 font-sans">
       <div className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">シフト管理・人員配置</h2>
            <div className="flex bg-slate-200 p-1 rounded-full">
               <button onClick={()=>setViewMode('day')} className={`px-4 py-1 text-[10px] font-bold rounded-full ${viewMode==='day'?'bg-slate-900 text-white shadow-md':'text-slate-500'}`}>日別</button>
               <button onClick={()=>setViewMode('week')} className={`px-4 py-1 text-[10px] font-bold rounded-full ${viewMode==='week'?'bg-slate-900 text-white shadow-md':'text-slate-500'}`}>週別</button>
               <button onClick={()=>setViewMode('month')} className={`px-4 py-1 text-[10px] font-bold rounded-full ${viewMode==='month'?'bg-slate-900 text-white shadow-md':'text-slate-500'}`}>月間</button>
            </div>
          </div>
          <input type="date" className="w-full bg-white border border-slate-300 p-3 font-bold text-sm outline-none rounded-xl" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
       </div>

       {viewMode === 'month' ? (
         <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
            <div className="grid grid-cols-7 gap-1 mb-4 border-b border-slate-100 pb-4">
               {['日','月','火','水','木','金','土'].map(d => <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>)}
               {currentMonthArr.map(d => {
                 const dayShifts = displayShifts.filter(s => s.date === d);
                 return (
                   <div key={d} className={`aspect-square flex flex-col items-center justify-center border rounded-lg ${d === selectedDate ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-100'}`}>
                     <span className={`text-[8px] font-bold ${d===selectedDate?'text-white':'text-slate-400'}`}>{d.split('-')[2]}</span>
                     {dayShifts.length > 0 && <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>}
                   </div>
                 );
               })}
            </div>
            <div className="space-y-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden">
               {displayShifts.map(s => {
                 const m = members.find(mem=>mem.id===s.memberId);
                 return (
                   <div key={s.id} className="flex items-center justify-between p-3 bg-white text-[10px] font-bold">
                     <span className="text-slate-400">{s.date.split('-')[2]}日</span>
                     <span className="text-slate-900">{m?.name}</span>
                     <span className="text-indigo-600 border px-2 py-0.5 rounded-full">{s.startTime}-{s.endTime}</span>
                   </div>
                 );
               })}
            </div>
         </div>
       ) : (
         <div className="space-y-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden">
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
                             <span className="flex items-center gap-1"><Icon p={I.Clock} size={10}/>{s.startTime}-{s.endTime}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={()=>{if(window.confirm('削除しますか？')) onDeleteShift(s.id)}} className="p-2 text-slate-200 hover:text-rose-600 transition-colors"><Icon p={I.Trash} size={18}/></button>
                 </div>
               );
            })}
         </div>
       )}
       
       <button onClick={()=>setShowModal(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-slate-900 text-white flex flex-col items-center justify-center border-4 border-white shadow-2xl z-40 rounded-full">
         <Icon p={I.Plus} size={24} />
         <span className="text-[7px] font-bold uppercase mt-0.5">登録</span>
       </button>

       {showModal && (
         <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm p-10 space-y-8 border-2 border-slate-900 rounded-3xl">
               <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                  <h3 className="text-xl font-bold">シフト新規登録</h3>
                  <button onClick={()=>setShowModal(false)}><Icon p={I.X} /></button>
               </div>
               <div className="space-y-6">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">担当スタッフ</label>
                  <div className="flex flex-wrap gap-2">{members.map(m => (
                    <button key={m.id} className="px-3 py-1.5 border border-slate-200 font-bold text-xs hover:bg-slate-900 hover:text-white transition-all rounded-full">{m.name}</button>
                  ))}</div></div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">開始</label>
                     <input type="time" className="w-full p-4 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-xl" defaultValue="10:00" /></div>
                     <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">終了</label>
                     <input type="time" className="w-full p-4 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-xl" defaultValue="19:00" /></div>
                  </div>
               </div>
               <button onClick={()=>setShowModal(false)} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl">内容を保存</button>
            </div>
         </div>
       )}
    </div>
  );
};

const AnalyticsView = ({ members, reports, event }) => {
  const [selectedMid, setSelectedMid] = useState('all');
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
    }), { calls: 0, appts: 0, requests: 0, picConnected: 0 });
  }, [fReports]);

  const dailyTrend = useMemo(() => {
    const map = {};
    fReports.forEach(r => {
      if (!r.date) return;
      const d = toLocalDateString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)).slice(-5);
      map[d] = (map[d] || 0) + (Number(r.appts) || 0);
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b)=>a.day.localeCompare(b.day)).slice(-7);
  }, [fReports]);

  return (
    <div className="space-y-10 pb-28">
       <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <h2 className="text-xl font-bold flex items-center gap-3"><Icon p={I.PieChart} size={20}/> 高度分析センター</h2>
          <select className="bg-white border border-slate-300 p-2 font-bold text-xs outline-none rounded-xl" value={selectedMid} onChange={e=>setSelectedMid(e.target.value)}>
             <option value="all">チーム全体の状態を見る</option>
             {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">週間獲得トレンド</h3>
             <div className="h-48 w-full"><AreaChart data={dailyTrend} color="#4f46e5" /></div>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">転換・効率（CVR）</h3>
             <div className="space-y-10">
                <MetricBar label="接続率 (架電比)" val={stats.picConnected} tgt={stats.calls} />
                <MetricBar label="アポ率 (接続比)" val={stats.appts} tgt={stats.picConnected} />
             </div>
          </div>
       </div>

       <section className="p-10 bg-slate-900 text-white relative rounded-[2.5rem] shadow-2xl overflow-hidden min-h-[300px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Icon p={I.Zap} size={140} /></div>
          <div className="relative z-10 space-y-8">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500"></div>
                <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest">AI戦略アドバイス</h3>
             </div>
             <p className="text-lg font-black leading-relaxed font-sans pr-10">
                {getAIAdvice(stats, selectedMid !== 'all')}
             </p>
          </div>
          <div className="relative z-10 border-t border-white/10 pt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
             Deep Analytical Engine Active
          </div>
       </section>
    </div>
  );
};

const Settings = ({ events, members, onAddEvent, onDeleteEvent, onAddMember, onDelMember, onUpdateMember, onClose }) => {
  const [newEName, setNewEName] = useState("");
  const [newMName, setNewMName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("apo");
  const [newWage, setNewWage] = useState("1500");
  const [editingMember, setEditingMember] = useState(null);
  
  return (
    <div className="space-y-12 pb-40 font-sans">
       <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
          <div className="flex items-center gap-6">
             <button onClick={onClose} className="p-4 bg-slate-900 text-white rounded-2xl"><Icon p={I.X}/></button>
             <div><h2 className="font-black text-3xl text-slate-900 leading-none">システム高度管理</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Administrator Privileges Only</p></div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <section className="space-y-6">
             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-900 pl-3">案件・プロジェクト</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-4 shadow-sm rounded-3xl">
                <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold focus:border-slate-900 outline-none rounded-xl" placeholder="新規案件名" value={newEName} onChange={e=>setNewEName(e.target.value)} />
                <button onClick={()=>{if(newEName){onAddEvent(newEName, ""); setNewEName("");}}} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl">案件をデータベースに登録</button>
             </div>
             <div className="flex flex-col gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 bg-white text-sm font-bold">
                     <span>{e.name}</span>
                     <button onClick={()=>{if(window.confirm('この案件を完全に削除しますか？')) onDeleteEvent(e.id)}} className="text-slate-300 hover:text-rose-600"><Icon p={I.Trash} size={18}/></button>
                  </div>
                ))}
             </div>
          </section>

          <section className="space-y-6">
             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-emerald-600 pl-3">チーム・給与構成</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-4 shadow-sm rounded-3xl">
                <div className="grid grid-cols-2 gap-4">
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" placeholder="氏名" value={newMName} onChange={e=>setNewMName(e.target.value)} />
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" placeholder="Gmail" value={newEmail} onChange={e=>setNewEmail(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                      <option value="apo">アポインター</option>
                      <option value="closer">CLOSER</option>
                      <option value="admin">管理者</option>
                   </select>
                   <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" placeholder="時給" value={newWage} onChange={e=>setNewWage(e.target.value)} />
                </div>
                <button onClick={()=>{if(newMName){onAddMember(newMName, newRole, newWage, newEmail); setNewMName(""); setNewEmail("");}}} className="w-full bg-emerald-600 text-white py-4 font-bold rounded-2xl">スタッフを新規登録</button>
             </div>
             <div className="flex flex-col gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden">
                {members.map(m => (
                  <button key={m.id} onClick={() => setEditingMember(m)} className="p-4 bg-white flex items-center justify-between text-left hover:bg-slate-50 group">
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center font-bold text-white rounded-full ${m.role==='admin'?'bg-slate-900':'bg-slate-400'}`}>{m.name.slice(0,1)}</div>
                        <div>
                           <div className="font-bold text-slate-900">{m.name}</div>
                           <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">¥{m.hourlyWage}/H • {m.role}</div>
                        </div>
                     </div>
                     <Icon p={I.Settings} size={16} className="text-slate-200 group-hover:text-slate-900" />
                  </button>
                ))}
             </div>
          </section>
       </div>

       {editingMember && (
         <div className="fixed inset-0 bg-slate-900/95 z-[300] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
               <h3 className="text-xl font-bold border-b-2 border-slate-100 pb-4">スタッフ情報の修正</h3>
               <div className="space-y-4">
                  <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" value={editingMember.name} onChange={e=>setEditingMember({...editingMember, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                     <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}>
                        <option value="apo">アポインター</option>
                        <option value="closer">CLOSER</option>
                        <option value="admin">管理者</option>
                     </select>
                     <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-200 font-bold outline-none rounded-xl" value={editingMember.hourlyWage} onChange={e=>setEditingMember({...editingMember, hourlyWage: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={()=>{onDelMember(editingMember.id); setEditingMember(null);}} className="bg-rose-50 text-rose-500 py-4 font-bold border border-rose-100 transition-all active:bg-rose-100 rounded-2xl">削除</button>
                  <button onClick={()=>{onUpdateMember(editingMember.id, editingMember); setEditingMember(null);}} className="bg-slate-900 text-white py-4 font-bold transition-all active:bg-black rounded-2xl">更新を確定</button>
               </div>
               <button onClick={()=>setEditingMember(null)} className="w-full text-slate-400 text-sm font-bold pt-4">キャンセル</button>
            </div>
         </div>
       )}
    </div>
  );
};

function InputModal({ members, onAdd, onUpdate, onDelete, onClose, initialData = null }) {
  const [val, setVal] = useState({ memberId: '', date: toLocalDateString(new Date()), calls: '', appts: '', requests: '', lost: '', deals: '', hours: '', startTime: '10:00', endTime: '19:00', picConnected: '' });
  useEffect(() => { if (initialData) { const d = initialData.date?.toDate ? initialData.date.toDate() : new Date(initialData.date); setVal({ ...initialData, date: toLocalDateString(d) }); } }, [initialData]);
  const submit = (e) => { e.preventDefault(); if (!val.memberId) return alert("スタッフを選択してください"); const d = { ...val, calls: Number(val.calls), appts: Number(val.appts), requests: Number(val.requests), lost: Number(val.lost), deals: Number(val.deals), hours: Number(val.hours), picConnected: Number(val.picConnected) }; if (initialData) onUpdate(d); else onAdd(d); onClose(); };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex flex-col md:items-center md:justify-center p-4">
       <div className="w-full h-full md:max-w-2xl md:h-auto bg-white border-2 border-slate-900 flex flex-col overflow-hidden shadow-2xl rounded-3xl">
          <div className="p-6 border-b-2 border-slate-100 flex justify-between items-center bg-slate-50">
             <button onClick={onClose} className="p-2 border border-slate-200 bg-white rounded-full"><Icon p={I.X}/></button>
             <h2 className="font-bold text-xl uppercase tracking-widest">実績報告入力</h2>
             <div className="w-10"/>
          </div>
          <form onSubmit={submit} className="flex-1 overflow-y-auto p-8 space-y-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input type="date" className="p-4 bg-slate-50 border-2 border-slate-100 font-bold focus:border-slate-900 outline-none rounded-xl" value={val.date} onChange={e=>setVal({...val, date: e.target.value})} />
                <div className="flex flex-wrap gap-2">
                   {members.map(m => ( <label key={m.id} className={`px-4 py-2 border-2 cursor-pointer font-bold transition-all text-xs rounded-full ${val.memberId===m.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}> <input type="radio" value={m.id} className="hidden" onChange={e=>setVal({...val, memberId: e.target.value})} /> {m.name} </label> ))}
                </div>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-slate-200 border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                <div className="bg-white"><InputItem label="全体架電数" icon={I.Phone} val={val.calls} set={v=>setVal({...val, calls: v})} /></div>
                <div className="bg-white"><InputItem label="本人接続数" icon={I.Zap} val={val.picConnected} set={v=>setVal({...val, picConnected: v})} /></div>
                <div className="bg-white"><InputItem label="アポイント獲得" icon={I.Check} val={val.appts} set={v=>setVal({...val, appts: v})} /></div>
                <div className="bg-white"><InputItem label="資料請求" icon={I.FileText} val={val.requests} set={v=>setVal({...val, requests: v})} /></div>
                <div className="bg-white"><InputItem label="稼働時間" icon={I.Clock} val={val.hours} set={v=>setVal({...val, hours: v})} /></div>
             </div>
             <button className="w-full bg-slate-900 text-white py-6 font-bold text-lg hover:bg-black transition-all rounded-2xl">実績を確定し送信</button>
          </form>
       </div>
    </div>
  );
}

function InputItem({ label, icon, val, set }) {
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center gap-2 text-slate-400"><Icon p={icon} size={14}/><span className="text-[9px] font-black uppercase">{label}</span></div>
      <input type="number" className="w-full font-black text-xl outline-none" value={val} onChange={e=>set(e.target.value)} />
    </div>
  );
}

// ==========================================
// 5. メインAppコンポーネント (Logic)
// ==========================================

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showInput, setShowInput] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('member');
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [currentBaseDate, setCurrentBaseDate] = useState(new Date());

  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [editingReport, setEditingReport] = useState(null);

  const defaultGoals = {
    total: { deals: 15, meetings: 40, prospects: 30, lost: 10, appts: 100, calls: 1000, apoProspects: 50 },
    weekly: { deals: 2, meetings: 8, prospects: 5, lost: 2, appts: 20, calls: 200, apoProspects: 10 }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      alert("ログインに失敗しました。詳細： " + e.message);
    }
  };

  const handleLogout = () => signOut(auth);

  useEffect(() => {
    if (isOffline || !auth) { setConnectionStatus("offline"); return; }

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setConnectionStatus("connected");
        setUserRole(u.email === ADMIN_EMAIL ? 'admin' : 'member');

        const eCol = collection(db, 'artifacts', appId, 'public', 'data', 'events');
        onSnapshot(eCol, (s) => {
          const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
          if (list.length === 0) {
            const newEvent = { name: "イベント 2026", date: "2026-06-30", goals: defaultGoals, weeklyGoals: {}, createdAt: Timestamp.now() };
            addDoc(eCol, newEvent);
          } else {
            setEvents(list);
            if (!currentEventId && list.length > 0) setCurrentEventId(list[0].id);
          }
        });

        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (s) => {
          setMembers(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), (s) => {
          setReports(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'shifts'), (s) => {
          setShifts(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } else {
        setConnectionStatus("unauthenticated");
      }
    });
    return () => unsubAuth();
  }, [currentEventId]);

  const addEvent = async (n, d) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { name: n, date: d, goals: defaultGoals, weeklyGoals: {}, createdAt: Timestamp.now() });
  const deleteEvent = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
  const updateEventGoals = async (id, g) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), { goals: g });
  const updateEventWeeklyGoals = async (id, wk, wg, ig) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), { [`weeklyGoals.${wk}`]: wg, [`individualWeeklyGoals.${wk}`]: ig });
  
  const addMember = async (n, r, w, e) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), { name: n, role: r, hourlyWage: Number(w), email: e || "", createdAt: Timestamp.now() });
  const updateMember = async (id, d) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), { ...d, updatedAt: Timestamp.now() });
  const deleteMember = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id));

  const addReport = async (d) => {
    const reportDate = d.date ? Timestamp.fromDate(new Date(d.date)) : Timestamp.now();
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), { ...d, eventId: currentEventId, date: reportDate, createdAt: Timestamp.now() });
  };
  const updateReport = async (d) => {
    const { id, ...u } = d;
    u.date = d.date ? Timestamp.fromDate(new Date(d.date)) : Timestamp.now();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', id), u);
    setEditingReport(null);
  };
  const deleteReport = async (id) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', id)); setEditingReport(null); };

  const currentEvent = useMemo(() => events.find(e => e.id === currentEventId) || { goals: defaultGoals }, [events, currentEventId]);
  
  const totals = useMemo(() => {
    const wr = getWeekRange(currentBaseDate);
    const wD = reports.filter(r => {
      if (!r.date) return false;
      const isEventMatch = !r.eventId || r.eventId === currentEventId;
      if (!isEventMatch) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return d >= wr.start && d <= wr.end;
    });
    const tD = reports.filter(r => !r.eventId || r.eventId === currentEventId);
    const sum = (arr) => arr.reduce((acc, r) => ({
      appts: acc.appts + (Number(r.appts) || 0),
      calls: acc.calls + (Number(r.calls) || 0),
      requests: acc.requests + (Number(r.requests) || 0),
      meetings: acc.meetings + (Number(r.meetings) || 0),
      deals: acc.deals + (Number(r.deals) || 0),
      lost: acc.lost + (Number(r.lost) || 0),
      hours: acc.hours + (Number(r.hours) || 0),
    }), { appts: 0, calls: 0, requests: 0, meetings: 0, deals: 0, lost: 0, hours: 0 });
    return { weekly: sum(wD), total: sum(tD) };
  }, [reports, currentEventId, currentBaseDate]);

  const memberStats = useMemo(() => {
    return members.map(m => {
      const myReps = reports.filter(r => r.memberId === m.id && r.eventId === currentEventId);
      const myTot = myReps.reduce((acc, r) => ({
        deals: acc.deals + (Number(r.deals)||0),
        prospects: acc.prospects + (Number(r.prospects)||0),
        lost: acc.lost + (Number(r.lost)||0),
        appts: acc.appts + (Number(r.appts)||0),
        calls: acc.calls + (Number(r.calls)||0),
        requests: acc.requests + (Number(r.requests)||0),
        hours: acc.hours + (Number(r.hours)||0),
        picConnected: acc.picConnected + (Number(r.picConnected)||0),
      }), { deals: 0, prospects: 0, lost: 0, appts: 0, calls: 0, requests: 0, hours: 0, picConnected: 0 });
      const meetings = myTot.deals + (m.role==='closer' ? myTot.prospects : 0) + myTot.lost;
      return { ...m, ...myTot, meetings, cph: myTot.hours > 0 ? (myTot.calls / myTot.hours).toFixed(1) : "0.0" };
    }).sort((a,b) => b.cph - a.cph);
  }, [members, reports, currentEventId]);

  if (connectionStatus === "unauthenticated" || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
         <div className="w-full max-w-md bg-white border-4 border-slate-900 p-12 shadow-2xl space-y-10 text-center rounded-3xl">
            <div className="space-y-4">
               <div className="w-24 h-24 bg-slate-900 mx-auto flex items-center justify-center shadow-2xl mb-8 rounded-3xl">
                  <Icon p={I.Target} size={48} color="white" />
               </div>
               <h1 className="text-3xl font-black tracking-tighter">KPI Sync</h1>
               <p className="text-slate-400 text-sm font-bold">次世代KPI管理プラットフォーム</p>
            </div>
            <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-5 font-black text-lg shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all rounded-2xl">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
               Googleでログイン
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900 font-sans selection:bg-indigo-100">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-2">
           <div className="p-3 bg-slate-900 rounded-none shadow-xl"><Icon p={I.Target} size={24} color="white" strokeWidth={2.5} /></div>
           <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">イベントKPIアプリ</h1>
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">正常稼働中</span></div>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {connectionStatus === "offline" && <div className="text-rose-500"><Icon p={I.WifiOff} size={20}/></div>}
           <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                 <div className="text-xs font-black">{user.displayName}</div>
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{userRole === 'admin' ? '管理者' : 'メンバー'}</div>
              </div>
              <button onClick={handleLogout} className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-500 transition-all border border-slate-100 shadow-sm"><Icon p={I.LogOut} size={20} /></button>
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
            onUpdateGoal={updateEventWeeklyGoals}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView members={members} reports={reports} event={currentEvent} userRole={userRole} />}
        {activeTab === 'attendance' && <AttendanceView members={members} reports={reports} onEdit={setEditingReport} />}
        {activeTab === 'shifts' && (
          <ShiftView 
            members={members} shifts={shifts} 
            onAddShift={(s) => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shifts'), { ...s, createdAt: Timestamp.now() })} 
            onDeleteShift={(id) => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', id))} 
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            events={events} currentEventId={currentEventId} 
            onAddEvent={addEvent} onDeleteEvent={deleteEvent}
            onUpdateGoals={updateEventGoals} onUpdateWeeklyGoals={updateEventWeeklyGoals}
            members={members} onAddMember={addMember} onDelMember={deleteMember} onUpdateMember={updateMember}
            onClose={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'shifts' || activeTab === 'attendance' || activeTab === 'settings') && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 flex items-center justify-between no-print pt-2 pb-6 px-4">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Grid} label="ホーム" />
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.PieChart} label="分析" />
          <NavButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} icon={I.Calendar} label="シフト" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={I.Clock} label="履歴/成果" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={I.Settings} label="設定" />
        </nav>
      )}

      {showInput && <InputModal members={members} onAdd={addReport} onClose={() => setShowInput(false)} />}
      {editingReport && <InputModal members={members} initialData={editingReport} onUpdate={updateReport} onDelete={deleteReport} onClose={() => setEditingReport(null)} />}
    </div>
  );
}

export default App;