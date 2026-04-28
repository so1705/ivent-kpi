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
  <button onClick={onClick} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${active ? 'text-blue-600 border-t-2 border-blue-600' : 'text-slate-300'}`}>
    <Icon p={icon} size={20} />
    <span className={`text-[9px] font-bold mt-1 ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
  </button>
);

const getAIAdvice = (stats, isPersonal) => {
  const { calls, appts, picConnected } = stats;
  const connectRate = calls > 0 ? picConnected / calls : 0;
  const apptRate = picConnected > 0 ? appts / picConnected : 0;
  const totalCvr = calls > 0 ? appts / calls : 0;
  
  if (calls === 0) return "データが未蓄積です。まずはアクションを起こし、初期のペースメイキングを行いましょう。";

  let obs = "", strategy = "", action = "";

  if (isPersonal) {
    if (connectRate < 0.15) {
      obs = "現在、コール数に対する本人接続率が平均値を下回っています。";
      strategy = "アプローチのタイミング最適化が必要です。";
      action = "曜日や時間帯のターゲットリストを再編し、決済者が着座している可能性が高い時間帯にリソースを集中投下してください。";
    } else if (apptRate < 0.05) {
      obs = "接続からアポイントメントへの転換率が低下しています。";
      strategy = "冒頭30秒のスクリプト構成と、ヒアリングの深度を見直す必要があります。";
      action = "フロントの警戒心を解くアイスブレイクを強化し、相手のペインポイントに直接刺さる提案へとトークフローを調整してください。";
    } else if (totalCvr > 0.02) {
      obs = `全体の獲得効率は ${(totalCvr*100).toFixed(1)}% と非常に高い水準を維持しています。`;
      strategy = "現在の獲得モデルのスケールアウトが推奨されます。";
      action = "このペースを維持しつつ、得られた成功パターン（時間帯・トークスクリプト）をチーム全体へナレッジ共有してください。";
    } else {
      obs = "標準的な推移を見せています。";
      strategy = "もう一段階のブレイクスルーには、微細なボトルネックの解消が必要です。";
      action = "自身の過去の音声記録を確認し、クロージング前の切り返しのタイミングを1秒早める練習を行ってください。";
    }
  } else {
    if (connectRate < 0.20) {
      obs = "プロジェクト全体の接続率が目標閾値を下回って推移しています。";
      strategy = "リスト枯渇、あるいはターゲティングの不一致が疑われます。";
      action = "リストの供給源を見直すか、現在のアプローチ対象業界の優先順位を即座に変更してください。";
    } else if (apptRate < 0.08) {
      obs = "接続後の有効商談化率が低迷しています。";
      strategy = "市場のニーズ変化に対し、現在のオファー内容が弱くなっている可能性があります。";
      action = "提案の切り口（フック）を3パターン用意し、A/Bテストを実施して最も反応率の高いスクリプトに全体統一してください。";
    } else {
      obs = "プロジェクトは極めて健全なKPIツリーを形成しています。";
      strategy = "現在のプロセスは最適化されています。";
      action = "メンバーの疲労蓄積によるペースダウンを防ぐため、シフトの適正化とモチベーション管理に注力してください。";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-start"><div className="mt-1 w-2 h-2 rounded-full bg-rose-500 shrink-0"></div><p><span className="text-rose-400 font-bold text-[10px] uppercase block mb-0.5">Observation</span>{obs}</p></div>
      <div className="flex gap-3 items-start"><div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div><p><span className="text-blue-400 font-bold text-[10px] uppercase block mb-0.5">Strategy</span>{strategy}</p></div>
      <div className="flex gap-3 items-start"><div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div><p><span className="text-emerald-400 font-bold text-[10px] uppercase block mb-0.5">Action Plan</span>{action}</p></div>
    </div>
  );
};

const MetricBar = ({ label, val, tgt }) => {
  const p = Math.min((val / (tgt || 1)) * 100, 100);
  const isOk = val >= (tgt || 0);
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <span className={`text-sm font-black ${isOk ? 'text-emerald-600' : 'text-blue-600'}`}>
          {val.toLocaleString()} <span className="text-slate-300 font-normal">/ {tgt.toLocaleString()}</span>
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
          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{isOk ? '達成済み' : '目標達成へ'}</span>
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
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase tracking-widest">データがありません</div>;
  const max = Math.max(...data.map(d => d.value), 1); 
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - (d.value / max) * 100}`).join(' ');
  const areaPoints = `${points} 100,100 0,100`;

  return (
    <div className="w-full h-full relative group flex flex-col">
      <div className="flex-1 relative">
        <div className="absolute inset-x-0 bottom-0 top-0 grid grid-cols-6 border-b border-l border-slate-100/50">
          {[...Array(6)].map((_, i) => <div key={i} className="border-r border-slate-50 opacity-20" />)}
        </div>
        <svg viewBox="0 -5 100 110" preserveAspectRatio="none" className="w-full h-full overflow-visible relative z-10">
          {type === 'area' && <polygon fill={`${color}15`} points={areaPoints} />}
          <polyline fill="none" stroke={color} strokeWidth={type === 'line' ? "4" : "3"} strokeLinejoin="round" points={points} className={type === 'line' ? "drop-shadow-md" : ""} />
          {data.map((d, i) => (
            <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - (d.value / max) * 100} r={type === 'line' ? "3" : "2"} fill="white" stroke={color} strokeWidth="2" className="transition-all hover:r-4 cursor-pointer" />
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-4 px-1">
        {data.map((d, i) => <span key={i} className={`text-[9px] font-black uppercase ${i===data.length-1?'text-blue-600':'text-slate-400'}`}>{d.day}</span>)}
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
                <span className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> 正常稼働中</span>
                <span className="w-px h-3 bg-slate-200"></span>
                <span>運営期間内</span>
             </div>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-2xl">
             <button onClick={()=>setViewMode('personal')} className={`px-8 py-3 text-xs font-bold transition-all rounded-xl ${viewMode==='personal'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>{currentUserEmail === ADMIN_EMAIL ? '個人統計' : 'マイ実績'}</button>
             <button onClick={()=>setViewMode('team')} className={`px-8 py-3 text-xs font-bold transition-all rounded-xl ${viewMode==='team'?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-900'}`}>全体指標</button>
          </div>
       </div>

       {viewMode === 'personal' ? (
                 <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 主要目標 (週間)
                          </h3>
                          <MainMetric label="アポイント獲得数" icon={I.Target} current={myTotals.appts} target={activeIndivGoals.appts} />
                          <button onClick={()=>setEditingGoal(activeIndivGoals)} className="w-full py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-bold hover:bg-slate-50 transition-all">目標数値を調整する</button>
                       </div>
                       <div className="space-y-6">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div> 稼働効率解析
                          </h3>
                          <div className="flex flex-col gap-10 p-10 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">累計架電数</div>
                                   <div className="text-2xl font-black">{myTotals.calls}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl">
                                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">1hあたり(CPH)</div>
                                   <div className="text-2xl font-black text-blue-600">{(myTotals.calls / (myTotals.hours || 1)).toFixed(1)}</div>
                                </div>
                             </div>
                             <MetricBar label="接続率 (架電比)" val={myTotals.picConnected} tgt={myTotals.calls} />
                             <MetricBar label="アポ率 (接続比)" val={myTotals.appts} tgt={myTotals.picConnected} />
                          </div>
                       </div>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> チーム目標
                          </h3>
                          <MainMetric label="全社アポイント獲得数" icon={I.Check} current={totals.weekly.appts} target={activeWeeklyGoals.appts} />
                       </div>
                       <div className="space-y-6">
                          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-slate-300 rounded-full"></div> 全体効率
                          </h3>
                          <div className="flex flex-col gap-10 p-10 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
                             <MetricBar label="全体接続率" val={totals.weekly.picConnected} tgt={totals.weekly.calls} />
                             <MetricBar label="全体アポ率" val={totals.weekly.appts} tgt={totals.weekly.picConnected} />
                          </div>
                       </div>
                    </div>

                    <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                       <div className="p-6 bg-slate-50 border-b border-slate-100 text-xs font-black flex items-center justify-between text-slate-600 uppercase tracking-widest">
                          <span className="flex items-center gap-3"><Icon p={I.Users} size={16}/> メンバー別パフォーマンス詳細</span>
                          <span className="text-[10px] text-slate-400">CPH順にソート</span>
                       </div>
                       <div className="divide-y divide-slate-50 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[600px]">
                             <thead className="bg-slate-50/50">
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                   <th className="p-6">氏名</th>
                                   <th className="p-6">架電数</th>
                                   <th className="p-6">本人接続</th>
                                   <th className="p-6">資料請求</th>
                                   <th className="p-6 text-blue-600">アポ</th>
                                   <th className="p-6">1h効率</th>
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
                       <h3 className="text-2xl font-black text-slate-900">{drilldownMember.name} 氏</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{drilldownMember.role} • 1h/¥{drilldownMember.hourlyWage.toLocaleString()}</p>
                     </div>
                   </div>
                   <button onClick={()=>setDrilldownMember(null)} className="p-3 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all"><Icon p={I.X}/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: '架電数', val: drilldownMember.calls, color: 'text-slate-900' },
                     { label: '本人接続', val: drilldownMember.picConnected, color: 'text-slate-900' },
                     { label: '資料請求', val: drilldownMember.requests, color: 'text-slate-900' },
                     { label: 'アポ獲得', val: drilldownMember.appts, color: 'text-blue-600' },
                     { label: '1h効率(CPH)', val: drilldownMember.cph, color: 'text-emerald-600' },
                     { label: '稼働時間', val: `${drilldownMember.hours}H`, color: 'text-slate-400' },
                   ].map(stat => (
                      <div key={stat.label} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</div>
                         <div className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.val}</div>
                      </div>
                   ))}
                </div>

                <div className="bg-slate-900 p-8 text-white relative rounded-[2rem] overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5"><Icon p={I.Zap} size={80} /></div>
                   <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-4 tracking-widest">個別戦略アドバイス</h4>
                   <div className="text-sm leading-relaxed font-bold">
                      {getAIAdvice({
                        calls: drilldownMember.calls,
                        appts: drilldownMember.appts,
                        picConnected: drilldownMember.picConnected
                      }, true)}
                   </div>
                </div>
                <button onClick={()=>setDrilldownMember(null)} className="w-full bg-slate-900 text-white py-5 font-black rounded-[2rem] shadow-xl hover:bg-black transition-all">統計を閉じる</button>
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
  const [viewMode, setViewMode] = useState('month'); 
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

  const wr = getWeekRange(selectedDate);
  const calendarData = useMemo(() => {
    const d = new Date(selectedDate);
    const y = d.getFullYear(); 
    const m = d.getMonth();
    const first = new Date(y, m, 1); 
    const last = new Date(y, m + 1, 0);
    
    const days = [];
    for (let i = 0; i < first.getDay(); i++) {
      days.push(null);
    }
    for (let i = 1; i <= last.getDate(); i++) {
      days.push(toLocalDateString(new Date(y, m, i)));
    }
    return days;
  }, [selectedDate]);
  
  const displayShifts = useMemo(() => {
    if (viewMode === 'day') return shifts.filter(s => s.date === selectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    if (viewMode === 'week') return shifts.filter(s => { const d = new Date(s.date); return d >= wr.start && d <= wr.end; }).sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const monthPrefix = toLocalMonthString(selectedDate);
    return shifts.filter(s => s.date.startsWith(monthPrefix)).sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, selectedDate, viewMode, wr]);

  const selectedDateShifts = useMemo(() => {
    return shifts.filter(s => s.date === selectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
  }, [shifts, selectedDate]);

  return (
    <div className="space-y-8 pb-24 font-sans">
       <div className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">シフト管理・人員配置</h2>
            <div className="flex bg-slate-200 p-1 rounded-full">
               <button onClick={()=>setViewMode('day')} className={`px-4 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='day'?'bg-slate-900 text-white shadow-md':'text-slate-500 hover:text-slate-900'}`}>日別</button>
               <button onClick={()=>setViewMode('week')} className={`px-4 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='week'?'bg-slate-900 text-white shadow-md':'text-slate-500 hover:text-slate-900'}`}>週別</button>
               <button onClick={()=>setViewMode('month')} className={`px-4 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='month'?'bg-slate-900 text-white shadow-md':'text-slate-500 hover:text-slate-900'}`}>月間カレンダー</button>
            </div>
          </div>
          <input type="date" className="w-full bg-white border border-slate-300 p-3 font-bold text-sm outline-none rounded-xl focus:border-slate-900 transition-colors" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
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
                   const isSelected = d === selectedDate;
                   const isToday = d === toLocalDateString(new Date());
                   return (
                     <button key={d} onClick={() => setSelectedDate(d)} className={`bg-white aspect-[4/3] p-2 flex flex-col items-start justify-start transition-all relative border-t border-l border-slate-50 hover:bg-blue-50 group ${isSelected ? 'ring-2 ring-inset ring-blue-600 z-10 bg-blue-50/30' : ''}`}>
                       <span className={`text-sm font-black mb-1 ${isSelected?'text-blue-600':isToday?'bg-blue-600 text-white px-2 rounded-full':''}`}>{d.split('-')[2]}</span>
                       <div className="w-full space-y-1">
                          {dayShifts.slice(0, 3).map((s, idx) => {
                             const m = members.find(mem=>mem.id===s.memberId);
                             return <div key={idx} className="text-[8px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate w-full">{m?.name}</div>
                          })}
                          {dayShifts.length > 3 && <div className="text-[8px] font-bold text-slate-300 pl-1">他 {dayShifts.length - 3} 名...</div>}
                       </div>
                     </button>
                   );
                 })}
              </div>
           </div>

           <div className="bg-white border border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900 flex items-center gap-4"><div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><Icon p={I.Calendar} size={20}/></div> {selectedDate.split('-')[1]}月{selectedDate.split('-')[2]}日のシフト詳細</h3>
                 <span className="px-4 py-2 bg-slate-50 rounded-full text-xs font-black text-slate-400 uppercase tracking-widest">{selectedDateShifts.length} 名のスタッフが予定</span>
              </div>
              {selectedDateShifts.length === 0 ? (
                 <div className="text-center py-20 text-slate-400 font-bold text-sm">この日のシフト登録はありません。右下の＋ボタンから登録してください。</div>
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
                             <button onClick={()=>{if(window.confirm('このシフトを削除しますか？')) onDeleteShift(s.id)}} className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Icon p={I.Trash} size={20}/></button>
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
       
       <button onClick={()=>setShowModal(true)} className="fixed bottom-24 right-6 w-16 h-16 bg-slate-900 text-white flex flex-col items-center justify-center border-4 border-white shadow-2xl z-40 rounded-full hover:scale-105 transition-transform">
         <Icon p={I.Plus} size={24} />
         <span className="text-[7px] font-bold uppercase mt-0.5">登録</span>
       </button>

       {showModal && (
         <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
               <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                  <h3 className="text-xl font-bold">シフト新規登録</h3>
                  <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><Icon p={I.X} /></button>
               </div>
               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-3 block">担当スタッフ</label>
                    <div className="flex flex-wrap gap-2">{members.map(m => (
                      <button key={m.id} className="px-4 py-2 border border-slate-200 font-bold text-xs hover:bg-slate-900 hover:text-white transition-all rounded-full">{m.name}</button>
                    ))}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">開始</label>
                       <input type="time" className="w-full p-4 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-xl transition-colors" defaultValue="10:00" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">終了</label>
                       <input type="time" className="w-full p-4 border-2 border-slate-100 font-bold outline-none focus:border-slate-900 rounded-xl transition-colors" defaultValue="19:00" />
                     </div>
                  </div>
               </div>
               <button onClick={()=>setShowModal(false)} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl hover:bg-black transition-colors">内容を保存</button>
            </div>
         </div>
       )}
    </div>
  );
};

const AnalyticsView = ({ members, reports, event }) => {
  const [selectedMid, setSelectedMid] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [chartMetric, setChartMetric] = useState('appts'); 
  
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
      map[d] = (map[d] || 0) + (Number(r[chartMetric]) || 0);
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b)=>a.day.localeCompare(b.day)).slice(-14); 
  }, [fReports, chartMetric]);

  const metricLabels = {
    calls: '架電数',
    appts: 'アポ獲得数',
    requests: '資料請求数',
    picConnected: '本人接続数'
  };

  return (
    <div className="space-y-10 pb-28">
       <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
          <h2 className="text-xl font-black flex items-center gap-3"><Icon p={I.PieChart} size={20}/> プロジェクト多角分析</h2>
          <select className="bg-white border border-slate-300 p-2 px-4 font-bold text-xs outline-none rounded-xl shadow-sm" value={selectedMid} onChange={e=>setSelectedMid(e.target.value)}>
             <option value="all">チーム全体の推移を表示</option>
             {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
       </div>

       <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-xl space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="space-y-1">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">トレンド・パフォーマンス・モニタリング</h3>
                <div className="text-3xl font-black text-slate-900">{metricLabels[chartMetric]}の推移</div>
             </div>
             <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl gap-1">
                {['appts', 'calls', 'requests'].map(m => (
                   <button key={m} onClick={()=>setChartMetric(m)} className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all ${chartMetric===m?'bg-white shadow-md text-blue-600':'text-slate-400 hover:text-slate-600'}`}>{metricLabels[m]}</button>
                ))}
                <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                <button onClick={()=>setChartType('line')} className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all ${chartType==='line'?'bg-blue-600 text-white shadow-md':'text-slate-400 hover:text-slate-600'}`}>折れ線</button>
                <button onClick={()=>setChartType('area')} className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all ${chartType==='area'?'bg-blue-600 text-white shadow-md':'text-slate-400 hover:text-slate-600'}`}>エリア</button>
             </div>
          </div>
          <div className="h-[400px] w-full min-w-full">
             <CustomChart data={dailyTrend} color={chartMetric==='appts'?'#4f46e5':chartMetric==='calls'?'#0ea5e9':'#10b981'} type={chartType} />
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-10">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">転換・効率（CVR）</h3>
             <div className="space-y-10">
                <MetricBar label="接続率 (架電比)" val={stats.picConnected} tgt={stats.calls} />
                <MetricBar label="アポ率 (接続比)" val={stats.appts} tgt={stats.picConnected} />
             </div>
          </div>

          <section className="p-10 bg-slate-900 text-white relative rounded-[2.5rem] shadow-xl overflow-hidden min-h-[300px] flex flex-col justify-between border border-slate-800">
             <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Icon p={I.Zap} size={140} /></div>
             <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                   <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">AI戦略アドバイザー</h3>
                </div>
                <div className="text-sm font-bold leading-relaxed pr-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                   {getAIAdvice(stats, selectedMid !== 'all')}
                </div>
             </div>
             <div className="relative z-10 border-t border-white/10 pt-6 flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-widest">
                <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> リアルタイム解析中</span>
                <span className="opacity-40 italic">深層分析エンジン v5.0.3</span>
             </div>
          </section>
       </div>
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
  
  const [gasUrl, setGasUrl] = useState(localStorage.getItem('kpi_gas_url') || "");
  const [legacyAppId, setLegacyAppId] = useState(localStorage.getItem('kpi_legacy_appid') || "");
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSaveSyncSettings = () => {
    localStorage.setItem('kpi_gas_url', gasUrl);
    localStorage.setItem('kpi_legacy_appid', legacyAppId);
    alert("同期設定を保存しました。");
  };

  const handleManualSync = async () => {
    if (!gasUrl) return alert("GASのURLを設定してください。");
    setIsSyncing(true);
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify({ 
          action: 'sync', 
          appId: appId, 
          legacyAppId: legacyAppId 
        })
      });
      alert("同期リクエストを送信しました。Googleスプレッドシート側のGASが正しく設定されていれば、数分以内にデータが反映されます。");
    } catch (e) {
      alert("同期リクエストの送信に失敗しました: " + e.message);
    }
    setIsSyncing(false);
  };
  
  return (
    <div className="space-y-12 pb-40 font-sans">
       <div className="flex items-center justify-between border-b-4 border-slate-900 pb-6">
          <div className="flex items-center gap-6">
             <button onClick={onClose} className="p-4 bg-slate-900 text-white rounded-2xl"><Icon p={I.X}/></button>
             <div><h2 className="font-black text-3xl text-slate-900 leading-none">システム高度管理</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">管理者権限のみ。一般スタッフは閲覧できません。</p></div>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <section className="space-y-6">
             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-slate-900 pl-3">案件・プロジェクト</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-4 shadow-sm rounded-3xl">
                <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold focus:border-slate-900 outline-none rounded-xl" placeholder="新規案件名" value={newEName} onChange={e=>setNewEName(e.target.value)} />
                <button onClick={()=>{if(newEName){onAddEvent(newEName, ""); setNewEName("");}}} className="w-full bg-slate-900 text-white py-4 font-bold rounded-2xl hover:bg-black transition-colors">案件をデータベースに登録</button>
             </div>
             <div className="flex flex-col gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-4 bg-white text-sm font-bold">
                     <span>{e.name}</span>
                     <button onClick={()=>{if(window.confirm('この案件を完全に削除しますか？')) onDeleteEvent(e.id)}} className="text-slate-300 hover:text-rose-600 transition-colors"><Icon p={I.Trash} size={18}/></button>
                  </div>
                ))}
             </div>

             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-blue-600 pl-3 mt-12">外部データ同期 (GAS / 過去データ)</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-6 shadow-sm rounded-3xl">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Google Apps Script URL</label>
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl text-xs" placeholder="https://script.google.com/macros/s/..." value={gasUrl} onChange={e=>setGasUrl(e.target.value)} />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">過去データ引継ぎ用 App ID</label>
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl text-xs" placeholder="例: tele-apo-manager-original" value={legacyAppId} onChange={e=>setLegacyAppId(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={handleSaveSyncSettings} className="w-full bg-white border-2 border-slate-200 text-slate-600 py-4 font-bold rounded-2xl hover:bg-slate-50 transition-colors">設定を保存</button>
                   <button onClick={handleManualSync} disabled={isSyncing} className="w-full bg-blue-600 text-white py-4 font-bold rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      <Icon p={I.Zap} size={18} /> {isSyncing ? '同期中...' : '今すぐ同期'}
                   </button>
                </div>
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
                      <option value="closer">クローザー</option>
                      <option value="admin">管理者</option>
                   </select>
                   <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" placeholder="時給" value={newWage} onChange={e=>setNewWage(e.target.value)} />
                </div>
                <button onClick={()=>{if(newMName){onAddMember(newMName, newRole, newWage, newEmail); setNewMName(""); setNewEmail("");}}} className="w-full bg-emerald-600 text-white py-4 font-bold rounded-2xl hover:bg-emerald-700 transition-colors">スタッフを新規登録</button>
             </div>
             <div className="flex flex-col gap-px bg-slate-200 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {members.map(m => (
                  <button key={m.id} onClick={() => setEditingMember(m)} className="p-4 bg-white flex items-center justify-between text-left hover:bg-slate-50 group transition-colors">
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center font-bold text-white rounded-full ${m.role==='admin'?'bg-slate-900':'bg-slate-400'}`}>{m.name.slice(0,1)}</div>
                        <div>
                           <div className="font-bold text-slate-900">{m.name}</div>
                           <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">¥{m.hourlyWage}/H • {m.role}</div>
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
               <h3 className="text-xl font-bold border-b-2 border-slate-100 pb-4">スタッフ情報の修正</h3>
               <div className="space-y-4">
                  <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" value={editingMember.name} onChange={e=>setEditingMember({...editingMember, name: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                     <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold outline-none rounded-xl" value={editingMember.role} onChange={e=>setEditingMember({...editingMember, role: e.target.value})}>
                        <option value="apo">アポインター</option>
                        <option value="closer">クローザー</option>
                        <option value="admin">管理者</option>
                     </select>
                     <input type="number" className="w-full p-4 bg-slate-50 border-2 border-slate-200 font-bold outline-none rounded-xl" value={editingMember.hourlyWage} onChange={e=>setEditingMember({...editingMember, hourlyWage: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <button onClick={()=>{onDelMember(editingMember.id); setEditingMember(null);}} className="bg-rose-50 text-rose-500 py-4 font-bold border border-rose-100 transition-all active:bg-rose-100 rounded-2xl">削除</button>
                  <button onClick={()=>{onUpdateMember(editingMember.id, editingMember); setEditingMember(null);}} className="bg-slate-900 text-white py-4 font-bold transition-all active:bg-black rounded-2xl">更新を確定</button>
               </div>
               <button onClick={()=>setEditingMember(null)} className="w-full text-slate-400 text-sm font-bold pt-4 hover:text-slate-900 transition-colors">キャンセル</button>
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
      picConnected: acc.picConnected + (Number(r.picConnected) || 0),
    }), { appts: 0, calls: 0, requests: 0, meetings: 0, deals: 0, lost: 0, hours: 0, picConnected: 0 });
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
         <div className="w-full max-sm bg-white border border-slate-100 p-12 shadow-2xl space-y-12 text-center rounded-[3rem]">
            <div className="space-y-6">
               <div className="w-24 h-24 bg-blue-600 mx-auto flex items-center justify-center shadow-xl rounded-[2rem]">
                  <Icon p={I.Target} size={48} color="white" />
               </div>
               <div className="space-y-2">
                <h1 className="text-4xl font-black tracking-tighter">KPI SYNC</h1>
                <p className="text-slate-400 text-sm font-bold">高精度な実績管理。チームの成果を最大化。</p>
               </div>
            </div>
            <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-5 font-black text-lg shadow-xl flex items-center justify-center gap-4 hover:shadow-2xl transition-all rounded-[2rem]">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
               Google連携でログイン
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
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">実績管理・KPI同期システム</h1>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {connectionStatus === "offline" && <div className="text-rose-500"><Icon p={I.WifiOff} size={20}/></div>}
           <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                 <div className="text-xs font-black">{user.displayName}</div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userRole === 'admin' ? 'システム管理者' : 'プロジェクトメンバー'}</div>
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
