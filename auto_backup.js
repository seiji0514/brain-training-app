// auto_backup.js
setInterval(() => {
  require('./backup.js');
  console.log('バックアップ実行:', new Date().toLocaleString());
}, 24 * 60 * 60 * 1000); // 24時間ごと（1日1回）

// 起動時にも1回バックアップを実行したい場合
require('./backup.js');
console.log('初回バックアップ実行:', new Date().toLocaleString());