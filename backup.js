const fs = require('fs');
const path = require('path');

// バックアップ元と先のパス
const targets = [
  'database.sqlite',
  'game_admin.html',
  'uploads',
  'images'
];
const backupDir = path.join(__dirname, 'backup_' + new Date().toISOString().replace(/[:.]/g, '-'));

fs.mkdirSync(backupDir, { recursive: true });

function copyRecursive(src, dest) {
  if (fs.lstatSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const target of targets) {
  if (fs.existsSync(target)) {
    copyRecursive(path.join(__dirname, target), path.join(backupDir, target));
    console.log(`バックアップ完了: ${target}`);
  } else {
    console.log(`見つかりません: ${target}`);
  }
}

console.log('バックアップ全体が完了しました。保存先:', backupDir);