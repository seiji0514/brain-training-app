const nodemailer = require('nodemailer');
const db = require('../db/database');

class NotificationSystem {
    constructor() {
        this.transporter = null;
        this.initializeEmailTransporter();
    }

    // メール送信設定の初期化
    initializeEmailTransporter() {
        // 本番環境では実際のSMTP設定を使用
        this.transporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    // メール通知送信
    async sendEmail(to, subject, content, htmlContent = null) {
        try {
            const mailOptions = {
                from: process.env.SMTP_USER,
                to: to,
                subject: subject,
                text: content,
                html: htmlContent
            };

            const result = await this.transporter.sendMail(mailOptions);
            
            // 通知ログを記録
            await this.logNotification('EMAIL', to, subject, 'SUCCESS');
            
            return result;
        } catch (error) {
            console.error('Email sending failed:', error);
            await this.logNotification('EMAIL', to, subject, 'FAILED', error.message);
            throw error;
        }
    }

    // 管理者向け通知
    async notifyAdmin(type, message, severity = 'MEDIUM') {
        try {
            // 管理者ユーザーを取得
            const admins = await db.query(
                'SELECT username FROM users WHERE role = "admin"'
            );

            const subject = `[システム通知] ${type}`;
            const content = `
                通知タイプ: ${type}
                重要度: ${severity}
                メッセージ: ${message}
                時刻: ${new Date().toLocaleString('ja-JP')}
            `;

            const htmlContent = `
                <h2>システム通知</h2>
                <p><strong>通知タイプ:</strong> ${type}</p>
                <p><strong>重要度:</strong> ${severity}</p>
                <p><strong>メッセージ:</strong> ${message}</p>
                <p><strong>時刻:</strong> ${new Date().toLocaleString('ja-JP')}</p>
            `;

            // 各管理者にメール送信
            for (const admin of admins) {
                await this.sendEmail(admin.username, subject, content, htmlContent);
            }

            // データベースに通知を記録
            await db.query(
                `INSERT INTO admin_notifications 
                 (type, message, severity, created_at) 
                 VALUES (?, ?, ?, datetime('now'))`,
                [type, message, severity]
            );

        } catch (error) {
            console.error('Admin notification failed:', error);
        }
    }

    // リアルタイムアラート（WebSocket対応）
    async sendRealTimeAlert(userId, type, message, data = {}) {
        try {
            const alert = {
                id: Date.now(),
                type: type,
                message: message,
                data: data,
                timestamp: new Date().toISOString(),
                userId: userId
            };

            // アラートをデータベースに保存
            await db.query(
                `INSERT INTO user_alerts 
                 (user_id, alert_type, message, alert_data, created_at) 
                 VALUES (?, ?, ?, ?, datetime('now'))`,
                [userId, type, message, JSON.stringify(data)]
            );

            // WebSocketでリアルタイム送信（実装予定）
            // this.sendWebSocketAlert(userId, alert);

            return alert;
        } catch (error) {
            console.error('Real-time alert failed:', error);
        }
    }

    // ユーザー向け通知
    async notifyUser(userId, type, message, data = {}) {
        try {
            // ユーザー情報を取得
            const user = await db.query(
                'SELECT username, email FROM users WHERE id = ?',
                [userId]
            );

            if (!user[0]) {
                throw new Error('User not found');
            }

            // メール通知
            if (user[0].email) {
                const subject = `[脳トレゲーム] ${type}`;
                const content = `
                    こんにちは、${user[0].username}さん

                    ${message}

                    詳細: ${JSON.stringify(data, null, 2)}
                `;

                await this.sendEmail(user[0].email, subject, content);
            }

            // リアルタイムアラート
            await this.sendRealTimeAlert(userId, type, message, data);

        } catch (error) {
            console.error('User notification failed:', error);
        }
    }

    // 通知ログ記録
    async logNotification(type, recipient, subject, status, errorMessage = null) {
        try {
            await db.query(
                `INSERT INTO notification_logs 
                 (notification_type, recipient, subject, status, error_message, created_at) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                [type, recipient, subject, status, errorMessage]
            );
        } catch (error) {
            console.error('Notification logging failed:', error);
        }
    }

    // 未読通知を取得
    async getUnreadNotifications(userId) {
        try {
            const notifications = await db.query(
                `SELECT * FROM user_alerts 
                 WHERE user_id = ? AND read_at IS NULL 
                 ORDER BY created_at DESC`,
                [userId]
            );
            return notifications;
        } catch (error) {
            console.error('Get unread notifications failed:', error);
            return [];
        }
    }

    // 通知を既読にする
    async markAsRead(alertId, userId) {
        try {
            await db.query(
                `UPDATE user_alerts 
                 SET read_at = datetime('now') 
                 WHERE id = ? AND user_id = ?`,
                [alertId, userId]
            );
        } catch (error) {
            console.error('Mark as read failed:', error);
        }
    }

    // 通知テンプレート
    getNotificationTemplate(type, data = {}) {
        const templates = {
            'GAME_COMPLETED': {
                subject: 'ゲームクリアおめでとうございます！',
                message: `素晴らしい成績です！スコア: ${data.score}点`
            },
            'NEW_RECORD': {
                subject: '新記録達成！',
                message: `新しい最高記録を達成しました！スコア: ${data.score}点`
            },
            'WEEKLY_REPORT': {
                subject: '週間レポート',
                message: '今週のゲーム成績レポートをお送りします。'
            },
            'SYSTEM_MAINTENANCE': {
                subject: 'システムメンテナンスのお知らせ',
                message: 'システムメンテナンスを実施します。'
            }
        };

        return templates[type] || {
            subject: '通知',
            message: '新しい通知があります。'
        };
    }
}

// シングルトンインスタンスを作成
const notificationSystem = new NotificationSystem();

module.exports = {
    NotificationSystem,
    notificationSystem
}; 