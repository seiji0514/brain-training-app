# トラブルシューティングガイド

## 目次
1. [一般的な問題](#一般的な問題)
2. [認証・ログイン問題](#認証ログイン問題)
3. [ゲーム関連の問題](#ゲーム関連の問題)
4. [パフォーマンス問題](#パフォーマンス問題)
5. [データベース問題](#データベース問題)
6. [ネットワーク問題](#ネットワーク問題)
7. [セキュリティ問題](#セキュリティ問題)
8. [緊急時の対応](#緊急時の対応)

## 一般的な問題

### 問題1: サーバーが起動しない
**症状**: `Error: listen EADDRINUSE: address already in use :::3000`

**原因**: ポート3000が既に使用されている

**対処法**:
```bash
# 1. ポート使用状況を確認
netstat -ano | findstr :3000

# 2. 使用中のプロセスを終了
taskkill /PID <PID> /F

# 3. サーバーを再起動
npm start
```

**予防法**:
- 起動前に既存のプロセスを確認
- 自動起動スクリプトの使用

### 問題2: モジュールが見つからない
**症状**: `Cannot find module 'xxx'`

**原因**: 依存関係がインストールされていない

**対処法**:
```bash
# 1. node_modulesを削除
rm -rf node_modules

# 2. package-lock.jsonを削除
rm package-lock.json

# 3. 依存関係を再インストール
npm install
```

**予防法**:
- 定期的な依存関係の更新
- package.jsonのバージョン管理

### 問題3: メモリ不足
**症状**: `JavaScript heap out of memory`

**原因**: メモリ使用量が制限を超えている

**対処法**:
```bash
# 1. Node.jsのメモリ制限を増加
node --max-old-space-size=2048 server.js

# 2. 不要なプロセスを終了
tasklist | findstr node
taskkill /IM node.exe /F
```

**予防法**:
- メモリ使用量の監視
- 定期的なプロセス再起動

## 認証・ログイン問題

### 問題4: JWTトークンエラー
**症状**: `JWT token invalid` または `Token expired`

**原因**: トークンの期限切れまたは無効

**対処法**:
```javascript
// 1. トークンの有効性を確認
const jwt = require('jsonwebtoken');
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Token is valid:', decoded);
} catch (error) {
  console.log('Token is invalid:', error.message);
}

// 2. ユーザーに再ログインを促す
```

**予防法**:
- トークンの有効期限を適切に設定
- リフレッシュトークンの実装

### 問題5: パスワード認証エラー
**症状**: 正しいパスワードでもログインできない

**原因**: パスワードハッシュの不整合

**対処法**:
```javascript
// 1. パスワードハッシュを確認
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('password', 10);
console.log('New hash:', hash);

// 2. データベースのパスワードを更新
db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
```

**予防法**:
- パスワードリセット機能の実装
- ハッシュアルゴリズムの統一

### 問題6: セッション管理エラー
**症状**: ログイン状態が保持されない

**原因**: セッションストアの問題

**対処法**:
```javascript
// 1. セッション設定を確認
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.db',
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// 2. セッションデータベースを確認
db.query('SELECT * FROM sessions', (err, rows) => {
  console.log('Sessions:', rows);
});
```

**予防法**:
- セッションの定期的なクリーンアップ
- セッションストアの監視

## ゲーム関連の問題

### 問題7: ゲーム記録が保存されない
**症状**: ゲーム終了後、スコアが記録されない

**原因**: データベース接続または権限の問題

**対処法**:
```javascript
// 1. データベース接続を確認
db.get('SELECT 1', (err, row) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connection OK');
  }
});

// 2. テーブル構造を確認
db.all("PRAGMA table_info(game_records)", (err, rows) => {
  console.log('Table structure:', rows);
});
```

**予防法**:
- データベースの定期バックアップ
- 接続プールの実装

### 問題8: ゲームが重い
**症状**: ゲームの動作が遅い

**原因**: フロントエンドのパフォーマンス問題

**対処法**:
```javascript
// 1. メモリリークの確認
console.log('Memory usage:', process.memoryUsage());

// 2. 不要なイベントリスナーの削除
element.removeEventListener('click', handler);

// 3. 画像の最適化
const img = new Image();
img.onload = () => {
  // 画像読み込み完了後の処理
};
```

**予防法**:
- 定期的なパフォーマンス監視
- アセットの最適化

## パフォーマンス問題

### 問題9: APIレスポンスが遅い
**症状**: API呼び出しに時間がかかる

**原因**: データベースクエリの最適化不足

**対処法**:
```javascript
// 1. クエリの実行時間を測定
const start = Date.now();
db.query('SELECT * FROM users', (err, rows) => {
  const duration = Date.now() - start;
  console.log('Query duration:', duration + 'ms');
});

// 2. インデックスの確認
db.all("PRAGMA index_list(users)", (err, rows) => {
  console.log('Indexes:', rows);
});

// 3. クエリの最適化
db.query('SELECT id, username FROM users WHERE active = 1 LIMIT 100');
```

**予防法**:
- クエリの定期的な最適化
- インデックスの適切な設定

### 問題10: メモリリーク
**症状**: 時間の経過とともにメモリ使用量が増加

**原因**: オブジェクトの適切な解放不足

**対処法**:
```javascript
// 1. メモリ使用量の監視
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
  });
}, 60000);

// 2. ガベージコレクションの強制実行
if (global.gc) {
  global.gc();
}
```

**予防法**:
- 定期的なメモリ監視
- オブジェクトの適切な管理

## データベース問題

### 問題11: データベースロック
**症状**: `database is locked`

**原因**: 複数のプロセスが同時にデータベースにアクセス

**対処法**:
```javascript
// 1. データベース接続を確認
db.get('PRAGMA busy_timeout = 30000');

// 2. トランザクションの使用
db.serialize(() => {
  db.run('BEGIN TRANSACTION');
  // データベース操作
  db.run('COMMIT');
});

// 3. 接続プールの実装
const pool = new Map();
```

**予防法**:
- 適切なトランザクション管理
- 接続数の制限

### 問題12: データベース破損
**症状**: データベースファイルが読み込めない

**原因**: ファイルシステムの問題または不適切なシャットダウン

**対処法**:
```javascript
// 1. データベースの整合性チェック
db.get('PRAGMA integrity_check', (err, result) => {
  if (err) {
    console.error('Database corruption detected');
  } else {
    console.log('Database integrity OK');
  }
});

// 2. バックアップからの復元
const backup = require('./backup');
backup.restore('backup_2024-01-01.sqlite');
```

**予防法**:
- 定期的なバックアップ
- 適切なシャットダウン処理

## ネットワーク問題

### 問題13: CORSエラー
**症状**: `Access to fetch at 'http://localhost:3000' from origin 'http://127.0.0.1:5500' has been blocked by CORS policy`

**原因**: CORS設定の問題

**対処法**:
```javascript
// 1. CORS設定の確認
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**予防法**:
- 本番環境での適切なCORS設定
- セキュリティポリシーの策定

### 問題14: ネットワークタイムアウト
**症状**: リクエストがタイムアウトする

**原因**: ネットワーク接続の問題

**対処法**:
```javascript
// 1. タイムアウト設定の調整
const timeout = require('connect-timeout');
app.use(timeout('30s'));

// 2. リトライ機能の実装
const retry = require('retry');
const operation = retry.operation({
  retries: 3,
  factor: 2,
  minTimeout: 1000,
  maxTimeout: 5000
});
```

**予防法**:
- ネットワーク監視の実装
- 適切なタイムアウト設定

## セキュリティ問題

### 問題15: レート制限エラー
**症状**: `Too many requests`

**原因**: レート制限に達した

**対処法**:
```javascript
// 1. レート制限の確認
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP'
});

// 2. レート制限のリセット
rateLimiter.reset(req.ip);
```

**予防法**:
- 適切なレート制限設定
- 異常アクセスの監視

### 問題16: セキュリティヘッダーエラー
**症状**: セキュリティヘッダーが設定されていない

**原因**: Helmetの設定問題

**対処法**:
```javascript
// 1. Helmetの設定確認
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

**予防法**:
- セキュリティヘッダーの定期的な確認
- セキュリティスキャンの実施

## 緊急時の対応

### システムダウン時の対応手順

1. **状況確認**
   ```bash
   # プロセス確認
   tasklist | findstr node
   
   # ポート確認
   netstat -ano | findstr :3000
   
   # ログ確認
   tail -f logs/error.log
   ```

2. **緊急復旧**
   ```bash
   # プロセス強制終了
   taskkill /IM node.exe /F
   
   # サーバー再起動
   npm start
   
   # データベース確認
   node db/check_db.js
   ```

3. **影響範囲の確認**
   - ユーザーへの影響
   - データの損失
   - 復旧時間の見積もり

4. **関係者への通知**
   - 管理者への通知
   - ユーザーへの案内
   - 復旧状況の報告

### データ損失時の対応

1. **バックアップの確認**
   ```bash
   # 最新バックアップの確認
   ls -la backup/
   
   # バックアップの整合性確認
   node backup/verify_backup.js
   ```

2. **復旧作業**
   ```bash
   # バックアップからの復元
   node backup/restore.js --file=backup_2024-01-01.sqlite
   
   # データの整合性確認
   node db/verify_data.js
   ```

3. **原因調査**
   - ログの分析
   - システムの調査
   - 再発防止策の検討

### セキュリティインシデント時の対応

1. **インシデントの特定**
   ```bash
   # セキュリティログの確認
   tail -f logs/security.log
   
   # 異常アクセスの検出
   node security/analyze_logs.js
   ```

2. **緊急対応**
   ```bash
   # システム停止（必要に応じて）
   npm run emergency-stop
   
   # 影響範囲の特定
   node security/impact_analysis.js
   ```

3. **復旧作業**
   ```bash
   # セキュリティパッチの適用
   npm audit fix
   
   # システム再起動
   npm start
   ```

## 予防的メンテナンス

### 定期チェック項目

1. **毎日**
   - ログファイルの確認
   - システムリソースの確認
   - バックアップの確認

2. **毎週**
   - セキュリティログの分析
   - パフォーマンスの確認
   - 依存関係の更新確認

3. **毎月**
   - セキュリティアップデートの適用
   - データベースの最適化
   - 設定の見直し

### 監視ツール

```javascript
// システム監視スクリプト
const monitor = require('./utils/monitor');

// CPU使用率の監視
monitor.cpu((usage) => {
  if (usage > 80) {
    console.warn('High CPU usage:', usage + '%');
  }
});

// メモリ使用率の監視
monitor.memory((usage) => {
  if (usage > 80) {
    console.warn('High memory usage:', usage + '%');
  }
});

// ディスク使用率の監視
monitor.disk((usage) => {
  if (usage > 90) {
    console.warn('High disk usage:', usage + '%');
  }
});
```

## 連絡先

### 緊急時連絡先
- **システム管理者**: admin@example.com
- **技術サポート**: support@example.com
- **セキュリティ**: security@example.com

### エスカレーション手順
1. 一次対応: システム管理者
2. 二次対応: 技術サポート
3. 三次対応: 開発チーム

### 報告書テンプレート
```markdown
# インシデント報告書

## 基本情報
- 発生日時: 
- 発見者: 
- 影響範囲: 

## 症状
- 具体的な症状
- エラーメッセージ
- 影響を受けた機能

## 原因
- 推定原因
- 調査結果

## 対応内容
- 実施した対応
- 復旧時間
- 再発防止策

## 今後の対策
- 改善点
- 予防策
``` 