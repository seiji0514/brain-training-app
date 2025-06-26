const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');

class SystemMonitor {
    constructor(config = {}) {
        this.config = {
            logDir: config.logDir || './logs',
            alertThresholds: {
                cpu: config.cpuThreshold || 80,
                memory: config.memoryThreshold || 80,
                disk: config.diskThreshold || 90,
                responseTime: config.responseTimeThreshold || 5000
            },
            checkInterval: config.checkInterval || 60000, // 1分
            alertRecipients: config.alertRecipients || [],
            ...config
        };
        
        this.alerts = [];
        this.isMonitoring = false;
        
        // ログディレクトリの作成
        if (!fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }
    }

    // システムリソース監視
    async checkSystemResources() {
        const stats = {
            timestamp: new Date().toISOString(),
            cpu: await this.getCPUUsage(),
            memory: await this.getMemoryUsage(),
            disk: await this.getDiskUsage(),
            uptime: os.uptime(),
            loadAverage: os.loadavg()
        };

        // アラートチェック
        this.checkAlerts(stats);
        
        // ログ記録
        this.logSystemStats(stats);
        
        return stats;
    }

    // CPU使用率取得
    async getCPUUsage() {
        return new Promise((resolve) => {
            const startUsage = os.cpus().map(cpu => ({
                idle: cpu.times.idle,
                total: Object.values(cpu.times).reduce((a, b) => a + b, 0)
            }));

            setTimeout(() => {
                const endUsage = os.cpus().map(cpu => ({
                    idle: cpu.times.idle,
                    total: Object.values(cpu.times).reduce((a, b) => a + b, 0)
                }));

                const cpuUsage = endUsage.map((end, i) => {
                    const start = startUsage[i];
                    const idle = end.idle - start.idle;
                    const total = end.total - start.total;
                    return (1 - idle / total) * 100;
                });

                const avgUsage = cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length;
                resolve(Math.round(avgUsage * 100) / 100);
            }, 100);
        });
    }

    // メモリ使用率取得
    getMemoryUsage() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        return Math.round((usedMem / totalMem) * 100 * 100) / 100;
    }

    // ディスク使用率取得
    async getDiskUsage() {
        return new Promise((resolve) => {
            exec('wmic logicaldisk get size,freespace,caption', (error, stdout) => {
                if (error) {
                    resolve(0);
                    return;
                }

                const lines = stdout.trim().split('\n').slice(1);
                let totalSize = 0;
                let totalFree = 0;

                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 3) {
                        const size = parseInt(parts[1]);
                        const free = parseInt(parts[2]);
                        if (!isNaN(size) && !isNaN(free)) {
                            totalSize += size;
                            totalFree += free;
                        }
                    }
                });

                const usage = totalSize > 0 ? ((totalSize - totalFree) / totalSize) * 100 : 0;
                resolve(Math.round(usage * 100) / 100);
            });
        });
    }

    // アラートチェック
    checkAlerts(stats) {
        const alerts = [];

        if (stats.cpu > this.config.alertThresholds.cpu) {
            alerts.push({
                type: 'CPU_HIGH',
                message: `CPU使用率が高い: ${stats.cpu}%`,
                severity: 'WARNING',
                timestamp: stats.timestamp
            });
        }

        if (stats.memory > this.config.alertThresholds.memory) {
            alerts.push({
                type: 'MEMORY_HIGH',
                message: `メモリ使用率が高い: ${stats.memory}%`,
                severity: 'WARNING',
                timestamp: stats.timestamp
            });
        }

        if (stats.disk > this.config.alertThresholds.disk) {
            alerts.push({
                type: 'DISK_HIGH',
                message: `ディスク使用率が高い: ${stats.disk}%`,
                severity: 'CRITICAL',
                timestamp: stats.timestamp
            });
        }

        if (alerts.length > 0) {
            this.sendAlerts(alerts);
            this.alerts.push(...alerts);
        }
    }

    // アラート送信
    sendAlerts(alerts) {
        alerts.forEach(alert => {
            console.log(`[${alert.severity}] ${alert.message}`);
            this.logAlert(alert);
        });
    }

    // システム統計ログ記録
    logSystemStats(stats) {
        const logFile = path.join(this.config.logDir, `system_stats_${new Date().toISOString().split('T')[0]}.log`);
        const logEntry = JSON.stringify(stats) + '\n';
        
        fs.appendFileSync(logFile, logEntry);
    }

    // アラートログ記録
    logAlert(alert) {
        const logFile = path.join(this.config.logDir, `alerts_${new Date().toISOString().split('T')[0]}.log`);
        const logEntry = JSON.stringify(alert) + '\n';
        
        fs.appendFileSync(logFile, logEntry);
    }

    // 監視開始
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('監視は既に開始されています');
            return;
        }
        this.isMonitoring = true;
        console.log('システム監視を開始しました');
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.checkSystemResources();
                await checkServerHealth();
                analyzeLogs();
            } catch (error) {
                console.error('監視エラー:', error);
                this.logAlert({
                    type: 'MONITORING_ERROR',
                    message: `監視エラー: ${error.message}`,
                    severity: 'ERROR',
                    timestamp: new Date().toISOString()
                });
                notifyAdmin('監視エラー: ' + error.message);
            }
        }, this.config.checkInterval);
    }

    // 監視停止
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.isMonitoring = false;
            console.log('システム監視を停止しました');
        }
    }

    // 監視状況取得
    getMonitoringStatus() {
        return {
            isMonitoring: this.isMonitoring,
            config: this.config,
            recentAlerts: this.alerts.slice(-10), // 最新10件
            uptime: os.uptime()
        };
    }

    // ログファイル分析
    analyzeLogs(date = new Date().toISOString().split('T')[0]) {
        const statsFile = path.join(this.config.logDir, `system_stats_${date}.log`);
        const alertsFile = path.join(this.config.logDir, `alerts_${date}.log`);

        const analysis = {
            date: date,
            totalRecords: 0,
            averageCPU: 0,
            averageMemory: 0,
            averageDisk: 0,
            alertCount: 0,
            criticalAlerts: 0,
            warnings: 0
        };

        // システム統計分析
        if (fs.existsSync(statsFile)) {
            const stats = fs.readFileSync(statsFile, 'utf8')
                .trim()
                .split('\n')
                .map(line => JSON.parse(line));

            analysis.totalRecords = stats.length;
            analysis.averageCPU = stats.reduce((sum, stat) => sum + stat.cpu, 0) / stats.length;
            analysis.averageMemory = stats.reduce((sum, stat) => sum + stat.memory, 0) / stats.length;
            analysis.averageDisk = stats.reduce((sum, stat) => sum + stat.disk, 0) / stats.length;
        }

        // アラート分析
        if (fs.existsSync(alertsFile)) {
            const alerts = fs.readFileSync(alertsFile, 'utf8')
                .trim()
                .split('\n')
                .map(line => JSON.parse(line));

            analysis.alertCount = alerts.length;
            analysis.criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
            analysis.warnings = alerts.filter(a => a.severity === 'WARNING').length;
        }

        return analysis;
    }
}

// 監視レポート生成
class MonitoringReport {
    constructor(monitor) {
        this.monitor = monitor;
    }

    // 日次レポート生成
    generateDailyReport(date = new Date().toISOString().split('T')[0]) {
        const analysis = this.monitor.analyzeLogs(date);
        const status = this.monitor.getMonitoringStatus();

        const report = {
            reportDate: date,
            generatedAt: new Date().toISOString(),
            systemStatus: {
                isMonitoring: status.isMonitoring,
                uptime: status.uptime
            },
            dailyStats: {
                totalRecords: analysis.totalRecords,
                averageCPU: Math.round(analysis.averageCPU * 100) / 100,
                averageMemory: Math.round(analysis.averageMemory * 100) / 100,
                averageDisk: Math.round(analysis.averageDisk * 100) / 100
            },
            alerts: {
                total: analysis.alertCount,
                critical: analysis.criticalAlerts,
                warnings: analysis.warnings
            },
            recommendations: this.generateRecommendations(analysis)
        };

        return report;
    }

    // 推奨事項生成
    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.averageCPU > 70) {
            recommendations.push('CPU使用率が高いため、プロセス最適化を検討してください');
        }

        if (analysis.averageMemory > 80) {
            recommendations.push('メモリ使用率が高いため、メモリ増設またはプロセス最適化を検討してください');
        }

        if (analysis.averageDisk > 85) {
            recommendations.push('ディスク使用率が高いため、不要ファイルの削除またはストレージ拡張を検討してください');
        }

        if (analysis.criticalAlerts > 0) {
            recommendations.push('重大なアラートが発生しています。システム管理者に連絡してください');
        }

        if (recommendations.length === 0) {
            recommendations.push('システムは正常に動作しています');
        }

        return recommendations;
    }

    // レポート保存
    saveReport(report, filename = null) {
        if (!filename) {
            filename = `monitoring_report_${report.reportDate}.json`;
        }

        const reportDir = path.join(this.monitor.config.logDir, 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const reportPath = path.join(reportDir, filename);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        return reportPath;
    }
}

// LINE Notifyのトークン（ご自身のものに差し替えてください）
const LINE_TOKEN = 'YOUR_LINE_NOTIFY_TOKEN';

// サーバーヘルスチェック
async function checkServerHealth() {
    try {
        const res = await axios.get('http://localhost:3000/health');
        if (res.status !== 200) notifyAdmin('サーバー異常: 応答コード ' + res.status);
    } catch (e) {
        notifyAdmin('サーバーに接続できません');
    }
}

// ログ異常検知＋AI/ルール判定（簡易例）
function analyzeLogs() {
    try {
        const logs = fs.readFileSync('./logs/service.log', 'utf8');
        if (logs.includes('ECONNREFUSED') || (logs.match(/ERROR/g) || []).length > 10) {
            notifyAdmin('AI判定: サーバーで異常が多発しています');
        }
    } catch (e) {
        // ログファイルがない場合は無視
    }
}

// LINEに自動通知
function notifyAdmin(message) {
    axios.post('https://notify-api.line.me/api/notify',
        `message=${encodeURIComponent(message)}`,
        { headers: { 'Authorization': `Bearer ${LINE_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    ).catch(e => console.error('LINE通知エラー:', e.message));
}

module.exports = { SystemMonitor, MonitoringReport }; 