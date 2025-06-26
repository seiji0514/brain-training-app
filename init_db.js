const db = require('./db/database');
const bcrypt = require('bcrypt');

async function createTables() {
  try {
    await db.execSQL('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT "user", created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    await db.execSQL('CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, session_token TEXT UNIQUE NOT NULL, expires_at DATETIME NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    await db.execSQL('CREATE TABLE IF NOT EXISTS game_records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, game_id TEXT NOT NULL, score INTEGER, play_time INTEGER, mistakes INTEGER, completed BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    await db.execSQL('CREATE TABLE IF NOT EXISTS operation_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, action TEXT NOT NULL, target_type TEXT, target_id INTEGER, ip_address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    const adminPassword = await bcrypt.hash('admin123', 10);
    await db.insert('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['admin@example.com', adminPassword, 'admin']);
    console.log('Admin user created: admin@example.com / admin123');
  } catch (error) {
    console.error('Error:', error);
  }
}
createTables();
