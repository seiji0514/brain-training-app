const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.sqlite');

const username = 'General administrator';
const password = 'OGAWA SEIJI';
const role = 'admin';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  db.run(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, hash, role],
    function (err) {
      if (err) {
        console.error('追加失敗:', err.message);
      } else {
        console.log('管理者ユーザーを追加しました。');
      }
      db.close();
    }
  );
}); 