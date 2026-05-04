const fs = require('fs');
const path = 'src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Broadly fix any string starting with 賁 and ending where it looks like it should end
content = content.replace(/'賁[^']*?(\)|,)/g, "'資料請求'$1");

// Also check for other patterns in the App component
content = content.replace(/if \(d\.type === 'アポ獲得 myTot\.appts \+= 1;/g, "if (d.type === 'アポ獲得') myTot.appts += 1;");
content = content.replace(/if \(d\.type\?\.includes\('賁[^']*?\)\) myTot\.requests \+= 1;/g, "if (d.type?.includes('資料請求')) myTot.requests += 1;");

fs.writeFileSync(path, content, 'utf8');
console.log("Ultimate string cleanup complete");
