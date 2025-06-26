// セッション時間管理システム
class SessionTimer {
    constructor() {
        this.settings = null;
        this.sessionStartTime = null;
        this.sessionEndTime = null;
        this.timerInterval = null;
        this.breakTimer = null;
        this.dailyUsage = this.getDailyUsage();
        this.loadSettings();
    }

    // 設定を読み込み
    async loadSettings() {
        try {
            const response = await fetch('game_settings.json');
            const data = await response.json();
            this.settings = data.system_settings;
        } catch (error) {
            console.error('設定の読み込みに失敗しました:', error);
            // デフォルト設定
            this.settings = {
                session_time_limit: {
                    enabled: true,
                    default_minutes: 30,
                    max_minutes: 120,
                    warning_minutes: 5
                },
                daily_time_limit: {
                    enabled: true,
                    default_minutes: 120,
                    max_minutes: 240
                },
                break_reminder: {
                    enabled: true,
                    interval_minutes: 15,
                    break_minutes: 5
                }
            };
        }
    }

    // セッション開始
    startSession(customMinutes = null) {
        if (this.sessionStartTime) {
            console.warn('セッションは既に開始されています');
            return false;
        }

        const sessionLimit = customMinutes || this.settings.session_time_limit.default_minutes;
        
        // 日次制限チェック
        if (this.settings.daily_time_limit.enabled) {
            const remainingDaily = this.getRemainingDailyTime();
            if (remainingDaily < sessionLimit) {
                this.showNotification('本日の利用時間制限に達しています', 'warning');
                return false;
            }
        }

        this.sessionStartTime = new Date();
        this.sessionEndTime = new Date(this.sessionStartTime.getTime() + (sessionLimit * 60 * 1000));
        
        this.startTimer();
        this.startBreakReminder();
        
        // セッション情報を保存
        sessionStorage.setItem('sessionInfo', JSON.stringify({
            startTime: this.sessionStartTime.toISOString(),
            endTime: this.sessionEndTime.toISOString(),
            limitMinutes: sessionLimit
        }));

        this.showNotification(`セッション開始: ${sessionLimit}分間`, 'info');
        return true;
    }

    // セッション終了
    endSession() {
        if (!this.sessionStartTime) {
            console.warn('開始されていないセッションです');
            return;
        }

        const sessionTime = Math.round((new Date() - this.sessionStartTime) / 1000 / 60);
        this.updateDailyUsage(sessionTime);
        
        this.stopTimer();
        this.stopBreakReminder();
        
        this.sessionStartTime = null;
        this.sessionEndTime = null;
        
        sessionStorage.removeItem('sessionInfo');
        
        this.showNotification(`セッション終了: ${sessionTime}分間利用`, 'info');
    }

    // タイマー開始
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        this.timerInterval = setInterval(() => {
            this.updateTimerDisplay();
            this.checkTimeLimit();
        }, 1000);
    }

    // タイマー停止
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // タイマー表示更新
    updateTimerDisplay() {
        if (!this.sessionEndTime) return;

        const now = new Date();
        const remaining = Math.max(0, this.sessionEndTime - now);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        // タイマー表示要素を更新
        const timerElement = document.getElementById('session-timer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            // 警告時間になったら色を変更
            if (minutes <= this.settings.session_time_limit.warning_minutes) {
                timerElement.style.color = '#e74c3c';
                timerElement.style.fontWeight = 'bold';
            } else {
                timerElement.style.color = '#2c3e50';
                timerElement.style.fontWeight = 'normal';
            }
        }

        // 残り時間が0になったら自動終了
        if (remaining <= 0) {
            this.forceEndSession();
        }
    }

    // 時間制限チェック
    checkTimeLimit() {
        if (!this.sessionEndTime) return;

        const now = new Date();
        const remaining = this.sessionEndTime - now;
        const remainingMinutes = Math.floor(remaining / 60000);

        // 警告時間
        if (remainingMinutes === this.settings.session_time_limit.warning_minutes) {
            this.showNotification(`残り${remainingMinutes}分です。セッション終了の準備をしてください。`, 'warning');
        }

        // 強制終了
        if (remaining <= 0) {
            this.forceEndSession();
        }
    }

    // 強制セッション終了
    forceEndSession() {
        this.showNotification('セッション時間が終了しました。自動的に終了します。', 'error');
        this.endSession();
        
        // ゲーム画面をリダイレクト
        setTimeout(() => {
            window.location.href = 'brain_training_game.html';
        }, 3000);
    }

    // 休憩リマインダー開始
    startBreakReminder() {
        if (!this.settings.break_reminder.enabled) return;

        this.breakTimer = setTimeout(() => {
            this.showBreakReminder();
        }, this.settings.break_reminder.interval_minutes * 60 * 1000);
    }

    // 休憩リマインダー停止
    stopBreakReminder() {
        if (this.breakTimer) {
            clearTimeout(this.breakTimer);
            this.breakTimer = null;
        }
    }

    // 休憩リマインダー表示
    showBreakReminder() {
        const result = confirm(`${this.settings.break_reminder.interval_minutes}分間の利用が続いています。\n${this.settings.break_reminder.break_minutes}分間の休憩を取ることをお勧めします。\n\n休憩を取りますか？`);
        
        if (result) {
            this.pauseSession();
        } else {
            // 次の休憩リマインダーを設定
            this.startBreakReminder();
        }
    }

    // セッション一時停止
    pauseSession() {
        this.stopTimer();
        this.stopBreakReminder();
        
        const pauseEndTime = new Date(Date.now() + (this.settings.break_reminder.break_minutes * 60 * 1000));
        
        this.showNotification(`${this.settings.break_reminder.break_minutes}分間の休憩を開始します`, 'info');
        
        setTimeout(() => {
            this.showNotification('休憩が終了しました。セッションを再開します。', 'info');
            this.resumeSession();
        }, this.settings.break_reminder.break_minutes * 60 * 1000);
    }

    // セッション再開
    resumeSession() {
        if (!this.sessionStartTime) return;
        
        this.startTimer();
        this.startBreakReminder();
    }

    // 日次利用時間を取得
    getDailyUsage() {
        const today = new Date().toDateString();
        const dailyData = localStorage.getItem(`dailyUsage_${today}`);
        return dailyData ? JSON.parse(dailyData) : { totalMinutes: 0, sessions: [] };
    }

    // 日次利用時間を更新
    updateDailyUsage(minutes) {
        const today = new Date().toDateString();
        this.dailyUsage.totalMinutes += minutes;
        this.dailyUsage.sessions.push({
            date: new Date().toISOString(),
            minutes: minutes
        });
        
        localStorage.setItem(`dailyUsage_${today}`, JSON.stringify(this.dailyUsage));
    }

    // 残り日次時間を取得
    getRemainingDailyTime() {
        if (!this.settings.daily_time_limit.enabled) return Infinity;
        return Math.max(0, this.settings.daily_time_limit.default_minutes - this.dailyUsage.totalMinutes);
    }

    // 通知表示
    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.getElementById('session-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'session-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;

        // タイプに応じて色を設定
        switch (type) {
            case 'warning':
                notification.style.backgroundColor = '#f39c12';
                break;
            case 'error':
                notification.style.backgroundColor = '#e74c3c';
                break;
            case 'success':
                notification.style.backgroundColor = '#27ae60';
                break;
            default:
                notification.style.backgroundColor = '#3498db';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // 3秒後に自動削除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // セッション情報を取得
    getSessionInfo() {
        if (!this.sessionStartTime) return null;
        
        return {
            startTime: this.sessionStartTime,
            endTime: this.sessionEndTime,
            remaining: this.sessionEndTime ? Math.max(0, this.sessionEndTime - new Date()) : 0,
            isActive: !!this.sessionStartTime
        };
    }

    // 設定を更新
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        // 設定をサーバーに保存（必要に応じて）
    }
}

// グローバルインスタンス
const sessionTimer = new SessionTimer();

// CSS アニメーション
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style); 