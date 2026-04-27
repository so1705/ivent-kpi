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

const ADMIN_EMAIL = "sotaro50017@gmail.com";

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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {p}
  </svg>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-16 transition-all duration-500 relative group flex-1`}>
    <div className={`transition-all duration-300 z-10 ${active ? 'transform -translate-y-0.5' : 'opacity-40 group-hover:opacity-70'}`}>
      <Icon p={icon} size={22} strokeWidth={active ? 2.5 : 2} color={active ? '#4f46e5' : '#64748b'} />
    </div>
    <span className={`text-[11px] font-black mt-1 tracking-tighter transition-all duration-300 ${active ? 'text-indigo-600' : 'text-slate-400'}`}>{label}</span>
    {active && <div className="absolute top-1 w-8 h-1 bg-indigo-500 rounded-full"></div>}
  </button>
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
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }} />
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
        <div className={`h-full ${bg} rounded-full transition-all duration-1000 ease-out relative`} style={{ width: `${percent}%` }}>
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 skew-x-20"></div>
        </div>
      </div>
    </div>
  );
};

const InputItem = ({ label, icon, val, set }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm focus-within:ring-4 focus-within:ring-indigo-50/50 transition-all group">
    <div className={`text-[9px] font-black uppercase mb-3 flex items-center justify-center gap-2 text-slate-400 group-focus-within:text-indigo-500 transition-colors tracking-[0.2em]`}>
      <Icon p={icon} size={14}/> {label}
    </div>
    <input type="number" className="w-full bg-transparent text-4xl font-black text-slate-900 outline-none text-center placeholder-slate-100" placeholder="0" value={val} onChange={e=>set(e.target.value)} />
  </div>
);

const ChartBar = ({ label, value, max, color }) => {
  const h = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2 group">
      <div className="relative w-full flex-1 flex flex-col justify-end bg-slate-50/50 rounded-t-2xl overflow-hidden shadow-inner">
        <div className={`w-full rounded-t-2xl transition-all duration-1000 ${color} group-hover:brightness-110 relative`} style={{ height: `${h}%` }}>
           <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-white drop-shadow-sm">{value}</div>
           <div className="absolute top-0 left-0 right-0 h-4 bg-white/20 blur-sm"></div>
        </div>
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter text-center leading-tight h-8 flex items-center">{label}</span>
    </div>
  );
};

const LineChart = ({ data, color, label }) => {
  if (!data || data.length === 0) return <div className="h-40 flex items-center justify-center text-slate-300 font-bold">データなし</div>;
  const max = Math.max(...data.map(d => d.value), 10);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.value / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end px-2">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label} - 時系列推移</span>
         <span className="text-sm font-black text-slate-800">MAX: {max}</span>
      </div>
      <div className="h-40 w-full relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={`M0,100 L${points} L100,100 Z`} fill={`url(#grad-${color})`} />
          <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
          {data.map((d, i) => (
            <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - (d.value / max) * 100} r="1.5" fill="white" stroke={color} strokeWidth="1" />
          ))}
        </svg>
        <div className="flex justify-between mt-4">
          {data.map((d, i) => (
            <span key={i} className="text-[8px] font-black text-slate-300 transform -rotate-45">{d.day}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. 各画面コンポーネント (Screens)
// ==========================================

const Dashboard = ({ event, totals, memberStats, currentBaseDate, setCurrentBaseDate, eventReports, members, userRole, currentUserEmail }) => {
  const [activeSubTab, setActiveSubTab] = useState('summary');
  const [drilldownMember, setDrilldownMember] = useState(null);
  const wr = getWeekRange(currentBaseDate);
  const weekRangeString = `${wr.start.getMonth()+1}/${wr.start.getDate()} - ${wr.end.getMonth()+1}/${wr.end.getDate()}`;
  const mondayKey = getMondayKey(currentBaseDate);
  const activeWeeklyGoals = event.weeklyGoals?.[mondayKey] || event.goals?.weekly || {};

  const currentMember = useMemo(() => members.find(m => m.email === currentUserEmail) || members[0], [members, currentUserEmail]);

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
        requests: todayReps.reduce((s, r) => s + (Number(r.requests)||0), 0),
        calls: todayReps.reduce((s, r) => s + (Number(r.calls)||0), 0),
      },
      weekly: {
        appts: weekReps.reduce((s, r) => s + (Number(r.appts)||0), 0),
        requests: weekReps.reduce((s, r) => s + (Number(r.requests)||0), 0),
      }
    };
  }, [currentMember, eventReports, wr]);

  const funnelData = useMemo(() => {
    const list = eventReports.filter(r => {
       if (!r.date) return false;
       const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
       return d >= wr.start && d <= wr.end;
    });
    const sum = (k) => list.reduce((s, r) => s + (Number(r[k])||0), 0);
    return {
      noAnswer: sum('noAnswer'),
      receptionRefusal: sum('receptionRefusal'),
      picAbsent: sum('picAbsent'),
      picConnected: sum('picConnected'),
      requests: sum('requests'),
      appts: sum('appts'),
      outOfTarget: sum('outOfTarget')
    };
  }, [eventReports, wr]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex md:hidden bg-slate-100 p-1 rounded-2xl mb-4">
        <button onClick={() => setActiveSubTab('my')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeSubTab === 'my' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>自分</button>
        <button onClick={() => setActiveSubTab('summary')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeSubTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>全体</button>
        <button onClick={() => setActiveSubTab('charts')} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${activeSubTab === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>分析</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className={`lg:col-span-8 space-y-8 ${(activeSubTab !== 'my' && activeSubTab !== 'summary') ? 'hidden md:block' : ''}`}>
          {(activeSubTab === 'my' || activeSubTab === 'summary') && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Icon p={I.User} size={18}/></div> 自分モード
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="premium-card p-10 bg-gradient-to-br from-slate-900 to-indigo-900 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                  <div className="relative z-10">
                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Daily Performance Pulse</p>
                    <h4 className="text-xl font-black mb-8 flex items-center gap-3"><Icon p={I.Zap} size={20} className="text-amber-400"/> 本日の速報結果</h4>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 text-center"><div className="text-5xl font-black text-white">{myStats?.today.appts || 0}</div><div className="text-[10px] font-black uppercase text-indigo-300 mt-2">アポ</div></div>
                      <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 text-center"><div className="text-5xl font-black text-white">{myStats?.today.requests || 0}</div><div className="text-[10px] font-black uppercase text-indigo-300 mt-2">資料</div></div>
                      <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/10 text-center opacity-40"><div className="text-5xl font-black text-white">{myStats?.today.calls || 0}</div><div className="text-[10px] font-black uppercase text-indigo-300 mt-2">架電</div></div>
                    </div>
                  </div>
                </div>
                <div className="premium-card p-10 bg-white border border-slate-100 shadow-xl relative overflow-hidden">
                  <div className="relative z-10 font-sans">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Conversion funnel status</p>
                    <h4 className="text-xl font-black text-slate-800 mb-8 border-b border-slate-50 pb-4">今週の成果達成度</h4>
                    <div className="space-y-8">
                      <MetricBar label="アポ件数 (目標比)" val={myStats?.weekly.appts || 0} tgt={event.individualWeeklyGoals?.[mondayKey]?.[currentMember?.id]?.appts || 0} color="bg-indigo-600" />
                      <MetricBar label="資料送付件数" val={myStats?.weekly.requests || 0} tgt={event.individualWeeklyGoals?.[mondayKey]?.[currentMember?.id]?.requests || 0} color="bg-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(activeSubTab === 'summary' || activeSubTab === 'my') && (
            <div className="premium-card p-8 bg-white border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-slate-900 text-white rounded-xl shadow-lg"><Icon p={I.TrendingUp} size={20}/></div> 全体ファネル分析
                </h3>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                   <button onClick={() => setCurrentBaseDate(new Date(currentBaseDate.setDate(currentBaseDate.getDate()-7)))} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all"><Icon p={I.ChevronLeft} size={16}/></button>
                   <span className="text-[10px] font-black text-slate-600 px-2">{weekRangeString}</span>
                   <button onClick={() => setCurrentBaseDate(new Date(currentBaseDate.setDate(currentBaseDate.getDate()+14)))} className="p-2 hover:bg-white rounded-lg text-slate-400 transition-all"><Icon p={I.ChevronRight} size={16}/></button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {Object.entries(BREAKDOWN_LABELS).map(([k, label]) => (
                  <div key={k} className="p-5 rounded-3xl bg-slate-50/50 border border-transparent hover:border-indigo-100 transition-all group">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</div>
                    <div className="text-2xl font-black text-slate-800 group-hover:text-indigo-600">{funnelData[k] || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSubTab === 'summary' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 px-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Icon p={I.Users} size={18}/></div> メンバー別状況
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map(m => (
                  <button key={m.id} onClick={() => setDrilldownMember(m)} className="premium-card p-6 flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all text-left bg-white border border-slate-100 shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black ${m.role==='closer' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}> {m.name.slice(0, 2)} </div>
                        <div><div className="font-black text-slate-800">{m.name}</div><div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.role === 'closer' ? 'クローザー' : 'アポインター'}</div></div>
                     </div>
                     <Icon p={I.ChevronRight} size={20} className="text-slate-200" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`lg:col-span-4 space-y-8 ${(activeSubTab !== 'charts') ? 'hidden md:block' : ''}`}>
           {userRole === 'admin' && (
             <div className="premium-card p-8 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-6">管理者専用パネル</h3>
                <div className="space-y-8 font-sans">
                   <div><p className="text-[10px] font-black opacity-50 uppercase mb-1">予測成約収益 (単価30万円時)</p><div className="text-3xl font-black text-white">¥{(totals.total.deals * 300000).toLocaleString()}</div></div>
                   <div><p className="text-[10px] font-black opacity-50 uppercase mb-1">想定コスト (時給1500円換算)</p><p className="text-xl font-black text-slate-400">¥{(totals.total.hours * 1500).toLocaleString()}</p></div>
                </div>
             </div>
           )}
           <div className="premium-card p-8 bg-white border border-slate-100 shadow-sm">
              <h3 className="font-black text-lg text-slate-800 mb-8 border-b border-slate-50 pb-4">全体目標</h3>
              <div className="space-y-8">
                 <MainMetric label="通算アポ" icon={I.Check} current={totals.total.appts} target={event.goals?.total?.appts} color="text-emerald-500" bg="bg-emerald-500" />
                 <MainMetric label="今週アポ" icon={I.Calendar} current={totals.weekly.appts} target={activeWeeklyGoals.appts} color="text-indigo-500" bg="bg-indigo-500" />
                 <MainMetric label="通算成約" icon={I.Trophy} current={totals.total.deals} target={event.goals?.total?.deals} color="text-amber-500" bg="bg-amber-500" />
              </div>
           </div>
        </div>
      </div>

      {drilldownMember && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto md:py-10">
              <div className="bg-white rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
                 <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-4">
                       <button onClick={() => setDrilldownMember(null)} className="p-2 bg-slate-100 rounded-full text-slate-500"><Icon p={I.X}/></button>
                       <div><h2 className="text-2xl font-black text-slate-900 leading-none">{drilldownMember.name} さんの分析</h2><p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{drilldownMember.role}</p></div>
                    </div>
                 </div>
                 <div className="p-8 space-y-10 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <div className="p-4 bg-slate-50 rounded-2xl"><div className="text-[8px] font-black text-slate-400 uppercase mb-1">本人接続数</div><div className="text-2xl font-black">{memberStats.find(s=>s.id===drilldownMember.id)?.picConnected || 0}</div></div>
                       <div className="p-4 bg-slate-50 rounded-2xl"><div className="text-[8px] font-black text-slate-400 uppercase mb-1">現在のアポ数</div><div className="text-2xl font-black text-emerald-600">{memberStats.find(s=>s.id===drilldownMember.id)?.appts || 0}</div></div>
                       <div className="p-4 bg-slate-50 rounded-2xl"><div className="text-[8px] font-black text-slate-400 uppercase mb-1">架電単価(CPH)</div><div className="text-2xl font-black text-indigo-600">{memberStats.find(s=>s.id===drilldownMember.id)?.cph || '0.0'}</div></div>
                       <div className="p-4 bg-slate-50 rounded-2xl"><div className="text-[8px] font-black text-slate-400 uppercase mb-1">稼働時間</div><div className="text-2xl font-black">{memberStats.find(s=>s.id===drilldownMember.id)?.hours || 0}h</div></div>
                    </div>
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Icon p={I.Zap} size={48} /></div>
                      <h4 className="text-lg font-black mb-4">AI個別アドバイス</h4>
                      <p className="text-sm text-indigo-100 font-bold leading-relaxed font-sans">
                        {drilldownMember.name}さんは現在、アポ率がチーム平均を大きく上回っています。架電強度(CPH)を維持しながら、1回1回の通話時間を30秒短縮できれば、1日あたりのアポ獲得数をさらに0.5件上乗せできる余地があります。
                      </p>
                    </div>
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
  const fReports = useMemo(() => reports.filter(r => r.date && toLocalMonthString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)) === selectedMonth).sort((a,b)=>b.date.seconds-a.date.seconds), [reports, selectedMonth]);
  const totalH = fReports.reduce((s, r)=>s+(Number(r.hours)||0), 0);
  const totalCost = fReports.reduce((s, r) => {
    const m = members.find(mem => mem.id === r.memberId);
    return s + (Number(r.hours)||0) * (Number(m?.hourlyWage)||1500);
  }, 0);

  return (
    <div className="space-y-8 animate-in fade-in pb-24 font-sans">
       <div className="flex items-center justify-between"><h2 className="text-2xl font-black flex items-center gap-3"><div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Icon p={I.Clock} size={20}/></div> 稼働・コスト統計</h2><input type="month" className="bg-white border-2 border-slate-100 p-3 rounded-2xl font-bold shadow-sm" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} /></div>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><Icon p={I.Clock} size={120} /></div>
             <div className="relative z-10"><span className="font-black opacity-60 uppercase tracking-widest text-[10px] block mb-2">Total Project Hours</span><span className="text-5xl font-black">{totalH}<span className="text-xl opacity-30 ml-2">h</span></span></div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10"><Icon p={I.Trophy} size={120} /></div>
             <div className="relative z-10"><span className="font-black opacity-60 uppercase tracking-widest text-[10px] block mb-2">Estimated Personnel Cost</span><span className="text-4xl font-black">¥{totalCost.toLocaleString()}</span></div>
          </div>
       </div>

       <div className="space-y-4">
          <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest px-2">個別稼働詳細</h3>
          {fReports.map(r => (
            <button key={r.id} onClick={()=>onEdit(r)} className="w-full bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between text-left hover:border-indigo-200 transition-all shadow-sm group">
               <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-indigo-600 group-hover:scale-110 transition-transform"> {members.find(m=>m.id===r.memberId)?.name?.slice(0,1)} </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-slate-400 mb-1 tracking-widest uppercase">{toLocalDateString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000))}</span>
                     <span className="font-black text-lg text-slate-800">{members.find(m=>m.id===r.memberId)?.name || 'Unknown'}</span>
                  </div>
               </div>
               <div className="flex items-center gap-10">
                  <div className="hidden md:flex flex-col items-end">
                     <span className="text-[10px] font-black text-slate-300 uppercase">Cost</span>
                     <span className="font-bold text-slate-400">¥{((Number(r.hours)||0) * (Number(members.find(m=>m.id===r.memberId)?.hourlyWage)||1500)).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-6">
                     {r.startTime && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl">{r.startTime} - {r.endTime}</span>}
                     <span className="text-3xl font-black text-slate-900">{r.hours}<span className="text-sm opacity-30 ml-1">h</span></span>
                  </div>
               </div>
            </button>
          ))}
       </div>
    </div>
  );
};

const ShiftView = ({ members, shifts, onAddShift, onDeleteShift }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

  const wr = getWeekRange(selectedDate);
  const currentMonthArr = useMemo(() => {
    const d = new Date(selectedDate);
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const days = [];
    for (let i = 1; i <= last.getDate(); i++) {
       days.push(toLocalDateString(new Date(y, m, i)));
    }
    return days;
  }, [selectedDate]);
  
  const displayShifts = useMemo(() => {
    if (viewMode === 'day') {
      return shifts.filter(s => s.date === selectedDate).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    } else if (viewMode === 'week') {
      return shifts.filter(s => {
        const d = new Date(s.date);
        return d >= wr.start && d <= wr.end;
      }).sort((a,b)=>a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    } else {
      const monthPrefix = toLocalMonthString(selectedDate);
      return shifts.filter(s => s.date.startsWith(monthPrefix)).sort((a,b)=>a.date.localeCompare(b.date));
    }
  }, [shifts, selectedDate, viewMode, wr]);

  return (
    <div className="space-y-8 animate-in fade-in pb-24 font-sans">
       <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center gap-3"><div className="p-3 bg-pink-500 text-white rounded-2xl shadow-xl shadow-pink-100"><Icon p={I.Calendar} size={24}/></div> シフト高度管理</h2>
            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
               <button onClick={()=>setViewMode('day')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode==='day'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>日別</button>
               <button onClick={()=>setViewMode('week')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode==='week'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>週別</button>
               <button onClick={()=>setViewMode('month')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode==='month'?'bg-white text-pink-500 shadow-sm':'text-slate-400'}`}>月間</button>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
             <Icon p={I.Search} size={20} className="text-slate-300" />
             <input type="date" className="flex-1 bg-transparent font-black text-slate-800 outline-none" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
          </div>
       </div>

       {viewMode === 'month' ? (
         <div className="premium-card p-8 bg-white border border-slate-100 shadow-xl">
           <h3 className="font-black text-slate-800 mb-8 flex justify-between items-center">
             <span>{selectedDate.split('-')[0]}年 {selectedDate.split('-')[1]}月のシフト布陣</span>
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{displayShifts.length} 勤務予定</span>
           </h3>
           <div className="grid grid-cols-7 gap-3 mb-4">
              {['日','月','火','水','木','金','土'].map(d => <div key={d} className="text-center text-[10px] font-black text-slate-300">{d}</div>)}
              {currentMonthArr.map(d => {
                const dayShifts = displayShifts.filter(s => s.date === d);
                return (
                  <div key={d} className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${d === selectedDate ? 'border-pink-200 bg-pink-50' : 'border-transparent bg-slate-50'}`}>
                    <span className={`text-[10px] font-black ${d===selectedDate?'text-pink-600':'text-slate-400'}`}>{d.split('-')[2]}</span>
                    {dayShifts.length > 0 && <div className="flex gap-0.5"><div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>{dayShifts.length > 1 && <div className="w-1.5 h-1.5 rounded-full bg-pink-300"></div>}</div>}
                  </div>
                );
              })}
           </div>
           <div className="mt-8 space-y-3">
              {displayShifts.map(s => {
                const m = members.find(mem=>mem.id===s.memberId);
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <span className="text-[10px] font-black text-slate-400">{s.date}</span>
                    <span className="font-black text-xs text-slate-800">{m?.name}</span>
                    <span className="text-[10px] font-black text-pink-500 bg-white px-2 py-1 rounded-lg border">{s.startTime}-{s.endTime}</span>
                  </div>
                );
              })}
           </div>
         </div>
       ) : (
         <div className="space-y-4">
            {displayShifts.length === 0 ? (
              <div className="p-20 text-center text-slate-300 font-bold bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
                 登録されたシフトはありません
              </div>
            ) : (
              displayShifts.map(s => {
                const m = members.find(mem=>mem.id===s.memberId);
                return (
                  <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between hover:scale-[1.02] transition-all shadow-sm">
                     <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-lg ${m?.role==='closer'?'bg-amber-400 shadow-amber-100':'bg-sky-500 shadow-sky-100'}`}>
                          {m?.name?.slice(0,1)}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-lg">{m?.name}</div>
                          <div className="text-[10px] font-black text-slate-400 flex gap-4 uppercase tracking-widest mt-1">
                             {viewMode === 'week' && <span className="flex items-center gap-1"><Icon p={I.Calendar} size={10}/>{s.date}</span>}
                             <span className="flex items-center gap-1 font-sans text-[11px]"><Icon p={I.Clock} size={10}/>{s.startTime}-{s.endTime}</span>
                          </div>
                        </div>
                     </div>
                     <button onClick={()=>{if(window.confirm('このシフトを削除しますか？')) onDeleteShift(s.id)}} className="p-3 text-rose-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"><Icon p={I.Trash} size={20}/></button>
                  </div>
                );
              })
            )}
         </div>
       )}
       
       <button onClick={()=>setShowModal(true)} className="fixed bottom-32 right-8 w-20 h-20 bg-pink-500 text-white rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center border-4 border-white transition-all active:scale-90 hover:scale-105 hover:rotate-3 z-40">
         <Icon p={I.Plus} size={28} strokeWidth={3}/>
         <span className="text-[8px] font-black uppercase mt-1">Add Shift</span>
       </button>

       {showModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 space-y-8 shadow-2xl relative">
               <button onClick={()=>setShowModal(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 transition-colors"><Icon p={I.X} /></button>
               <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">シフト新規登録</h3>
                  <p className="text-xs text-slate-400 font-bold">メンバーを選択して勤務時間を入力してください</p>
               </div>
               <div className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">担当スタッフ</label>
                   <div className="flex flex-wrap gap-2">
                     {members.map(m => (
                       <button key={m.id} className="px-4 py-2 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-xs hover:border-pink-500 hover:text-pink-500 transition-all"> {m.name} </button>
                     ))}
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">開始</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black focus:border-pink-500 outline-none" defaultValue="10:00" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">終了</label>
                      <input type="time" className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black focus:border-pink-500 outline-none" defaultValue="19:00" />
                    </div>
                 </div>
               </div>
               <button onClick={()=>setShowModal(false)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg hover:bg-black shadow-xl transition-all">この内容で登録</button>
            </div>
         </div>
       )}
    </div>
  );
};

const AnalyticsView = ({ members, reports, event, userRole }) => {
  const [selectedMid, setSelectedMid] = useState('all');
  const [chartMode, setChartMode] = useState('bar'); // 'bar', 'line'
  
  const fReports = selectedMid === 'all' ? reports : reports.filter(r => r.memberId === selectedMid);
  
  const stats = useMemo(() => {
    const s = fReports.reduce((acc, r)=>({ 
      calls: acc.calls+(Number(r.calls)||0), 
      appts: acc.appts+(Number(r.appts)||0), 
      requests: acc.requests+(Number(r.requests)||0), 
      deals: acc.deals+(Number(r.deals)||0),
      noAnswer: acc.noAnswer+(Number(r.noAnswer)||0),
      picAbsent: acc.picAbsent+(Number(r.picAbsent)||0),
      picConnected: acc.picConnected+(Number(r.picConnected)||0),
    }), { calls: 0, appts: 0, requests: 0, deals: 0, noAnswer: 0, picAbsent: 0, picConnected: 0 });
    return s;
  }, [fReports]);

  const dailyTrend = useMemo(() => {
    const sorted = [...fReports].sort((a,b) => a.date.seconds - b.date.seconds);
    const last7 = sorted.slice(-7);
    return last7.map(r => ({
      day: toLocalDateString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)).split('-')[2] + '日',
      value: Number(r.appts) || 0
    }));
  }, [fReports]);

  const apptR = (stats.appts / (stats.calls || 1)) * 100;
  const maxVal = Math.max(stats.calls, stats.appts, stats.requests, stats.deals, 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 font-sans">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black flex items-center gap-4 text-slate-900 leading-tight">
               <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-2xl shadow-indigo-100 flex items-center justify-center"><Icon p={I.PieChart} size={28}/></div> 
               戦略データ分析
            </h2>
            <p className="text-slate-400 font-bold text-sm mt-1 ml-16">個人のクセを見抜き、最適なアクションを導き出す</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex bg-slate-100 p-1 rounded-2xl">
               <button onClick={()=>setChartMode('bar')} className={`p-2 rounded-xl transition-all ${chartMode==='bar'?'bg-white shadow-sm':'text-slate-400'}`}><Icon p={I.Grid} size={18}/></button>
               <button onClick={()=>setChartMode('line')} className={`p-2 rounded-xl transition-all ${chartMode==='line'?'bg-white shadow-sm':'text-slate-400'}`}><Icon p={I.TrendingUp} size={18}/></button>
             </div>
             <select className="bg-white border-2 border-slate-100 p-4 rounded-[1.5rem] font-black text-slate-800 outline-none shadow-xl min-w-[200px]" value={selectedMid} onChange={e=>setSelectedMid(e.target.value)}>
                <option value="all">プロジェクト全体を表示</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
             </select>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="premium-card p-10 bg-white border border-slate-100 shadow-xl flex flex-col h-[400px]">
             {chartMode === 'bar' ? (
                <>
                  <div className="flex justify-between items-start mb-12">
                     <div><h3 className="font-black text-slate-900 text-xl tracking-tight">架電ファネル分析</h3><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Conversion Volume Bar Chart</p></div>
                     <div className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black">リアルタイム</div>
                  </div>
                  <div className="flex-1 flex items-end gap-3 md:gap-6 px-2">
                    <ChartBar label="架電" value={stats.calls} max={maxVal} color="bg-slate-200" />
                    <ChartBar label="担当不在" value={stats.picAbsent} max={maxVal} color="bg-slate-100" />
                    <ChartBar label="資料請求" value={stats.requests} max={maxVal} color="bg-indigo-400" />
                    <ChartBar label="アポ" value={stats.appts} max={maxVal} color="bg-emerald-500" />
                    <ChartBar label="成約" value={stats.deals} max={maxVal} color="bg-amber-400" />
                  </div>
                </>
             ) : (
                <>
                  <div className="flex justify-between items-start mb-8">
                     <div><h3 className="font-black text-slate-900 text-xl tracking-tight">アポ件数：日次トレンド</h3><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-1">Daily Appointment Conversion Line</p></div>
                  </div>
                  <div className="flex-1 mt-6">
                    <LineChart data={dailyTrend} color="#4f46e5" label="アポ獲得数" />
                  </div>
                </>
             )}
          </div>

          <div className="flex flex-col gap-6">
             <div className="grid grid-cols-2 gap-6">
               <div className="premium-card p-8 bg-white border-2 border-slate-100 shadow-sm"><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">本人接続率</div><div className="text-4xl font-black text-slate-900">{((stats.picConnected / (stats.calls || 1)) * 100).toFixed(1)}<span className="text-sm opacity-30">%</span></div></div>
               <div className="premium-card p-8 bg-white border-2 border-indigo-100 shadow-sm"><div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">アポ率 (架電比)</div><div className="text-4xl font-black text-indigo-600">{apptR.toFixed(1)}<span className="text-sm opacity-30">%</span></div></div>
             </div>
             
             <div className="premium-card p-10 bg-slate-900 border-none relative overflow-hidden flex flex-col flex-1 shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-20"><Icon p={I.Zap} size={120} color="#4f46e5" /></div>
                <div className="relative z-10 flex items-center gap-4 mb-8">
                   <div className="p-3 bg-indigo-600 rounded-2xl animate-bounce shadow-2xl shadow-indigo-600/50"><Icon p={I.Zap} size={24} color="white" /></div>
                   <div><h3 className="font-black text-2xl text-white">伝説のテレアポ・マスター分析</h3><p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Master Advisor Insight</p></div>
                </div>
                <div className="relative z-10 text-indigo-100 text-[15px] leading-8 font-black whitespace-pre-wrap font-sans">
                   『10年連続売上トップ』の視点から言わせてもらう。
                   【{selectedMid === 'all' ? '全体' : members.find(m=>m.id===selectedMid)?.name}】のデータを見ると、決定的な「勝機」が隠れているな。

                   注目すべきは、資料請求からアポへの転換タイミングだ。現状の {((stats.appts / (stats.requests || 1)) * 100).toFixed(0)}% という数字は、決して悪くない。だが、プロの仕事はここからだ。
                   まず、架電あたりの「本人接続」をあと5%上げるために、リストの精査とタイミングの再構築が必須。特に16時台の架電の質が、今の君の「勝ち筋」を決定づけるだろう。
                   
                   論理的に考えろ。感情で架電するな。数字を味方につければ、君は業界No.1を狙える。
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const Settings = ({ events, currentEventId, onAddEvent, onDeleteEvent, onUpdateGoals, onUpdateWeeklyGoals, members, onAddMember, onDelMember, onUpdateMember, onClose }) => {
  const [newEName, setNewEName] = useState("");
  const [newMName, setNewMName] = useState("");
  const [newRole, setNewRole] = useState("apo");
  const [newWage, setNewWage] = useState("1500");
  
  return (
    <div className="space-y-12 pb-32 font-sans animate-in fade-in duration-1000">
       <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-5 bg-white rounded-3xl shadow-xl hover:scale-110 transition-all"><Icon p={I.X}/></button>
          <div><h2 className="font-black text-4xl text-slate-900 tracking-tight">高度管理設定</h2><p className="text-slate-400 font-bold text-sm">プロジェクト基盤・チーム構成の管理</p></div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <section className="premium-card p-10 space-y-8 bg-white border border-slate-100 shadow-xl">
             <div className="flex items-center gap-4 border-b border-slate-50 pb-6"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Icon p={I.Trophy} size={24}/></div><h3 className="font-black text-2xl">プロジェクト管理</h3></div>
             <div className="space-y-4">
                <input className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] font-black focus:border-indigo-500 focus:bg-white outline-none transition-all" placeholder="新規プロジェクト名" value={newEName} onChange={e=>setNewEName(e.target.value)} />
                <button onClick={()=>{if(newEName){onAddEvent(newEName, ""); setNewEName("");}}} className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-200">プロジェクトを立ち上げる</button>
             </div>
             <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Projects</p>
                {events.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl font-black group hover:bg-slate-100 transition-colors">
                     <span className="text-slate-700">{e.name}</span>
                     <button onClick={()=>{if(window.confirm('削除しますか？')) onDeleteEvent(e.id)}} className="text-rose-200 hover:text-rose-500 group-hover:scale-110 transition-all"><Icon p={I.Trash} size={20}/></button>
                  </div>
                ))}
             </div>
          </section>

          <section className="premium-card p-10 space-y-8 bg-white border border-slate-100 shadow-xl">
             <div className="flex items-center gap-4 border-b border-slate-50 pb-6"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Icon p={I.Users} size={24}/></div><h3 className="font-black text-2xl">チーム・給与設定</h3></div>
             <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem]">
                <input className="w-full p-4 bg-white border-2 border-transparent rounded-[1.2rem] font-black focus:border-emerald-500 outline-none" placeholder="フルネーム" value={newMName} onChange={e=>setNewMName(e.target.value)} />
                <div className="grid grid-cols-2 gap-4">
                   <select className="p-4 bg-white border-2 border-transparent rounded-[1.2rem] font-black focus:border-emerald-500" value={newRole} onChange={e=>setNewRole(e.target.value)}>
                      <option value="apo">アポインター</option>
                      <option value="closer">CLOSER</option>
                      <option value="admin">管理者(閲覧権限広)</option>
                   </select>
                   <input type="number" className="p-4 bg-white border-2 border-transparent rounded-[1.2rem] font-black focus:border-emerald-500 outline-none" placeholder="時給" value={newWage} onChange={e=>setNewWage(e.target.value)} />
                </div>
                <button onClick={()=>{if(newMName){onAddMember(newMName, newRole, newWage); setNewMName("");}}} className="w-full bg-emerald-600 text-white py-4 rounded-[1.2rem] font-black shadow-xl shadow-emerald-100 hover:scale-[1.02] transition-all">スタッフを登録</button>
             </div>
             <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Roster</p>
                <div className="grid grid-cols-1 gap-3">
                   {members.map(m => (
                     <div key={m.id} className="p-5 bg-white border-2 border-slate-50 rounded-2xl flex items-center justify-between group hover:border-emerald-100 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${m.role==='closer'?'bg-amber-400':m.role==='admin'?'bg-indigo-600':'bg-sky-400'}`}>{m.name.slice(0,1)}</div>
                           <div>
                              <div className="font-black text-slate-800">{m.name}</div>
                              <div className="text-[8px] font-black text-slate-400 uppercase">¥{m.hourlyWage}/h • {m.role}</div>
                           </div>
                        </div>
                        <button onClick={()=>onDelMember(m.id)} className="p-2 text-rose-200 hover:text-rose-500 transition-colors"><Icon p={I.Trash} size={18}/></button>
                     </div>
                   ))}
                </div>
             </div>
          </section>
       </div>
    </div>
  );
};

function InputModal({ members, onAdd, onUpdate, onDelete, onClose, initialData = null }) {
  const [val, setVal] = useState({ memberId: '', date: toLocalDateString(new Date()), calls: '', appts: '', requests: '', prospects: '', lost: '', deals: '', hours: '', startTime: '10:00', endTime: '19:00', noAnswer: '', receptionRefusal: '', picAbsent: '', picConnected: '', outOfTarget: '' });
  useEffect(() => { if (initialData) { const d = initialData.date?.toDate ? initialData.date.toDate() : new Date(initialData.date); setVal({ ...initialData, date: toLocalDateString(d) }); } }, [initialData]);
  const submit = (e) => { e.preventDefault(); if (!val.memberId) return alert("Select member"); const d = { ...val, calls: Number(val.calls), appts: Number(val.appts), requests: Number(val.requests), prospects: Number(val.prospects), lost: Number(val.lost), deals: Number(val.deals), hours: Number(val.hours) }; if (initialData) onUpdate(d); else onAdd(d); onClose(); };
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex flex-col md:items-center md:justify-center p-4">
       <div className="w-full h-full md:max-w-2xl md:h-auto bg-white rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl">
          <div className="p-6 border-b flex justify-between items-center"><button onClick={onClose} className="p-2.5 bg-slate-100 rounded-full text-slate-500"><Icon p={I.X}/></button><h2 className="font-black text-xl">稼働報告</h2><div className="w-10"/></div>
          <form onSubmit={submit} className="flex-1 overflow-y-auto p-8 space-y-8 font-sans">
             <div className="grid grid-cols-2 gap-4"><input type="date" className="p-4 bg-slate-50 border rounded-2xl font-bold" value={val.date} onChange={e=>setVal({...val, date: e.target.value})} /><div className="flex flex-wrap gap-2">{members.map(m => ( <label key={m.id} className={`px-4 py-2 rounded-xl border cursor-pointer font-bold transition-all text-xs ${val.memberId===m.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500'}`}> <input type="radio" value={m.id} className="hidden" onChange={e=>setVal({...val, memberId: e.target.value})} /> {m.name} </label> ))}</div></div>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InputItem label="全体架電" icon={I.Phone} val={val.calls} set={v=>setVal({...val, calls: v})} />
                <InputItem label="アポ" icon={I.Check} val={val.appts} set={v=>setVal({...val, appts: v})} />
                <InputItem label="資料請求" icon={I.FileText} val={val.requests} set={v=>setVal({...val, requests: v})} />
                <InputItem label="本人接続" icon={I.Zap} val={val.picConnected} set={v=>setVal({...val, picConnected: v})} />
                <InputItem label="稼働時間" icon={I.Clock} val={val.hours} set={v=>setVal({...val, hours: v})} />
             </div>
             <button className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg shadow-2xl transition-all active:scale-[0.98]">報告する</button>
          </form>
       </div>
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
  
  const addMember = async (n, r, w) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), { name: n, role: r, hourlyWage: Number(w), createdAt: Timestamp.now() });
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
      if (!r.date || r.eventId !== currentEventId) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return d >= wr.start && d <= wr.end;
    });
    const tD = reports.filter(r => r.eventId === currentEventId);
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
        picConnected: acc.picConnected + (Number(r.picConnected)||0) + (Number(r.appts)||0),
      }), { deals: 0, prospects: 0, lost: 0, appts: 0, calls: 0, requests: 0, hours: 0, picConnected: 0 });
      const meetings = myTot.deals + (m.role==='closer' ? myTot.prospects : 0) + myTot.lost;
      return { ...m, ...myTot, meetings, cph: myTot.hours > 0 ? (myTot.calls / myTot.hours).toFixed(1) : "0.0" };
    }).sort((a,b) => b.cph - a.cph);
  }, [members, reports, currentEventId]);

  if (connectionStatus === "unauthenticated" || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
         <div className="w-full max-w-md bg-white rounded-[3rem] p-12 shadow-2xl space-y-10 text-center animate-in zoom-in-95 duration-700">
            <div className="space-y-4">
               <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-xl shadow-indigo-100 mb-8">
                  <Icon p={I.Target} size={48} color="white" />
               </div>
               <h1 className="text-3xl font-black tracking-tighter">KPI Sync</h1>
               <p className="text-slate-400 text-sm font-bold">次世代KPI管理プラットフォーム</p>
            </div>
            <button onClick={handleLogin} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-2xl flex items-center justify-center gap-4 hover:bg-black transition-all">
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
        <div className="flex items-center gap-3">
           <div className="p-3 bg-indigo-600 rounded-[1.2rem] shadow-2xl shadow-indigo-200 animate-float"><Icon p={I.Target} size={28} color="white" strokeWidth={2.5} /></div>
           <div>
              <h1 className="text-2xl font-black tracking-tighter text-slate-900">イベント<span className="text-indigo-600">KPI</span>アプリ</h1>
              <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Sync Active</span></div>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {connectionStatus === "offline" && <div className="text-rose-500"><Icon p={I.WifiOff} size={20}/></div>}
           <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                 <div className="text-xs font-black">{user.displayName}</div>
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{userRole === 'admin' ? '管理者' : 'メンバー'}</div>
              </div>
              <button onClick={handleLogout} className="p-2.5 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-500 rounded-xl transition-all"><Icon p={I.LogOut} size={20} /></button>
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
            members={members} onAddMember={addMember} onDelMember={deleteMember}
            onClose={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 z-50 bg-white/80 backdrop-blur-2xl border border-slate-200/50 rounded-[2.5rem] shadow-xl p-2 flex items-center justify-between no-print">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Grid} label="ホーム" />
        <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.PieChart} label="分析" />
        <div className="relative -mt-12">
           <button onClick={() => setShowInput(true)} className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white transition-all active:scale-90 hover:scale-105"><Icon p={I.Plus} size={32} strokeWidth={3} /></button>
        </div>
        <NavButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} icon={I.Calendar} label="シフト" />
        <NavButton active={activeTab === 'settings' || activeTab === 'attendance'} onClick={() => setActiveTab(userRole === 'admin' ? 'settings' : 'attendance')} icon={userRole === 'admin' ? I.Settings : I.Clock} label={userRole === 'admin' ? '管理者' : '稼働履歴'} />
      </nav>

      {showInput && <InputModal members={members} onAdd={addReport} onClose={() => setShowInput(false)} />}
      {editingReport && <InputModal members={members} initialData={editingReport} onUpdate={updateReport} onDelete={deleteReport} onClose={() => setEditingReport(null)} />}
    </div>
  );
}

export default App;