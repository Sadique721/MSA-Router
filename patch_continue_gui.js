const fs = require('fs');
const path = 'C:\\Users\\MD SADIQUE AMIN\\.antigravity-ide\\extensions\\continue.continue-2.0.0-win32-x64\\gui\\assets\\index.js';
const bak = path + '.original';

if (!fs.existsSync(bak)) {
  fs.copyFileSync(path, bak);
  console.log('✅ Backed up index.js -> index.js.original');
}

let content = fs.readFileSync(path, 'utf8');

// Target 1: at 3289076
const target1 = 'b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"}),b.jsxs("span",{className:"line-clamp-1",children:[e.title';
const replace1 = '(window.vscMediaUrl&&e.icon?b.jsx("img",{src:`${window.vscMediaUrl}/logos/${e.icon}`,className:"h-4 w-4 rounded object-contain flex-shrink-0"}):b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"})),b.jsxs("span",{className:"line-clamp-1",children:[e.title';

// Target 2: at 3730351
const target2 = 'b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"}),b.jsxs("span",{className:"line-clamp-1 truncate",style:{fontSize:Do(-1)},children:[d.title';
const replace2 = '(window.vscMediaUrl&&d.icon?b.jsx("img",{src:`${window.vscMediaUrl}/logos/${d.icon}`,className:"h-4 w-4 rounded object-contain flex-shrink-0"}):b.jsx(bm,{className:"h-3 w-3 flex-shrink-0"})),b.jsxs("span",{className:"line-clamp-1 truncate",style:{fontSize:Do(-1)},children:[d.title';

let patched = false;
if (content.includes(target1)) {
  content = content.replace(target1, replace1);
  console.log('✅ Patched Target 1 (dropdown list item icon)');
  patched = true;
}

if (content.includes(target2)) {
  content = content.replace(target2, replace2);
  console.log('✅ Patched Target 2 (selector item icon)');
  patched = true;
}

if (patched) {
  fs.writeFileSync(path, content, 'utf8');
  console.log('✅ index.js successfully updated with live custom model image logos!');
} else {
  console.log('ℹ️ Targets already patched or not matched.');
}
