const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const users = [
  { username: 'General administrator', password: 'OGAWA SEIJI', role: 'admin' },
  { username: 'Shin Takeo Hospital', password: 'rehabilitation', role: 'user' },
  { username: 'kaho052514github@gmail.com', password: 'test123', role: 'user' }
];

users.forEach(user => {
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) throw err;
    db.run(
      'INSERT OR REPLACE INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [user.username, hash, user.role],
      function (err) {
        if (err) {
          console.error('追加失敗:', err.message);
        } else {
          console.log(`${user.username} を追加しました`);
        }
      }
    );
  });
}); 