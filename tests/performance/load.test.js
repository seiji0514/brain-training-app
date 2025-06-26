const autocannon = require('autocannon');
const request = require('supertest');
const app = require('../../api_server');
const { performance } = require('perf_hooks');

describe('パフォーマンステスト', () => {
  const baseUrl = 'http://localhost:3000';

  describe('ログインAPI パフォーマンス', () => {
    it('同時100ユーザーでのログイン処理', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/login`,
        connections: 100,
        duration: 10,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'test@example.com',
          password: 'testpass123'
        })
      }, (err, result) => {
        if (err) {
          console.error('Autocannon error:', err);
        }
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.latency.p99).toBeLessThan(1000); // 99%のリクエストが1秒以内
    }, 30000); // タイムアウトを30秒に延長
  });

  describe('ゲーム一覧API パフォーマンス', () => {
    it('同時50ユーザーでのゲーム一覧取得', async () => {
      const result = await autocannon({
        url: `${baseUrl}/api/games`,
        connections: 50,
        duration: 10,
        method: 'GET'
      }, (err, result) => {
        if (err) {
          console.error('Autocannon error:', err);
        }
      });

      expect(result.errors).toBe(0);
      expect(result.timeouts).toBe(0);
      expect(result.latency.p99).toBeLessThan(500); // 99%のリクエストが500ms以内
    }, 30000); // タイムアウトを30秒に延長
  });

  describe('データベースパフォーマンス', () => {
    it('大量データでのクエリパフォーマンス', async () => {
      const startTime = performance.now();
      
      // 大量のテストデータを生成してクエリを実行
      const promises = [];
      for (let i = 0; i < 1000; i++) {
        promises.push(
          request(app)
            .get('/api/games')
            .expect(200)
        );
      }
      
      await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(10000); // 10秒以内に完了
    }, 30000); // タイムアウトを30秒に延長
  });

  describe('メモリ使用量テスト', () => {
    it('長時間運用でのメモリリークチェック', async () => {
      const initialMemory = process.memoryUsage();
      
      // 長時間の処理をシミュレート
      for (let i = 0; i < 100; i++) {
        await request(app)
          .get('/api/games')
          .expect(200);
        
        // 少し待機
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // メモリ増加が1MB以内であることを確認
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    }, 30000); // タイムアウトを30秒に延長
  });

  describe('レスポンス時間テスト', () => {
    it('単一リクエストのレスポンス時間', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/games')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(1000); // 1秒以内
    });

    it('複数リクエストの平均レスポンス時間', async () => {
      const responseTimes = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/games')
          .expect(200);
        
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }
      
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      expect(averageResponseTime).toBeLessThan(500); // 平均500ms以内
    });
  });
}); 