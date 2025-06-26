const db = require('../../db/database');

describe('データベース機能テスト', () => {
  beforeAll(async () => {
    // テスト用データベースの初期化
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterAll(async () => {
    // テスト用データベースのクリーンアップ
    await db.exec('DROP TABLE IF EXISTS users');
  });

  beforeEach(async () => {
    // 各テスト前にテーブルをクリア
    await db.exec('DELETE FROM users');
  });

  describe('ユーザー管理', () => {
    it('ユーザーを正常に作成できる', async () => {
      const username = 'test@example.com';
      const passwordHash = 'hashed_password';
      const role = 'user';

      const userId = await db.insert(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, role]
      );

      expect(userId).toBeGreaterThan(0);

      const users = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe(username);
      expect(users[0].role).toBe(role);
    });

    it('重複するユーザー名でエラーが発生する', async () => {
      const username = 'duplicate@example.com';
      const passwordHash = 'hashed_password';

      // 最初のユーザーを作成
      await db.insert(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash]
      );

      // 重複するユーザー名で作成を試行
      await expect(
        db.insert(
          'INSERT INTO users (username, password_hash) VALUES (?, ?)',
          [username, passwordHash]
        )
      ).rejects.toThrow();
    });

    it('ユーザーを正常に取得できる', async () => {
      const username = 'test@example.com';
      const passwordHash = 'hashed_password';

      const userId = await db.insert(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash]
      );

      const users = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(userId);
      expect(users[0].username).toBe(username);
    });
  });

  describe('認証機能', () => {
    it('存在するユーザーで認証が成功する', async () => {
      const username = 'auth@example.com';
      const passwordHash = 'hashed_password';

      await db.insert(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash]
      );

      const user = await new Promise((resolve, reject) => {
        db.authenticateUser(username, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      expect(user).toBeDefined();
      expect(user.username).toBe(username);
    });

    it('存在しないユーザーで認証が失敗する', async () => {
      const username = 'nonexistent@example.com';

      const user = await new Promise((resolve, reject) => {
        db.authenticateUser(username, (err, user) => {
          if (err) reject(err);
          else resolve(user);
        });
      });

      expect(user).toBeNull();
    });
  });
}); 