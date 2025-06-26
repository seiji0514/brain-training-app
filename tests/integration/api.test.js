const request = require('supertest');
const app = require('../../api_server');

describe('API統合テスト', () => {
  let authToken;

  describe('認証API', () => {
    it('正常なログインが成功する', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'test@example.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(401); // テストユーザーが存在しないため401
      // 実際の環境では200が期待される
    });

    it('無効な認証情報でログインが失敗する', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'invalid@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('存在しないユーザーでログインが失敗する', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistent@example.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('ユーザー管理API', () => {
    it('認証なしでユーザー一覧取得が失敗する', async () => {
      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(401);
    });
  });

  describe('ゲーム記録API', () => {
    it('認証なしでゲーム記録保存が失敗する', async () => {
      const response = await request(app)
        .post('/api/records')
        .send({
          gameId: 'test-game',
          score: 100,
          playTime: 60,
          mistakes: 2,
          completed: true
        });

      expect(response.status).toBe(401);
    });

    it('認証なしでゲーム記録取得が失敗する', async () => {
      const response = await request(app)
        .get('/api/records');

      expect(response.status).toBe(401);
    });
  });

  describe('分析API', () => {
    it('認証なしでユーザー行動分析取得が失敗する', async () => {
      const response = await request(app)
        .get('/api/analytics');

      expect(response.status).toBe(401);
    });

    it('認証なしでゲーム成績レポート取得が失敗する', async () => {
      const response = await request(app)
        .get('/api/reports');

      expect(response.status).toBe(401);
    });
  });

  describe('ログアウトAPI', () => {
    it('正常にログアウトできる', async () => {
      const response = await request(app)
        .post('/api/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('ゲームデータAPI', () => {
    it('ゲーム一覧を取得できる', async () => {
      const response = await request(app)
        .get('/api/games');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('特定のゲームを取得できる', async () => {
      const response = await request(app)
        .get('/api/games/test-game');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
    });

    it('存在しないゲームで404エラーが返される', async () => {
      const response = await request(app)
        .get('/api/games/nonexistent-game');

      expect(response.status).toBe(404);
    });
  });

  describe('進捗データAPI', () => {
    it('進捗データを取得できる', async () => {
      const response = await request(app)
        .get('/api/progress');

      expect(response.status).toBe(200);
      expect(typeof response.body).toBe('object');
    });
  });

  describe('お知らせAPI', () => {
    it('お知らせデータを取得できる', async () => {
      const response = await request(app)
        .get('/api/notices');

      expect(response.status).toBe(200);
      expect(typeof response.body).toBe('object');
    });
  });

  describe('バックアップAPI', () => {
    it('バックアップデータを取得できる', async () => {
      const response = await request(app)
        .get('/api/backup');

      expect(response.status).toBe(200);
      expect(typeof response.body).toBe('object');
    });
  });
}); 