const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const jwt = require('jsonwebtoken');
const config = require('../config');

let ALLOWED_IPS = [
    '192.168.0.0/16',  // 院内Wi-Fi
    '10.0.0.0/8',      // 院内Wi-Fi
    '127.0.0.1',       // サーバー自身
    '203.0.113.45'     // 管理者自宅（例: ご自宅のグローバルIPに変更）
];

// 管理画面やAPIから個別IPを追加できる関数
function addAllowedIP(ip) {
    if (!ALLOWED_IPS.includes(ip)) {
        ALLOWED_IPS.push(ip);
    }
}

// 現在の許可IPリストを取得
function getAllowedIPs() {
    return ALLOWED_IPS;
}

// IPアドレスが許可された範囲内かチェック
function isIPAllowed(ip) {
    return ALLOWED_IPS.some(allowed => {
        if (allowed.includes('/')) {
            // CIDR表記の場合
            const [base, bits] = allowed.split('/');
            const mask = ~((1 << (32 - bits)) - 1);
            const ipNum = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
            const baseNum = base.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
            return (ipNum & mask) === (baseNum & mask);
        }
        return ip === allowed;
    });
}

// IP制限ミドルウェア
const ipRestriction = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    if (!isIPAllowed(clientIP)) {
        return res.status(403).json({ error: 'アクセスが許可されていません' });
    }
    next();
};

// CSRFトークン生成
const generateCSRFToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// CSRFトークン検証ミドルウェア
const csrfProtection = (req, res, next) => {
    if (req.method === 'GET') {
        // GETリクエストの場合は新しいトークンを生成
        const token = generateCSRFToken();
        res.cookie('csrf_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });
        res.locals.csrfToken = token;
    } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        // POST/PUT/DELETEリクエストの場合はトークンを検証
        const token = req.headers['x-csrf-token'];
        const cookieToken = req.cookies.csrf_token;
        
        if (!token || !cookieToken || token !== cookieToken) {
            return res.status(403).json({ error: 'CSRFトークンが無効です' });
        }
    }
    next();
};

// XSS対策用の入力値サニタイズ
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// 入力値サニタイズミドルウェア
const sanitizeMiddleware = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeInput(req.body[key]);
            }
        });
    }
    next();
};

// データの整合性チェック用のハッシュ生成
const generateDataHash = (data) => {
    return crypto
        .createHash('sha256')
        .update(JSON.stringify(data))
        .digest('hex');
};

// データの整合性検証ミドルウェア
const validateDataIntegrity = (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        const dataHash = req.headers['x-data-hash'];
        const calculatedHash = generateDataHash(req.body);
        
        if (!dataHash || dataHash !== calculatedHash) {
            return res.status(400).json({ error: 'データの整合性が確認できません' });
        }
    }
    next();
};

// シンプルな認証チェック（role不要、トークンの有効性のみ確認）
async function checkAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: '認証情報がありません' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');

        // セッションの有効性を確認
        const session = await db.query(
            'SELECT * FROM sessions WHERE session_token = ? AND expires_at > datetime("now")',
            [token]
        );

        if (!session || session.length === 0) {
            return res.status(401).json({ error: 'セッションが無効です' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: '認証に失敗しました' });
    }
}

// 権限チェックミドルウェア
function checkPermission(requiredRole) {
    return async function (req, res, next) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: '認証情報がありません' });
        }
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');

            // セッションの有効性を確認
            const session = await db.query(
                'SELECT * FROM sessions WHERE session_token = ? AND expires_at > datetime("now")',
                [token]
            );

            if (!session || session.length === 0) {
                return res.status(401).json({ error: 'セッションが無効です' });
            }

            if (decoded.role !== requiredRole) {
                return res.status(403).json({ error: '権限がありません' });
            }
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ error: '認証に失敗しました' });
        }
    };
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '認証トークンが必要です' });
    }

    jwt.verify(token, config.jwt.secret, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'トークンが無効です' });
        }
        req.user = user;
        next();
    });
};

const checkSession = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: 'セッションが無効です' });
    }
    next();
};

// 改善されたレート制限機能
class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.maxAttempts = config.security.maxLoginAttempts;
        this.timeoutMinutes = 15;
    }

    check(req, res, next) {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const userAttempts = this.attempts.get(ip);

        if (userAttempts) {
            // タイムアウト期間をチェック
            const timeSinceFirstAttempt = now - userAttempts.firstAttempt;
            const timeoutMs = this.timeoutMinutes * 60 * 1000;

            if (userAttempts.count >= this.maxAttempts && timeSinceFirstAttempt < timeoutMs) {
                const remainingTime = Math.ceil((timeoutMs - timeSinceFirstAttempt) / 1000 / 60);
                return res.status(429).json({
                    error: `ログイン試行回数が制限を超えました。${remainingTime}分後に再試行してください。`,
                    remainingTime
                });
            }

            // タイムアウト期間が終了したらリセット
            if (timeSinceFirstAttempt >= timeoutMs) {
                this.attempts.delete(ip);
            }
        }

        next();
    }

    increment(ip) {
        const now = Date.now();
        const userAttempts = this.attempts.get(ip);

        if (userAttempts) {
            userAttempts.count += 1;
        } else {
            this.attempts.set(ip, {
                count: 1,
                firstAttempt: now
            });
        }
    }

    reset(ip) {
        this.attempts.delete(ip);
    }

    // 古いエントリをクリーンアップ
    cleanup() {
        const now = Date.now();
        const timeoutMs = this.timeoutMinutes * 60 * 1000;

        for (const [ip, attempts] of this.attempts.entries()) {
            if (now - attempts.firstAttempt >= timeoutMs) {
                this.attempts.delete(ip);
            }
        }
    }
}

// レート制限インスタンスを作成
const rateLimiter = new RateLimiter();

// 定期的なクリーンアップ（1分ごと）
setInterval(() => {
    rateLimiter.cleanup();
}, 60000);

module.exports = {
    ipRestriction,
    csrfProtection,
    sanitizeMiddleware,
    validateDataIntegrity,
    generateCSRFToken,
    generateDataHash,
    checkPermission,
    checkAuth,
    addAllowedIP,
    getAllowedIPs,
    authenticateToken,
    checkSession,
    rateLimiter
}; 