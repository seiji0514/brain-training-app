const db = require('./db/database'); db.execSQL('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT \
user\, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)').then(() => console.log('テーブル作成成功')).catch(err => console.error('エラー:', err));
