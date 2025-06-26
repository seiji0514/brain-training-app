const db = require('../db/database');

// エラータイプの定義
const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTHENTICATION_ERROR',
    AUTHORIZATION: 'AUTHORIZATION_ERROR',
    DATABASE: 'DATABASE_ERROR',
    NETWORK: 'NETWORK_ERROR',
    RATE_LIMIT: 'RATE_LIMIT_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

// エラーレベルの定義
const ErrorLevels = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
    }

    // エラーをログに記録
    async logError(error, req = null, userId = null) {
        try {
            const errorInfo = {
                type: this.getErrorType(error),
                level: this.getErrorLevel(error),
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                userId: userId,
                ipAddress: req?.ip,
                userAgent: req?.headers['user-agent'],
                url: req?.url,
                method: req?.method
            };

            // データベースにエラーログを保存
            await db.query(
                `INSERT INTO error_logs 
                 (error_type, error_level, message, stack_trace, user_id, ip_address, user_agent, url, method) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    errorInfo.type,
                    errorInfo.level,
                    errorInfo.message,
                    errorInfo.stack,
                    errorInfo.userId,
                    errorInfo.ipAddress,
                    errorInfo.userAgent,
                    errorInfo.url,
                    errorInfo.method
                ]
            );

            // エラーカウントを更新
            this.updateErrorCount(errorInfo.type);

            // コンソールにログ出力
            console.error(`[${errorInfo.level}] ${errorInfo.type}: ${errorInfo.message}`);

            // 重要なエラーの場合は管理者に通知
            if (errorInfo.level === ErrorLevels.CRITICAL) {
                await this.notifyAdmin(errorInfo);
            }

        } catch (logError) {
            console.error('Error logging failed:', logError);
        }
    }

    // エラータイプを判定
    getErrorType(error) {
        if (error.name === 'ValidationError') return ErrorTypes.VALIDATION;
        if (error.name === 'AuthenticationError') return ErrorTypes.AUTHENTICATION;
        if (error.name === 'AuthorizationError') return ErrorTypes.AUTHORIZATION;
        if (error.code === 'SQLITE_ERROR' || error.code === 'SQLITE_CONSTRAINT') return ErrorTypes.DATABASE;
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return ErrorTypes.NETWORK;
        if (error.status === 429) return ErrorTypes.RATE_LIMIT;
        return ErrorTypes.UNKNOWN;
    }

    // エラーレベルを判定
    getErrorLevel(error) {
        if (error.status === 500 || error.code === 'SQLITE_ERROR') return ErrorLevels.CRITICAL;
        if (error.status === 401 || error.status === 403) return ErrorLevels.HIGH;
        if (error.status === 400 || error.status === 404) return ErrorLevels.MEDIUM;
        return ErrorLevels.LOW;
    }

    // エラーカウントを更新
    updateErrorCount(errorType) {
        const count = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, count + 1);
    }

    // 管理者通知
    async notifyAdmin(errorInfo) {
        try {
            await db.query(
                `INSERT INTO admin_notifications 
                 (type, message, severity, created_at) 
                 VALUES (?, ?, ?, datetime('now'))`,
                ['ERROR_ALERT', `Critical error: ${errorInfo.message}`, 'HIGH']
            );
        } catch (error) {
            console.error('Admin notification failed:', error);
        }
    }

    // エラー統計を取得
    getErrorStats() {
        const stats = {};
        for (const [type, count] of this.errorCounts.entries()) {
            stats[type] = count;
        }
        return stats;
    }

    // エラーレスポンスを生成
    createErrorResponse(error, req = null) {
        const errorType = this.getErrorType(error);
        const errorLevel = this.getErrorLevel(error);

        // 本番環境では詳細なエラー情報を隠す
        const isProduction = process.env.NODE_ENV === 'production';
        
        let response = {
            error: true,
            type: errorType,
            message: isProduction ? 'サーバーエラーが発生しました' : error.message,
            timestamp: new Date().toISOString()
        };

        // 開発環境では詳細情報を含める
        if (!isProduction) {
            response.stack = error.stack;
            response.details = {
                level: errorLevel,
                url: req?.url,
                method: req?.method
            };
        }

        return response;
    }

    // グローバルエラーハンドラーミドルウェア
    globalErrorHandler(err, req, res, next) {
        // エラーをログに記録
        this.logError(err, req, req.user?.id);

        // エラーレスポンスを生成
        const errorResponse = this.createErrorResponse(err, req);

        // 適切なHTTPステータスコードを設定
        const statusCode = err.status || 500;
        res.status(statusCode).json(errorResponse);
    }

    // 非同期エラーハンドラー
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

// シングルトンインスタンスを作成
const errorHandler = new ErrorHandler();

module.exports = {
    ErrorHandler,
    ErrorTypes,
    ErrorLevels,
    errorHandler
}; 