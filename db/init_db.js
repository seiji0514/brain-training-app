const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// テーブル作成
db.serialize(() => {
  // ユーザーテーブル
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // セッションテーブル
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // 操作ログテーブル
  db.run(`CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id INTEGER,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // デフォルト管理者ユーザーの作成
  bcrypt.hash('OGAWA SEIJI', 10, (err, hash) => {
    if (err) {
      console.error('パスワードハッシュ生成エラー:', err);
      db.close();
      return;
    }
    db.run(`INSERT OR IGNORE INTO users (username, password_hash, role)
            VALUES (?, ?, ?)`,
      ['General administrator', hash, 'admin'],
      (err) => {
        if (err) {
          console.error('管理者ユーザー作成エラー:', err);
        } else {
          console.log('データベース初期化完了');
        }
        db.close();
      }
    );
  });
}); 