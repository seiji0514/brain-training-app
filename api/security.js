const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../db/database');
const { checkAuth } = require('./middleware');

// 2段階認証（2FA）の設定
router.post('/setup-2fa', checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // シークレットキーを生成
        const secret = crypto.randomBytes(20).toString('hex');
        const secretKey = crypto.randomBytes(32).toString('base64');
        
        // QRコード用のURIを生成
        const user = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        const qrUri = `otpauth://totp/BrainTraining:${user[0].username}?secret=${secret}&issuer=BrainTraining`;
        
        // QRコードを生成
        const qrCodeDataUrl = await QRCode.toDataURL(qrUri);
        
        // 2FA設定をデータベースに保存
        await db.query(
            `INSERT OR REPLACE INTO two_factor_auth 
             (user_id, secret_key, backup_codes, is_enabled, created_at) 
             VALUES (?, ?, ?, 0, datetime('now'))`,
            [userId, secretKey, JSON.stringify([])]
        );
        
        res.json({
            secret: secret,
            qrCode: qrCodeDataUrl,
            backupCodes: generateBackupCodes()
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: '2FA設定に失敗しました' });
    }
});

// 2FAの有効化
router.post('/enable-2fa', checkAuth, async (req, res) => {
    try {
        const { token, backupCodes } = req.body;
        const userId = req.user.id;
        
        // トークンを検証（実際の実装ではTOTPライブラリを使用）
        if (!validateTOTP(token)) {
            return res.status(400).json({ error: '無効なトークンです' });
        }
        
        // 2FAを有効化
        await db.query(
            `UPDATE two_factor_auth 
             SET is_enabled = 1, backup_codes = ?, updated_at = datetime('now') 
             WHERE user_id = ?`,
            [JSON.stringify(backupCodes), userId]
        );
        
        res.json({ message: '2FAが有効化されました' });
    } catch (error) {
        console.error('2FA enable error:', error);
        res.status(500).json({ error: '2FA有効化に失敗しました' });
    }
});

// 2FA認証
router.post('/verify-2fa', async (req, res) => {
    try {
        const { username, token } = req.body;
        
        // ユーザーを取得
        const user = await db.query(
            'SELECT id, username FROM users WHERE username = ?',
            [username]
        );
        
        if (!user[0]) {
            return res.status(401).json({ error: 'ユーザーが見つかりません' });
        }
        
        // 2FA設定を確認
        const twoFactorAuth = await db.query(
            'SELECT * FROM two_factor_auth WHERE user_id = ? AND is_enabled = 1',
            [user[0].id]
        );
        
        if (!twoFactorAuth[0]) {
            return res.status(400).json({ error: '2FAが設定されていません' });
        }
        
        // トークンを検証
        if (!validateTOTP(token)) {
            // バックアップコードをチェック
            const backupCodes = JSON.parse(twoFactorAuth[0].backup_codes || '[]');
            if (!backupCodes.includes(token)) {
                return res.status(401).json({ error: '無効な認証コードです' });
            }
            
            // 使用されたバックアップコードを削除
            const updatedCodes = backupCodes.filter(code => code !== token);
            await db.query(
                'UPDATE two_factor_auth SET backup_codes = ? WHERE user_id = ?',
                [JSON.stringify(updatedCodes), user[0].id]
            );
        }
        
        res.json({ message: '2FA認証が成功しました' });
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: '2FA認証に失敗しました' });
    }
});

// IP制限機能
router.post('/ip-whitelist', checkAuth, async (req, res) => {
    try {
        // 管理者権限チェック
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '管理者権限が必要です' });
        }
        
        const { ipAddress, description } = req.body;
        
        // IPアドレスをホワイトリストに追加
        await db.query(
            `INSERT INTO ip_whitelist (ip_address, description, created_by, created_at) 
             VALUES (?, ?, ?, datetime('now'))`,
            [ipAddress, description, req.user.id]
        );
        
        res.json({ message: 'IPアドレスがホワイトリストに追加されました' });
    } catch (error) {
        console.error('IP whitelist error:', error);
        res.status(500).json({ error: 'IP制限設定に失敗しました' });
    }
});

// IP制限チェック
async function checkIPRestriction(ipAddress) {
    try {
        // ホワイトリストをチェック
        const whitelist = await db.query(
            'SELECT * FROM ip_whitelist WHERE ip_address = ? AND is_active = 1',
            [ipAddress]
        );
        
        if (whitelist.length === 0) {
            // ブラックリストをチェック
            const blacklist = await db.query(
                'SELECT * FROM ip_blacklist WHERE ip_address = ? AND is_active = 1',
                [ipAddress]
            );
            
            if (blacklist.length > 0) {
                return { allowed: false, reason: 'IPアドレスがブラックリストに登録されています' };
            }
        }
        
        return { allowed: true };
    } catch (error) {
        console.error('IP restriction check error:', error);
        return { allowed: true }; // エラーの場合は許可
    }
}

// セキュリティ監査ログ
router.get('/audit-logs', checkAuth, async (req, res) => {
    try {
        // 管理者権限チェック
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '管理者権限が必要です' });
        }
        
        const { page = 1, limit = 50, type, severity } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        let params = [];
        
        if (type) {
            whereClause += ' AND event_type = ?';
            params.push(type);
        }
        
        if (severity) {
            whereClause += ' AND severity = ?';
            params.push(severity);
        }
        
        // 監査ログを取得
        const auditLogs = await db.query(
            `SELECT * FROM security_audit_logs 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );
        
        // 総数を取得
        const totalCount = await db.query(
            `SELECT COUNT(*) as count FROM security_audit_logs ${whereClause}`,
            params
        );
        
        res.json({
            logs: auditLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount[0].count,
                totalPages: Math.ceil(totalCount[0].count / limit)
            }
        });
    } catch (error) {
        console.error('Audit logs error:', error);
        res.status(500).json({ error: '監査ログの取得に失敗しました' });
    }
});

// セキュリティイベントを記録
async function logSecurityEvent(eventType, severity, message, userId = null, ipAddress = null, details = {}) {
    try {
        await db.query(
            `INSERT INTO security_audit_logs 
             (event_type, severity, message, user_id, ip_address, details, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [eventType, severity, message, userId, ipAddress, JSON.stringify(details)]
        );
    } catch (error) {
        console.error('Security event logging failed:', error);
    }
}

// バックアップコード生成
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
        codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
}

// TOTP検証（簡易実装）
function validateTOTP(token) {
    // 実際の実装では、speakeasyなどのTOTPライブラリを使用
    // ここでは簡易的な検証を行う
    return token && token.length === 6 && /^\d{6}$/.test(token);
}

module.exports = {
    router,
    checkIPRestriction,
    logSecurityEvent
}; 