# 本番環境構築ガイド

## 目次
1. [環境要件](#環境要件)
2. [サーバーセットアップ](#サーバーセットアップ)
3. [アプリケーションデプロイ](#アプリケーションデプロイ)
4. [データベース設定](#データベース設定)
5. [セキュリティ設定](#セキュリティ設定)
6. [監視・ログ設定](#監視ログ設定)
7. [バックアップ設定](#バックアップ設定)
8. [SSL証明書設定](#SSL証明書設定)

## 環境要件

### ハードウェア要件
- **CPU**: 2コア以上（推奨4コア）
- **メモリ**: 4GB以上（推奨8GB）
- **ストレージ**: 50GB以上（SSD推奨）
- **ネットワーク**: 100Mbps以上

### ソフトウェア要件
- **OS**: Ubuntu 20.04 LTS / CentOS 8 / Windows Server 2019
- **Node.js**: 18.x LTS以上
- **Nginx**: 1.18以上
- **PM2**: 最新版
- **SQLite**: 3.35以上

### ネットワーク要件
- **ポート**: 80, 443, 3000
- **ファイアウォール**: 適切な設定
- **DNS**: ドメイン名の設定

## サーバーセットアップ

### Ubuntu 20.04 LTSでのセットアップ

#### 1. システムアップデート
```bash
sudo apt update
sudo apt upgrade -y
```

#### 2. Node.jsのインストール
```bash
# NodeSourceリポジトリの追加
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.jsのインストール
sudo apt-get install -y nodejs

# バージョン確認
node --version
npm --version
```

#### 3. Nginxのインストール
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

#### 4. PM2のインストール
```bash
sudo npm install -g pm2
```

#### 5. ファイアウォールの設定
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw enable
```

### Windows Server 2019でのセットアップ

#### 1. Node.jsのインストール
```powershell
# Chocolateyを使用
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Node.jsのインストール
choco install nodejs -y
```

#### 2. IISの設定
```powershell
# IISの有効化
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServer
Enable-WindowsOptionalFeature -Online -FeatureName IIS-CommonHttpFeatures
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpErrors
Enable-WindowsOptionalFeature -Online -FeatureName IIS-HttpLogging
Enable-WindowsOptionalFeature -Online -FeatureName IIS-RequestFiltering
Enable-WindowsOptionalFeature -Online -FeatureName IIS-StaticContent
```

#### 3. PM2のインストール
```powershell
npm install -g pm2
```

## アプリケーションデプロイ

### 1. アプリケーションの配置
```bash
# アプリケーションディレクトリの作成
sudo mkdir -p /var/www/brain-training
sudo chown $USER:$USER /var/www/brain-training

# アプリケーションのコピー
cp -r * /var/www/brain-training/
cd /var/www/brain-training
```

### 2. 依存関係のインストール
```bash
npm install --production
```

### 3. 環境変数の設定
```bash
# .envファイルの作成
cat > .env << EOF
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
DB_PATH=/var/www/brain-training/database.sqlite
PORT=3000
ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
SESSION_SECRET=your-session-secret-here
EOF
```

### 4. PM2でのアプリケーション起動
```bash
# PM2設定ファイルの作成
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'brain-training-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=2048'
  }]
};
EOF

# アプリケーションの起動
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginxの設定
```bash
# Nginx設定ファイルの作成
sudo tee /etc/nginx/sites-available/brain-training << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # リダイレクト設定（HTTPS用）
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL証明書の設定
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 静的ファイルの配信
    location / {
        root /var/www/brain-training;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # APIプロキシ
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # ファイルアップロード制限
    client_max_body_size 10M;

    # ログ設定
    access_log /var/log/nginx/brain-training-access.log;
    error_log /var/log/nginx/brain-training-error.log;
}
EOF

# シンボリックリンクの作成
sudo ln -s /etc/nginx/sites-available/brain-training /etc/nginx/sites-enabled/

# Nginx設定のテスト
sudo nginx -t

# Nginxの再起動
sudo systemctl restart nginx
```

## データベース設定

### 1. データベースの初期化
```bash
# データベースディレクトリの作成
sudo mkdir -p /var/www/brain-training/db
sudo chown $USER:$USER /var/www/brain-training/db

# データベースの初期化
cd /var/www/brain-training
node db/init_db.js
```

### 2. 管理者ユーザーの作成
```bash
node db/add_admin.js
```

### 3. データベースの最適化
```bash
# インデックスの作成
sqlite3 database.sqlite << EOF
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON game_records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_game_id ON game_records(game_id);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON game_records(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
VACUUM;
ANALYZE;
EOF
```

## セキュリティ設定

### 1. ファイアウォールの設定
```bash
# UFWの設定
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 3000
sudo ufw enable
```

### 2. Fail2banの設定
```bash
# Fail2banのインストール
sudo apt install fail2ban -y

# 設定ファイルの作成
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https"]
logpath = /var/log/nginx/access.log
maxretry = 3
EOF

# Fail2banの再起動
sudo systemctl restart fail2ban
```

### 3. セキュリティ監査
```bash
# システムの脆弱性スキャン
sudo apt install lynis -y
sudo lynis audit system

# 依存関係の脆弱性チェック
npm audit
npm audit fix
```

## 監視・ログ設定

### 1. ログローテーションの設定
```bash
# logrotateの設定
sudo tee /etc/logrotate.d/brain-training << EOF
/var/www/brain-training/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 2. 監視スクリプトの作成
```bash
# 監視スクリプトの作成
cat > /var/www/brain-training/monitor.sh << 'EOF'
#!/bin/bash

# システムリソースの監視
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | cut -d'%' -f1)

# アプリケーションの監視
PM2_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status')

# アラートの送信
if [ $(echo "$CPU_USAGE > 80" | bc) -eq 1 ]; then
    echo "High CPU usage: ${CPU_USAGE}%" | mail -s "System Alert" admin@yourdomain.com
fi

if [ $(echo "$MEMORY_USAGE > 80" | bc) -eq 1 ]; then
    echo "High memory usage: ${MEMORY_USAGE}%" | mail -s "System Alert" admin@yourdomain.com
fi

if [ "$PM2_STATUS" != "online" ]; then
    echo "Application is not running. Status: $PM2_STATUS" | mail -s "System Alert" admin@yourdomain.com
    pm2 restart brain-training-api
fi
EOF

chmod +x /var/www/brain-training/monitor.sh

# cronジョブの設定
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/brain-training/monitor.sh") | crontab -
```

## バックアップ設定

### 1. 自動バックアップスクリプト
```bash
# バックアップスクリプトの作成
cat > /var/www/brain-training/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/var/backups/brain-training"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.tar.gz"

# バックアップディレクトリの作成
mkdir -p $BACKUP_DIR

# アプリケーションの停止
pm2 stop brain-training-api

# データベースのバックアップ
cp /var/www/brain-training/database.sqlite /tmp/database_backup.sqlite

# アプリケーションの再開
pm2 start brain-training-api

# バックアップファイルの作成
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    /var/www/brain-training/database.sqlite \
    /var/www/brain-training/.env \
    /var/www/brain-training/logs \
    /var/www/brain-training/uploads

# 古いバックアップの削除（30日以上）
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +30 -delete

# バックアップの検証
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "Backup completed: $BACKUP_FILE" | mail -s "Backup Success" admin@yourdomain.com
else
    echo "Backup failed" | mail -s "Backup Error" admin@yourdomain.com
fi
EOF

chmod +x /var/www/brain-training/backup.sh

# 毎日午前2時にバックアップを実行
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/brain-training/backup.sh") | crontab -
```

## SSL証明書設定

### 1. Let's Encryptの設定
```bash
# Certbotのインストール
sudo apt install certbot python3-certbot-nginx -y

# SSL証明書の取得
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 自動更新の設定
sudo crontab -e
# 以下の行を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. SSL設定の最適化
```bash
# SSL設定の強化
sudo tee /etc/nginx/snippets/ssl-params.conf << EOF
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
ssl_ecdh_curve secp384r1;
ssl_session_timeout 10m;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
EOF
```

## デプロイ後の確認

### 1. 動作確認
```bash
# アプリケーションの状態確認
pm2 status
pm2 logs brain-training-api

# Nginxの状態確認
sudo systemctl status nginx
sudo nginx -t

# ポートの確認
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### 2. パフォーマンステスト
```bash
# 負荷テストの実行
npm install -g autocannon
autocannon -c 100 -d 30 http://localhost:3000/api/health
```

### 3. セキュリティテスト
```bash
# セキュリティスキャンの実行
npm audit
sudo lynis audit system
```

## 運用開始後のメンテナンス

### 1. 定期メンテナンス
```bash
# 毎週のメンテナンススクリプト
cat > /var/www/brain-training/maintenance.sh << 'EOF'
#!/bin/bash

# システムアップデート
sudo apt update && sudo apt upgrade -y

# 依存関係の更新
cd /var/www/brain-training
npm update

# ログのクリーンアップ
find /var/www/brain-training/logs -name "*.log" -mtime +30 -delete

# データベースの最適化
sqlite3 database.sqlite "VACUUM; ANALYZE;"

# PM2の再起動
pm2 restart brain-training-api
EOF

chmod +x /var/www/brain-training/maintenance.sh

# 毎週日曜日の午前3時にメンテナンスを実行
(crontab -l 2>/dev/null; echo "0 3 * * 0 /var/www/brain-training/maintenance.sh") | crontab -
```

### 2. 監視ダッシュボード
```bash
# PM2監視ダッシュボードの設定
pm2 install pm2-server-monit
pm2 set pm2-server-monit:email admin@yourdomain.com
```

このガイドに従って本番環境を構築することで、安定した運用が可能になります。 