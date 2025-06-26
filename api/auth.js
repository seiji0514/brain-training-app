const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const { checkAuth, rateLimiter, csrfProtection, sanitizeMiddleware } = require('./middleware');
const config = require('../config');
const cors = require('cors');

// CORS設定
router.use(cors({
  origin: config.security.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}));

// サニタイズとCSRF保護を全ルートに適用
router.use(sanitizeMiddleware);
router.use(csrfProtection);

// ログイン（レート制限あり）
router.post('/login', rateLimiter.check.bind(rateLimiter), async (req, res) => {
    const { username, password } = req.body;
    const clientIP = req.ip;
    
    try {
        // 入力値検証
        if (!username || !password) {
            return res.status(400).json({ error: 'ユーザー名とパスワードが必要です' });
        }
        
        // 入力長制限
        if (username.length > 100 || password.length > 100) {
            return res.status(400).json({ error: '入力値が長すぎます' });
        }
        
        const userRow = await new Promise((resolve, reject) => {
            db.authenticateUser(username, (err, user) => {
                if (err) reject(err);
                else resolve(user);
            });
        });
        
        if (!userRow) {
            rateLimiter.increment(clientIP);
            return res.status(401).json({ error: '認証に失敗しました' });
        }
        
        const match = await bcrypt.compare(password, userRow.password_hash);
        if (!match) {
            rateLimiter.increment(clientIP);
            return res.status(401).json({ error: '認証に失敗しました' });
        }
        
        const token = jwt.sign(
            { userId: userRow.id, role: userRow.role },
            config.jwt.secret,
            { expiresIn: config.jwt.expiration }
        );
        
        try {
            await db.insert(
                'INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, datetime("now", "+30 minutes"))',
                [userRow.id, token]
            );
        } catch (sessionError) {
            console.error('Session save error:', sessionError);
        }
        
        try {
            await db.insert(
                'INSERT INTO operation_logs (user_id, action, target_type, ip_address) VALUES (?, ?, ?, ?)',
                [userRow.id, 'LOGIN', 'auth', clientIP]
            );
        } catch (logError) {
            console.error('Log save error:', logError);
        }
        
        res.json({
            token,
            user: {
                id: userRow.id,
                username: userRow.username,
                role: userRow.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ログアウト
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            await db.exec('DELETE FROM sessions WHERE session_token = ?', [token]);
        }
        res.json({ message: 'ログアウトしました' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ユーザー一覧取得（管理者のみ）
router.get('/users', checkAuth, async (req, res) => {
    try {
        const users = await db.query(
            'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ユーザー作成（管理者のみ）
router.post('/users', checkAuth, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // 入力値検証
        if (!username || !password || !role) {
            return res.status(400).json({ error: '必要な情報が不足しています' });
        }
        
        // 入力長制限
        if (username.length > 100 || password.length > 100) {
            return res.status(400).json({ error: '入力値が長すぎます' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);

        const userId = await db.insert(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, passwordHash, role]
        );

        // 操作ログ記録
        await db.insert(
            'INSERT INTO operation_logs (user_id, action, target_type, target_id, ip_address) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'CREATE_USER', 'user', userId, req.ip]
        );

        res.status(201).json({ id: userId, username, role });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ゲーム記録の保存
router.post('/records', checkAuth, async (req, res) => {
    try {
        const { gameId, score, playTime, mistakes, completed } = req.body;
        
        // 入力値検証
        if (!gameId || typeof score !== 'number') {
            return res.status(400).json({ error: '無効なデータです' });
        }
        
        const recordId = await db.saveGameRecord(
            req.user.id,
            gameId,
            score,
            playTime,
            mistakes,
            completed
        );
        res.status(201).json({ id: recordId });
    } catch (error) {
        console.error('Save record error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ゲーム記録の取得
router.get('/records', checkAuth, async (req, res) => {
    try {
        const records = await db.query(
            `SELECT r.*, g.name as game_name 
             FROM game_records r 
             JOIN games g ON r.game_id = g.id 
             WHERE r.user_id = ? 
             ORDER BY r.created_at DESC`,
            [req.user.id]
        );
        res.json(records);
    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 分析API
router.get('/analytics', checkAuth, async (req, res) => {
    try {
        const gameStats = await db.query(
            'SELECT COUNT(*) as totalGames, AVG(score) as averageScore FROM game_records WHERE user_id = ?',
            [req.user.id]
        );
        
        const timeTrend = await db.query(
            'SELECT DATE(created_at) as date, COUNT(*) as games FROM game_records WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 7',
            [req.user.id]
        );
        
        res.json({
            gameStats: gameStats[0] || { totalGames: 0, averageScore: 0 },
            timeTrend: { daily: timeTrend.map(t => t.games) },
            improvementTrend: { weekly: [65, 70, 75, 80, 85] } // 仮データ
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// レポートAPI
router.get('/reports', checkAuth, async (req, res) => {
    try {
        const periodStats = await db.query(
            'SELECT COUNT(DISTINCT user_id) as totalUsers FROM game_records WHERE created_at >= datetime("now", "-30 days")'
        );
        
        const detailedHistory = await db.query(
            'SELECT DATE(created_at) as date, COUNT(*) as games, AVG(score) as averageScore FROM game_records WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30',
            [req.user.id]
        );
        
        res.json({
            periodStats: periodStats[0] || { totalUsers: 0, activeUsers: 0 },
            detailedHistory: detailedHistory
        });
    } catch (error) {
        console.error('Reports error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

module.exports = router; 