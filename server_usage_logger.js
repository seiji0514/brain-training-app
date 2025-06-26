// サーバーサイド利用履歴記録システム
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class ServerUsageLogger {
    constructor() {
        this.dbPath = path.join(__dirname, 'database.sqlite');
        this.initDatabase();
    }

    // データベース初期化
    initDatabase() {
        const db = new sqlite3.Database(this.dbPath);
        
        // 利用履歴テーブルの作成
        db.run(`
            CREATE TABLE IF NOT EXISTS usage_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                role TEXT NOT NULL,
                game_name TEXT NOT NULL,
                action TEXT NOT NULL,
                score INTEGER,
                play_time INTEGER,
                mistakes INTEGER,
                completed BOOLEAN,
                session_id TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT
            )
        `);

        // 顔認証ユーザーテーブルの作成
        db.run(`
            CREATE TABLE IF NOT EXISTS face_auth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                face_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT 1
            )
        `);

        // セッション管理テーブルの作成
        db.run(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        `);

        db.close();
        console.log('データベーステーブルが初期化されました');
    }

    // 利用履歴を記録
    logUsage(logData) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                INSERT INTO usage_logs 
                (username, role, game_name, action, score, play_time, mistakes, completed, session_id, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                logData.username,
                logData.role,
                logData.gameName,
                logData.action,
                logData.score || null,
                logData.playTime || null,
                logData.mistakes || null,
                logData.completed ? 1 : 0,
                logData.sessionId || null,
                logData.ipAddress || null,
                logData.userAgent || null
            ];

            db.run(query, params, function(err) {
                if (err) {
                    console.error('利用履歴の記録に失敗:', err);
                    reject(err);
                } else {
                    console.log(`利用履歴を記録しました: ID ${this.lastID}`);
                    resolve(this.lastID);
                }
                db.close();
            });
        });
    }

    // 顔認証ユーザーを登録
    registerFaceAuthUser(userData) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                INSERT OR REPLACE INTO face_auth_users 
                (username, role, face_data, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                userData.username,
                userData.role,
                userData.faceData || null
            ];

            db.run(query, params, function(err) {
                if (err) {
                    console.error('顔認証ユーザーの登録に失敗:', err);
                    reject(err);
                } else {
                    console.log(`顔認証ユーザーを登録しました: ${userData.username}`);
                    resolve(this.lastID);
                }
                db.close();
            });
        });
    }

    // セッションを作成
    createSession(username, sessionId, expiresInHours = 24) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + expiresInHours);
            
            const query = `
                INSERT INTO user_sessions 
                (session_id, username, expires_at)
                VALUES (?, ?, ?)
            `;
            
            const params = [sessionId, username, expiresAt.toISOString()];

            db.run(query, params, function(err) {
                if (err) {
                    console.error('セッションの作成に失敗:', err);
                    reject(err);
                } else {
                    console.log(`セッションを作成しました: ${sessionId}`);
                    resolve(this.lastID);
                }
                db.close();
            });
        });
    }

    // セッションを検証
    validateSession(sessionId) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = `
                SELECT us.*, fau.role 
                FROM user_sessions us
                JOIN face_auth_users fau ON us.username = fau.username
                WHERE us.session_id = ? AND us.is_active = 1 AND us.expires_at > datetime('now')
            `;
            
            db.get(query, [sessionId], (err, row) => {
                if (err) {
                    console.error('セッション検証に失敗:', err);
                    reject(err);
                } else {
                    resolve(row);
                }
                db.close();
            });
        });
    }

    // 利用履歴を取得
    getUsageLogs(filters = {}) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            let query = 'SELECT * FROM usage_logs WHERE 1=1';
            const params = [];

            // フィルター条件を追加
            if (filters.username) {
                query += ' AND username LIKE ?';
                params.push(`%${filters.username}%`);
            }

            if (filters.gameName) {
                query += ' AND game_name LIKE ?';
                params.push(`%${filters.gameName}%`);
            }

            if (filters.action) {
                query += ' AND action = ?';
                params.push(filters.action);
            }

            if (filters.startDate) {
                query += ' AND timestamp >= ?';
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                query += ' AND timestamp <= ?';
                params.push(filters.endDate);
            }

            // ソート
            query += ' ORDER BY timestamp DESC';

            // ページネーション
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }

            if (filters.offset) {
                query += ' OFFSET ?';
                params.push(filters.offset);
            }

            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error('利用履歴の取得に失敗:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
                db.close();
            });
        });
    }

    // 統計情報を取得
    getStatistics() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const queries = {
                totalUsers: 'SELECT COUNT(DISTINCT username) as count FROM usage_logs',
                totalSessions: 'SELECT COUNT(DISTINCT session_id) as count FROM usage_logs WHERE session_id IS NOT NULL',
                popularGames: 'SELECT game_name, COUNT(*) as count FROM usage_logs GROUP BY game_name ORDER BY count DESC LIMIT 10',
                dailyActivity: 'SELECT DATE(timestamp) as date, COUNT(*) as count FROM usage_logs GROUP BY DATE(timestamp) ORDER BY date DESC LIMIT 30',
                averageScores: 'SELECT game_name, AVG(score) as avg_score, COUNT(*) as count FROM usage_logs WHERE score IS NOT NULL GROUP BY game_name'
            };

            const results = {};
            let completedQueries = 0;
            const totalQueries = Object.keys(queries).length;

            Object.keys(queries).forEach(key => {
                db.all(queries[key], [], (err, rows) => {
                    if (err) {
                        console.error(`統計情報の取得に失敗 (${key}):`, err);
                        results[key] = [];
                    } else {
                        results[key] = rows;
                    }
                    
                    completedQueries++;
                    if (completedQueries === totalQueries) {
                        db.close();
                        resolve(results);
                    }
                });
            });
        });
    }

    // 古いセッションをクリーンアップ
    cleanupExpiredSessions() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const query = 'UPDATE user_sessions SET is_active = 0 WHERE expires_at <= datetime("now")';
            
            db.run(query, [], function(err) {
                if (err) {
                    console.error('セッションクリーンアップに失敗:', err);
                    reject(err);
                } else {
                    console.log(`${this.changes}件の期限切れセッションをクリーンアップしました`);
                    resolve(this.changes);
                }
                db.close();
            });
        });
    }

    // データベースバックアップ
    backupDatabase() {
        return new Promise((resolve, reject) => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, 'backups', `database_backup_${timestamp}.sqlite`);
            
            // バックアップディレクトリの作成
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // データベースファイルをコピー
            fs.copyFile(this.dbPath, backupPath, (err) => {
                if (err) {
                    console.error('データベースバックアップに失敗:', err);
                    reject(err);
                } else {
                    console.log(`データベースをバックアップしました: ${backupPath}`);
                    resolve(backupPath);
                }
            });
        });
    }
}

// Express.js用のミドルウェア
function createUsageLoggerMiddleware() {
    const logger = new ServerUsageLogger();
    
    return (req, res, next) => {
        // リクエスト情報を追加
        req.usageLogger = logger;
        req.clientInfo = {
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
        };
        next();
    };
}

// APIエンドポイント用のルーター
function createUsageLoggerRouter() {
    const express = require('express');
    const router = express.Router();
    const logger = new ServerUsageLogger();

    // 利用履歴を記録
    router.post('/log', async (req, res) => {
        try {
            const logData = {
                ...req.body,
                ipAddress: req.clientInfo?.ipAddress,
                userAgent: req.clientInfo?.userAgent
            };
            
            const logId = await logger.logUsage(logData);
            res.json({ success: true, logId });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 利用履歴を取得
    router.get('/logs', async (req, res) => {
        try {
            const filters = {
                username: req.query.username,
                gameName: req.query.gameName,
                action: req.query.action,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: parseInt(req.query.limit) || 100,
                offset: parseInt(req.query.offset) || 0
            };
            
            const logs = await logger.getUsageLogs(filters);
            res.json({ success: true, logs });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // 統計情報を取得
    router.get('/statistics', async (req, res) => {
        try {
            const stats = await logger.getStatistics();
            res.json({ success: true, statistics: stats });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // セッション検証
    router.post('/validate-session', async (req, res) => {
        try {
            const { sessionId } = req.body;
            const session = await logger.validateSession(sessionId);
            
            if (session) {
                res.json({ success: true, session });
            } else {
                res.status(401).json({ success: false, message: '無効なセッションです' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}

module.exports = {
    ServerUsageLogger,
    createUsageLoggerMiddleware,
    createUsageLoggerRouter
};
