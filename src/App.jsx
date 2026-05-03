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
  Search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  Edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
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
  const { calls, appts, picConnected, requests } = stats;
  const connectRate = calls > 0 ? picConnected / calls : 0;
  const apptRate = picConnected > 0 ? appts / picConnected : 0;
  const totalCvr = calls > 0 ? appts / calls : 0;
  const requestRate = picConnected > 0 ? requests / picConnected : 0;
  
  if (calls === 0) return "データが未蓄積です。まずは架電アクションを開始し、ベースラインを作成しましょう。";

  const categories = [];

  if (isPersonal) {
    if (connectRate < 0.15) {
      categories.push({
        obs: "本人接続率が低迷しています。リストの鮮度か時間帯の不一致が疑われます。",
        strategy: "アプローチタイミングのシフト",
        action: "ターゲット業界が最も電話に出やすい時間帯（例：飲食なら14-16時、ITなら10-11時）へ架電を集中させてください。"
      });
      categories.push({
        obs: "受付でのブロックが多いようです。",
        strategy: "フロント突破話法の改善",
        action: "「〇〇様（個人名）」を指名する、あるいは用件を「資料の件」とシンプルに伝えることで、受付通過率を高めましょう。"
      });
    }

    if (apptRate < 0.05) {
      categories.push({
        obs: "本人接続はできていますが、アポへの転換が弱いです。",
        strategy: "冒頭30秒のフック強化",
        action: "相手が「自分に関係がある」と思えるメリット（他社事例など）を、接続直後の15秒以内に盛り込んでください。"
      });
      categories.push({
        obs: "ネクストアクションの提示が曖昧です。",
        strategy: "クローズド・クエスチョンの活用",
        action: "「いつが良いですか？」ではなく「火曜の14時か水曜の11時ならどちらが都合良いですか？」と選択肢を提示してください。"
      });
    }

    if (requestRate > 0.15 && apptRate < 0.05) {
      categories.push({
        obs: "「資料送付」で逃げられているケースが散見されます。",
        strategy: "資料送付をアポのステップにする",
        action: "「資料を送りますので、その内容を5分だけ解説させてください」という流れで、資料送付と同時にアポを確定させましょう。"
      });
    }

    if (totalCvr > 0.03) {
      categories.push({
        obs: "極めて高いパフォーマンスです。現在のトークスキルは完成されています。",
        strategy: "成功パターンのナレッジ化",
        action: "好調な要因（スクリプト、トーン、対象リスト）をチームに共有し、全体の底上げに貢献してください。"
      });
    }

    if (categories.length === 0) {
      categories.push({
        obs: "安定した推移です。大きなボトルネックは見られません。",
        strategy: "微細なトーン＆マナーの調整",
        action: "自分の録音を聞き返し、相手の喋るスピード（ペーシング）に合わせる練習をして、さらに親密度を高めましょう。"
      });
      categories.push({
        obs: "着実に数字を積み上げています。",
        strategy: "集中力の波のコントロール",
        action: "50分架電・10分休憩のサイクルを徹底し、高いパフォーマンスを長時間持続させる工夫をしてください。"
      });
    }
  } else {
    if (connectRate < 0.20) {
      categories.push({
        obs: "チーム全体の接続率が低下しています。リストの枯渇が考えられます。",
        strategy: "リストの再セグメント化",
        action: "未架電リストの補充、またはアプローチ対象業界の優先順位を即座に見直してください。"
      });
    } else if (apptRate < 0.07) {
      categories.push({
        obs: "チーム全体でアポ獲得に苦戦しています。",
        strategy: "トッププレイヤーのノウハウ展開",
        action: "成績上位者の録音を全員で聞く「ロープレ・フィードバック会」を実施し、良いフレーズを即座に盗んでください。"
      });
    } else {
      categories.push({
        obs: "チーム全体で高い生産性を維持できています。",
        strategy: "モチベーション維持と環境整備",
        action: "個々の成果を称え合い、ポジティブな雰囲気を維持することで、週末までのラストスパートをかけましょう。"
      });
    }
  }

  const advice = categories[Math.floor(Math.random() * categories.length)];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-start"><div className="mt-1.5 w-2 h-2 rounded-full bg-rose-500 shrink-0"></div><p><span className="text-rose-400 font-bold text-[10px] uppercase block mb-0.5">Observation</span><span className="text-white font-medium leading-relaxed">{advice.obs}</span></p></div>
      <div className="flex gap-3 items-start"><div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div><p><span className="text-blue-400 font-bold text-[10px] uppercase block mb-0.5">Strategy</span><span className="text-white font-medium leading-relaxed">{advice.strategy}</span></p></div>
      <div className="flex gap-3 items-start"><div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div><p><span className="text-emerald-400 font-bold text-[10px] uppercase block mb-0.5">Action Plan</span><span className="text-white font-black leading-relaxed text-base">{advice.action}</span></p></div>
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
  const len = Math.max(data.length - 1, 1);
  const points = data.map((d, i) => `${(i / len) * 100},${100 - (d.value / max) * 100}`).join(' ');
  const areaPoints = `${points} 100,100 0,100`;

  return (
    <div className="w-full h-full relative flex flex-col pl-4 pb-2">
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-bold text-slate-400 tracking-widest">件数</div>
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
      <div className="text-center text-[10px] font-bold text-slate-400 tracking-widest mt-1">日付</div>
    </div>
  );
};

const Dashboard = ({ event, totals, memberStats, eventReports, members, currentBaseDate, setCurrentBaseDate, userRole, currentUserEmail, onUpdateGoal, gasData, onEditGasRecord, onDeleteGasRecord }) => {
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
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 個人目標 (自動配分)
                           </h3>
                           <div className="p-8 bg-white border-2 border-slate-900 rounded-[2rem] shadow-sm space-y-6">
                              <div className="flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">一律目標 / 人</span>
                                    <button onClick={()=>setEditingGoal(activeIndivGoals)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Icon p={I.Edit} size={14}/></button>
                                 </div>
                                 <span className="text-2xl font-black text-slate-900">{(memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 0)} <span className="text-xs">件</span></span>
                              </div>
                              <MetricBar label="達成率" val={myTotals.appts} tgt={memberStats.find(m=>m.email===currentUserEmail)?.uniformGoal || 1} />
                           </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                           <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                             <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div> 今週の着地予測
                           </h3>
                           <div className="p-8 bg-emerald-900 text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10"><Icon p={I.TrendingUp} size={100} /></div>
                              <div className="relative z-10 space-y-4">
                                 <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">データに基づく期待値</div>
                                 <div className="text-5xl font-black">{memberStats.find(m=>m.email===currentUserEmail)?.expectedAppts || 0}<span className="text-sm font-normal ml-2 opacity-50">件</span></div>
                                 <div className="pt-4 border-t border-emerald-800 flex justify-between items-center">
                                    <span className="text-xs font-bold opacity-60">目標との差分</span>
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
                           <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm flex flex-col justify-between h-[180px]">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">1hあたり(CPH)</div>
                                    <div className="text-3xl font-black text-blue-600">{(myTotals.calls / (myTotals.hours || 1)).toFixed(1)}</div>
                                 </div>
                                 <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase text-right">予定稼働時間</div>
                                    <div className="text-xl font-black text-slate-900 text-right">{memberStats.find(m=>m.email===currentUserEmail)?.scheduledHours || 0}H</div>
                                 </div>
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold leading-tight">過去実績から算出された期待値です。稼働時間を増やすか、効率を上げることで目標達成に近づきます。</div>
                           </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                           <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> 本日の稼働データ (GAS同期)
                        </h3>
                        <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden p-8">
                           <GasSyncDataView 
                              gasData={gasData} 
                              members={members} 
                              forcedMemberId={currentMember?.id} 
                              onEditGasRecord={onEditGasRecord} 
                              onDeleteGasRecord={onDeleteGasRecord} 
                              initialPeriod="今日"
                              hideHeader={true}
                           />
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
                     { label: '期待着地', val: drilldownMember.expectedAppts, color: 'text-emerald-600' },
                     { label: '予定稼働', val: `${drilldownMember.scheduledHours}H`, color: 'text-slate-400' },
                   ].map(stat => (
                      <div key={stat.label} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                         <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{stat.label}</div>
                         <div className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.val}</div>
                      </div>
                   ))}
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">架電結果の内訳解析</h4>
                   <div className="space-y-3">
                      {[
                        { label: 'アポ獲得', val: drilldownMember.appts || 0, color: 'bg-blue-600' },
                        { label: '資料請求', val: drilldownMember.requests || 0, color: 'bg-emerald-500' },
                        { label: '本人接続 (その他)', val: (drilldownMember.picConnected || 0) - (drilldownMember.appts || 0) - (drilldownMember.requests || 0), color: 'bg-slate-400' },
                        { label: '受付拒否', val: drilldownMember.receptionRefusal || 0, color: 'bg-rose-400' },
                        { label: '不在 / その他', val: (drilldownMember.calls || 0) - (drilldownMember.picConnected || 0) - (drilldownMember.receptionRefusal || 0), color: 'bg-slate-100' },
                      ].map(item => {
                         const safeVal = Math.max(0, item.val);
                         const safeCalls = Math.max(1, drilldownMember.calls || 1);
                         const p = Math.max(0, Math.min(100, (safeVal / safeCalls) * 100));
                         if (safeVal <= 0 && item.label !== 'アポ獲得') return null;
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
                   <h4 className="text-[10px] font-bold text-blue-400 uppercase mb-4 tracking-widest">個別戦略アドバイス</h4>
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
                      <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2"><Icon p={I.Zap} size={20} className="text-blue-600"/> 過去の獲得データ</h4>
                      <GasSyncDataView gasData={gasData} members={members} forcedMemberId={drilldownMember.id} hideHeader={true} onEditGasRecord={onEditGasRecord} onDeleteGasRecord={onDeleteGasRecord} />
                   </div>
                )}
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
    const dateMatch = toLocalMonthString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)) === selectedMonth;
    const memberMatch = selectedMemberId === 'all' || r.memberId === selectedMemberId;
    return dateMatch && memberMatch;
  }).sort((a,b)=>b.date.seconds-a.date.seconds), [reports, selectedMonth, selectedMemberId]);

  const totalH = fReports.reduce((s, r)=>s+(Number(r.hours)||0), 0);
  const totalCost = fReports.reduce((s, r) => {
    const m = members.find(mem => mem.id === r.memberId);
    return s + (Number(r.hours)||0) * (Number(m?.hourlyWage)||1500);
  }, 0);

  // メンバー別集計
  const memberSummary = useMemo(() => {
    const allReports = reports.filter(r => r.date && toLocalMonthString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000)) === selectedMonth);
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
            <h2 className="text-xl font-bold flex items-center gap-3">稼働・人件費統計</h2>
            <input type="month" className="bg-white border border-slate-300 p-2 font-bold text-sm outline-none rounded-xl" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setSelectedMemberId('all')} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedMemberId==='all'?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-500 border-slate-200'}`}>全員</button>
            {members.map(m => (
              <button key={m.id} onClick={()=>setSelectedMemberId(m.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedMemberId===m.id?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-500 border-slate-200'}`}>{m.name}</button>
            ))}
          </div>
       </div>

       <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 p-6 text-white rounded-2xl">
             <span className="font-bold opacity-60 text-[10px] block mb-1">稼働時間</span>
             <span className="text-3xl font-black">{totalH}<span className="text-sm opacity-30 ml-1">H</span></span>
          </div>
          <div className="bg-white border border-slate-200 p-6 rounded-2xl">
             <span className="font-bold text-slate-400 text-[10px] block mb-1">人件費合計</span>
             <span className="text-2xl font-black">¥{totalCost.toLocaleString()}</span>
          </div>
       </div>

       {selectedMemberId === 'all' && memberSummary.length > 0 && (
         <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
           <div className="p-4 bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest">メンバー別内訳</div>
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
                        <span className="text-[9px] font-bold text-slate-400">{toLocalDateString(r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000))}</span>
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
          {fReports.length === 0 && <div className="py-12 text-center text-slate-400 font-bold text-sm bg-white">この期間のデータがありません</div>}
       </div>
    </div>
  );
};

const ShiftView = ({ members, shifts, onAddShift, onDeleteShift, userRole, myMemberId }) => {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('month');
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkDates, setBulkDates] = useState([]);
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

  return (
    <div className="space-y-6 pb-24 font-sans">
       <div className="flex flex-col gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">シフト管理・人員配置</h2>
              {userRole === 'admin' && viewMode === 'month' && (
                <button 
                  onClick={() => { setBulkMode(!bulkMode); setBulkDates([]); }} 
                  className={`px-3 py-1.5 text-[10px] font-black rounded-full transition-all flex items-center gap-1.5 ${bulkMode ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {bulkMode ? <><Icon p={I.Check} size={12}/> 一括選択モード解除</> : <><Icon p={I.Zap} size={12}/> 管理者一括入力モード</>}
                </button>
              )}
            </div>
            <div className="flex bg-slate-200 p-1 rounded-full">
               <button onClick={()=>setViewMode('day')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='day'?'bg-slate-900 text-white':'text-slate-500'}`}>日別</button>
               <button onClick={()=>setViewMode('week')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='week'?'bg-slate-900 text-white':'text-slate-500'}`}>週別</button>
               <button onClick={()=>setViewMode('month')} className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${viewMode==='month'?'bg-slate-900 text-white':'text-slate-500'}`}>月間</button>
            </div>
          </div>
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
                   const isSelected = bulkMode ? bulkDates.includes(d) : d === selectedDate;
                   const isToday = d === toLocalDateString(new Date());
                   return (
                     <button 
                       key={d} 
                       onClick={() => {
                         if (bulkMode) {
                           if (bulkDates.includes(d)) setBulkDates(bulkDates.filter(x => x !== d));
                           else setBulkDates([...bulkDates, d]);
                         } else {
                           setSelectedDate(d);
                         }
                       }} 
                       className={`bg-white aspect-[4/3] p-2 flex flex-col items-start justify-start transition-all relative border-t border-l border-slate-50 hover:bg-blue-50 group ${isSelected ? (bulkMode ? 'ring-4 ring-inset ring-rose-500 z-10 bg-rose-50/20' : 'ring-2 ring-inset ring-blue-600 z-10 bg-blue-50/30') : ''}`}
                     >
                       <span className={`text-sm font-black mb-1 ${isSelected ? (bulkMode ? 'text-rose-600' : 'text-blue-600') : isToday ? 'bg-blue-600 text-white px-2 rounded-full' : ''}`}>{d.split('-')[2]}</span>
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
       
       <button 
         onClick={() => {
           if (bulkMode && bulkDates.length === 0) return alert('一括登録する日付を選択してください。');
           setShowModal(true);
         }} 
         className={`fixed bottom-24 right-6 w-16 h-16 text-white flex flex-col items-center justify-center border-4 border-white shadow-2xl z-40 rounded-full hover:scale-105 transition-transform ${bulkMode ? 'bg-rose-500' : 'bg-slate-900'}`}
       >
         <Icon p={I.Plus} size={24} />
         <span className="text-[7px] font-bold uppercase mt-0.5">{bulkMode ? '一括登録' : '登録'}</span>
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

const METRIC_HELP = {
  CPH: 'CPH（Calls Per Hour）= 1時間あたりの架電数。稼働効率を示す指標。高いほど効率的。',
  接続率: '本人接続率 = 架電数のうち担当者本人と会話できた割合。リストの質を測る指標。',
  アポ率: 'アポ率 = 本人接続数のうちアポイントを獲得できた割合。トークの転換力を測る指標。',
  達成率: '達成率 = 今週の個人アポ目標に対する現在の獲得数の割合。',
  期待着地: '期待着地件数 = 過去の実績（アポ率×CPH）×今週の予定稼働時間から算出した予測値。',
  本人接続: '担当者本人と直接会話できた件数。受付止まりや不在は含まない。',
};

const MetricHelpModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <h3 className="font-black text-lg flex items-center gap-3"><Icon p={I.Help} size={20} color="white"/>指標ガイド</h3>
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

const AnalyticsView = ({ members, reports, event, userRole }) => {
  const [selectedMid, setSelectedMid] = useState('all');
  const [chartType, setChartType] = useState('line');
  const [chartMetric, setChartMetric] = useState('appts');
  const [periodMode, setPeriodMode] = useState('daily'); // daily/weekly/monthly/yearly
  const [showHelp, setShowHelp] = useState(false);

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

  const trendData = useMemo(() => {
    const map = {};
    fReports.forEach(r => {
      if (!r.date) return;
      const dateObj = r.date.toDate ? r.date.toDate() : new Date(r.date.seconds * 1000);
      let key = '';
      if (periodMode === 'daily') key = toLocalDateString(dateObj).slice(-5);
      else if (periodMode === 'weekly') {
        const mon = getMondayKey(dateObj);
        key = mon.slice(5).replace('-', '/');
      } else if (periodMode === 'monthly') {
        key = `${dateObj.getMonth()+1}月`;
      } else {
        key = `${dateObj.getFullYear()}年`;
      }
      map[key] = (map[key] || 0) + (Number(r[chartMetric]) || 0);
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b)=>a.day.localeCompare(b.day));
  }, [fReports, chartMetric, periodMode]);

  const metricLabels = { calls:'架電数', appts:'アポ獲得数', requests:'資料請求数', picConnected:'本人接続数' };
  const periodLabels = { daily:'日次', weekly:'週次', monthly:'月次', yearly:'年次' };

  return (
    <div className="space-y-10 pb-28">
       {showHelp && <MetricHelpModal onClose={()=>setShowHelp(false)} />}
       <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black flex items-center gap-3"><Icon p={I.PieChart} size={20}/> プロジェクト多角分析</h2>
            <button onClick={()=>setShowHelp(true)} className="p-2 rounded-full bg-slate-100 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors" title="指標の説明">
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
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">トレンド・モニタリング</h3>
                  <div className="text-2xl font-black text-slate-900">{metricLabels[chartMetric]}の推移</div>
               </div>
               <div className="flex flex-wrap gap-2">
                 {['appts','calls','requests'].map(m => (
                   <button key={m} onClick={()=>setChartMetric(m)} className={`px-3 py-2 text-[10px] font-black rounded-xl transition-all border ${chartMetric===m?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-400 border-slate-200'}`}>{metricLabels[m]}</button>
                 ))}
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
                <div className="text-sm font-bold leading-relaxed pr-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm text-white">
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

const Settings = ({ events, currentEventId, members, onAddEvent, onDeleteEvent, onAddMember, onDelMember, onUpdateMember, onUpdateGoal, currentBaseDate, onClose }) => {
  const [newEName, setNewEName] = useState("");
  const [newMName, setNewMName] = useState("");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("apo");
  const [newWage, setNewWage] = useState("1500");
  const [editingMember, setEditingMember] = useState(null);
  
  const currentEvent = useMemo(() => events?.find(e => e.id === currentEventId) || null, [events, currentEventId]);
  const activeWeeklyGoals = currentEvent?.weeklyGoals?.[getMondayKey(currentBaseDate)] || currentEvent?.goals?.weekly || { appts: 0 };

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

             <h3 className="text-sm font-bold text-slate-800 border-l-4 border-indigo-600 pl-3 mt-12">全体目標の設定 (管理者のみ)</h3>
             <div className="p-8 bg-white border border-slate-200 space-y-6 shadow-sm rounded-3xl">
                <div className="space-y-4">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">今週の全体アポイント目標</label>
                   <div className="flex gap-4">
                      <input type="number" id="admin-global-goal" className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 font-black text-2xl outline-none rounded-xl" defaultValue={activeWeeklyGoals.appts} />
                      <button onClick={() => {
                         const val = Number(document.getElementById('admin-global-goal').value);
                         onUpdateGoal(getMondayKey(currentBaseDate), null, { ...activeWeeklyGoals, appts: val });
                         alert("全体目標を更新しました。");
                      }} className="px-8 bg-indigo-600 text-white font-bold rounded-2xl">保存</button>
                   </div>
                </div>
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
                   <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" placeholder="スプシ表示名(名字)" value={newSpreadsheetName} onChange={e=>setNewSpreadsheetName(e.target.value)} />
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
                <button onClick={()=>{if(newMName){onAddMember(newMName, newRole, newWage, newEmail, newSpreadsheetName); setNewMName(""); setNewEmail(""); setNewSpreadsheetName("");}}} className="w-full bg-emerald-600 text-white py-4 font-bold rounded-2xl hover:bg-emerald-700 transition-colors">スタッフを新規登録</button>
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
                  <div className="grid grid-cols-2 gap-4">
                     <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" value={editingMember.name} onChange={e=>setEditingMember({...editingMember, name: e.target.value})} placeholder="氏名" />
                     <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 font-bold rounded-xl" value={editingMember.spreadsheetName || ''} onChange={e=>setEditingMember({...editingMember, spreadsheetName: e.target.value})} placeholder="スプシ表示名" />
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
  const [val, setVal] = useState({ memberId: '', date: toLocalDateString(new Date()), calls: '', appts: '', requests: '', lost: '', deals: '', hours: '', startTime: '10:00', endTime: '19:00', picConnected: '', noAnswer: '', receptionRefusal: '', picAbsent: '', outOfTarget: '' });
  useEffect(() => { if (initialData) { const d = initialData.date?.toDate ? initialData.date.toDate() : new Date(initialData.date); setVal({ ...initialData, date: toLocalDateString(d) }); } }, [initialData]);
  const submit = (e) => { e.preventDefault(); if (!val.memberId) return alert("スタッフを選択してください"); const d = { ...val, calls: Number(val.calls), appts: Number(val.appts), requests: Number(val.requests), lost: Number(val.lost), deals: Number(val.deals), hours: Number(val.hours), picConnected: Number(val.picConnected), noAnswer: Number(val.noAnswer), receptionRefusal: Number(val.receptionRefusal), picAbsent: Number(val.picAbsent), outOfTarget: Number(val.outOfTarget) }; if (initialData) onUpdate(d); else onAdd(d); onClose(); };

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
             <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                <div className="bg-white"><InputItem label="全体架電数" icon={I.Phone} val={val.calls} set={v=>setVal({...val, calls: v})} /></div>
                <div className="bg-white"><InputItem label="本人接続数" icon={I.Zap} val={val.picConnected} set={v=>setVal({...val, picConnected: v})} /></div>
                <div className="bg-white"><InputItem label="アポイント" icon={I.Check} val={val.appts} set={v=>setVal({...val, appts: v})} /></div>
                <div className="bg-white"><InputItem label="資料請求" icon={I.FileText} val={val.requests} set={v=>setVal({...val, requests: v})} /></div>
                
                <div className="bg-white"><InputItem label="受付拒否" icon={I.Ban} val={val.receptionRefusal} set={v=>setVal({...val, receptionRefusal: v})} /></div>
                <div className="bg-white"><InputItem label="担当不在" icon={I.Users} val={val.picAbsent} set={v=>setVal({...val, picAbsent: v})} /></div>
                <div className="bg-white"><InputItem label="不在/その他" icon={I.Phone} val={val.noAnswer} set={v=>setVal({...val, noAnswer: v})} /></div>
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
// 5. GAS連携データ表示コンポーネント
// ==========================================
const GasSyncDataView = ({ gasData, members, forcedMemberId = null, hideHeader = false, onEditGasRecord, onDeleteGasRecord }) => {
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [editingData, setEditingData] = useState(null);

  const now = new Date();
  
  const effectiveMember = forcedMemberId || selectedMember;

  const filteredData = gasData.filter(d => {
    if (effectiveMember !== 'all') {
       const targetMember = members.find(m => m.id === effectiveMember);
       // Check if GAS memberId matches app's spreadsheetName, app's full name, or the direct dropdown value (for legacy names)
       const isMatch = targetMember 
          ? (d.memberId === targetMember.spreadsheetName || d.memberId === targetMember.name)
          : (d.memberId === effectiveMember);
       if (!isMatch) return false;
    }
    
    if (selectedPeriod !== 'all') {
      const dDate = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
      if (selectedPeriod === 'today') {
        if (dDate.toDateString() !== now.toDateString()) return false;
      } else if (selectedPeriod === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        if (dDate < weekAgo) return false;
      } else if (selectedPeriod === 'month') {
        if (dDate.getMonth() !== now.getMonth() || dDate.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  const counts = filteredData.reduce((acc, d) => {
    acc[d.type] = (acc[d.type] || 0) + 1;
    return acc;
  }, {});

  const dailyTrend = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      if (!r.timestamp) return;
      const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
      const dayStr = `${d.getMonth()+1}/${d.getDate()}`;
      map[dayStr] = (map[dayStr] || 0) + 1;
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b) => {
      const [am, ad] = a.day.split('/').map(Number);
      const [bm, bd] = b.day.split('/').map(Number);
      return am !== bm ? am - bm : ad - bd;
    }).slice(-14);
  }, [filteredData]);

  const uniqueMembersForDropdown = useMemo(() => {
    const knownIds = new Set(members.map(m => m.id));
    const gasUnmappedNames = new Set();
    
    gasData.forEach(d => {
      const match = members.find(m => m.spreadsheetName === d.memberId || m.name === d.memberId);
      if (!match && d.memberId) {
        gasUnmappedNames.add(d.memberId);
      }
    });
    
    return [
      ...members.map(m => ({ id: m.id, name: m.name })),
      ...Array.from(gasUnmappedNames).map(name => ({ id: name, name: name }))
    ];
  }, [members, gasData]);

  const STATUS_LIST = [
    { key: '新規', label: '新規', color: 'text-slate-600' },
    { key: '担当者不在', label: '担当者不在', color: 'text-slate-600' },
    { key: '折り返し', label: '折り返し', color: 'text-orange-500' },
    { key: '再架電🔥', label: '再架電🔥', color: 'text-rose-500' },
    { key: '再架電😍', label: '再架電😍', color: 'text-pink-500' },
    { key: '資料送付予定A', label: '資料A', color: 'text-emerald-600' },
    { key: '資料送付予定B', label: '資料B', color: 'text-emerald-500' },
    { key: '資料送付予定C', label: '資料C', color: 'text-emerald-400' },
    { key: 'アポ確定', label: 'アポ確定', color: 'text-blue-600' },
    { key: '受付拒否', label: '受付拒否', color: 'text-rose-600' },
    { key: '担当者拒否', label: '担当者拒否', color: 'text-rose-700' },
    { key: '営業時間外', label: '営業時間外', color: 'text-slate-500' },
    { key: 'call', label: '架電 (自動)', color: 'text-slate-400' },
    { key: 'appt', label: 'アポ (自動)', color: 'text-blue-400' },
    { key: 'request', label: '資料 (自動)', color: 'text-emerald-400' },
    { key: 'meeting', label: '商談 (自動)', color: 'text-purple-400' }
  ];

  return (
    <div className="space-y-8 pb-24 font-sans">
       <div className={`flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-slate-900 pb-4 gap-4 ${hideHeader ? 'border-none pb-0' : ''}`}>
          {!hideHeader && <h2 className="text-xl font-bold flex items-center gap-3"><Icon p={I.Zap} size={24} className="text-blue-600"/> GAS自動同期データ</h2>}
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto ml-auto">
            <select 
              value={selectedPeriod} 
              onChange={e => setSelectedPeriod(e.target.value)}
              className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm flex-1 md:flex-none"
            >
              <option value="all">全期間 (All Time)</option>
              <option value="today">今日 (Today)</option>
              <option value="week">直近1週間 (7 Days)</option>
              <option value="month">今月 (This Month)</option>
            </select>
            {!forcedMemberId && (
              <select 
                value={selectedMember} 
                onChange={e => setSelectedMember(e.target.value)}
                className="p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none shadow-sm flex-1 md:flex-none min-w-[200px]"
              >
                <option value="all">全員のデータ (All)</option>
                {uniqueMembersForDropdown.map(m => (
                  <option key={m.id} value={m.id}>{m.name} のデータ</option>
                ))}
              </select>
            )}
          </div>
       </div>

       {dailyTrend.length > 0 && (
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[300px]">
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">アクション数の推移</h3>
           <div className="h-[200px]">
             <CustomChart data={dailyTrend} color="#4f46e5" type="area" />
           </div>
         </div>
       )}

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-sm flex flex-col items-center col-span-2 md:col-span-4">
             <div className="text-xs font-bold text-slate-400 uppercase">選択中のアクション総数</div>
             <div className="text-5xl font-black mt-2">{filteredData.length}</div>
         </div>
         {STATUS_LIST.map(st => {
            const c = counts[st.key] || 0;
            if (c === 0 && st.key.match(/call|appt|request|meeting/)) return null; 
            return (
              <div key={st.key} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase">{st.label}</div>
                 <div className={`text-2xl font-black mt-1 ${st.color}`}>{c}</div>
              </div>
            );
         })}
       </div>

       <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-500 pl-2">最近の履歴</h3>
          {filteredData.sort((a,b) => {
             const tA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
             const tB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
             return tB - tA;
          }).slice(0, 100).map((d, i) => {
             const stInfo = STATUS_LIST.find(s => s.key === d.type) || { label: d.type, color: 'text-slate-600' };
             return (
               <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all">
                  <div className="flex flex-col">
                     <span className="font-bold text-slate-900">{d.memberId}</span>
                     <span className="text-[10px] text-slate-400 font-bold">{d.industry || '未設定'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className={`px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold ${stInfo.color}`}>{stInfo.label}</span>
                     <span className="text-[10px] font-bold text-slate-400">
                       {d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString() : new Date(d.timestamp).toLocaleString()}
                     </span>
                     {(onEditGasRecord && onDeleteGasRecord) && (
                       <div className="flex gap-1 ml-2">
                          <button onClick={()=>setEditingData(d)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"><Icon p={I.Edit} size={14}/></button>
                          <button onClick={()=>{ if(window.confirm('本当にこの記録を削除しますか？')){ onDeleteGasRecord(d.id); } }} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"><Icon p={I.Trash} size={14}/></button>
                       </div>
                     )}
                  </div>
               </div>
             )
          })}
          {filteredData.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-100">
              まだ同期されたデータがありません
            </div>
          )}
       </div>
       
       {editingData && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/90 p-4">
           <div className="bg-white w-full max-w-sm p-10 space-y-8 border-4 border-slate-900 rounded-3xl shadow-2xl">
             <h3 className="text-xl font-bold">記録の修正 ({editingData.memberId})</h3>
             <div className="space-y-4">
                <label className="text-sm font-bold text-slate-600">ステータス変更</label>
                <select 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-200 font-bold outline-none rounded-xl"
                  value={editingData.type}
                  onChange={e => setEditingData({...editingData, type: e.target.value})}
                >
                   {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={()=>setEditingData(null)} className="w-full text-slate-500 bg-slate-100 py-4 font-bold rounded-2xl">キャンセル</button>
                <button onClick={()=>{onEditGasRecord(editingData.id, {type: editingData.type}); setEditingData(null);}} className="w-full bg-slate-900 text-white py-4 font-bold shadow-lg rounded-2xl">保存</button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

// ==========================================
// 6. メインAppコンポーネント (Logic)
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
  const [gasData, setGasData] = useState([]);
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
        onSnapshot(collection(db, 'kpi_sync'), (s) => {
          setGasData(s.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } else {
        setConnectionStatus("unauthenticated");
      }
    });
    return () => unsubAuth();
  }, [currentEventId]);

  const addEvent = async (n, d) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { name: n, date: d, goals: defaultGoals, weeklyGoals: {}, createdAt: Timestamp.now() });
  const deleteEvent = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
  const updateEventWeeklyGoals = async (id, wk, wg, ig) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id), { [`weeklyGoals.${wk}`]: wg, [`individualWeeklyGoals.${wk}`]: ig });
  
  const handleUpdateGoal = (monday, memberId, goal) => {
    const currentEvent = events?.find(e => e.id === currentEventId);
    if (!currentEventId) return;
    if (memberId) {
      const ig = currentEvent?.individualWeeklyGoals?.[monday] || {};
      updateEventWeeklyGoals(currentEventId, monday, currentEvent?.weeklyGoals?.[monday] || currentEvent?.goals?.weekly || { appts: 0 }, { ...ig, [memberId]: goal });
    } else {
      updateEventWeeklyGoals(currentEventId, monday, goal, currentEvent?.individualWeeklyGoals?.[monday] || {});
    }
  };
  
  const addMember = async (n, r, w, e, sName) => await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'members'), { name: n, role: r, hourlyWage: Number(w), email: e || "", spreadsheetName: sName || "", createdAt: Timestamp.now() });
  const updateMember = async (id, d) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id), { ...d, updatedAt: Timestamp.now() });
  const deleteMember = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'members', id));

  const deleteGasRecord = async (id) => {
    await deleteDoc(doc(db, 'kpi_sync', id));
  };
  const updateGasRecord = async (id, data) => {
    await updateDoc(doc(db, 'kpi_sync', id), data);
  };

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
  const currentMember = useMemo(() => members.find(m => m.email === user?.email), [members, user]);
  
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
    
    const sumGas = (arr) => arr.reduce((acc, d) => {
      acc.calls += 1;
      if (d.type === 'アポ確定') acc.appts += 1;
      if (d.type === '資料送付予定A' || d.type === '資料送付予定B' || d.type === '資料送付予定C') acc.requests += 1;
      return acc;
    }, { appts: 0, calls: 0, requests: 0 });

    const gasWd = gasData.filter(d => {
      if (!d.timestamp) return false;
      const ts = d.timestamp.toDate ? d.timestamp.toDate() : new Date(d.timestamp);
      return ts >= wr.start && ts <= wr.end;
    });

    const s = sum(wD);
    const gWs = sumGas(gasWd);
    s.appts += gWs.appts; s.calls += gWs.calls; s.requests += gWs.requests;

    const t = sum(tD);
    const gTs = sumGas(gasData);
    t.appts += gTs.appts; t.calls += gTs.calls; t.requests += gTs.requests;

    // 今週の全メンバーのシフトから総予定時間を算出
    const weekShifts = shifts.filter(sh => {
      const d = new Date(sh.date);
      return d >= wr.start && d <= wr.end;
    });
    const totalScheduledHours = weekShifts.reduce((acc, sh) => {
      const [h1, m1] = sh.startTime.split(':').map(Number);
      const [h2, m2] = sh.endTime.split(':').map(Number);
      return acc + (h2 + m2/60) - (h1 + m1/60);
    }, 0);

    return { weekly: s, total: t, totalScheduledHours };
  }, [reports, currentEventId, currentBaseDate, shifts, gasData]);

  const memberStats = useMemo(() => {
    const wr = getWeekRange(currentBaseDate);
    const activeWeeklyGoals = currentEvent.weeklyGoals?.[getMondayKey(currentBaseDate)] || currentEvent.goals?.weekly || {};
    // 一律目標の算出（メンバー数で割る）
    const uniformGoal = members.length > 0 ? Math.ceil(activeWeeklyGoals.appts / members.length) : 0;

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
        noAnswer: acc.noAnswer + (Number(r.noAnswer)||0),
        receptionRefusal: acc.receptionRefusal + (Number(r.receptionRefusal)||0),
        picAbsent: acc.picAbsent + (Number(r.picAbsent)||0),
        outOfTarget: acc.outOfTarget + (Number(r.outOfTarget)||0),
      }), { deals: 0, prospects: 0, lost: 0, appts: 0, calls: 0, requests: 0, hours: 0, picConnected: 0, noAnswer: 0, receptionRefusal: 0, picAbsent: 0, outOfTarget: 0 });
      
      // Merge GAS data
      gasData.filter(d => d.memberId === m.spreadsheetName || d.memberId === m.name).forEach(d => {
        myTot.calls += 1;
        if (d.type === 'アポ確定') myTot.appts += 1;
        if (d.type === '資料送付予定A' || d.type === '資料送付予定B' || d.type === '資料送付予定C') myTot.requests += 1;
        if (d.type === '担当者不在' || d.type === '折り返し' || d.type === '再架電🔥' || d.type === '再架電😍' || d.type === '営業時間外') myTot.picAbsent += 1;
        if (d.type === '受付拒否') myTot.receptionRefusal += 1;
        if (d.type === '担当者拒否') myTot.outOfTarget += 1;
      });

      const meetings = myTot.deals + (m.role==='closer' ? myTot.prospects : 0) + myTot.lost;
      const cph = myTot.hours > 0 ? (myTot.calls / myTot.hours).toFixed(1) : "0.0";
      
      // 今週の稼働予定時間の計算
      const myWeekShifts = shifts.filter(sh => {
        const d = new Date(sh.date);
        return sh.memberId === m.id && d >= wr.start && d <= wr.end;
      });
      const scheduledHours = myWeekShifts.reduce((acc, sh) => {
        const [h1, m1] = sh.startTime.split(':').map(Number);
        const [h2, m2] = sh.endTime.split(':').map(Number);
        return acc + (h2 + m2/60) - (h1 + m1/60);
      }, 0);

      // 期待アポ数の計算: (過去のアポ数 / 過去の稼働時間) * 今週の予定時間
      // データ不足の場合は全体平均（あるいは0.05程度）を仮置き
      const apptRatePerHour = myTot.hours > 0 ? (myTot.appts / myTot.hours) : 0.05; 
      const expectedAppts = (apptRatePerHour * scheduledHours).toFixed(1);

      return { ...m, ...myTot, meetings, cph, scheduledHours, expectedAppts, uniformGoal };
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
            onUpdateGoal={handleUpdateGoal}
            gasData={gasData}
            onEditGasRecord={updateGasRecord}
            onDeleteGasRecord={deleteGasRecord}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView members={members} reports={reports} event={currentEvent} userRole={userRole} />}
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
            onClose={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'shifts' || activeTab === 'attendance' || activeTab === 'gas' || activeTab === 'settings') && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-slate-100 flex items-center justify-between no-print pt-2 pb-6 px-4">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={I.Grid} label="ホーム" />
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={I.PieChart} label="分析" />
          <NavButton active={activeTab === 'shifts'} onClick={() => setActiveTab('shifts')} icon={I.Calendar} label="シフト" />
          <NavButton active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={I.Clock} label="履歴/成果" />
          <NavButton active={activeTab === 'gas'} onClick={() => setActiveTab('gas')} icon={I.Zap} label="GAS連携" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={I.Settings} label="設定" />
        </nav>
      )}

      {showInput && <InputModal members={members} onAdd={addReport} onClose={() => setShowInput(false)} />}
      {editingReport && <InputModal members={members} initialData={editingReport} onUpdate={updateReport} onDelete={deleteReport} onClose={() => setEditingReport(null)} />}
    </div>
  );
}

export default App;
