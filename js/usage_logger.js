// ゲーム利用履歴記録ライブラリ
class UsageLogger {
    constructor() {
        this.logs = JSON.parse(localStorage.getItem('usageLogs') || '[]');
    }

    // ゲーム開始時の履歴記録
    logGameStart(gameName, gameId = null) {
        const user = this.getCurrentUser();
        if (!user) {
            console.warn('ユーザー情報が見つかりません');
            return;
        }

        const logEntry = {
            id: Date.now().toString(),
            username: user.username,
            role: user.role,
            gameName: gameName,
            gameId: gameId,
            action: 'start',
            timestamp: new Date().toISOString(),
            sessionId: this.generateSessionId()
        };

        this.logs.push(logEntry);
        this.saveLogs();
        
        // セッション情報を保存（ゲーム終了時に使用）
        sessionStorage.setItem('currentGameSession', JSON.stringify({
            sessionId: logEntry.sessionId,
            gameName: gameName,
            startTime: logEntry.timestamp
        }));

        console.log(`ゲーム開始記録: ${gameName} by ${user.username}`);
    }

    // ゲーム終了時の履歴記録
    logGameEnd(gameName, score = null, playTime = null, mistakes = null, completed = false) {
        const user = this.getCurrentUser();
        const sessionInfo = JSON.parse(sessionStorage.getItem('currentGameSession') || '{}');
        
        if (!user) {
            console.warn('ユーザー情報が見つかりません');
            return;
        }

        const logEntry = {
            id: Date.now().toString(),
            username: user.username,
            role: user.role,
            gameName: gameName,
            action: 'end',
            timestamp: new Date().toISOString(),
            sessionId: sessionInfo.sessionId,
            score: score,
            playTime: playTime, // 秒単位
            mistakes: mistakes,
            completed: completed,
            totalPlayTime: this.calculateTotalPlayTime(sessionInfo.startTime)
        };

        this.logs.push(logEntry);
        this.saveLogs();
        
        // セッション情報をクリア
        sessionStorage.removeItem('currentGameSession');

        console.log(`ゲーム終了記録: ${gameName} by ${user.username}, スコア: ${score}`);
    }

    // ゲーム進行中の履歴記録（オプション）
    logGameProgress(gameName, progress, level = null) {
        const user = this.getCurrentUser();
        if (!user) return;

        const logEntry = {
            id: Date.now().toString(),
            username: user.username,
            role: user.role,
            gameName: gameName,
            action: 'progress',
            timestamp: new Date().toISOString(),
            progress: progress,
            level: level
        };

        this.logs.push(logEntry);
        this.saveLogs();
    }

    // エラー発生時の履歴記録
    logGameError(gameName, errorMessage, errorType = 'general') {
        const user = this.getCurrentUser();
        if (!user) return;

        const logEntry = {
            id: Date.now().toString(),
            username: user.username,
            role: user.role,
            gameName: gameName,
            action: 'error',
            timestamp: new Date().toISOString(),
            errorMessage: errorMessage,
            errorType: errorType
        };

        this.logs.push(logEntry);
        this.saveLogs();
        
        console.error(`ゲームエラー記録: ${gameName} - ${errorMessage}`);
    }

    // 現在のユーザー情報を取得
    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (!userData) return null;
        
        try {
            return JSON.parse(userData);
        } catch (error) {
            console.error('ユーザー情報の解析エラー:', error);
            return null;
        }
    }

    // ログを保存
    saveLogs() {
        localStorage.setItem('usageLogs', JSON.stringify(this.logs));
    }

    // セッションID生成
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 総プレイ時間を計算
    calculateTotalPlayTime(startTime) {
        if (!startTime) return null;
        
        const start = new Date(startTime);
        const end = new Date();
        return Math.round((end - start) / 1000); // 秒単位
    }

    // 履歴を取得（管理者用）
    getLogs(filters = {}) {
        let filteredLogs = [...this.logs];

        // ユーザー名でフィルタ
        if (filters.username) {
            filteredLogs = filteredLogs.filter(log => 
                log.username.toLowerCase().includes(filters.username.toLowerCase())
            );
        }

        // ゲーム名でフィルタ
        if (filters.gameName) {
            filteredLogs = filteredLogs.filter(log => 
                log.gameName.toLowerCase().includes(filters.gameName.toLowerCase())
            );
        }

        // 日付範囲でフィルタ
        if (filters.startDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= new Date(filters.startDate)
            );
        }

        if (filters.endDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= new Date(filters.endDate)
            );
        }

        // アクションでフィルタ
        if (filters.action) {
            filteredLogs = filteredLogs.filter(log => log.action === filters.action);
        }

        // ソート
        if (filters.sortBy) {
            filteredLogs.sort((a, b) => {
                if (filters.sortBy === 'timestamp') {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                }
                return 0;
            });
        }

        return filteredLogs;
    }

    // 統計情報を取得（管理者用）
    getStatistics() {
        const stats = {
            totalSessions: 0,
            totalUsers: 0,
            popularGames: {},
            averageScores: {},
            userActivity: {},
            dailyActivity: {}
        };

        const users = new Set();
        const sessions = new Set();

        this.logs.forEach(log => {
            // ユーザー数
            users.add(log.username);

            // セッション数
            if (log.sessionId) {
                sessions.add(log.sessionId);
            }

            // 人気ゲーム
            if (!stats.popularGames[log.gameName]) {
                stats.popularGames[log.gameName] = 0;
            }
            stats.popularGames[log.gameName]++;

            // 平均スコア
            if (log.score !== null && log.score !== undefined) {
                if (!stats.averageScores[log.gameName]) {
                    stats.averageScores[log.gameName] = { total: 0, count: 0 };
                }
                stats.averageScores[log.gameName].total += log.score;
                stats.averageScores[log.gameName].count++;
            }

            // ユーザー活動
            if (!stats.userActivity[log.username]) {
                stats.userActivity[log.username] = 0;
            }
            stats.userActivity[log.username]++;

            // 日別活動
            const date = log.timestamp.split('T')[0];
            if (!stats.dailyActivity[date]) {
                stats.dailyActivity[date] = 0;
            }
            stats.dailyActivity[date]++;
        });

        stats.totalUsers = users.size;
        stats.totalSessions = sessions.size;

        // 平均スコアを計算
        Object.keys(stats.averageScores).forEach(game => {
            const data = stats.averageScores[game];
            stats.averageScores[game] = data.count > 0 ? data.total / data.count : 0;
        });

        return stats;
    }

    // ログをエクスポート（CSV形式）
    exportToCSV() {
        const headers = ['ID', 'ユーザー名', '役割', 'ゲーム名', 'アクション', 'タイムスタンプ', 'スコア', 'プレイ時間', 'ミス回数', '完了'];
        const csvContent = [
            headers.join(','),
            ...this.logs.map(log => [
                log.id,
                log.username,
                log.role,
                log.gameName,
                log.action,
                log.timestamp,
                log.score || '',
                log.playTime || '',
                log.mistakes || '',
                log.completed ? 'Yes' : 'No'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `usage_logs_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    // ログをクリア（管理者用）
    clearLogs() {
        if (confirm('すべての利用履歴を削除しますか？この操作は取り消せません。')) {
            this.logs = [];
            this.saveLogs();
            console.log('利用履歴をクリアしました');
        }
    }
}

// グローバルインスタンスを作成
const usageLogger = new UsageLogger();

// グローバル関数として公開
window.usageLogger = usageLogger;

// ページ読み込み時に自動でゲーム開始を記録（オプション）
document.addEventListener('DOMContentLoaded', function() {
    // ゲームページの場合のみ記録
    const gameName = document.title.replace(' - 脳トレゲームシステム', '').replace('脳トレゲームversion2 ', '');
    if (gameName && gameName !== '生活面編') {
        usageLogger.logGameStart(gameName);
    }
});

// ページ離脱時にゲーム終了を記録（オプション）
window.addEventListener('beforeunload', function() {
    const sessionInfo = JSON.parse(sessionStorage.getItem('currentGameSession') || '{}');
    if (sessionInfo.gameName) {
        usageLogger.logGameEnd(sessionInfo.gameName);
    }
});
