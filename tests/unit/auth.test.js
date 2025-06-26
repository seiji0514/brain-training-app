const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken, rateLimiter } = require('../../api/middleware');

// モック設定
jest.mock('../../db/database', () => ({
  query: jest.fn(),
  insert: jest.fn(),
  exec: jest.fn()
}));

describe('認証機能テスト', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    it('有効なトークンで認証が成功する', () => {
      const validToken = jwt.sign(
        { userId: 1, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      mockReq.headers.authorization = `Bearer ${validToken}`;
      
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.userId).toBe(1);
    });

    it('無効なトークンで認証が失敗する', () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'トークンが無効です'
      });
    });

    it('トークンが存在しない場合にエラーを返す', () => {
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: '認証トークンが必要です'
      });
    });
  });

  describe('rateLimiter', () => {
    beforeEach(() => {
      // レート制限をリセット
      rateLimiter.attempts.clear();
    });

    it('初回アクセスは許可される', () => {
      rateLimiter.check(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('制限回数内のアクセスは許可される', () => {
      // 4回までアクセス（制限は5回）
      for (let i = 0; i < 4; i++) {
        rateLimiter.increment(mockReq.ip);
      }
      
      rateLimiter.check(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('制限回数を超えたアクセスは拒否される', () => {
      // 5回アクセス（制限を超える）
      for (let i = 0; i < 5; i++) {
        rateLimiter.increment(mockReq.ip);
      }
      
      rateLimiter.check(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('ログイン試行回数が制限を超えました')
        })
      );
    });

    it('レート制限がリセットされる', () => {
      // 制限を超える
      for (let i = 0; i < 5; i++) {
        rateLimiter.increment(mockReq.ip);
      }
      
      // リセット
      rateLimiter.reset(mockReq.ip);
      
      // 再度アクセス
      rateLimiter.check(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
}); 