const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update Firestore listener for GAS data
content = content.replace(/onSnapshot\(collection\(db, 'artifacts', appId, 'public', 'data', 'gas_sync'\)/, "onSnapshot(collection(db, 'kpi_sync')");

// 2. Update GAS record operations (Edit/Delete)
content = content.replace(/await deleteDoc\(doc\(db, 'artifacts', appId, 'public', 'data', 'gas_sync', id\)\)/, "await deleteDoc(doc(db, 'kpi_sync', id))");
content = content.replace(/await updateDoc\(doc\(db, 'artifacts', appId, 'public', 'data', 'gas_sync', id\), data\)/, "await updateDoc(doc(db, 'kpi_sync', id), data)");

// 3. Update sumGas and memberStats mapping for the specific GAS types
const newSumGas = `    const sumGas = (arr) => arr.reduce((acc, d) => {
      acc.calls += 1;
      if (d.type === 'アポ確定') { acc.appts += 1; acc.picConnected += 1; }
      else if (d.type?.startsWith('資料送付予定')) { acc.requests += 1; acc.picConnected += 1; }
      else if (d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電') || d.type === '営業時間外') { acc.picAbsent += 1; acc.picConnected += 1; }
      else if (d.type === '受付拒否') { acc.receptionRefusal += 1; }
      else if (d.type === '担当者拒否') { /* out of target usually not in simple totals */ }
      else if (d.type === '本人接続' || d.type?.includes('接続') || d.type?.includes('通話')) { acc.picConnected += 1; }
      return acc;
    }, { appts: 0, calls: 0, requests: 0, picConnected: 0, picAbsent: 0, receptionRefusal: 0 });`;

content = content.replace(/const sumGas = \(list\) => list\.reduce\(\(acc, r\) => \{[\s\S]+?\}, \{ appts: 0, calls: 0, requests: 0, picConnected: 0 \}\);/, newSumGas);

// 4. Update memberStats loop to use the specific types
const newMemberStatsGasLogic = `      gasData.filter(d => d.memberId === m.spreadsheetName || d.memberId === m.name).forEach(d => {
        myTot.calls += 1;
        if (d.type === 'アポ確定') { myTot.appts += 1; myTot.picConnected += 1; }
        else if (d.type?.startsWith('資料送付予定')) { myTot.requests += 1; myTot.picConnected += 1; }
        else if (d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電') || d.type === '営業時間外') { myTot.picAbsent += 1; myTot.picConnected += 1; }
        else if (d.type === '受付拒否') { myTot.receptionRefusal += 1; }
        else if (d.type === '担当者拒否') { myTot.picAbsent += 1; /* mapping as absent/lost */ }
        else { myTot.picConnected += 1; }
      });`;

content = content.replace(/gasData\.filter\(d => d\.memberId === m\.spreadsheetName \|\| d\.memberId === m\.name\)\.forEach\(d => \{[\s\S]+?\}\);/, newMemberStatsGasLogic);

// 5. Update AnalyticsView mapping for the specific GAS types
const newAnalyticsGasMapping = `    const gasList = (gasData || []).map(d => {
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
    });`;

content = content.replace(/const gasList = \(gasData \|\| \[\]\)\.map\(d => \{[\s\S]+?\}\);/, newAnalyticsGasMapping);

// 6. Update handleManualSync fetch mode
content = content.replace(/method: 'POST',/, "method: 'POST',\n        mode: 'no-cors',");

// 7. Update Dashboard's myReports calculation for the specific GAS types
const newDashboardGasLogic = `    const gas = (gasData || []).filter(d => d.memberId === currentMember?.spreadsheetName || d.memberId === currentMember?.name).map(d => ({
      appts: d.type === 'アポ確定' ? 1 : 0,
      calls: 1,
      picConnected: (d.type === 'アポ確定' || d.type?.startsWith('資料送付予定') || d.type === '担当者不在' || d.type === '折り返し' || d.type?.startsWith('再架電')) ? 1 : 0,
      date: d.timestamp?.toDate ? d.timestamp.toDate() : (d.timestamp?.seconds ? new Date(d.timestamp.seconds * 1000) : new Date(d.timestamp))
    }));`;

content = content.replace(/const gas = \(gasData \|\| \[\]\)\.filter\(d => d\.memberId === currentMember\?\.spreadsheetName \|\| d\.memberId === currentMember\?\.name\)\.map\(d => \(\{[\s\S]+?\}\)\);/, newDashboardGasLogic);

fs.writeFileSync(path, content, 'utf8');
console.log("GAS Sync logic alignment with historical code complete");
