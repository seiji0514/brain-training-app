const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const sqlite3 = require('sqlite3').verbose();

// スコアテーブル初期化
function initDB() {
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario TEXT,
      result TEXT,
      reaction INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
  db.close();
}
initDB();

// スコア送信（保存）API
router.post('/', (req, res) => {
  const { scenario, result, reaction } = req.body;
  if (!scenario || !result || typeof reaction !== 'number') {
    return res.status(400).json({ error: 'Invalid data' });
  }
  const db = new sqlite3.Database(dbPath);
  db.run(
    'INSERT INTO scores (scenario, result, reaction) VALUES (?, ?, ?)',
    [scenario, result, reaction],
    function (err) {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// スコア履歴取得API
router.get('/', (req, res) => {
  const db = new sqlite3.Database(dbPath);
  db.all('SELECT * FROM scores ORDER BY created_at DESC LIMIT 100', [], (err, rows) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

module.exports = router; 