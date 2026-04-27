import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, setDoc, 
  deleteDoc, Timestamp, updateDoc 
} from 'firebase/firestore';

// ==========================================
// 1. 設定 & ヘルパー関数
// ==========================================
const appId = 'tele-apo-manager-v42-date-nav';

// ★Firebase設定
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

// 管理者メールアドレス
const ADMIN_EMAIL = "sotaro50017@gmail.com";

const saveLocal = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
};
const loadLocal = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
};

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
  Yen: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  Sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
  Grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
  List: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  Zap: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  TrendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  Activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
  PieChart: <><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></>,
  LogOut: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  Info: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  User: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>
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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {p}
  </svg>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center w-full h-16 transition-all duration-500 relative group flex-1`}
  >
    <div className={`transition-all duration-300 z-10 ${active ? 'transform -translate-y-0.5' : 'opacity-40 group-hover:opacity-70'}`}>
      <Icon p={icon} size={22} strokeWidth={active ? 2.5 : 2} color={active ? '#4f46e5' : '#64748b'} />
    </div>
    <span className={`text-[10px] font-black mt-1 tracking-tighter transition-all duration-300 ${active ? 'text-indigo-600 opacity-100' : 'text-slate-400 opacity-80'}`}>{label}</span>
    {active && <div className="absolute top-1 w-8 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)] animate-in slide-in-from-top-1 duration-500"></div>}
  </button>
);


const GoalRow = ({ label, val, set }) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    <input 
      type="number" 
      className="w-24 text-right bg-gray-50 rounded-lg px-2 py-1 font-bold text-gray-900 outline-none border border-transparent focus:border-gray-300 transition-all" 
      value={val !== undefined ? val : 0} 
      onChange={e=>set(e.target.value)} 
    />
  </div>
);

const InputItem = ({ label, icon, val, set, color = "text-indigo-600" }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm focus-within:ring-4 focus-within:ring-indigo-50/50 transition-all group">
    <div className={`text-[9px] font-black uppercase mb-3 flex items-center justify-center gap-2 text-slate-400 group-focus-within:text-indigo-500 transition-colors tracking-[0.2em]`}>
      <Icon p={icon} size={14}/> {label}
    </div>
    <input 
      type="number" 
      className="w-full bg-transparent text-4xl font-black text-slate-900 outline-none text-center placeholder-slate-100" 
      placeholder="0" 
      value={val} 
      onChange={e=>set(e.target.value)} 
    />
  </div>
);


const StatItem = ({ label, val, highlight, color }) => (
  <div className={`flex flex-col py-3 px-2 rounded-2xl transition-all ${highlight ? 'bg-slate-50 ring-1 ring-slate-100 shadow-sm' : ''}`}>
    <span className="text-[10px] text-slate-400 font-extrabold mb-1 uppercase tracking-widest">{label}</span>
    <span className={`text-xl font-black ${highlight && color ? color : 'text-slate-800'}`}>{val}</span>
  </div>
);

const MetricBar = ({ label, val, tgt, color, small }) => {
  const percent = tgt > 0 ? Math.min((val/tgt)*100, 100) : 0;
  return (
    <div className={`flex flex-col ${small ? 'gap-1' : 'gap-2'}`}>
      <div className="flex justify-between items-end">
        <span className={`font-black text-slate-500 uppercase tracking-tighter ${small ? 'text-[9px]' : 'text-[10px]'}`}>{label}</span>
        <div className="font-black text-slate-900 leading-none">
          <span className={small ? 'text-sm' : 'text-base'}>{val}</span>
          {tgt > 0 && <span className="text-[10px] text-slate-300 ml-1">/ {tgt}</span>}
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${color} transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

const MainMetric = ({ label, icon, current, target, color, bg }) => {
  const percent = target > 0 ? Math.min((current/target)*100, 100) : 0;
  return (
    <div className="group">
      <div className="flex justify-between items-end mb-4">
        <div className={`flex items-center gap-3 font-black ${color}`}>
          <div className={`p-2 rounded-xl bg-slate-50 group-hover:scale-110 transition-transform duration-500`}>
            <Icon p={icon} size={24}/> 
          </div>
          <span className="text-xl tracking-tight uppercase">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-5xl font-black text-slate-900 tracking-tighter">{current}</span>
          <span className="text-sm font-black text-slate-200 ml-2">/ {target}</span>
        </div>
      </div>
      <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-50 p-1">
        <div className={`h-full ${bg} rounded-full transition-all duration-1000 ease-out relative group-hover:brightness-110`} style={{ width: `${percent}%` }}>
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 skew-x-20"></div>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 4. 複合コンポーネント (Complex Components)
// ==========================================

const GoalSection = ({ title, subTitle, data, goals, variant, headerAction }) => {
  const isGold = variant === "gold";
  const accentColor = isGold ? "text-amber-600" : "text-indigo-600";
  const barColor = isGold ? "bg-amber-500" : "bg-indigo-500";
  const headerBg = isGold ? "bg-amber-50" : "bg-indigo-50";
  
  const safeGoals = goals || {};

  return (
    <div className="premium-card p-8 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${isGold ? 'from-amber-100/20' : 'from-indigo-100/20'} to-transparent rounded-bl-[5rem] -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-700 pointer-events-none`}></div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${headerBg} ${accentColor} shadow-sm border border-white`}>
            <Icon p={isGold ? I.Trophy : I.Calendar} size={24} strokeWidth={2}/>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 leading-none mb-1">{title}達成目標</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{subTitle}</p>
          </div>
        </div>
        {headerAction}
      </div>

      <div className="mb-10 relative z-10">
        <MainMetric 
          label="商談成約数" 
          icon={I.Briefcase}
          current={data.deals} 
          target={safeGoals.deals} 
          color={accentColor} 
          bg={barColor}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 relative z-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">アポインター実績</span>
          </div>
          <MetricBar label="アポ数" val={data.appts} tgt={safeGoals.appts} color="bg-emerald-500" />
          <MetricBar label="架電数" val={data.calls} tgt={safeGoals.calls} color="bg-slate-700" />
          <MetricBar label="アポ見込み数" val={data.apoProspects} tgt={safeGoals.apoProspects} color="bg-cyan-500" />
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">クローザー実績</span>
          </div>
          <MetricBar label="実施商談数" val={data.meetings} tgt={safeGoals.meetings} color="bg-purple-600" />
          <MetricBar label="商談見込み数" val={data.dealProspects} tgt={safeGoals.prospects} color="bg-amber-500" />
          <MetricBar label="失注数" val={data.lost} tgt={safeGoals.lost} color="bg-rose-400" />
        </div>
      </div>
    </div>
  );
};



const Dashboard = ({ event, totals, memberStats, currentBaseDate, setCurrentBaseDate, activeWeeklyGoals, eventReports, members, userRole, currentUserEmail }) => {
  const [activeSubTab, setActiveSubTab] = useState('summary'); // 'summary' or 'my' or 'charts'
  const [showHelp, setShowHelp] = useState(false);
  const [drilldownMember, setDrilldownMember] = useState(null);

  const g = {
    total: event.goals?.total || {},
    weekly: activeWeeklyGoals || event.goals?.weekly || {} 
  };

  const currentMember = useMemo(() => members.find(m => m.email === currentUserEmail) || members[0], [members, currentUserEmail]);

  const wr = getWeekRange(currentBaseDate);
  const weekRangeString = `${wr.start.getMonth()+1}/${wr.start.getDate()} - ${wr.end.getMonth()+1}/${wr.end.getDate()}`;
  
  const shiftDate = (amount, unit) => {
    const newDate = new Date(currentBaseDate);
    if(unit === 'month') newDate.setMonth(newDate.getMonth() + amount);
    else if(unit === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
    else newDate.setDate(newDate.getDate() + amount);
    setCurrentBaseDate(newDate);
  };

  // 自分の統計（今日・今週）
  const myStats = useMemo(() => {
    if (!currentMember) return null;
    const mid = currentMember.id;
    const now = new Date();
    const todayStr = toLocalDateString(now);

    const todayReps = eventReports.filter(r => r.memberId === mid && r.date && toLocalDateString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)) === todayStr);
    const weekReps = eventReports.filter(r => {
      if (!r.date || r.memberId !== mid) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return d >= wr.start && d <= wr.end;
    });

    return {
      today: {
        appts: todayReps.reduce((s, r) => s + (Number(r.appts)||0), 0),
        calls: todayReps.reduce((s, r) => s + (Number(r.calls)||0), 0),
        requests: todayReps.reduce((s, r) => s + (Number(r.requests)||0), 0),
      },
      weekly: {
        appts: weekReps.reduce((s, r) => s + (Number(r.appts)||0), 0),
        calls: weekReps.reduce((s, r) => s + (Number(r.calls)||0), 0),
        requests: weekReps.reduce((s, r) => s + (Number(r.requests)||0), 0),
      }
    };
  }, [currentMember, eventReports, wr]);

  const statsToShow = drilldownMember ? memberStats.find(s => s.id === drilldownMember.id) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* モバイル版サブタブ（デスクトップでは非表示） */}
      <div className="flex md:hidden bg-slate-100 p-1 rounded-2xl shadow-inner mb-4">
        <button onClick={() => setActiveSubTab('my')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeSubTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
          自分
        </button>
        <button onClick={() => setActiveSubTab('summary')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeSubTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
          全体
        </button>
        <button onClick={() => setActiveSubTab('charts')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeSubTab === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
          分析
        </button>
      </div>

      {/* ヘルプアイコン */}
      <div className="fixed top-6 right-6 z-40 md:relative md:top-0 md:right-0 md:flex md:justify-end">
        <button onClick={() => setShowHelp(true)} className="p-3 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-slate-100 text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all">
          <Icon p={I.Info} size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左側：個人・チームサマリー (lg:span-8) */}
        <div className={`lg:col-span-8 space-y-8 ${(activeSubTab !== 'my' && activeSubTab !== 'summary') ? 'hidden md:block' : ''}`}>
          
          {/* 自分モード (今日・今週の結果) */}
          {(activeSubTab === 'my' || !window.innerWidth < 768) && (
            <div className="space-y-6">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Icon p={I.User} size={18}/></div>
                 自分モード
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 今日 */}
                  <div className="premium-card p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden shadow-2xl">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                     <div className="relative z-10">
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Today's Results</p>
                        <h4 className="text-sm font-bold opacity-80 mb-6">今日の結果</h4>
                        <div className="grid grid-cols-3 gap-4">
                           <div className="text-center">
                              <div className="text-4xl font-black">{myStats?.today.appts || 0}</div>
                              <div className="text-[9px] font-black uppercase opacity-60 mt-1">アポ</div>
                           </div>
                           <div className="text-center">
                              <div className="text-4xl font-black">{myStats?.today.requests || 0}</div>
                              <div className="text-[9px] font-black uppercase opacity-60 mt-1">資料</div>
                           </div>
                           <div className="text-center border-l border-white/10">
                              <div className="text-4xl font-black opacity-40">{myStats?.today.calls || 0}</div>
                              <div className="text-[9px] font-black uppercase opacity-30 mt-1">架電</div>
                           </div>
                        </div>
                     </div>
                  </div>
                  {/* 今週 */}
                  <div className="premium-card p-8 bg-white border border-slate-100 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                     <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Weekly Performance</p>
                        <h4 className="text-sm font-bold text-slate-800 mb-6">今週の成果</h4>
                        <div className="space-y-4">
                           <MetricBar label="アポ数" val={myStats?.weekly.appts || 0} tgt={event.individualWeeklyGoals?.[getMondayKey(currentBaseDate)]?.[currentMember?.id]?.appts || 0} color="bg-emerald-500" />
                           <MetricBar label="資料送付数" val={myStats?.weekly.requests || 0} tgt={event.individualWeeklyGoals?.[getMondayKey(currentBaseDate)]?.[currentMember?.id]?.requests || 0} color="bg-blue-500" />
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* 全体ファネル分析 (タブ：全体) */}
          {(activeSubTab === 'summary' || !window.innerWidth < 768) && (
            <div className="premium-card p-8 bg-white border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-48 h-48 bg-slate-50/50 rounded-full blur-3xl -ml-24 -mt-24 pointer-events-none"></div>
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Icon p={I.TrendingUp} size={20}/></div>
                  プロジェクト全体ファネル
                </h3>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                   <button onClick={() => shiftDate(-7, 'week')} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all"><Icon p={I.ChevronLeft} size={16}/></button>
                   <span className="text-[10px] font-black text-slate-600 px-2">{weekRangeString}</span>
                   <button onClick={() => shiftDate(7, 'week')} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all"><Icon p={I.ChevronRight} size={16}/></button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
                {Object.entries(BREAKDOWN_LABELS).map(([key, label]) => (
                  <div key={key} className="p-5 rounded-3xl bg-slate-50/50 border border-transparent hover:border-indigo-100 hover:bg-white transition-all group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</div>
                    <div className="text-2xl font-black text-slate-800 group-hover:text-indigo-600">{funnelData[key] || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* メンバー一覧・ドリルダウン */}
          {(activeSubTab === 'summary' || !window.innerWidth < 768) && (
            <div className="space-y-6">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Icon p={I.Users} size={18}/></div>
                 メンバー別状況
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => setDrilldownMember(m)}
                      className="premium-card p-6 flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all text-left bg-white border border-slate-100 shadow-sm group"
                    >
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black ${m.role==='closer' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {m.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-black text-slate-800">{m.name}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.role === 'closer' ? 'クローザー' : 'アポインター'}</div>
                          </div>
                       </div>
                       <Icon p={I.ChevronRight} size={20} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
                    </button>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* 右側：全体目標・サマリー (lg:span-4) */}
        <div className={`lg:col-span-4 space-y-8 ${(activeSubTab !== 'charts') ? 'hidden md:block' : ''}`}>
           {/* 管理者のみ：予測収益/金額データ */}
           {userRole === 'admin' && (
             <div className="premium-card p-8 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-6">管理者専用パネル</h3>
                <div className="space-y-8">
                   <div>
                      <p className="text-[10px] font-black opacity-50 uppercase mb-1">予測成約収益</p>
                      <div className="text-3xl font-black text-white">¥{(totals.total.deals * 300000).toLocaleString()}<span className="text-sm font-medium opacity-40 ml-2">est.</span></div>
                   </div>
                   <div>
                      <p className="text-[10px] font-black opacity-50 uppercase mb-1">現在のコスト (概算)</p>
                      <p className="text-xl font-black text-slate-400">¥{(totals.total.hours * 1500).toLocaleString()}</p>
                   </div>
                </div>
             </div>
           )}

           <div className="premium-card p-8 bg-white border border-slate-100 shadow-sm h-fit">
              <h3 className="font-black text-lg text-slate-800 mb-8 border-b border-slate-50 pb-4 flex items-center justify-between">
                 <span>プロジェクト目標</span>
                 <Icon p={I.Target} size={20} className="text-indigo-600" />
              </h3>
              <div className="space-y-8">
                 <MainMetric label="通算アポ" icon={I.Check} current={totals.total.appts} target={g.total.appts} color="text-emerald-500" bg="bg-emerald-500" />
                 <MainMetric label="今週アポ" icon={I.Calendar} current={totals.weekly.appts} target={g.weekly.appts} color="text-indigo-500" bg="bg-indigo-500" />
                 <MainMetric label="通算成約" icon={I.Trophy} current={totals.total.deals} target={g.total.deals} color="text-amber-500" bg="bg-amber-500" />
              </div>
           </div>

           <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
              <Icon p={I.Zap} size={32} className="absolute top-4 right-4 opacity-20" />
              <h3 className="font-black text-lg mb-4">目標ペース分析</h3>
              <p className="text-xs text-indigo-100 font-bold leading-relaxed">
                今週の目標達成には、あと <span className="text-white text-lg">{Math.max(0, g.weekly.appts - totals.weekly.appts)} 件</span> のアポが必要です。
                平均アポ率から逆算すると、チーム全体で <span className="text-white text-lg">{Math.ceil((g.weekly.appts - totals.weekly.appts) / 0.05)} 回</span> の架電が推奨されます。
              </p>
           </div>
        </div>
      </div>

      {/* ドリルダウン・メンバー詳細モーダル */}
      {drilldownMember && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto p-4 md:py-10">
              <div className="bg-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                 <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                       <button onClick={() => setDrilldownMember(null)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all active:scale-90"><Icon p={I.X}/></button>
                       <div>
                          <h2 className="text-2xl font-black text-slate-900 leading-none">{drilldownMember.name} さんの分析</h2>
                          <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{drilldownMember.role}</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-8 space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <StatItem label="累計架電" val={statsToShow?.calls || 0} highlight />
                       <StatItem label="累計アポ" val={statsToShow?.appts || 0} highlight color="text-emerald-500" />
                       <StatItem label="アポ率" val={`${statsToShow?.calls > 0 ? ((statsToShow.appts/statsToShow.calls)*100).toFixed(1) : 0}%`} highlight color="text-indigo-600" />
                       <StatItem label="稼働時間" val={`${statsToShow?.hours || 0}h`} highlight />
                    </div>
                    
                    <div className="premium-card p-8 bg-slate-50 border border-slate-100">
                       <h4 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest">重要KPI 進捗</h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          <MetricBar label="架電数" val={statsToShow?.calls || 0} tgt={1000} color="bg-slate-600" />
                          <MetricBar label="アポ数" val={statsToShow?.appts || 0} tgt={20} color="bg-emerald-500" />
                          <MetricBar label="資料送付" val={statsToShow?.requests || 0} tgt={50} color="bg-blue-500" />
                       </div>
                    </div>

                    <div className="bg-indigo-600 rounded-3xl p-8 text-white">
                      <h4 className="text-lg font-black mb-4">メンバー個別アドバイス</h4>
                      <p className="text-sm text-indigo-50 font-bold leading-relaxed">
                        {drilldownMember.name}さんは現在、リード獲得後の「資料送付率」が非常に高い水準にあります。
                        一方でアポ獲得率がやや平均を下回っているため、資料送付の打診時に「資料だけでは伝わらない具体的な導入事例」をセットで提示することを意識してみてください。
                      </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 用語解説モーダル */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in zoom-in-95 duration-300 p-4">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                 <h3 className="text-2xl font-black text-slate-900">指標の見方・解説</h3>
                 <button onClick={() => setShowHelp(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><Icon p={I.X}/></button>
              </div>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                 <div className="space-y-2">
                    <h4 className="font-black text-indigo-600 flex items-center gap-2"><Icon p={I.TrendingUp} size={16}/> パフォーマンス予測</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">現在の「CPH（時間あたりのアポ数）」と残りの目標数から、目標達成に必要な稼働時間を逆算しています。+の数字が出ている場合は、目標を前倒しで達成できるペースです。</p>
                 </div>
                 <div className="space-y-2">
                    <h4 className="font-black text-emerald-600 flex items-center gap-2"><Icon p={I.Zap} size={16}/> 必要強度 (Pace)</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">目標達成のために「今日」「今週」どれだけの行動量が必要かを示します。赤字で不足分が出ている場合は、架電のスピードを上げるか、時間を確保する必要があります。</p>
                 </div>
                 <div className="space-y-2">
                    <h4 className="font-black text-amber-600 flex items-center gap-2"><Icon p={I.Briefcase} size={16}/> 俯瞰モード (チーム)</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">プロジェクト全体の進捗を把握するためのモードです。メンバーの役割（アポインター/クローザー）ごとに、どのプロセスで滞留が起きているかを可視化します。</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};


const AttendanceView = ({ members, reports, onEdit }) => {

  const [selectedMonth, setSelectedMonth] = useState(toLocalMonthString(new Date())); 
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const apoMembers = members.filter(m => m.role !== 'closer');
  
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (!r.date) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return toLocalMonthString(d) === selectedMonth && 
             (selectedMemberId ? r.memberId === selectedMemberId : true) && 
             (r.hours > 0 || (r.startTime && r.endTime));
    }).sort((a,b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));
  }, [reports, selectedMonth, selectedMemberId]);

  const calculateSalary = (hours, hourlyWage) => {
    if (!hourlyWage) return 0;
    return Math.floor(hours * hourlyWage);
  };

  const totalHours = filteredReports.reduce((s, r) => s + (Number(r.hours) || 0), 0);
  const totalSalary = selectedMemberId ? filteredReports.reduce((s, r) => {
    const member = members.find(m => m.id === r.memberId);
    return s + calculateSalary(Number(r.hours) || 0, member?.hourlyWage || 0);
  }, 0) : 0;

  const formatDate = (ts) => { if (!ts) return ""; const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000); return `${d.getMonth()+1}/${d.getDate()}`; };
  const formatDay = (ts) => { if (!ts) return ""; const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000); return ['日','月','火','水','木','金','土'][d.getDay()]; };
  const handlePrint = () => window.print();

  const printData = useMemo(() => {
    const data = {};
    filteredReports.forEach(r => {
      const member = members.find(m => m.id === r.memberId);
      if (!data[r.memberId]) {
        data[r.memberId] = { name: member?.name || 'Unknown', hourlyWage: member?.hourlyWage || 0, logs: [], totalHours: 0, totalSalary: 0 };
      }
      const hours = Number(r.hours) || 0;
      const dailySalary = calculateSalary(hours, member?.hourlyWage || 0);
      data[r.memberId].logs.push({ ...r, dailySalary });
      data[r.memberId].totalHours += hours;
      data[r.memberId].totalSalary += dailySalary;
    });
    return Object.values(data);
  }, [filteredReports, members]);

  return (
    <>
      <div className="space-y-6 animate-in fade-in no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Icon p={I.Clock} size={20}/></div>稼働管理</h2>
          <button onClick={handlePrint} className="flex items-center gap-2 text-sm font-bold text-white bg-gray-900 px-5 py-2.5 rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all active:scale-95"><Icon p={I.Download} size={16}/> PDF出力</button>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">対象月</label><input type="month" className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} /></div>
            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">メンバー個別表示</label><select className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}><option value="">全員表示</option>{apoMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 p-5 rounded-2xl text-white shadow-lg shadow-gray-200"><span className="text-sm font-bold opacity-80">稼働時間の合計</span><span className="text-3xl font-black">{totalHours}<span className="text-sm font-medium ml-1 opacity-60">h</span></span></div>
            {selectedMemberId && (<div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 rounded-2xl text-white shadow-lg shadow-emerald-200"><span className="text-sm font-bold opacity-80">支払予定額</span><span className="text-3xl font-black">¥{totalSalary.toLocaleString()}</span></div>)}
          </div>
        </div>
        <div className="space-y-3 pb-20">
          <div className="text-[10px] font-bold text-gray-400 px-4 flex justify-between uppercase tracking-wider"><span>日付</span><span className="flex-1 text-center pl-8">時間帯</span><span>合計時間</span></div>
          {filteredReports.map(r => (<div key={r.id} onClick={() => onEdit(r)} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all cursor-pointer active:scale-95"><div className="w-20"><div className="font-bold text-gray-800 text-lg">{formatDate(r.date)}</div><div className="text-[10px] font-bold text-gray-400 uppercase">{formatDay(r.date)}</div></div><div className="flex-1 text-center">{r.startTime && r.endTime ? (<span className="bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">{r.startTime} - {r.endTime}</span>) : <span className="text-gray-300 text-xl">···</span>}{(!selectedMemberId && r.memberId) && (<div className="text-[10px] font-bold text-indigo-500 mt-1">{members.find(m => m.id === r.memberId)?.name}</div>)}</div><div className="w-24 text-right"><div className="font-black text-xl text-gray-800">{r.hours}<span className="text-xs text-gray-400 font-medium ml-0.5">h</span></div>{selectedMemberId && members.find(m => m.id === r.memberId)?.hourlyWage > 0 && (<div className="text-[10px] font-bold text-emerald-600">¥{Math.floor(r.hours * members.find(m => m.id === r.memberId).hourlyWage).toLocaleString()}</div>)}</div></div>))}
        </div>
      </div>
      <div className="print-wrapper" style={{ display: 'none' }}>
        <div className="max-w-4xl mx-auto font-sans text-gray-900">
          <div className="flex justify-between items-end border-b-2 border-gray-900 pb-6 mb-10"><div><h1 className="text-4xl font-extrabold tracking-tight mb-2">給与明細 (稼働詳細)</h1><p className="text-lg font-medium text-gray-600">{selectedMonth.replace("-", "年")}月分</p></div><div className="text-right"><p className="text-sm font-bold text-gray-500">発行日: {new Date().toLocaleDateString('ja-JP')}</p><p className="text-xl font-bold mt-2">振込元: 森平心</p></div></div>
          <div className="space-y-12">
            {printData.map((pd, i) => (
              <div key={i} style={{ pageBreakInside: 'avoid', marginBottom: '40px' }}><div className="flex justify-between items-center mb-4 bg-gray-100 p-4 rounded-lg"><div><h3 className="text-2xl font-bold">{pd.name} <span className="text-sm font-normal text-gray-500 ml-2">様</span></h3>{pd.hourlyWage > 0 && <p className="text-sm text-gray-500 mt-1">時給: ¥{Number(pd.hourlyWage).toLocaleString()}</p>}</div><div className="text-right"><span className="text-sm font-bold text-gray-500 mr-2 block">合計支給額</span><span className="text-3xl font-black">¥{pd.totalSalary.toLocaleString()}</span></div></div><table className="w-full text-sm border-collapse"><thead><tr className="border-b-2 border-gray-300"><th className="p-3 text-left w-24 font-bold text-gray-500">日付</th><th className="p-3 text-center font-bold text-gray-500">開始時間</th><th className="p-3 text-center font-bold text-gray-500">終了時間</th><th className="p-3 text-right w-20 font-bold text-gray-500">稼働時間</th><th className="p-3 text-right w-24 font-bold text-gray-500">日給</th></tr></thead><tbody>{pd.logs.map((log, j) => (<tr key={j} className="border-b border-gray-200"><td className="p-3 font-bold">{formatDate(log.date)} <span className="text-xs text-gray-400 ml-1">({formatDay(log.date)})</span></td><td className="p-3 text-center font-mono">{log.startTime || '-'}</td><td className="p-3 text-center font-mono">{log.endTime || '-'}</td><td className="p-3 text-right font-bold">{log.hours}h</td><td className="p-3 text-right font-bold text-gray-800">¥{log.dailySalary.toLocaleString()}</td></tr>))}</tbody></table><div className="mt-4 text-right pr-4"><span className="text-sm font-bold text-gray-500 mr-4">合計稼働時間: {pd.totalHours}h</span></div></div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const ShiftView = ({ members, shifts, onDeleteShift, onAddShift }) => {
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showShiftInput, setShowShiftInput] = useState(false);
  const [targetDateForInput, setTargetDateForInput] = useState("");

  const getShiftsForDay = (dateObj) => {
    const dateStr = toLocalDateString(dateObj);
    return shifts.filter(s => s.date === dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
  };

  // Month View Helpers
  const getMonthDays = (baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const paddingStart = firstDay.getDay();
    
    // Previous month padding
    for(let i=0; i<paddingStart; i++) days.push(null);
    // Current month days
    for(let i=1; i<=lastDay.getDate(); i++) days.push(new Date(year, month, i));
    
    return days;
  };

  // Week View Helpers
  const getWeekDays = (baseDate) => {
    const wr = getWeekRange(baseDate);
    const days = [];
    const d = new Date(wr.start);
    while (d <= wr.end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const shiftDate = (amount, unit) => {
    const newDate = new Date(currentDate);
    if(unit === 'month') newDate.setMonth(newDate.getMonth() + amount);
    else if(unit === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
    else newDate.setDate(newDate.getDate() + amount);
    setCurrentDate(newDate);
  };

  const handlePrev = () => shiftDate(-1, viewMode === 'day' ? 'day' : viewMode === 'week' ? 'week' : 'month');
  const handleNext = () => shiftDate(1, viewMode === 'day' ? 'day' : viewMode === 'week' ? 'week' : 'month');
  
  const formatHeaderDate = () => {
    if(viewMode === 'month') return `${currentDate.getFullYear()}年 ${currentDate.getMonth()+1}月`;
    if(viewMode === 'day') return `${currentDate.getMonth()+1}/${currentDate.getDate()} (${['日','月','火','水','木','金','土'][currentDate.getDay()]})`;
    const wr = getWeekRange(currentDate);
    return `${wr.start.getMonth()+1}/${wr.start.getDate()} - ${wr.end.getMonth()+1}/${wr.end.getDate()}`;
  };

  const formatDayOfWeek = (i) => ['日','月','火','水','木','金','土'][i];

  return (
    <>
      <div className="space-y-4 animate-in fade-in pb-24 h-full flex flex-col">
        {/* Header Control */}
        <div className="flex flex-col gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-pink-50 text-pink-500 rounded-xl"><Icon p={I.Calendar} size={20}/></div>
              シフト管理
            </h2>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={()=>setViewMode('month')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode==='month' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>月間</button>
              <button onClick={()=>setViewMode('week')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode==='week' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>週間</button>
              <button onClick={()=>setViewMode('day')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode==='day' ? 'bg-white shadow-sm text-pink-500' : 'text-gray-400'}`}>日間</button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button onClick={handlePrev} className="p-2 hover:bg-gray-50 rounded-xl text-gray-500"><Icon p={I.ChevronLeft}/></button>
            <span className="text-lg font-black text-gray-800">{formatHeaderDate()}</span>
            <button onClick={handleNext} className="p-2 hover:bg-gray-50 rounded-xl text-gray-500"><Icon p={I.ChevronRight}/></button>
          </div>
        </div>

        {/* Calendar Views */}
        <div className="flex-1 overflow-y-auto">
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
              <div className="grid grid-cols-7 mb-2 text-center">
                {[0,1,2,3,4,5,6].map(i => <div key={i} className={`text-[10px] font-bold uppercase ${i===0?'text-red-400':i===6?'text-blue-400':'text-gray-400'}`}>{formatDayOfWeek(i)}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthDays(currentDate).map((d, i) => {
                  if(!d) return <div key={i} className="aspect-square bg-gray-50/30 rounded-lg"></div>;
                  const dayShifts = getShiftsForDay(d);
                  const isToday = toLocalDateString(d) === toLocalDateString(new Date());
                  return (
                    <div 
                      key={i} 
                      onClick={() => { setTargetDateForInput(toLocalDateString(d)); setShowShiftInput(true); }}
                      className={`aspect-square rounded-xl p-1 relative border transition-all cursor-pointer hover:border-pink-300 active:scale-95 ${isToday ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-100'}`}
                    >
                      <span className={`text-xs font-bold absolute top-1 left-1.5 ${isToday?'text-pink-600':'text-gray-700'}`}>{d.getDate()}</span>
                      <div className="absolute bottom-1 right-1 left-1 flex flex-wrap gap-0.5 justify-end content-end">
                        {dayShifts.slice(0, 4).map(s => {
                          const m = members.find(m => m.id === s.memberId);
                          return m ? <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${m.role==='closer'?'bg-amber-400':'bg-sky-400'}`}></div> : null;
                        })}
                        {dayShifts.length > 4 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="space-y-3">
              {getWeekDays(currentDate).map(d => {
                const dayShifts = getShiftsForDay(d);
                const isToday = toLocalDateString(d) === toLocalDateString(new Date());
                return (
                  <div key={d.toISOString()} className={`bg-white rounded-2xl p-4 border ${isToday ? 'border-pink-200 ring-1 ring-pink-100' : 'border-gray-100'}`}>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center min-w-[2.5rem]">
                        <span className={`text-[10px] font-bold uppercase ${d.getDay()===0?'text-red-400':d.getDay()===6?'text-blue-400':'text-gray-400'}`}>{formatDayOfWeek(d.getDay())}</span>
                        <span className={`text-xl font-black ${isToday?'text-pink-500':'text-gray-800'}`}>{d.getDate()}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        {dayShifts.length === 0 ? <div className="text-xs font-bold text-gray-200 py-1">シフトなし</div> : 
                          <div className="grid grid-cols-1 gap-2">
                            {dayShifts.map(s => {
                              const mem = members.find(m => m.id === s.memberId);
                              if (!mem) return null;
                              return (
                                <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black text-white ${mem.role==='closer'?'bg-amber-400':'bg-sky-400'}`}>{mem.name.slice(0,1)}</div>
                                    <span className="text-xs font-bold text-gray-700">{mem.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono font-bold text-gray-500">{s.startTime}-{s.endTime}</span>
                                    <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete?')) onDeleteShift(s.id); }} className="text-gray-300 hover:text-red-400"><Icon p={I.X} size={14}/></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        }
                      </div>
                      <button onClick={() => { setTargetDateForInput(d.toISOString().slice(0,10)); setShowShiftInput(true); }} className="p-1 text-gray-300 hover:text-pink-500"><Icon p={I.Plus} size={18}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div className="bg-white rounded-3xl p-6 border border-gray-100 min-h-[50vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">本日の予定</h3>
                <button onClick={() => { setTargetDateForInput(toLocalDateString(currentDate)); setShowShiftInput(true); }} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">シフトを追加</button>
              </div>
              <div className="space-y-4">
                {getShiftsForDay(currentDate).length === 0 ? <div className="text-center py-10 text-gray-300 font-bold">予定されているシフトはありません</div> : 
                  getShiftsForDay(currentDate).map(s => {
                    const mem = members.find(m => m.id === s.memberId);
                    if (!mem) return null;
                    return (
                      <div key={s.id} className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-sm ${mem.role==='closer'?'bg-amber-400':'bg-sky-400'}`}>{mem.name.slice(0,1)}</div>
                         <div className="ml-4 flex-1">
                           <div className="font-bold text-gray-800">{mem.name}</div>
                           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{mem.role}</div>
                         </div>
                         <div className="text-right mr-4">
                           <div className="text-lg font-black text-gray-800 font-mono">{s.startTime}</div>
                           <div className="text-xs font-bold text-gray-400">to {s.endTime}</div>
                         </div>
                         <button onClick={() => { if(window.confirm('Delete?')) onDeleteShift(s.id); }} className="p-2 text-gray-300 hover:text-red-400"><Icon p={I.Trash} size={20}/></button>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>

        {/* Floating Action Button for Shift - Adjusted position on mobile to avoid overlap */}
        <div className="fixed bottom-44 right-6 z-30 md:bottom-10 md:right-28">
           <button onClick={() => { setTargetDateForInput(""); setShowShiftInput(true); }} className="bg-pink-500 text-white p-4 rounded-full shadow-xl shadow-pink-500/40 hover:scale-110 active:scale-95 transition-all border-4 border-white">
             <Icon p={I.Plus} size={28} />
           </button>
        </div>
      </div>

      {showShiftInput && (
        <ShiftInputModal 
          members={members} 
          initialDate={targetDateForInput} 
          onAdd={onAddShift} 
          onClose={() => setShowShiftInput(false)} 
        />
      )}
    </>
  );
};

const ShiftInputModal = ({ members, initialDate, onAdd, onClose }) => {
  const [val, setVal] = useState({ memberId: '', date: initialDate || toLocalDateString(new Date()), startTime: '10:00', endTime: '19:00' });
  
  const submit = (e) => {
    e.preventDefault();
    if (!val.memberId || !val.date || !val.startTime || !val.endTime) return alert("全ての項目を入力してください");
    onAdd(val);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-in fade-in duration-300 text-gray-900 p-4">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Icon p={I.Calendar}/> シフト追加</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><Icon p={I.X}/></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">スタッフ</label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <label key={m.id} className={`px-3 py-2 rounded-xl border cursor-pointer font-bold transition-all text-xs flex items-center gap-2 ${val.memberId===m.id ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-200' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-300'}`}>
                  <input type="radio" name="mem" value={m.id} className="hidden" onChange={e=>setVal({...val, memberId: e.target.value})} />
                  {m.name}
                </label>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">日時</label>
            <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-pink-100" value={val.date} onChange={e => setVal({...val, date: e.target.value})} />
          </div>

          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">開始</label>
              <input type="time" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none text-center focus:ring-2 focus:ring-pink-100" value={val.startTime} onChange={e => setVal({...val, startTime: e.target.value})} />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">終了</label>
              <input type="time" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none text-center focus:ring-2 focus:ring-pink-100" value={val.endTime} onChange={e => setVal({...val, endTime: e.target.value})} />
            </div>
          </div>

          <button className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-all active:scale-95">シフトを保存</button>
        </form>
      </div>
    </div>
  );
};
const AnalyticsView = ({ members, reports, event, userRole }) => {
  const [selectedMemberId, setSelectedMemberId] = useState("all");
  
  const filteredReports = useMemo(() => {
    return selectedMemberId === "all" ? reports : reports.filter(r => r.memberId === selectedMemberId);
  }, [reports, selectedMemberId]);

  const stats = useMemo(() => {
    return filteredReports.reduce((acc, r) => ({
      appts: acc.appts + (Number(r.appts)||0),
      calls: acc.calls + (Number(r.calls)||0),
      requests: acc.requests + (Number(r.requests)||0),
      deals: acc.deals + (Number(r.deals)||0),
      picConnected: acc.picConnected + (Number(r.picConnected)||0) + (Number(r.appts)||0),
    }), { appts: 0, calls: 0, requests: 0, deals: 0, picConnected: 0 });
  }, [filteredReports]);

  const apptRate = (stats.appts / (stats.calls || 1)) * 100;
  const requestRate = (stats.requests / (stats.calls || 1)) * 100;
  const connectionRate = (stats.picConnected / (stats.calls || 1)) * 100;
  const closeRate = stats.appts > 0 ? (stats.deals / stats.appts) * 100 : 0;

  const aiAdvice = useMemo(() => {
    const memName = selectedMemberId === 'all' ? 'チーム全体' : members.find(m => m.id === selectedMemberId)?.name;
    
    if (!stats.calls) return "まだ十分な活動データが蓄積されていません。まずは100件程度の架電を目指して数値を入力していきましょう。";
    
    let advice = `【${memName}さんの深層分析レポート】\n\n`;

    if (apptRate < 1) {
      advice += "現状、架電数に対するアポ率が1%を下回っており、大きなボトルネックとなっています。";
      if (connectionRate > 30) {
        advice += "本人接続はできているものの、そこからの『ベネフィット提示』で断られているケースが多いようです。相手の課題を深掘りする質問から始めてみてください。";
      } else {
        advice += "そもそも受付突破の段階で苦戦している可能性があります。架電の時間帯を14:00〜16:00の『比較的手が空きやすい時間』にスライドしてみるか、フロントトークのトーンを0.5音分高く設定して『信頼感』を演出してみてください。";
      }
    } else if (apptRate >= 3) {
      advice += "非常に高いアポ率（3.0%以上）を維持できています！これはトークの質が極めて高い証拠です。";
      advice += "現在の質の高さを維持しつつ、もし行動量を1.2倍に増やすことができれば、チーム内で圧倒的なトップパフォーマーとして君臨できます。";
    } else {
      advice += "アポ率は安定していますが、さらなる向上の余地があります。";
    }

    if (requestRate > 8) {
      advice += "\n\nまた、資料送付率が非常に高いですね。これは『まずは資料だけでも』という断り文句を逆手に取れているか、あるいはアポの打診が少し慎重になりすぎているかもしれません。資料送付が決まった瞬間に『お手元に届く頃を見計らって、5分だけ解説の時間をいただけませんか？』とアポへの布石を打つ練習をしましょう。";
    }

    return advice;
  }, [stats, selectedMemberId, members, apptRate, requestRate, connectionRate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><Icon p={I.PieChart} size={20}/></div>
          データ詳細・AI分析
        </h2>
        <select 
          className="bg-white border border-slate-200 p-3 rounded-2xl font-bold text-slate-700 outline-none shadow-sm focus:ring-4 focus:ring-indigo-50"
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
        >
          <option value="all">プロジェクト全体</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="premium-card p-6 border-b-4 border-slate-400">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">架電数</div>
           <div className="text-3xl font-black text-slate-800">{stats.calls}</div>
        </div>
        <div className="premium-card p-6 border-b-4 border-blue-500">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">資料送付</div>
           <div className="text-3xl font-black text-blue-600">{stats.requests}</div>
        </div>
        <div className="premium-card p-6 border-b-4 border-emerald-500">
           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">アポ数</div>
           <div className="text-3xl font-black text-emerald-600">{stats.appts}</div>
        </div>
        {userRole === 'admin' && (
          <div className="premium-card p-6 border-b-4 border-amber-500">
             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">成約数</div>
             <div className="text-3xl font-black text-amber-600">{stats.deals}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* グラフエリア */}
         <div className="premium-card p-8 space-y-8">
            <h3 className="font-black text-lg text-slate-800">ファネルボリューム</h3>
            <div className="h-64 flex items-end gap-4 md:gap-8 px-4">
              <ChartBar label="架電" value={stats.calls} max={Math.max(stats.calls * 1.1, 100)} color="bg-slate-400" />
              <ChartBar label="送付" value={stats.requests} max={stats.calls} color="bg-blue-500" />
              <ChartBar label="アポ" value={stats.appts} max={stats.calls} color="bg-emerald-500" />
            </div>
         </div>

         {/* AIアドバイザー（強化版） */}
         <div className="premium-card p-8 bg-slate-900 border-none relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10 flex items-center gap-3 mb-6">
               <div className="p-2 bg-indigo-500 rounded-lg animate-pulse"><Icon p={I.Zap} size={20} color="white" /></div>
               <h3 className="font-black text-xl text-white">AIアドバイザー・深層分析</h3>
            </div>
            <div className="relative z-10 flex-1">
               <pre className="text-indigo-100 text-sm leading-relaxed font-bold whitespace-pre-wrap font-sans">
                 {aiAdvice}
               </pre>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
               <div className="flex-1 text-center">
                  <div className="text-xl font-black text-emerald-400">{connectionRate.toFixed(1)}%</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">接続率</div>
               </div>
               <div className="flex-1 text-center">
                  <div className="text-xl font-black text-indigo-400">{apptRate.toFixed(1)}%</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">アポ率</div>
               </div>
            </div>
         </div>
      </div>

      {/* メンバー比較テーブル */}
      {selectedMemberId === "all" && (
        <div className="premium-card p-8 bg-white border border-slate-100">
           <h3 className="font-black text-xl text-slate-800 mb-8">リーグ・ランキング (架電効率)</h3>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                   <th className="pb-4 text-left">Player</th>
                   <th className="pb-4 text-center">Efficiency (Appt%)</th>
                   <th className="pb-4 text-center">Volume</th>
                   <th className="pb-4 text-right">Trend</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {members.map(m => {
                   const mReps = reports.filter(r => r.memberId === m.id);
                   const mC = mReps.reduce((s,r)=>s+(Number(r.calls)||0), 0);
                   const mA = mReps.reduce((s,r)=>s+(Number(r.appts)||0), 0);
                   const rate = mC > 0 ? (mA / mC) * 100 : 0;
                   return (
                     <tr key={m.id} className="group">
                       <td className="py-6">
                         <div className="flex items-center gap-4">
                           <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                           <span className="font-black text-slate-700">{m.name}</span>
                         </div>
                       </td>
                       <td className="py-6 text-center">
                          <div className={`text-lg font-black ${rate > 3 ? 'text-emerald-500' : 'text-slate-900'}`}>{rate.toFixed(1)}%</div>
                       </td>
                       <td className="py-6 text-center font-bold text-slate-400">{mC} calls</td>
                       <td className="py-6 text-right">
                          <div className="inline-flex items-center gap-1 text-emerald-500 font-black text-xs">
                             <Icon p={I.TrendingUp} size={14} /> Stable
                          </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

function InputModal({ members, onAdd, onUpdate, onDelete, onClose, initialData = null }) {
  const today = toLocalDateString(new Date());
  const [val, setVal] = useState({ 
    memberId: '', date: today, 
    calls: '', appts: '', requests: '', prospects: '', lost: '', deals: '', hours: '', startTime: '', endTime: '',
    noAnswer: '', receptionRefusal: '', picAbsent: '', picConnected: '', outOfTarget: ''
  });
  
  useEffect(() => {
    if (initialData) {
      let dateStr = today;
      if (initialData.date) {
        const d = initialData.date.toDate ? initialData.date.toDate() : new Date(initialData.date);
        dateStr = toLocalDateString(d);
      }
      setVal({ 
        ...initialData, 
        date: dateStr, 
        calls: initialData.calls || '', 
        appts: initialData.appts || '', 
        requests: initialData.requests || '', 
        prospects: initialData.prospects || '', 
        lost: initialData.lost || '', 
        deals: initialData.deals || '', 
        hours: initialData.hours || '', 
        startTime: initialData.startTime || '', 
        endTime: initialData.endTime || '',
        noAnswer: initialData.noAnswer || '',
        receptionRefusal: initialData.receptionRefusal || '',
        picAbsent: initialData.picAbsent || '',
        picConnected: initialData.picConnected || '',
        outOfTarget: initialData.outOfTarget || ''
      });
    }
  }, [initialData]);

  const selectedMember = members.find(m => m.id === val.memberId);
  const isCloser = selectedMember?.role === 'closer';
  const isEditMode = !!initialData;

  useEffect(() => {
    if (val.startTime && val.endTime && (!initialData || val.startTime !== initialData.startTime || val.endTime !== initialData.endTime)) {
      const start = new Date(`2000-01-01T${val.startTime}`);
      const end = new Date(`2000-01-01T${val.endTime}`);
      if (end > start) {
        const diff = (end - start) / (1000 * 60 * 60);
        setVal(prev => ({ ...prev, hours: diff.toFixed(1) }));
      }
    }
  }, [val.startTime, val.endTime]);

  const submit = (e) => {
    e.preventDefault();
    if (!val.memberId) return alert("Please select a member");
    
    // Auto-calculate Total Calls if breakdown is provided? 
    // Or just save as is. User requested "Breakdown", so we save all.
    const data = { 
      ...val, 
      calls: Number(val.calls), appts: Number(val.appts), requests: Number(val.requests), 
      prospects: Number(val.prospects), lost: Number(val.lost), deals: Number(val.deals), 
      hours: Number(val.hours),
      noAnswer: Number(val.noAnswer),
      receptionRefusal: Number(val.receptionRefusal),
      picAbsent: Number(val.picAbsent),
      picConnected: Number(val.picConnected),
      outOfTarget: Number(val.outOfTarget)
    };
    
    if (isEditMode) onUpdate(data); else onAdd(data);
    onClose();
  };
  
  const handleDelete = () => {
    if (window.confirm("この記録を削除しますか？")) { onDelete(initialData.id); onClose(); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-500 md:items-center md:justify-center no-print text-slate-900 overflow-hidden">
      <div className="w-full h-full md:max-w-2xl md:h-auto md:max-h-[90vh] bg-white md:rounded-[2.5rem] shadow-2xl flex flex-col relative overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
             <button onClick={onClose} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-all active:scale-90"><Icon p={I.X}/></button>
             {isEditMode && <button onClick={handleDelete} className="p-2.5 bg-rose-50 hover:bg-rose-100 rounded-full text-rose-500 transition-all"><Icon p={I.Trash} size={20}/></button>}
          </div>
          <h2 className="font-black text-xl tracking-tight">{isEditMode ? '記録の修正' : '稼働報告'}</h2>
          <div className="w-12"/>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-8 space-y-10">
          <section className="space-y-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block ml-1">Basic Info</label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" value={val.date} onChange={e => setVal({...val, date: e.target.value})} />
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <label key={m.id} className={`px-4 py-3 rounded-2xl border cursor-pointer font-bold transition-all text-xs flex items-center gap-2 ${val.memberId===m.id ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-slate-100 bg-white text-slate-500 hover:border-slate-300 shadow-sm'}`}>
                      <input type="radio" name="mem" value={m.id} className="hidden" onChange={e=>setVal({...val, memberId: e.target.value})} />
                      {m.name}
                    </label>
                  ))}
                </div>
             </div>
          </section>

          {selectedMember && (
            <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-10">
              {!isCloser ? (
                <>
                  <section className="space-y-5">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl w-fit">Working Hours</div>
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase text-center block">Start</label><input type="time" className="w-full p-3 rounded-xl bg-white font-bold text-center border border-slate-100" value={val.startTime} onChange={e=>setVal({...val, startTime: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase text-center block">End</label><input type="time" className="w-full p-3 rounded-xl bg-white font-bold text-center border border-slate-100" value={val.endTime} onChange={e=>setVal({...val, endTime: e.target.value})} /></div>
                       <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase text-center block">Total (H)</label><input type="number" step="0.5" className="w-full p-3 rounded-xl bg-transparent font-black text-2xl text-center outline-none" value={val.hours} onChange={e=>setVal({...val, hours: e.target.value})} /></div>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl w-fit">Results Breakdown</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <InputItem label="全体架電" icon={I.Phone} val={val.calls} set={v=>setVal({...val, calls: v})} color="text-slate-400" />
                       <InputItem label="不在" icon={I.Clock} val={val.noAnswer} set={v=>setVal({...val, noAnswer: v})} />
                       <InputItem label="受付拒否" icon={I.Ban} val={val.receptionRefusal} set={v=>setVal({...val, receptionRefusal: v})} />
                       <InputItem label="担当不在" icon={I.Users} val={val.picAbsent} set={v=>setVal({...val, picAbsent: v})} />
                       <InputItem label="本人接続" icon={I.Zap} val={val.picConnected} set={v=>setVal({...val, picConnected: v})} color="text-indigo-500" />
                       <InputItem label="資料請求" icon={I.FileText} val={val.requests} set={v=>setVal({...val, requests: v})} color="text-blue-500" />
                       <InputItem label="アポ" icon={I.Check} val={val.appts} set={v=>setVal({...val, appts: v})} color="text-emerald-500" />
                       <InputItem label="対象外" icon={I.X} val={val.outOfTarget} set={v=>setVal({...val, outOfTarget: v})} />
                       <InputItem label="見込み" icon={I.Help} val={val.prospects} set={v=>setVal({...val, prospects: v})} color="text-amber-500" />
                    </div>
                  </section>
                </>
              ) : (
                <section className="space-y-6">
                  <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 flex flex-col items-center">
                    <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-4">商談成約数</div>
                    <input type="number" className="w-48 bg-white p-6 rounded-[2rem] text-5xl font-black text-center shadow-xl shadow-amber-200/50 outline-none" value={val.deals} onChange={e=>setVal({...val, deals: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputItem label="商談見込み" icon={I.Help} val={val.prospects} set={v=>setVal({...val, prospects: v})} color="text-amber-500" />
                    <InputItem label="失注数" icon={I.Ban} val={val.lost} set={v=>setVal({...val, lost: v})} color="text-rose-500" />
                  </div>
                </section>
              )}
            </div>
          )}
          
          <button className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg shadow-2xl shadow-slate-200 transition-all hover:bg-black active:scale-[0.98]">
            {isEditMode ? '修正内容を保存' : '稼働を報告する'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Settings({ events, currentEventId, onAddEvent, onDeleteEvent, onUpdateGoals, onUpdateWeeklyGoals, members, onAddMember, onDelMember, onClose }) {
  const cur = events.find(e => e.id === currentEventId) || {};
  const [targetDate, setTargetDate] = useState(new Date()); 
  const [goals, setGoals] = useState({ total: {}, weekly: {} });
  const [memberGoals, setMemberGoals] = useState({}); // { memberId: { appts, calls, requests } }
  
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newMem, setNewMem] = useState("");
  const [newRole, setNewRole] = useState("apo");
  const [newHourlyWage, setNewHourlyWage] = useState("");
  const targetWeekKey = useMemo(() => getMondayKey(targetDate), [targetDate]);

  useEffect(() => {
    if (cur.goals) {
      const specificWeeklyGoal = cur.weeklyGoals?.[targetWeekKey] || cur.goals.weekly || {};
      const individualWeeklyGoal = cur.individualWeeklyGoals?.[targetWeekKey] || {};
      setGoals({
        total: cur.goals.total || {},
        weekly: specificWeeklyGoal
      });
      setMemberGoals(individualWeeklyGoal);
    }
  }, [cur, targetWeekKey]);

  const saveGoals = () => { 
    if (currentEventId) { 
      onUpdateGoals(currentEventId, { ...cur.goals, total: goals.total });
      onUpdateWeeklyGoals(currentEventId, targetWeekKey, goals.weekly, memberGoals);
      alert(`${getWeekRange(targetDate).start.toLocaleDateString()} の週の目標（個別目標含む）を保存しました。`); 
    } 
  };
  const updateGoalVal = (type, key, val) => { setGoals(prev => ({ ...prev, [type]: { ...prev[type], [key]: Number(val) } })); };
  const updateIndividualGoalVal = (memberId, key, val) => {
    setMemberGoals(prev => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [key]: Number(val) }
    }));
  };
  const shiftWeek = (days) => { const newDate = new Date(targetDate); newDate.setDate(newDate.getDate() + days); setTargetDate(newDate); };
  const wr = getWeekRange(targetDate);
  const weekRangeLabel = `${wr.start.getMonth()+1}/${wr.start.getDate()} - ${wr.end.getMonth()+1}/${wr.end.getDate()}`;

  return (
    <div className="space-y-10 md:grid md:grid-cols-2 md:gap-10 md:space-y-0 pb-24 no-print animate-in fade-in duration-700">
      <div className="md:col-span-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-4 bg-white rounded-full shadow-lg shadow-slate-200/50 hover:bg-slate-50 transition-all active:scale-90"><Icon p={I.X}/></button>
          <h2 className="font-black text-3xl text-slate-900 tracking-tight">各種設定</h2>
        </div>
      </div>

      <div className="space-y-10">
        {/* プロジェクト・イベント管理 */}
        <section className="premium-card p-8 space-y-8">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Icon p={I.Trophy} size={20}/></div>
            プロジェクト管理
          </h3>
          <div className="space-y-4">
            <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" placeholder="プロジェクト名（例: 26卒イベント）" value={newEventName} onChange={e=>setNewEventName(e.target.value)} />
            <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" placeholder="終了予定日 (YYYY-MM-DD)" value={newEventDate} onChange={e=>setNewEventDate(e.target.value)} />
            <button onClick={() => { if(newEventName){ onAddEvent(newEventName, newEventDate); setNewEventName(""); setNewEventDate(""); }}} className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-sm hover:bg-black transition-all">プロジェクトを追加</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {events.map(e => (
              <div key={e.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentEventId===e.id ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-50'}`}>
                 <span className={`font-bold text-sm ${currentEventId===e.id ? 'text-indigo-900' : 'text-slate-600'}`}>{e.name}</span>
                 <button onClick={() => {if(window.confirm(`${e.name} を削除しますか？`)) onDeleteEvent(e.id)}} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Icon p={I.Trash} size={18}/></button>
              </div>
            ))}
          </div>
        </section>

        {/* メンバー登録 */}
        <section className="premium-card p-8 space-y-8">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Icon p={I.Users} size={20}/></div>
            チームメンバー管理
          </h3>
          <div className="flex flex-col gap-4">
             <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" placeholder="名前" value={newMem} onChange={e=>setNewMem(e.target.value)} />
             <div className="grid grid-cols-2 gap-4">
                <select className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none cursor-pointer" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                    <option value="apo">アポインター</option>
                    <option value="closer">クローザー</option>
                </select>
                <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none" placeholder="時給 (円)" type="number" value={newHourlyWage} onChange={e=>setNewHourlyWage(e.target.value)} />
             </div>
             <button onClick={()=>{if(newMem){onAddMember(newMem, newRole, newHourlyWage); setNewMem(""); setNewHourlyWage("");}}} className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all text-center">メンバーを追加</button>
          </div>
          <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {members.map(m => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <span className="text-xs font-black text-slate-700">{m.name}</span>
                <button onClick={()=>onDelMember(m.id)} className="opacity-0 group-hover:opacity-100 p-2 text-rose-300 hover:text-rose-500 transition-all"><Icon p={I.X} size={14}/></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-10 h-fit">
        {/* 目標数値設定 */}
        <section className="premium-card p-10 space-y-10 border-indigo-200/30">
          <div className="flex items-center justify-between border-b border-slate-50 pb-6">
             <h3 className="font-black text-2xl text-slate-800 tracking-tight">目標値の設定</h3>
             <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => shiftWeek(-7)} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all"><Icon p={I.ChevronLeft} size={16}/></button>
                <div className="px-4 flex items-center text-[10px] font-black text-slate-700 uppercase tracking-widest">{weekRangeLabel}</div>
                <button onClick={() => shiftWeek(7)} className="p-2 hover:bg-white rounded-lg text-slate-500 transition-all"><Icon p={I.ChevronRight} size={16}/></button>
             </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">プロジェクト全体の目標</label>
              <div className="grid grid-cols-2 gap-4">
                <GoalRow label="アポ数" val={goals.total?.appts} set={v=>updateGoalVal('total','appts',v)} />
                <GoalRow label="成約数" val={goals.total?.deals} set={v=>updateGoalVal('total','deals',v)} />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">選択した週の週間目標</label>
              <div className="grid grid-cols-2 gap-4">
                <GoalRow label="アポ数" val={goals.weekly?.appts} set={v=>updateGoalVal('weekly','appts',v)} />
                <GoalRow label="成約数" val={goals.weekly?.deals} set={v=>updateGoalVal('weekly','deals',v)} />
                <GoalRow label="架電数" val={goals.weekly?.calls} set={v=>updateGoalVal('weekly','calls',v)} />
                <GoalRow label="商談数" val={goals.weekly?.meetings} set={v=>updateGoalVal('weekly','meetings',v)} />
              </div>
            </div>
            <div className="space-y-6 pt-4 border-t border-slate-50">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">メンバー別 週間個別目標</label>
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {members.filter(m => m.role !== 'closer').map(m => (
                  <div key={m.id} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                       <span className="text-xs font-black text-slate-700">{m.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">架電</label>
                        <input type="number" className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs font-bold text-center outline-none" value={memberGoals[m.id]?.calls || 0} onChange={e=>updateIndividualGoalVal(m.id, 'calls', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">資料</label>
                        <input type="number" className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs font-bold text-center outline-none" value={memberGoals[m.id]?.requests || 0} onChange={e=>updateIndividualGoalVal(m.id, 'requests', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">アポ</label>
                        <input type="number" className="w-full bg-white border border-slate-100 rounded-lg p-2 text-xs font-bold text-center outline-none" value={memberGoals[m.id]?.appts || 0} onChange={e=>updateIndividualGoalVal(m.id, 'appts', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button onClick={saveGoals} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-black">
            <Icon p={I.Check} size={28} strokeWidth={3}/> 目標を保存する
          </button>
        </section>
      </div>
    </div>
  );
}

// ==========================================
// 6. アプリ本体
// ==========================================
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

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
      alert("ログインに失敗しました。");
    }
  };

  const handleLogout = () => signOut(auth);

  useEffect(() => {
    if (isOffline || !auth) { setConnectionStatus("offline"); return; }

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setConnectionStatus("connected");
        // ロール判定
        if (u.email === ADMIN_EMAIL) {
          setUserRole('admin');
        } else {
          // Firestoreのmembersコレクションから引くことも可能だが、一旦安全策
          setUserRole('member');
        }

        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (s) => {
          const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
          if (list.length === 0) {
            const newEvent = { name: "イベント 2026", date: "2026-06-30", goals: defaultGoals, weeklyGoals: {}, createdAt: Timestamp.now() };
            addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), newEvent);
          } else {
            setEvents(list);
            if (!currentEventId && list.length > 0) setCurrentEventId(list[0].id);
          }
        });
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (s) => {
          const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
          setMembers(list);
          // ログインユーザーがメンバー一覧にいない場合、自動追加（簡易紐付け）
          if (u.email && !list.find(m => m.email === u.email)) {
            addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), { 
              name: u.displayName || "New Member", 
              email: u.email, 
              role: u.email === ADMIN_EMAIL ? 'closer' : 'apo',
              hourlyWage: 0,
              createdAt: Timestamp.now() 
            });
          }
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

  const activeEvent = useMemo(() => events.find(e => e.id === currentEventId) || { goals: defaultGoals }, [events, currentEventId]);
  
  const totals = useMemo(() => {
    const wr = getWeekRange(currentBaseDate);
    const weeklyData = reports.filter(r => {
      if (!r.date || r.eventId !== currentEventId) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return d >= wr.start && d <= wr.end;
    });
    const totalData = reports.filter(r => r.eventId === currentEventId);

    const sum = (arr) => arr.reduce((acc, r) => ({
      appts: acc.appts + (Number(r.appts) || 0),
      calls: acc.calls + (Number(r.calls) || 0),
      requests: acc.requests + (Number(r.requests) || 0),
      meetings: acc.meetings + (Number(r.meetings) || 0),
      deals: acc.deals + (Number(r.deals) || 0),
      lost: acc.lost + (Number(r.lost) || 0),
      hours: acc.hours + (Number(r.hours) || 0),
    }), { appts: 0, calls: 0, requests: 0, meetings: 0, deals: 0, lost: 0, hours: 0 });

    return { weekly: sum(weeklyData), total: sum(totalData) };
  }, [reports, currentEventId, currentBaseDate]);

  const memberStats = useMemo(() => {
    return members.map(m => {
      const mReps = reports.filter(r => r.memberId === m.id && r.eventId === currentEventId);
      const appts = mReps.reduce((s, r) => s + (Number(r.appts) || 0), 0);
      const hours = mReps.reduce((s, r) => s + (Number(r.hours) || 0), 0);
      const calls = mReps.reduce((s, r) => s + (Number(r.calls) || 0), 0);
      const requests = mReps.reduce((s, r) => s + (Number(r.requests) || 0), 0);
      return { 
        id: m.id, name: m.name, role: m.role, appts, hours, calls, requests,
        cph: hours > 0 ? (appts / hours).toFixed(2) : "0.00"
      };
    });
  }, [members, reports, currentEventId]);

  if (connectionStatus === "unauthenticated" || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
         <div className="w-full max-w-md bg-white rounded-[3rem] p-12 shadow-2xl space-y-10 text-center animate-in zoom-in-95 duration-700">
            <div className="space-y-4">
               <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-xl shadow-indigo-100 mb-8">
                  <Icon p={I.Target} size={48} color="white" strokeWidth={2.5} />
               </div>
               <h1 className="text-3xl font-black tracking-tighter">Event KPI Manager</h1>
               <p className="text-slate-400 text-sm font-bold">チームの成果を最大化する、<br/>次世代KPI管理プラットフォーム</p>
            </div>
            <button 
               onClick={handleLogin}
               className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-95"
            >
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
               Googleでログイン
            </button>
            <div className="pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
               <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">System Operational</span>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-6 py-4 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100">
             <Icon p={I.Target} size={20} color="white" strokeWidth={2.5} />
           </div>
           <h1 className="text-xl font-black tracking-tighter">KPI<span className="text-indigo-600">Sync</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
           {connectionStatus === "offline" && <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest"><Icon p={I.WifiOff} size={12}/> Offline Mode</div>}
           <div className="h-8 w-px bg-slate-100 mx-2"></div>
           <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                 <div className="text-xs font-black leading-none mb-0.5">{user.displayName}</div>
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{userRole === 'admin' ? 'Administrator' : 'Team Member'}</div>
              </div>
              <button onClick={handleLogout} className="p-2.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all active:scale-90">
                 <Icon p={I.LogOut} size={20} />
              </button>
           </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {activeTab === 'dashboard' && (
          <Dashboard 
            event={activeEvent} totals={totals} memberStats={memberStats} 
            eventReports={reports} members={members}
            currentBaseDate={currentBaseDate} setCurrentBaseDate={setCurrentBaseDate}
            activeWeeklyGoals={activeEvent.weeklyGoals?.[getMondayKey(currentBaseDate)]}
            userRole={userRole}
            currentUserEmail={user.email}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView members={members} reports={reports} event={activeEvent} userRole={userRole} />}
        {activeTab === 'attendance' && <AttendanceView members={members} reports={reports} onEdit={setEditingReport} />}
        {activeTab === 'shifts' && (
          <ShiftView 
            members={members} shifts={shifts} 
            onAddShift={async (s) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shifts'), { ...s, createdAt: Timestamp.now() })} 
            onDeleteShift={async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', id))} 
          />
        )}
        {activeTab === 'settings' && (
          <Settings 
            events={events} currentEventId={currentEventId} 
            onAddEvent={addEvent} onDeleteEvent={deleteEvent}
            onUpdateGoals={updateEventGoals} onUpdateWeeklyGoals={updateEventWeeklyGoals}
            members={members} onAddMember={addMember} onDelMember={deleteMember}
            onClose={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* モバイル ナビゲーション */}
      <nav className="fixed bottom-6 left-6 right-6 z-50 bg-white/80 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-2 flex items-center justify-between no-print">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Grid} label="HOME" />
        <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.Chart} label="ANALYSIS" />
        <div className="relative -mt-12">
           <button 
             onClick={() => setShowInput(true)} 
             className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl shadow-slate-200 hover:scale-110 active:scale-95 transition-all border-4 border-white"
           >
             <Icon p={I.Plus} size={32} strokeWidth={3} />
           </button>
        </div>
        <NavButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} icon={I.Calendar} label="SHIFTS" />
        <NavButton active={activeTab === 'settings' || activeTab === 'attendance'} onClick={() => setActiveTab(userRole === 'admin' ? 'settings' : 'attendance')} icon={userRole === 'admin' ? I.Settings : I.Clock} label={userRole === 'admin' ? 'ADMIN' : 'WORK'} />
      </nav>

      {showInput && <InputModal members={members} onAdd={addReport} onClose={() => setShowInput(false)} />}
      {editingReport && <InputModal members={members} initialData={editingReport} onUpdate={updateReport} onDelete={deleteReport} onClose={() => setEditingReport(null)} />}
    </div>
  );
}

export default App;

  const addShift = async (shiftData) => {
    const newShift = { ...shiftData, createdAt: Timestamp.now() };
    setShifts(prev => [...prev, { id: "temp_" + Date.now(), ...newShift }]);
    if (db && user) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shifts'), newShift);
    }
  };

  const deleteShift = async (id) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    if (db && user && !id.startsWith("temp_")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shifts', id));
    }
  };

  const currentEvent = events.find(e => e.id === currentEventId) || { goals: defaultGoals, name: "Loading..." };
  const eventReports = reports.filter(r => r.eventId === currentEventId || (!r.eventId && events.length > 0 && events[0].id === currentEventId)); 

  const activeWeeklyGoals = useMemo(() => {
    const currentWeekKey = getMondayKey(currentBaseDate);
    return currentEvent.weeklyGoals?.[currentWeekKey] || currentEvent.goals?.weekly;
  }, [currentEvent, currentBaseDate]);

  const memberRoleMap = useMemo(() => {
    return members.reduce((acc, m) => ({ ...acc, [m.id]: m.role }), {});
  }, [members]);

  const totals = useMemo(() => {
    const calc = (repList) => repList.reduce((acc, r) => {
      const role = memberRoleMap[r.memberId] || 'apo';
      const p = Number(r.prospects) || 0;
      const deals = Number(r.deals) || 0;
      const lost = Number(r.lost) || 0;
      const dealProspects = role === 'closer' ? p : 0;
      const meetings = deals + dealProspects + lost;
      return {
        deals: acc.deals + deals,
        meetings: acc.meetings + meetings,
        apoProspects: acc.apoProspects + (role !== 'closer' ? p : 0),
        dealProspects: acc.dealProspects + dealProspects,
        lost: acc.lost + lost,
        appts: acc.appts + (Number(r.appts)||0),
        calls: acc.calls + (Number(r.calls)||0),
        requests: acc.requests + (Number(r.requests)||0),
      };
    }, { deals: 0, meetings: 0, apoProspects: 0, dealProspects: 0, lost: 0, appts: 0, calls: 0, requests: 0 });

    const total = calc(eventReports);
    const wr = getWeekRange(currentBaseDate);
    const weeklyReports = eventReports.filter(r => {
      if (!r.date) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return d >= wr.start && d <= wr.end;
    });
    const weekly = calc(weeklyReports);
    return { total, weekly };
  }, [eventReports, memberRoleMap, currentBaseDate]);

  const memberStats = useMemo(() => {
    return members.map(m => {
      const myReps = eventReports.filter(r => r.memberId === m.id);
      const myTot = myReps.reduce((acc, r) => ({
        deals: acc.deals + (Number(r.deals)||0),
        prospects: acc.prospects + (Number(r.prospects)||0),
        lost: acc.lost + (Number(r.lost)||0),
        appts: acc.appts + (Number(r.appts)||0),
        calls: acc.calls + (Number(r.calls)||0),
        requests: acc.requests + (Number(r.requests)||0),
        hours: acc.hours + (Number(r.hours)||0),
      }), { deals: 0, prospects: 0, lost: 0, appts: 0, calls: 0, requests: 0, hours: 0 });
      const meetings = myTot.deals + (m.role==='closer' ? myTot.prospects : 0) + myTot.lost;
      return { ...m, ...myTot, meetings, cph: myTot.hours > 0 ? (myTot.calls / myTot.hours).toFixed(1) : "0.0" };
    }).sort((a,b) => b.cph - a.cph);
  }, [members, eventReports]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <style>{`@media print { body > * { display: none !important; } .print-wrapper, .print-wrapper * { display: block !important; } .print-wrapper { position: absolute; left: 0; top: 0; width: 100vw; min-height: 100vh; background: white; z-index: 99999; padding: 40px; } @page { size: A4; margin: 10mm; } }`}</style>
      <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto flex flex-col min-h-screen pb-24 shadow-2xl bg-white md:bg-slate-50 relative">
        <header className="bg-white/90 backdrop-blur sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center md:rounded-b-2xl md:mx-4 md:mt-2 md:shadow-sm no-print">
          <div className="flex flex-col"><div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pl-1">プロジェクトの選択</div><div className="relative group"><select className="appearance-none bg-transparent font-black text-lg text-indigo-900 pr-10 outline-none cursor-pointer" value={currentEventId || ""} onChange={e => setCurrentEventId(e.target.value)}>{events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select><div className="absolute right-0 top-1.5 pointer-events-none text-indigo-900 opacity-50"><Icon p={I.ChevronDown} size={16} /></div></div></div>
          <div className="flex gap-2">{connectionStatus === "offline" && <span className="text-red-400 bg-red-50 p-2 rounded-full"><Icon p={I.WifiOff} size={16}/></span>}<button onClick={() => setActiveTab('settings')} className="p-2 bg-slate-100 rounded-full text-slate-500 active:bg-slate-200"><Icon p={I.Settings} size={20} /></button></div>
        </header>
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {activeTab === 'dashboard' && (<div className="no-print"><Dashboard event={currentEvent} totals={totals} memberStats={memberStats} currentBaseDate={currentBaseDate} setCurrentBaseDate={setCurrentBaseDate} activeWeeklyGoals={activeWeeklyGoals} eventReports={eventReports} members={members} /></div>)}
          {activeTab === 'attendance' && (<AttendanceView members={members} reports={eventReports} onEdit={(report) => setEditingReport(report)} />)}
          {activeTab === 'shift' && (<div className="no-print"><ShiftView members={members} shifts={shifts} onDeleteShift={deleteShift} onAddShift={addShift} /></div>)}
          {activeTab === 'analytics' && (<div className="no-print"><AnalyticsView members={members} reports={eventReports} event={currentEvent} /></div>)}
          {activeTab === 'settings' && (<div className="no-print"><Settings events={events} currentEventId={currentEventId} onAddEvent={addEvent} onDeleteEvent={deleteEvent} onUpdateGoals={updateEventGoals} onUpdateWeeklyGoals={updateEventWeeklyGoals} members={members} onAddMember={addMember} onDelMember={deleteMember} onClose={() => setActiveTab('dashboard')} /></div>)}
        </div>
        {activeTab !== 'settings' && (<div className="fixed bottom-24 right-6 z-30 md:bottom-10 md:right-10 no-print"><button onClick={() => setShowInput(true)} className="bg-indigo-600 text-white p-4 rounded-full shadow-xl shadow-indigo-500/40 hover:scale-110 active:scale-95 transition-all border-4 border-white"><Icon p={I.Plus} size={28} /></button></div>)}
        {(showInput || editingReport) && (<div className="no-print"><InputModal members={members} initialData={editingReport} onAdd={addReport} onUpdate={updateReport} onDelete={deleteReport} onClose={() => { setShowInput(false); setEditingReport(null); }} /></div>)}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto bg-white border-t border-slate-100 flex justify-around items-center p-2 z-20 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:mb-4 md:mx-4 md:rounded-2xl md:border md:shadow-lg no-print">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Briefcase} label="ホーム" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={I.Clock} label="稼働管理" />
          <NavButton active={activeTab === 'shift'} onClick={() => setActiveTab('shift')} icon={I.Calendar} label="シフト" />
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.PieChart} label="データ分析" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={I.Settings} label="設定" />
        </nav>
      </div>
    </div>
  );
}

export default App;