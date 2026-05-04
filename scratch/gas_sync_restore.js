const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

function replaceBlock(regex, newCode) {
    if (regex.test(content)) {
        content = content.replace(regex, newCode);
        return true;
    }
    return false;
}

// 1. Update sumGas and totals to handle picConnected and eventId consistency
const newTotalsLogic = `  const totals = useMemo(() => {
    const wr = getWeekRange(currentBaseDate);
    
    const sum = (list) => list.reduce((acc, r) => ({
      appts: acc.appts + (Number(r.appts)||0),
      calls: acc.calls + (Number(r.calls)||0),
      requests: acc.requests + (Number(r.requests)||0),
      picConnected: acc.picConnected + (Number(r.picConnected)||0),
    }), { appts: 0, calls: 0, requests: 0, picConnected: 0 });

    const sumGas = (list) => list.reduce((acc, r) => {
       acc.calls += 1;
       const t = r.type || "";
       if (t === 'アポ獲得') { acc.appts += 1; acc.picConnected += 1; }
       else if (t.includes('資料請求')) { acc.requests += 1; acc.picConnected += 1; }
       else if (t.includes('接続') || t.includes('通話')) { acc.picConnected += 1; }
       return acc;
    }, { appts: 0, calls: 0, requests: 0, picConnected: 0 });

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
  }, [reports, currentEventId, currentBaseDate, shifts, gasData]);`;

content = content.replace(/const totals = useMemo\(\(\) => \{[\s\S]+?\}, \[reports, currentEventId, currentBaseDate, shifts, gasData\]\);/, newTotalsLogic);

// 2. Update memberStats to handle picConnected and more detailed gas data mapping
const newMemberStatsLogic = `  const memberStats = useMemo(() => {
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
        const t = d.type || "";
        if (t === 'アポ獲得') { myTot.appts += 1; myTot.picConnected += 1; }
        else if (t.includes('資料請求')) { myTot.requests += 1; myTot.picConnected += 1; }
        else if (t.includes('接続') || t.includes('通話')) { myTot.picConnected += 1; }
        else if (t.includes('受付拒否') || t.includes('拒否')) { myTot.receptionRefusal += 1; }
        else if (t.includes('不在') || t.includes('担当者不在')) { myTot.picAbsent += 1; }
        else { myTot.noAnswer += 1; }
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
  }, [members, reports, currentEventId, shifts, currentEvent, currentBaseDate, gasData]);`;

content = content.replace(/const memberStats = useMemo\(\(\) => \{[\s\S]+?\}, \[members, reports, currentEventId, shifts, currentEvent, currentBaseDate, gasData\]\);/, newMemberStatsLogic);

// 3. Update AnalyticsView to merge gasData
const newAnalyticsViewLogic = `const AnalyticsView = ({ members, reports, gasData, event, userRole }) => {
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
        appts: d.type === 'アポ獲得' ? 1 : 0,
        requests: d.type?.includes('資料請求') ? 1 : 0,
        calls: 1,
        picConnected: (d.type === 'アポ獲得' || d.type?.includes('資料請求') || d.type?.includes('接続')) ? 1 : 0,
        hours: 0 // GAS doesn't usually have hours
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
      else if (periodMode === 'monthly') key = \`\${dateObj.getMonth()+1}月\`;
      else key = \`\${dateObj.getFullYear()}年\`;
      map[key] = (map[key] || 0) + (Number(r[chartMetric]) || 0);
    });
    return Object.entries(map).map(([day, value]) => ({ day, value })).sort((a,b)=>a.day.localeCompare(b.day));
  }, [mergedData, chartMetric, periodMode]);`;

content = content.replace(/const AnalyticsView = \(\{ members, reports, event, userRole \}\) => \{[\s\S]+?const stats = useMemo\(\(\) => \{[\s\S]+?\}, \[fReports\]\);[\s\S]+?const trendData = useMemo\(\(\) => \{[\s\S]+?\}, \[fReports, chartMetric, periodMode\]\);/, newAnalyticsViewLogic);

// 4. Fix handleManualSync to include appId
content = content.replace(/body: JSON\.stringify\(\{ action: 'sync', legacyAppId: legacyAppId \}\)/, "body: JSON.stringify({ action: 'sync', appId: appId, legacyAppId: legacyAppId })");

// 5. Update AnalyticsView call in App to pass gasData
content = content.replace(/<AnalyticsView members=\{members\} reports=\{reports\} event=\{currentEvent\} userRole=\{userRole\} \/>/, "<AnalyticsView members={members} reports={reports} gasData={gasData} event={currentEvent} userRole={userRole} />");

fs.writeFileSync(path, content, 'utf8');
console.log("GAS Sync Restoration complete");
