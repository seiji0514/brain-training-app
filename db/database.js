const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// ユーザー名でユーザー情報を取得する関数
db.authenticateUser = function(username, callback) {
  db.get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
    if (err) return callback(err, null);
    return callback(null, row ? row : null); // 必ずnullまたはrow
  });
};

// SQLクエリをPromiseでラップして返す関数
db.query = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// INSERT文を実行してIDを返す関数
db.insert = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

// 単一の行を取得する関数（sqlite3のgetメソッドと名前が重複しないよう別名）
db.getRow = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// SQL文を実行する関数（CREATE、DROP、DELETE等）
db.execSQL = function(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// ゲーム記録を保存する関数
db.saveGameRecord = function(userId, gameId, score, playTime, mistakes, completed) {
  return this.insert(
    'INSERT INTO game_records (user_id, game_id, score, play_time, mistakes, completed) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, gameId, score, playTime, mistakes, completed ? 1 : 0]
  );
};

module.exports = db;
