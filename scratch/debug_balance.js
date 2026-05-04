const fs = require('fs');
const content = fs.readFileSync('src/App.jsx', 'utf8');
const lines = content.split('\n');
let pCount = 0;
let bCount = 0;

lines.forEach((line, i) => {
  const lp = (line.match(/\(/g) || []).length;
  const rp = (line.match(/\)/g) || []).length;
  const lb = (line.match(/\{/g) || []).length;
  const rb = (line.match(/\}/g) || []).length;
  
  pCount += lp - rp;
  bCount += lb - rb;
  
  if (lp !== rp) {
    console.log(`Line ${i+1}: Paren mismatch! Current pCount: ${pCount} (line has (:${lp}, ):${rp})`);
  }
  if (lb !== rb) {
    console.log(`Line ${i+1}: Brace mismatch! Current bCount: ${bCount} (line has {:${lb}, }:${rb})`);
  }
});
console.log(`Final pCount: ${pCount}, bCount: ${bCount}`);
