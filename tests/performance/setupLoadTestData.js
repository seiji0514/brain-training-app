const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// テスト用DBファイルのパスを明示的に指定
const testDbPath = path.join(__dirname, '..', '..', 'test-database.sqlite');

// テスト用DBに直接接続
const db = new sqlite3.Database(testDbPath);

async function setupLoadTestData() {
  try {
    console.log('パフォーマンステスト用ダミーデータ投入を開始します...');

    // ユーザーを10件作成
    for (let i = 1; i <= 10; i++) {
      const username = `testuser${i}@example.com`;
      const passwordHash = await bcrypt.hash('testpass123', 10);
      
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
          [username, passwordHash, 'user'],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }
    console.log('ユーザーデータ作成完了');

    // ゲームを5件作成
    for (let i = 1; i <= 5; i++) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO games (id, name, description) VALUES (?, ?, ?)',
          [`test-game${i}`, `テストゲーム${i}`, `説明${i}`],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }
    console.log('ゲームデータ作成完了');

    // 各ユーザーに対して各ゲームの記録を10件ずつ作成
    for (let u = 1; u <= 10; u++) {
      for (let g = 1; g <= 5; g++) {
        for (let r = 0; r < 10; r++) {
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO game_records (user_id, game_id, score, play_time, mistakes, completed, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now", ?))',
              [u, `test-game${g}`, Math.floor(Math.random()*100), Math.floor(Math.random()*300), Math.floor(Math.random()*5), true, `-${r} days`],
              function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
              }
            );
          });
        }
      }
    }
    console.log('ゲーム記録データ作成完了');

    console.log('パフォーマンステスト用ダミーデータ投入完了');
    console.log('- ユーザー: 10件');
    console.log('- ゲーム: 5件');
    console.log('- ゲーム記録: 500件（10ユーザー × 5ゲーム × 10記録）');
    
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('ダミーデータ投入エラー:', error);
    db.close();
    process.exit(1);
  }
}

setupLoadTestData(); 