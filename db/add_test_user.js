const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// テストユーザーの作成
bcrypt.hash('test123', 10, (err, hash) => {
  if (err) {
    console.error('パスワードハッシュ生成エラー:', err);
    db.close();
    return;
  }

  db.run(`INSERT OR IGNORE INTO users (username, password_hash, role)
          VALUES (?, ?, ?)`,
    ['kaho052514github@gmail.com', hash, 'user'],
    (err) => {
      if (err) {
        console.error('テストユーザー作成エラー:', err);
      } else {
        console.log('テストユーザー作成完了');
      }
      db.close();
    }
  );
}); 