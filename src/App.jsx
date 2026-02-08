import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, doc, onSnapshot, addDoc, setDoc, 
  deleteDoc, Timestamp, updateDoc 
} from 'firebase/firestore';

// ==========================================
// 1. System Initialization & Helpers
// ==========================================
const appId = 'tele-apo-manager-v17-final';

// ★あなたのFirebase設定値
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
  // 設定値のチェック（空文字や初期値でないか）
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

const saveLocal = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
};
const loadLocal = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
};

const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.setDate(diff));
  start.setHours(0,0,0,0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23,59,59,999);
  return { start, end };
};

const isSameWeek = (dateObj) => {
  if (!dateObj) return false;
  const d = dateObj.toDate ? dateObj.toDate() : new Date(dateObj.seconds * 1000);
  const { start, end } = getWeekRange();
  return d >= start && d <= end;
};

// ==========================================
// 2. Icon Definitions
// ==========================================
function Icon({ p, size=24, color="currentColor", className="" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {p}
    </svg>
  );
}

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
  Help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  Ban: <><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></>,
  FileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>,
  Download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>
};

// ==========================================
// 3. UI Atomic Components
// ==========================================

function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-20 h-14 rounded-xl transition-all duration-300 ${active ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`transition-all duration-300 ${active ? 'transform scale-110 drop-shadow-md' : ''}`}>
        <Icon p={icon} size={24} strokeWidth={active ? 2 : 1.5} />
      </div>
      <span className={`text-[9px] font-bold mt-1 tracking-wide ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );
}

function GoalRow({ label, val, set }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <input 
        type="number" 
        className="w-24 text-right bg-gray-50 rounded-lg px-2 py-1 font-bold text-gray-900 outline-none border border-transparent focus:border-gray-300 transition-all" 
        value={val || 0} 
        onChange={e=>set(e.target.value)} 
      />
    </div>
  );
}

function InputItem({ label, icon, val, set, step="1", color="text-gray-400" }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-black/5 transition-all">
      <div className={`text-[10px] font-bold uppercase mb-2 flex items-center justify-center gap-1.5 ${color}`}>
        <Icon p={icon} size={12}/> {label}
      </div>
      <input 
        type="number" 
        step={step} 
        className="w-full bg-transparent text-3xl font-black text-gray-900 outline-none text-center placeholder-gray-200" 
        placeholder="0" 
        value={val} 
        onChange={e=>set(e.target.value)} 
      />
    </div>
  );
}

function StatItem({ label, val, highlight, color }) {
  return (
    <div className={`flex flex-col py-2 rounded-lg transition-colors ${highlight ? 'bg-gray-50' : ''}`}>
      <span className="text-[9px] text-gray-400 font-bold mb-1 uppercase tracking-wider">{label}</span>
      <span className={`text-lg font-black ${highlight && color ? color : 'text-gray-800'}`}>{val}</span>
    </div>
  );
}

function MetricBar({ label, val, tgt, color, small }) {
  const percent = tgt > 0 ? Math.min((val/tgt)*100, 100) : 0;
  return (
    <div className={`flex flex-col ${small ? 'gap-1' : 'gap-1.5'}`}>
      <div className="flex justify-between items-end">
        <span className={`font-bold text-gray-500 ${small ? 'text-[10px]' : 'text-xs'}`}>{label}</span>
        <div className="font-bold text-gray-900 leading-none">
          <span className={small ? 'text-xs' : 'text-sm'}>{val}</span>
          {tgt > 0 && <span className="text-[10px] text-gray-300 ml-1">/{tgt}</span>}
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function MainMetric({ label, icon, current, target, color, bg }) {
  const percent = target > 0 ? Math.min((current/target)*100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <div className={`flex items-center gap-2 font-bold ${color}`}>
          <Icon p={icon} size={24}/> 
          <span className="text-2xl tracking-tight">{label}</span>
        </div>
        <div className="text-right">
          <span className="text-5xl font-black text-black tracking-tighter">{current}</span>
          <span className="text-sm font-bold text-gray-300 ml-1">/ {target}</span>
        </div>
      </div>
      <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
        <div className={`h-full ${bg} transition-all duration-1000 ease-out relative`} style={{ width: `${percent}%` }}>
          <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30"></div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. Complex UI Components
// ==========================================

function GoalSection({ title, subTitle, data, goals, variant }) {
  const isGold = variant === "gold";
  const accentColor = isGold ? "text-amber-600" : "text-indigo-600";
  const barColor = isGold ? "bg-amber-500" : "bg-indigo-500";
  const headerBg = isGold ? "bg-amber-50/50" : "bg-indigo-50/50";

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${isGold ? 'from-amber-100/40' : 'from-indigo-100/40'} to-transparent rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700 pointer-events-none`}></div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className={`p-3 rounded-2xl ${headerBg} ${accentColor} shadow-sm`}>
          <Icon p={isGold ? I.Trophy : I.Calendar} size={24}/>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800 leading-tight">{title} Goal</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress Tracker</p>
        </div>
      </div>

      <div className="mb-8 relative z-10">
        <MainMetric 
          label="商談成約数" 
          icon={I.Briefcase}
          current={data.deals} 
          target={goals.deals} 
          color={accentColor} 
          bg={barColor}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-8 relative z-10">
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Apointer</span>
          </div>
          <MetricBar label="アポ数" val={data.appts} tgt={goals.appts} color="bg-emerald-500" />
          <MetricBar label="架電数" val={data.calls} tgt={goals.calls} color="bg-slate-700" />
          <MetricBar label="アポ見込み" val={data.apoProspects} tgt={goals.apoProspects} color="bg-cyan-500" />
        </div>
        
        <div className="space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Closer</span>
          </div>
          <MetricBar label="商談数 (実施)" val={data.meetings} tgt={goals.meetings} color="bg-purple-600" />
          <MetricBar label="商談見込み" val={data.dealProspects} tgt={goals.prospects} color="bg-amber-500" />
          <MetricBar label="失注数" val={data.lost} tgt={goals.lost} color="bg-rose-400" />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. Views
// ==========================================

function Dashboard({ event, totals, memberStats }) {
  const g = event.goals || { total: {}, weekly: {} };
  
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 md:grid md:grid-cols-2 md:gap-8 md:space-y-0">
      <div className="space-y-8">
        <GoalSection title="週間目標" subTitle="Weekly Target" data={totals.weekly} goals={g.weekly} variant="indigo" />
        <GoalSection title="全体目標" subTitle={`${event.date} まで`} data={totals.total} goals={g.total} variant="gold" />
      </div>

      <section className="md:h-full md:flex md:flex-col">
        <div className="flex justify-between items-end mb-4 px-2">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-xl text-gray-600"><Icon p={I.Users} size={20}/></div>
            Members
          </h2>
          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">Ranked by Efficiency</span>
        </div>
        <div className="space-y-4 md:flex-1 md:overflow-y-auto md:pr-2 pb-20 md:pb-0">
          {memberStats.map((m, i) => (
            <div key={m.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/80 transition-all hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${i===0 ? 'bg-black' : 'bg-transparent'}`}></div>
              
              <div className="flex justify-between items-center mb-4 pl-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black border-2 ${m.role === 'closer' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-sky-50 text-sky-700 border-sky-100'}`}>
                    {m.name.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800 text-lg leading-none mb-1">{m.name}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${m.role === 'closer' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                      {m.role === 'closer' ? 'Closer' : 'Apo'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-gray-800">{m.cph}</span>
                  <div className="text-[9px] font-bold text-gray-400 uppercase">Calls / Hour</div>
                </div>
              </div>
              
              <div className="grid grid-cols-6 gap-2 text-center pl-3">
                <StatItem label="成約" val={m.deals} highlight color="text-amber-600" />
                <StatItem label="商談" val={m.meetings} />
                <StatItem label="見込" val={m.prospects} />
                <StatItem label="失注" val={m.lost} />
                <StatItem label="アポ" val={m.appts} highlight color="text-emerald-600" />
                <StatItem label="架電" val={m.calls} />
              </div>
            </div>
          ))}
          {memberStats.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <p className="text-gray-300 font-bold">No Data Available</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AttendanceView({ members, reports }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const apoMembers = members.filter(m => m.role !== 'closer');
  
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (!r.date) return false;
      const d = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      return d.toISOString().slice(0, 7) === selectedMonth && 
             (selectedMemberId ? r.memberId === selectedMemberId : true) && 
             (r.hours > 0 || (r.startTime && r.endTime));
    }).sort((a,b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));
  }, [reports, selectedMonth, selectedMemberId]);

  const totalHours = filteredReports.reduce((s, r) => s + (Number(r.hours) || 0), 0);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return `${d.getMonth()+1}/${d.getDate()}`;
  };
  const formatDay = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return ['日','月','火','水','木','金','土'][d.getDay()];
  };

  const handlePrint = () => window.print();

  const printData = useMemo(() => {
    const data = {};
    filteredReports.forEach(r => {
      if (!data[r.memberId]) data[r.memberId] = { name: members.find(m=>m.id===r.memberId)?.name || 'Unknown', logs: [], total: 0 };
      data[r.memberId].logs.push(r);
      data[r.memberId].total += Number(r.hours) || 0;
    });
    return Object.values(data);
  }, [filteredReports, members]);

  return (
    <>
      <div className="space-y-6 animate-in fade-in no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Icon p={I.Clock} size={20}/></div>
            Attendance
          </h2>
          <button onClick={handlePrint} className="flex items-center gap-2 text-sm font-bold text-white bg-gray-900 px-5 py-2.5 rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-200 transition-all active:scale-95">
            <Icon p={I.Download} size={16}/> PDF Export
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Month</label>
              <input type="month" className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member</label>
              <select className="w-full bg-gray-50 p-3 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                <option value="">All Members</option>
                {apoMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 p-5 rounded-2xl text-white shadow-lg shadow-gray-200">
            <span className="text-sm font-bold opacity-80">Total Hours</span>
            <span className="text-3xl font-black">{totalHours}<span className="text-sm font-medium ml-1 opacity-60">h</span></span>
          </div>
        </div>

        <div className="space-y-3 pb-20">
          <div className="text-[10px] font-bold text-gray-400 px-4 flex justify-between uppercase tracking-wider">
            <span>Date</span>
            <span className="flex-1 text-center pl-8">Time Range</span>
            <span>Total</span>
          </div>
          {filteredReports.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between hover:border-gray-200 transition-colors">
              <div className="w-20">
                <div className="font-bold text-gray-800 text-lg">{formatDate(r.date)}</div>
                <div className="text-[10px] font-bold text-gray-400 uppercase">{formatDay(r.date)}</div>
              </div>
              <div className="flex-1 text-center">
                {r.startTime && r.endTime ? (
                  <span className="bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 border border-gray-100">
                    {r.startTime} - {r.endTime}
                  </span>
                ) : <span className="text-gray-300 text-xl">···</span>}
                {(!selectedMemberId && r.memberId) && (
                  <div className="text-[10px] font-bold text-indigo-500 mt-1">{members.find(m => m.id === r.memberId)?.name}</div>
                )}
              </div>
              <div className="w-16 text-right font-black text-xl text-gray-800">{r.hours}<span className="text-xs text-gray-400 font-medium ml-0.5">h</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Print Template - Premium Layout */}
      <div className="print-wrapper" style={{ display: 'none' }}>
        <div className="max-w-4xl mx-auto font-sans text-gray-900">
          <div className="flex justify-between items-end border-b-2 border-gray-900 pb-6 mb-10">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight mb-2">稼働報告書</h1>
              <p className="text-lg font-medium text-gray-600">{selectedMonth.replace("-", "年")}月度</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-500">発行日</p>
              <p className="text-lg font-bold">{new Date().toLocaleDateString('ja-JP')}</p>
            </div>
          </div>

          <div className="space-y-12">
            {printData.map((pd, i) => (
              <div key={i} style={{ pageBreakInside: 'avoid' }}>
                <div className="flex justify-between items-center mb-4 bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-2xl font-bold">{pd.name} <span className="text-sm font-normal text-gray-500 ml-2">様</span></h3>
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-500 mr-2">合計稼働</span>
                    <span className="text-2xl font-black">{pd.total} h</span>
                  </div>
                </div>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="p-3 text-left w-32 font-bold text-gray-500">日付</th>
                      <th className="p-3 text-center font-bold text-gray-500">開始時間</th>
                      <th className="p-3 text-center font-bold text-gray-500">終了時間</th>
                      <th className="p-3 text-right w-24 font-bold text-gray-500">稼働時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pd.logs.map((log, j) => (
                      <tr key={j} className="border-b border-gray-200">
                        <td className="p-3 font-bold">{formatDate(log.date)} <span className="text-xs text-gray-400 ml-1">({formatDay(log.date)})</span></td>
                        <td className="p-3 text-center font-mono">{log.startTime || '-'}</td>
                        <td className="p-3 text-center font-mono">{log.endTime || '-'}</td>
                        <td className="p-3 text-right font-bold">{log.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t-2 border-gray-900 flex justify-end items-end gap-6">
            <span className="text-sm font-bold text-gray-500 mb-1">月間総稼働時間</span>
            <span className="text-5xl font-black">{totalHours}<span className="text-xl font-bold ml-2 text-gray-400">Hours</span></span>
          </div>
        </div>
      </div>
    </>
  );
}

function InputModal({ members, onAdd, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [val, setVal] = useState({ 
    memberId: '', date: today,
    calls: '', appts: '', requests: '', prospects: '', lost: '', deals: '', hours: '',
    startTime: '', endTime: ''
  });
  const selectedMember = members.find(m => m.id === val.memberId);
  const isCloser = selectedMember?.role === 'closer';

  useEffect(() => {
    if (val.startTime && val.endTime) {
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
    onAdd({
      ...val,
      calls: Number(val.calls), appts: Number(val.appts), requests: Number(val.requests),
      prospects: Number(val.prospects), lost: Number(val.lost),
      deals: Number(val.deals), hours: Number(val.hours)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col animate-in fade-in duration-300 md:items-center md:justify-center no-print">
      <div className="w-full h-full md:max-w-md md:h-auto md:max-h-[90vh] md:bg-white md:rounded-[2rem] md:shadow-2xl md:border md:border-gray-100 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><Icon p={I.X}/></button>
          <h2 className="font-bold text-lg text-gray-800">New Report</h2>
          <div className="w-10"/>
        </div>
        
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
          <div className="space-y-3">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pl-1">Basic Info</label>
            <input 
              type="date" 
              className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              value={val.date}
              onChange={e => setVal({...val, date: e.target.value})}
            />
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <label key={m.id} className={`px-4 py-3 rounded-2xl border cursor-pointer font-bold transition-all text-xs flex items-center gap-2 shadow-sm ${val.memberId===m.id ? 'border-gray-900 bg-gray-900 text-white transform scale-105' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-300'}`}>
                  <input type="radio" name="mem" value={m.id} className="hidden" onChange={e=>setVal({...val, memberId: e.target.value})} />
                  <span className={`w-2 h-2 rounded-full ${m.role === 'closer' ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
                  {m.name}
                </label>
              ))}
            </div>
          </div>

          {selectedMember && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
              {!isCloser ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-bold text-sky-700 bg-sky-50 px-4 py-2 rounded-xl border border-sky-100">
                    <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></div> Apo Metrics
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-4">
                    <div className="flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 text-center">START</label>
                        <input type="time" className="w-full p-3 rounded-xl bg-white font-bold text-gray-800 outline-none text-center shadow-sm" value={val.startTime} onChange={e=>setVal({...val, startTime: e.target.value})} />
                      </div>
                      <div className="text-gray-300">➜</div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-400 block mb-1 text-center">END</label>
                        <input type="time" className="w-full p-3 rounded-xl bg-white font-bold text-gray-800 outline-none text-center shadow-sm" value={val.endTime} onChange={e=>setVal({...val, endTime: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-500">Total Hours</span>
                      <input type="number" step="0.5" className="w-24 text-right font-black text-2xl bg-transparent outline-none text-gray-800" value={val.hours} onChange={e=>setVal({...val, hours: e.target.value})} placeholder="0.0" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InputItem label="架電数" icon={I.Phone} val={val.calls} set={v=>setVal({...val, calls:v})} />
                    <InputItem label="アポ数" icon={I.Check} val={val.appts} set={v=>setVal({...val, appts:v})} color="text-emerald-600" />
                    <InputItem label="資料請求" icon={I.FileText} val={val.requests} set={v=>setVal({...val, requests:v})} />
                    <InputItem label="見込み" icon={I.Help} val={val.prospects} set={v=>setVal({...val, prospects:v})} color="text-blue-500" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div> Closer Metrics
                  </div>
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
                    <div className="flex items-center justify-center gap-2 mb-2 text-amber-800 font-bold text-xs uppercase tracking-widest"><Icon p={I.Briefcase} size={16}/> Deals Won</div>
                    <input type="number" className="w-full bg-white p-4 rounded-2xl text-4xl font-black text-center text-gray-800 outline-none shadow-sm focus:ring-4 focus:ring-amber-200 transition-all" placeholder="0" value={val.deals} onChange={e=>setVal({...val, deals: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <InputItem label="見込み" icon={I.Help} val={val.prospects} set={v=>setVal({...val, prospects:v})} color="text-blue-500" />
                    <InputItem label="失注" icon={I.Ban} val={val.lost} set={v=>setVal({...val, lost:v})} color="text-rose-500" />
                  </div>
                </>
              )}
            </div>
          )}

          <button className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-gray-200 active:scale-95 transition-transform hover:bg-black">
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
};

function Settings({ events, currentEventId, onAddEvent, onUpdateGoals, members, onAddMember, onDelMember, onClose }) {
  const cur = events.find(e => e.id === currentEventId) || {};
  const [goals, setGoals] = useState(cur.goals || { total: {}, weekly: {} });
  const [newEventName, setNewEventName] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newMem, setNewMem] = useState("");
  const [newRole, setNewRole] = useState("apo");

  const saveGoals = () => {
    if (currentEventId) {
      onUpdateGoals(currentEventId, goals);
      alert("Settings Saved");
    }
  };

  const updateGoalVal = (type, key, val) => {
    setGoals(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: Number(val) }
    }));
  };

  return (
    <div className="space-y-8 md:grid md:grid-cols-2 md:gap-8 md:space-y-0 pb-20 no-print">
      <div className="md:col-span-2 flex items-center gap-2">
        <button onClick={onClose} className="p-3 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"><Icon p={I.X}/></button>
        <h2 className="font-bold text-2xl text-gray-800">Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Icon p={I.Calendar} size={20}/> New Event</h3>
          <div className="space-y-3">
            <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Event Name" value={newEventName} onChange={e=>setNewEventName(e.target.value)} />
            <input className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Date (e.g. 2026-06-30)" value={newEventDate} onChange={e=>setNewEventDate(e.target.value)} />
          </div>
          <button 
            onClick={() => { if(newEventName){ onAddEvent(newEventName, newEventDate); setNewEventName(""); setNewEventDate(""); }}} 
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-gray-200 hover:bg-black transition-all"
          >
            Create Event
          </button>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Icon p={I.Users} size={20}/> Team Members</h3>
          <div className="flex gap-2">
            <input className="flex-1 p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Name" value={newMem} onChange={e=>setNewMem(e.target.value)} />
            <select 
              className="p-4 bg-gray-50 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
            >
              <option value="apo">Apo</option>
              <option value="closer">Closer</option>
            </select>
          </div>
          <button onClick={()=>{if(newMem){onAddMember(newMem, newRole);setNewMem("")}}} className="w-full bg-indigo-50 text-indigo-600 py-3 rounded-2xl font-bold hover:bg-indigo-100 transition-colors">Add Member</button>
          
          <div className="space-y-2 mt-4 max-h-60 overflow-y-auto pr-2">
            {members.map(m => (
              <div key={m.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${m.role === 'closer' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                    {m.role === 'closer' ? 'CL' : 'AP'}
                  </div>
                  <span className="font-bold text-sm text-gray-700">{m.name}</span>
                </div>
                <button onClick={()=>onDelMember(m.id)} className="text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Icon p={I.Trash} size={18}/></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 h-fit">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Target Goals</h3>
            <p className="text-xs text-gray-400 font-bold">{cur.name}</p>
          </div>
          <button onClick={saveGoals} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all">Save Changes</button>
        </div>
        
        <div className="space-y-6">
          <div className="p-5 bg-amber-50 rounded-[2rem] border border-amber-100 space-y-3">
            <div className="text-xs font-extrabold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2"><Icon p={I.Trophy} size={14}/> Total Goals</div>
            <GoalRow label="商談成約" val={goals.total?.deals} set={v=>updateGoalVal('total','deals',v)} />
            <GoalRow label="商談数(実施)" val={goals.total?.meetings} set={v=>updateGoalVal('total','meetings',v)} />
            <GoalRow label="見込(CL)" val={goals.total?.prospects} set={v=>updateGoalVal('total','prospects',v)} />
            <GoalRow label="失注" val={goals.total?.lost} set={v=>updateGoalVal('total','lost',v)} />
            <div className="border-t border-amber-200/50 my-2"></div>
            <GoalRow label="見込(AP)" val={goals.total?.apoProspects} set={v=>updateGoalVal('total','apoProspects',v)} />
            <GoalRow label="アポ" val={goals.total?.appts} set={v=>updateGoalVal('total','appts',v)} />
            <GoalRow label="架電" val={goals.total?.calls} set={v=>updateGoalVal('total','calls',v)} />
          </div>

          <div className="p-5 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-3">
            <div className="text-xs font-extrabold text-indigo-800 uppercase tracking-widest mb-2 flex items-center gap-2"><Icon p={I.Calendar} size={14}/> Weekly Goals</div>
            <GoalRow label="商談成約" val={goals.weekly?.deals} set={v=>updateGoalVal('weekly','deals',v)} />
            <GoalRow label="商談数(実施)" val={goals.weekly?.meetings} set={v=>updateGoalVal('weekly','meetings',v)} />
            <GoalRow label="見込(CL)" val={goals.weekly?.prospects} set={v=>updateGoalVal('weekly','prospects',v)} />
            <GoalRow label="失注" val={goals.weekly?.lost} set={v=>updateGoalVal('weekly','lost',v)} />
            <div className="border-t border-indigo-200/50 my-2"></div>
            <GoalRow label="見込(AP)" val={goals.weekly?.apoProspects} set={v=>updateGoalVal('weekly','apoProspects',v)} />
            <GoalRow label="アポ" val={goals.weekly?.appts} set={v=>updateGoalVal('weekly','appts',v)} />
            <GoalRow label="架電" val={goals.weekly?.calls} set={v=>updateGoalVal('weekly','calls',v)} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. App Entry Point
// ==========================================
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showInput, setShowInput] = useState(false);
  const [user, setUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const [events, setEvents] = useState([]);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);

  // Default goals including meetings
  const defaultGoals = {
    total: { deals: 15, meetings: 40, prospects: 30, lost: 10, appts: 100, calls: 1000, apoProspects: 50 },
    weekly: { deals: 2, meetings: 8, prospects: 5, lost: 2, appts: 20, calls: 200, apoProspects: 10 }
  };

  useEffect(() => {
    // Load local data first
    const lEvents = loadLocal('events');
    const lMems = loadLocal('members');
    const lReps = loadLocal('reports');
    if (lEvents.length) {
      setEvents(lEvents);
      setCurrentEventId(lEvents[0].id);
    }
    if (lMems.length) setMembers(lMems);
    if (lReps.length) setReports(lReps);

    if (isOffline || !auth) {
      setConnectionStatus("offline");
      return;
    }

    const init = async () => {
      try {
        // 修正: トークン不一致エラーに対処するためのフォールバックロジック
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            // トークンがマッチしない場合（自分のFirebase Configを使っている場合など）は匿名ログイン
            console.warn("Custom token failed, using anonymous auth", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { 
        console.error("Auth init failed", e); 
        setConnectionStatus("offline"); 
      }
    };
    init();

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setConnectionStatus("connected");

        // Events Listener
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (s) => {
          const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
          if (list.length === 0) {
            const newEvent = { name: "イベント 2026", date: "2026-06-30", goals: defaultGoals, createdAt: Timestamp.now() };
            addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), newEvent);
          } else {
            setEvents(prev => {
              const next = list;
              saveLocal('events', next);
              if (!currentEventId && next.length > 0) setCurrentEventId(next[0].id);
              return next;
            });
          }
        });

        // Members Listener
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'members'), (s) => {
          const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
          setMembers(list);
          saveLocal('members', list);
        });

        // Reports Listener
        onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), (s) => {
          const list = s.docs.map(d => ({ id: d.id, ...d.data() }));
          setReports(list);
          saveLocal('reports', list);
        });
      }
    });
    return () => unsubAuth();
  }, []);

  // --- Actions ---
  const addEvent = async (name, date) => {
    const newEvent = { name, date, goals: defaultGoals, createdAt: Timestamp.now() };
    if (db && user) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), newEvent);
  };

  const updateEventGoals = async (eventId, newGoals) => {
    if (db && user) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eventId), { goals: newGoals });
    setEvents(events.map(e => e.id === eventId ? { ...e, goals: newGoals } : e));
  };

  const addReport = async (data) => {
    const reportDate = data.date ? Timestamp.fromDate(new Date(data.date)) : Timestamp.now();
    const reportData = {
      ...data,
      eventId: currentEventId,
      date: reportDate,
      createdAt: Timestamp.now()
    };
    setReports([ { id: "temp_" + Date.now(), ...reportData }, ...reports ]);
    if (db && user) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'reports'), reportData);
  };

  const addMember = async (name, role) => {
    if (db && user) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), { name, role, createdAt: Timestamp.now() });
  };
  const deleteMember = async (id) => {
    if (db && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id));
  };

  // --- Aggregation ---
  const currentEvent = events.find(e => e.id === currentEventId) || { goals: defaultGoals, name: "Loading..." };
  const eventReports = reports.filter(r => r.eventId === currentEventId || (!r.eventId && events.length > 0 && events[0].id === currentEventId)); 

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
    const weekly = calc(eventReports.filter(r => isSameWeek(r.date)));

    return { total, weekly };
  }, [eventReports, memberRoleMap]);

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

      return { 
        ...m, ...myTot, meetings,
        cph: myTot.hours > 0 ? (myTot.calls / myTot.hours).toFixed(1) : "0.0" 
      };
    }).sort((a,b) => b.cph - a.cph);
  }, [members, eventReports]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-wrapper, .print-wrapper * { display: block !important; }
          .print-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100vw;
            min-height: 100vh;
            background: white;
            z-index: 99999;
            padding: 40px;
          }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>

      {/* Screen Wrapper */}
      <div className="max-w-md md:max-w-4xl lg:max-w-6xl mx-auto flex flex-col min-h-screen pb-24 shadow-2xl bg-white md:bg-slate-50 relative">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur sticky top-0 z-20 px-4 py-3 border-b border-slate-100 flex justify-between items-center md:rounded-b-2xl md:mx-4 md:mt-2 md:shadow-sm no-print">
          <div className="flex flex-col">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Event</div>
            <div className="relative group">
              <select 
                className="appearance-none bg-transparent font-black text-lg text-indigo-900 pr-6 outline-none cursor-pointer"
                value={currentEventId || ""}
                onChange={e => setCurrentEventId(e.target.value)}
              >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <div className="absolute right-0 top-1.5 pointer-events-none text-indigo-900"><Icon p={I.ChevronDown} size={16} /></div>
            </div>
          </div>
          <div className="flex gap-2">
            {connectionStatus === "offline" && <span className="text-red-400 bg-red-50 p-2 rounded-full"><Icon p={I.WifiOff} size={16}/></span>}
            <button onClick={() => setActiveTab('settings')} className="p-2 bg-slate-100 rounded-full text-slate-500 active:bg-slate-200">
              <Icon p={I.Settings} size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-6">
          {activeTab === 'dashboard' && (
            <div className="no-print">
              <Dashboard 
                event={currentEvent} 
                totals={totals} 
                memberStats={memberStats} 
              />
            </div>
          )}
          {activeTab === 'attendance' && (
            <AttendanceView 
              members={members}
              reports={eventReports}
            />
          )}
          {activeTab === 'settings' && (
            <div className="no-print">
              <Settings 
                events={events} 
                currentEventId={currentEventId}
                onAddEvent={addEvent}
                onUpdateGoals={updateEventGoals}
                members={members}
                onAddMember={addMember}
                onDelMember={deleteMember}
                onClose={() => setActiveTab('dashboard')}
              />
            </div>
          )}
        </div>

        {/* FAB */}
        {activeTab !== 'settings' && (
          <div className="fixed bottom-24 right-6 z-30 md:bottom-10 md:right-10 no-print">
            <button onClick={() => setShowInput(true)} className="bg-indigo-600 text-white p-4 rounded-full shadow-xl shadow-indigo-500/40 hover:scale-110 active:scale-95 transition-all border-4 border-white">
              <Icon p={I.Plus} size={28} />
            </button>
          </div>
        )}

        {/* Input Modal */}
        {showInput && (
          <div className="no-print">
            <InputModal 
              members={members} 
              onAdd={addReport} 
              onClose={() => setShowInput(false)} 
            />
          </div>
        )}

        {/* Nav */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md md:max-w-4xl lg:max-w-6xl mx-auto bg-white border-t border-slate-100 flex justify-around items-center p-2 z-20 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] md:mb-4 md:mx-4 md:rounded-2xl md:border md:shadow-lg no-print">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Briefcase} label="ホーム" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={I.Clock} label="稼働管理" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={I.Settings} label="設定" />
        </nav>
      </div>
    </div>
  );
}

export default App;