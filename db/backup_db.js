const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'database.sqlite');
const now = new Date();
const y = now.getFullYear();
const m = String(now.getMonth() + 1).padStart(2, '0');
const d = String(now.getDate()).padStart(2, '0');
const h = String(now.getHours()).padStart(2, '0');
const min = String(now.getMinutes()).padStart(2, '0');
const s = String(now.getSeconds()).padStart(2, '0');
const dst = path.join(__dirname, `backup_${y}${m}${d}_${h}${min}${s}.sqlite`);

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dst);
  console.log('バックアップ完了:', dst);
} else {
  console.log('database.sqlite が存在しません。');
} 