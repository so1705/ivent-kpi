const fs = require('fs');
const path = 'src/App.jsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the line that is exactly "              </div>" (with any whitespace) right after "             </div>"
// and before the GAS header.
for (let i = 0; i < lines.length - 2; i++) {
  if (lines[i].includes('alert("目標を更新し、チーム全体に適用しました。");') && 
      lines[i+3].includes('</div>') && 
      lines[i+4].trim() === '</div>' && 
      lines[i+6].includes('外部データ連携')) {
    console.log("Found target at line " + (i+5));
    lines.splice(i+4, 1);
    break;
  }
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log("Syntax fix applied via line removal");
