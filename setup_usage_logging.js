// 利用履歴記録システムのセットアップスクリプト
const { ServerUsageLogger } = require('./server_usage_logger');
const fs = require('fs');
const path = require('path');

class UsageLoggingSetup {
    constructor() {
        this.logger = new ServerUsageLogger();
    }

    // 初期セットアップ
    async setup() {
        console.log('=== 利用履歴記録システムのセットアップを開始します ===');
        
        try {
            // 1. データベースの初期化
            await this.initializeDatabase();
            
            // 2. 必要なディレクトリの作成
            await this.createDirectories();
            
            // 3. サンプルデータの作成
            await this.createSampleData();
            
            // 4. 設定ファイルの作成
            await this.createConfigFiles();
            
            console.log('=== セットアップが完了しました ===');
            console.log('サーバーを起動するには: node server.js');
            console.log('利用履歴確認: http://localhost:3000/usage_history.html');
            
        } catch (error) {
            console.error('セットアップ中にエラーが発生しました:', error);
        }
    }

    // データベースの初期化
    async initializeDatabase() {
        console.log('1. データベースの初期化...');
        
        // データベースファイルが存在しない場合は初期化
        const dbPath = path.join(__dirname, 'database.sqlite');
        if (!fs.existsSync(dbPath)) {
            console.log('データベースファイルを作成中...');
            // ServerUsageLoggerのコンストラクタで自動的に初期化される
        } else {
            console.log('既存のデータベースファイルが見つかりました');
        }
    }

    // 必要なディレクトリの作成
    async createDirectories() {
        console.log('2. 必要なディレクトリの作成...');
        
        const directories = [
            'backups',
            'logs',
            'logs/reports',
            'data'
        ];

        for (const dir of directories) {
            const dirPath = path.join(__dirname, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`作成: ${dir}`);
            } else {
                console.log(`既存: ${dir}`);
            }
        }
    }

    // サンプルデータの作成
    async createSampleData() {
        console.log('3. サンプルデータの作成...');
        
        try {
            // サンプル管理者ユーザーの作成
            await this.logger.registerFaceAuthUser({
                username: 'admin',
                role: 'admin',
                faceData: null
            });

            // サンプルリハビリスタッフユーザーの作成
            await this.logger.registerFaceAuthUser({
                username: 'staff1',
                role: 'user',
                faceData: null
            });

            // サンプル利用履歴の作成
            const sampleLogs = [
                {
                    username: 'staff1',
                    role: 'user',
                    gameName: '記憶力ゲーム',
                    action: 'start',
                    score: null,
                    playTime: null,
                    mistakes: null,
                    completed: false,
                    sessionId: 'sample_session_1'
                },
                {
                    username: 'staff1',
                    role: 'user',
                    gameName: '記憶力ゲーム',
                    action: 'end',
                    score: 85,
                    playTime: 120,
                    mistakes: 3,
                    completed: true,
                    sessionId: 'sample_session_1'
                },
                {
                    username: 'admin',
                    role: 'admin',
                    gameName: 'メインページ',
                    action: 'start',
                    score: null,
                    playTime: null,
                    mistakes: null,
                    completed: false,
                    sessionId: 'sample_session_2'
                }
            ];

            for (const log of sampleLogs) {
                await this.logger.logUsage(log);
            }

            console.log('サンプルデータを作成しました');
            
        } catch (error) {
            console.log('サンプルデータの作成をスキップしました:', error.message);
        }
    }

    // 設定ファイルの作成
    async createConfigFiles() {
        console.log('4. 設定ファイルの作成...');
        
        // 運用設定ファイル
        const config = {
            usageLogging: {
                enabled: true,
                retentionDays: 90,
                backupInterval: 'daily',
                cleanupInterval: 'weekly'
            },
            faceAuth: {
                sessionTimeout: 24, // 時間
                maxLoginAttempts: 5
            },
            server: {
                port: 3000,
                host: '0.0.0.0'
            }
        };

        const configPath = path.join(__dirname, 'usage_config.json');
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('設定ファイルを作成: usage_config.json');
        } else {
            console.log('既存の設定ファイル: usage_config.json');
        }

        // 運用マニュアルの作成
        const manual = this.createOperationManual();
        const manualPath = path.join(__dirname, 'USAGE_OPERATION_MANUAL.md');
        if (!fs.existsSync(manualPath)) {
            fs.writeFileSync(manualPath, manual);
            console.log('運用マニュアルを作成: USAGE_OPERATION_MANUAL.md');
        } else {
            console.log('既存の運用マニュアル: USAGE_OPERATION_MANUAL.md');
        }
    }

    // 運用マニュアルの作成
    createOperationManual() {
        return `# 利用履歴記録システム 運用マニュアル

## 概要
このシステムは、脳トレゲームの利用履歴を記録・管理するためのシステムです。

## 初期設定

### 1. サーバーの起動
\`\`\`bash
node server.js
\`\`\`

### 2. 管理者の顔認証登録
1. http://localhost:3000/face_register.html にアクセス
2. 管理者として登録（役割: 管理者）
3. 顔認証情報を登録

### 3. 利用履歴の確認
1. 管理者としてログイン
2. メインページの「利用履歴」ボタンをクリック
3. または直接 http://localhost:3000/usage_history.html にアクセス

## 日常運用

### 利用履歴の確認
- 日次: 利用統計の確認
- 週次: 詳細な利用パターンの分析
- 月次: 月次レポートの作成

### データバックアップ
- 自動バックアップ: 毎日実行
- 手動バックアップ: API経由で実行可能

### セッション管理
- 期限切れセッションの自動クリーンアップ
- 24時間でセッション期限切れ

## トラブルシューティング

### よくある問題
1. データベースエラー
   - 解決策: データベースファイルの権限確認

2. 顔認証エラー
   - 解決策: カメラ権限の確認

3. 利用履歴が記録されない
   - 解決策: ブラウザのlocalStorage容量確認

## API エンドポイント

### 利用履歴関連
- POST /api/usage/log - 利用履歴記録
- GET /api/usage/logs - 利用履歴取得
- GET /api/usage/statistics - 統計情報取得

### 管理関連
- POST /api/backup-database - データベースバックアップ
- POST /api/cleanup-sessions - セッションクリーンアップ
- GET /api/usage-stats - 利用統計取得

## セキュリティ

### アクセス制御
- 管理者のみが利用履歴を閲覧可能
- 顔認証による本人確認
- セッション管理による不正アクセス防止

### データ保護
- 個人情報の暗号化
- アクセスログの記録
- 定期的なバックアップ

## サポート

問題が発生した場合は、以下を確認してください：
1. サーバーログの確認
2. データベースの状態確認
3. ブラウザの開発者ツールでのエラー確認
`;
    }

    // システム健康度チェック
    async healthCheck() {
        console.log('=== システム健康度チェック ===');
        
        try {
            // データベース接続テスト
            const stats = await this.logger.getStatistics();
            console.log('✅ データベース接続: OK');
            console.log(`   総ユーザー数: ${stats.totalUsers?.[0]?.count || 0}`);
            console.log(`   総セッション数: ${stats.totalSessions?.[0]?.count || 0}`);

            // ファイルシステムチェック
            const requiredFiles = ['database.sqlite', 'server.js', 'server_usage_logger.js'];
            for (const file of requiredFiles) {
                if (fs.existsSync(path.join(__dirname, file))) {
                    console.log(`✅ ${file}: OK`);
                } else {
                    console.log(`❌ ${file}: 見つかりません`);
                }
            }

            // ディレクトリチェック
            const requiredDirs = ['backups', 'logs', 'data'];
            for (const dir of requiredDirs) {
                if (fs.existsSync(path.join(__dirname, dir))) {
                    console.log(`✅ ${dir}/: OK`);
                } else {
                    console.log(`❌ ${dir}/: 見つかりません`);
                }
            }

            console.log('=== 健康度チェック完了 ===');
            
        } catch (error) {
            console.error('健康度チェック中にエラーが発生しました:', error);
        }
    }
}

// メイン実行
async function main() {
    const setup = new UsageLoggingSetup();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--health-check')) {
        await setup.healthCheck();
    } else {
        await setup.setup();
    }
}

// スクリプトが直接実行された場合
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { UsageLoggingSetup };
 