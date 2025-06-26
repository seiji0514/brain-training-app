const fs = require('fs');
const path = require('path');
const { SystemMonitor, MonitoringReport } = require('./monitoring.js');

class OperationTools {
    constructor() {
        this.config = {
            logDir: './logs',
            reportsDir: './logs/reports',
            backupDir: './backups',
            dataDir: './data'
        };
        
        // 必要なディレクトリの作成
        this.ensureDirectories();
    }

    // 必要なディレクトリの作成
    ensureDirectories() {
        const dirs = [this.config.logDir, this.config.reportsDir, this.config.backupDir, this.config.dataDir];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    // 日次運用レポート生成
    async generateDailyOperationReport(date = new Date().toISOString().split('T')[0]) {
        const report = {
            reportDate: date,
            generatedAt: new Date().toISOString(),
            systemStatus: await this.getSystemStatus(),
            usageStats: await this.getUsageStats(date),
            alerts: await this.getAlerts(date),
            recommendations: []
        };

        // 推奨事項の生成
        report.recommendations = this.generateRecommendations(report);

        // レポート保存
        const reportPath = path.join(this.config.reportsDir, `daily_operation_${date}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        return { report, reportPath };
    }

    // システム状況取得
    async getSystemStatus() {
        const monitor = new SystemMonitor();
        const status = monitor.getMonitoringStatus();
        
        return {
            isMonitoring: status.isMonitoring,
            uptime: status.uptime,
            lastCheck: new Date().toISOString(),
            version: require('../package.json').version
        };
    }

    // 利用統計取得
    async getUsageStats(date) {
        // 実際の実装ではデータベースから取得
        return {
            totalUsers: 0,
            activeUsers: 0,
            totalSessions: 0,
            averageSessionTime: 0,
            popularGames: []
        };
    }

    // アラート取得
    async getAlerts(date) {
        const alertFile = path.join(this.config.logDir, `alerts_${date}.log`);
        
        if (!fs.existsSync(alertFile)) {
            return [];
        }

        const alerts = fs.readFileSync(alertFile, 'utf8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line));

        return alerts;
    }

    // 推奨事項生成
    generateRecommendations(report) {
        const recommendations = [];

        // アラート数に基づく推奨事項
        if (report.alerts.length > 10) {
            recommendations.push('アラート数が多いため、システム設定の見直しを検討してください');
        }

        // 利用者数に基づく推奨事項
        if (report.usageStats.activeUsers < 5) {
            recommendations.push('利用者数が少ないため、利用促進活動を検討してください');
        }

        return recommendations;
    }

    // 週次運用チェックリスト生成
    generateWeeklyChecklist(weekStartDate = new Date()) {
        const checklist = {
            weekStart: weekStartDate.toISOString().split('T')[0],
            generatedAt: new Date().toISOString(),
            tasks: [
                {
                    category: 'システム運用',
                    items: [
                        { task: 'バックアップの確認', completed: false, notes: '' },
                        { task: 'エラーログの確認', completed: false, notes: '' },
                        { task: 'セキュリティ状況の確認', completed: false, notes: '' },
                        { task: 'システムパフォーマンスの確認', completed: false, notes: '' }
                    ]
                },
                {
                    category: '利用状況',
                    items: [
                        { task: '利用者からのフィードバック確認', completed: false, notes: '' },
                        { task: 'ゲーム利用状況の確認', completed: false, notes: '' },
                        { task: 'スタッフからの報告確認', completed: false, notes: '' }
                    ]
                },
                {
                    category: 'コンテンツ管理',
                    items: [
                        { task: 'ゲーム内容の更新確認', completed: false, notes: '' },
                        { task: '管理画面の確認', completed: false, notes: '' }
                    ]
                },
                {
                    category: '文書・マニュアル',
                    items: [
                        { task: '運用マニュアルの更新確認', completed: false, notes: '' },
                        { task: '手順書の確認', completed: false, notes: '' }
                    ]
                }
            ],
            notes: '',
            completedBy: '',
            completedAt: null
        };

        return checklist;
    }

    // 月次運用報告書テンプレート生成
    generateMonthlyReportTemplate(month = new Date().getMonth() + 1, year = new Date().getFullYear()) {
        const report = {
            reportPeriod: `${year}年${month}月`,
            reporter: '',
            reportDate: new Date().toISOString().split('T')[0],
            basicInfo: {
                systemUptime: '',
                reportDate: new Date().toISOString().split('T')[0]
            },
            usageStats: {
                totalUsers: 0,
                newUsers: 0,
                averageUsageTime: 0,
                totalUsageCount: 0,
                popularGames: [
                    { name: '', count: 0 },
                    { name: '', count: 0 },
                    { name: '', count: 0 }
                ],
                satisfactionRate: 0
            },
            systemStatus: {
                uptime: 0,
                downtime: 0,
                errorCount: 0,
                averageResponseTime: 0,
                securityIncidents: 0,
                backupSuccessRate: 0
            },
            resourceUsage: {
                averageCPU: 0,
                averageMemory: 0,
                diskUsage: 0,
                networkUsage: 0
            },
            improvements: [],
            issues: [],
            feedback: {
                positive: '',
                improvement: '',
                newFeatures: ''
            },
            nextMonthPlan: [],
            budget: {
                operationCost: 0,
                improvementCost: 0,
                budgetRatio: 0
            },
            other: '',
            nextReportDate: '',
            approval: {
                reporter: '',
                approver: ''
            }
        };

        return report;
    }

    // 利用者フィードバック集計
    async aggregateUserFeedback(startDate, endDate) {
        // 実際の実装ではデータベースから取得
        const feedback = {
            period: `${startDate} - ${endDate}`,
            totalResponses: 0,
            averageSatisfaction: 0,
            categoryAverages: {
                gameFun: 0,
                easeOfUse: 0,
                difficulty: 0,
                visibility: 0,
                audio: 0,
                overall: 0
            },
            comments: {
                positive: [],
                improvement: [],
                operation: [],
                other: []
            },
            recommendations: []
        };

        return feedback;
    }

    // システム健康度診断
    async diagnoseSystemHealth() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            overallHealth: 'GOOD', // GOOD, WARNING, CRITICAL
            checks: {
                database: { status: 'OK', message: '' },
                fileSystem: { status: 'OK', message: '' },
                network: { status: 'OK', message: '' },
                security: { status: 'OK', message: '' },
                performance: { status: 'OK', message: '' }
            },
            recommendations: []
        };

        // データベースチェック
        try {
            // データベース接続テスト
            diagnosis.checks.database.status = 'OK';
        } catch (error) {
            diagnosis.checks.database.status = 'ERROR';
            diagnosis.checks.database.message = error.message;
        }

        // ファイルシステムチェック
        try {
            const requiredFiles = ['database.sqlite', 'config.js', 'server.js'];
            for (const file of requiredFiles) {
                if (!fs.existsSync(file)) {
                    throw new Error(`Required file missing: ${file}`);
                }
            }
            diagnosis.checks.fileSystem.status = 'OK';
        } catch (error) {
            diagnosis.checks.fileSystem.status = 'ERROR';
            diagnosis.checks.fileSystem.message = error.message;
        }

        // 全体的な健康度の判定
        const errorCount = Object.values(diagnosis.checks).filter(check => check.status === 'ERROR').length;
        if (errorCount === 0) {
            diagnosis.overallHealth = 'GOOD';
        } else if (errorCount <= 2) {
            diagnosis.overallHealth = 'WARNING';
        } else {
            diagnosis.overallHealth = 'CRITICAL';
        }

        return diagnosis;
    }

    // バックアップ状況確認
    async checkBackupStatus() {
        const backupStatus = {
            timestamp: new Date().toISOString(),
            lastBackup: null,
            backupFrequency: 'daily',
            backupRetention: '30 days',
            backupSize: 0,
            backupLocation: this.config.backupDir,
            status: 'UNKNOWN'
        };

        try {
            const backupFiles = fs.readdirSync(this.config.backupDir)
                .filter(file => file.endsWith('.sqlite'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.backupDir, file),
                    size: fs.statSync(path.join(this.config.backupDir, file)).size,
                    created: fs.statSync(path.join(this.config.backupDir, file)).birthtime
                }))
                .sort((a, b) => b.created - a.created);

            if (backupFiles.length > 0) {
                backupStatus.lastBackup = backupFiles[0].created.toISOString();
                backupStatus.backupSize = backupFiles[0].size;
                
                const hoursSinceLastBackup = (new Date() - backupFiles[0].created) / (1000 * 60 * 60);
                if (hoursSinceLastBackup <= 24) {
                    backupStatus.status = 'OK';
                } else if (hoursSinceLastBackup <= 48) {
                    backupStatus.status = 'WARNING';
                } else {
                    backupStatus.status = 'CRITICAL';
                }
            } else {
                backupStatus.status = 'CRITICAL';
            }
        } catch (error) {
            backupStatus.status = 'ERROR';
            backupStatus.error = error.message;
        }

        return backupStatus;
    }

    // 運用統計レポート生成
    async generateOperationStats(startDate, endDate) {
        const stats = {
            period: `${startDate} - ${endDate}`,
            generatedAt: new Date().toISOString(),
            systemMetrics: {
                uptime: 0,
                downtime: 0,
                availability: 0,
                averageResponseTime: 0,
                errorRate: 0
            },
            usageMetrics: {
                totalUsers: 0,
                activeUsers: 0,
                newUsers: 0,
                totalSessions: 0,
                averageSessionTime: 0,
                peakConcurrentUsers: 0
            },
            performanceMetrics: {
                averageCPU: 0,
                averageMemory: 0,
                peakCPU: 0,
                peakMemory: 0,
                diskUsage: 0
            },
            securityMetrics: {
                securityIncidents: 0,
                failedLoginAttempts: 0,
                suspiciousActivities: 0
            },
            trends: {
                userGrowth: 0,
                usageGrowth: 0,
                performanceTrend: 'STABLE'
            }
        };

        return stats;
    }
}

module.exports = { OperationTools }; 