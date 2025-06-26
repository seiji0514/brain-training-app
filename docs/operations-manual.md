# 運用マニュアル

## 目次
1. [システム概要](#システム概要)
2. [インストール・セットアップ](#インストールセットアップ)
3. [起動・停止](#起動停止)
4. [監視・ログ](#監視ログ)
5. [バックアップ・復元](#バックアップ復元)
6. [トラブルシューティング](#トラブルシューティング)
7. [セキュリティ管理](#セキュリティ管理)
8. [パフォーマンス最適化](#パフォーマンス最適化)

## システム概要

### 構成要素
- **APIサーバー**: Node.js + Express (ポート3000)
- **フロントエンド**: HTML/CSS/JavaScript (ポート5500)
- **データベース**: SQLite
- **認証**: JWT
- **セキュリティ**: Helmet, CORS, レート制限

### システム要件
- Node.js 16.0以上
- メモリ: 最低512MB、推奨1GB以上
- ディスク容量: 最低1GB
- OS: Windows 10/11, macOS, Linux

## インストール・セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env`ファイルを作成し、以下の設定を行います：
```env
NODE_ENV=production
JWT_SECRET=your-secret-key-here
DB_PATH=./database.sqlite
PORT=3000
ADMIN_EMAIL=admin@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

### 3. データベースの初期化
```bash
node db/init_db.js
```

### 4. 管理者ユーザーの作成
```bash
node db/add_admin.js
```

## 起動・停止

### 開発環境での起動
```bash
npm run dev
```

### 本番環境での起動
```bash
npm start
```

### Windowsサービスとして登録
```bash
# 管理者権限で実行
nssm install BrainTrainingAPI "C:\Program Files\nodejs\node.exe" "C:\path\to\your\app\server.js"
nssm set BrainTrainingAPI AppDirectory "C:\path\to\your\app"
nssm start BrainTrainingAPI
```

### サービスの停止
```bash
nssm stop BrainTrainingAPI
```

### サービスの削除
```bash
nssm remove BrainTrainingAPI confirm
```

## 監視・ログ

### ログファイルの場所
- **アプリケーションログ**: `logs/app.log`
- **エラーログ**: `logs/error.log`
- **セキュリティログ**: `logs/security.log`
- **アクセスログ**: `logs/access.log`

### ログローテーション
ログファイルは自動的にローテーションされます：
- 最大サイズ: 10MB
- 保持期間: 30日
- 圧縮: 有効

### 監視項目
1. **システムリソース**
   - CPU使用率
   - メモリ使用率
   - ディスク使用率
   - ネットワーク使用率

2. **アプリケーション**
   - レスポンス時間
   - エラー率
   - アクティブユーザー数
   - データベース接続数

3. **セキュリティ**
   - ログイン試行回数
   - 異常アクセス
   - セキュリティイベント

### 監視コマンド
```bash
# システム状態確認
npm run status

# ログ確認
npm run logs

# パフォーマンス確認
npm run performance
```

## バックアップ・復元

### 自動バックアップ
- **頻度**: 毎日午前2時
- **保持期間**: 30日
- **場所**: `backup/`ディレクトリ
- **内容**: データベース、設定ファイル、ログ

### 手動バックアップ
```bash
npm run backup
```

### バックアップの復元
```bash
npm run restore -- --file=backup_2024-01-01.sqlite
```

### バックアップの検証
```bash
npm run verify-backup -- --file=backup_2024-01-01.sqlite
```

## トラブルシューティング

### よくある問題と対処法

#### 1. サーバーが起動しない
**症状**: `Error: listen EADDRINUSE`
**原因**: ポート3000が既に使用中
**対処法**:
```bash
# ポート使用状況確認
netstat -ano | findstr :3000
# プロセス終了
taskkill /PID <PID> /F
```

#### 2. データベースエラー
**症状**: `SQLITE_CANTOPEN`
**原因**: データベースファイルの権限問題
**対処法**:
```bash
# 権限確認
icacls database.sqlite
# 権限修正
icacls database.sqlite /grant Everyone:F
```

#### 3. メモリ不足
**症状**: `JavaScript heap out of memory`
**原因**: メモリ使用量過多
**対処法**:
```bash
# Node.jsのメモリ制限を増加
node --max-old-space-size=2048 server.js
```

#### 4. 認証エラー
**症状**: `JWT token invalid`
**原因**: トークンの期限切れまたは無効
**対処法**:
- ユーザーに再ログインを促す
- JWT_SECRETの確認

### ログ分析
```bash
# エラーログの確認
tail -f logs/error.log

# 特定のエラーの検索
grep "ERROR" logs/app.log

# アクセスログの分析
npm run analyze-logs
```

### 緊急時の対応
1. **システムダウン時**
   - ログの確認
   - プロセスの再起動
   - データベースの整合性チェック

2. **セキュリティインシデント時**
   - 影響範囲の特定
   - ログの保存
   - 管理者への通知
   - 必要に応じてシステム停止

## セキュリティ管理

### 定期セキュリティチェック
- **毎日**: ログイン試行回数の確認
- **毎週**: セキュリティログの分析
- **毎月**: セキュリティアップデートの確認

### パスワードポリシー
- 最小8文字
- 大文字・小文字・数字・記号を含む
- 90日で期限切れ
- 過去5回のパスワードは再利用不可

### アクセス制御
- IP制限の設定
- セッションタイムアウト: 30分
- 同時ログイン制限: 1セッション

### セキュリティアップデート
```bash
# 依存関係の脆弱性チェック
npm audit

# セキュリティアップデート
npm audit fix
```

## パフォーマンス最適化

### データベース最適化
```bash
# データベースの最適化
npm run optimize-db

# インデックスの確認
npm run check-indexes
```

### キャッシュ戦略
- **Redis**: セッション管理
- **メモリキャッシュ**: 頻繁にアクセスされるデータ
- **CDN**: 静的ファイルの配信

### 負荷分散
- **ロードバランサー**: 複数インスタンス間での負荷分散
- **データベース**: 読み取り専用レプリカの活用

### パフォーマンス監視
```bash
# パフォーマンステスト
npm run performance-test

# メトリクス確認
npm run metrics
```

## 定期メンテナンス

### 毎日の作業
- ログファイルの確認
- バックアップの確認
- システムリソースの確認

### 毎週の作業
- セキュリティログの分析
- パフォーマンスの確認
- 不要ファイルの削除

### 毎月の作業
- セキュリティアップデート
- データベースの最適化
- 設定の見直し

### 四半期の作業
- システム全体の見直し
- ドキュメントの更新
- 運用プロセスの改善

## 連絡先

### 緊急時連絡先
- **システム管理者**: admin@example.com
- **技術サポート**: support@example.com
- **セキュリティ**: security@example.com

### エスカレーション手順
1. 一次対応: システム管理者
2. 二次対応: 技術サポート
3. 三次対応: 開発チーム

## 更新履歴

| 日付 | バージョン | 変更内容 | 更新者 |
|------|------------|----------|--------|
| 2024-01-01 | 1.0.0 | 初版作成 | 開発チーム |
| 2024-01-15 | 1.1.0 | セキュリティ項目追加 | 開発チーム | 