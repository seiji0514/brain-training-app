# 環境設定最適化ガイド

## 目次
1. [開発環境](#開発環境)
2. [ステージング環境](#ステージング環境)
3. [本番環境](#本番環境)
4. [環境変数管理](#環境変数管理)
5. [設定ファイル管理](#設定ファイル管理)
6. [パフォーマンス最適化](#パフォーマンス最適化)

## 開発環境

### 開発環境の設定ファイル
```javascript
// config/development.js
module.exports = {
  // サーバー設定
  server: {
    port: 3000,
    host: 'localhost',
    cors: {
      origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
      credentials: true
    }
  },

  // データベース設定
  database: {
    path: './database.sqlite',
    mode: 'development',
    logging: true,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  },

  // 認証設定
  auth: {
    jwtSecret: 'dev-secret-key',
    jwtExpiresIn: '24h',
    sessionSecret: 'dev-session-secret',
    sessionMaxAge: 24 * 60 * 60 * 1000, // 24時間
    bcryptRounds: 10
  },

  // セキュリティ設定
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 1000 // 1000リクエスト
    },
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }
  },

  // ログ設定
  logging: {
    level: 'debug',
    format: 'dev',
    transports: ['console', 'file'],
    file: {
      filename: 'logs/dev.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }
  },

  // 開発ツール
  devTools: {
    hotReload: true,
    debugMode: true,
    mockData: true
  }
};
```

### 開発環境の起動スクリプト
```json
// package.json
{
  "scripts": {
    "dev": "nodemon server.js",
    "dev:debug": "node --inspect server.js",
    "dev:test": "cross-env NODE_ENV=test jest --watch",
    "dev:lint": "eslint . --fix",
    "dev:format": "prettier --write ."
  }
}
```

## ステージング環境

### ステージング環境の設定ファイル
```javascript
// config/staging.js
module.exports = {
  // サーバー設定
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: {
      origin: ['https://staging.yourdomain.com'],
      credentials: true
    }
  },

  // データベース設定
  database: {
    path: '/var/www/brain-training-staging/database.sqlite',
    mode: 'staging',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  },

  // 認証設定
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '1h',
    sessionSecret: process.env.SESSION_SECRET,
    sessionMaxAge: 60 * 60 * 1000, // 1時間
    bcryptRounds: 12
  },

  // セキュリティ設定
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 500 // 500リクエスト
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }
  },

  // ログ設定
  logging: {
    level: 'info',
    format: 'combined',
    transports: ['file', 'syslog'],
    file: {
      filename: 'logs/staging.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }
  },

  // 監視設定
  monitoring: {
    enabled: true,
    metrics: true,
    healthCheck: true,
    alerting: true
  }
};
```

## 本番環境

### 本番環境の設定ファイル
```javascript
// config/production.js
module.exports = {
  // サーバー設定
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: {
      origin: ['https://yourdomain.com'],
      credentials: true
    },
    trustProxy: true
  },

  // データベース設定
  database: {
    path: '/var/www/brain-training/database.sqlite',
    mode: 'production',
    logging: false,
    pool: {
      max: 50,
      min: 10,
      acquire: 30000,
      idle: 10000
    },
    backup: {
      enabled: true,
      interval: '0 2 * * *', // 毎日午前2時
      retention: 30 // 30日間保持
    }
  },

  // 認証設定
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '30m',
    sessionSecret: process.env.SESSION_SECRET,
    sessionMaxAge: 30 * 60 * 1000, // 30分
    bcryptRounds: 14,
    twoFactor: {
      enabled: true,
      issuer: 'Brain Training App'
    }
  },

  // セキュリティ設定
  security: {
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 100 // 100リクエスト
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    },
    csrf: {
      enabled: true,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
      }
    }
  },

  // ログ設定
  logging: {
    level: 'warn',
    format: 'json',
    transports: ['file', 'syslog'],
    file: {
      filename: 'logs/production.log',
      maxsize: 20971520, // 20MB
      maxFiles: 20
    },
    syslog: {
      host: 'localhost',
      port: 514,
      facility: 'local0'
    }
  },

  // 監視設定
  monitoring: {
    enabled: true,
    metrics: true,
    healthCheck: true,
    alerting: true,
    apm: {
      enabled: true,
      serviceName: 'brain-training-api'
    }
  },

  // キャッシュ設定
  cache: {
    redis: {
      enabled: true,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      db: 0
    },
    memory: {
      enabled: true,
      max: 100,
      ttl: 60000 // 1分
    }
  },

  // メール設定
  email: {
    provider: 'smtp',
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  }
};
```

## 環境変数管理

### 環境変数テンプレート
```bash
# .env.template
# アプリケーション設定
NODE_ENV=development
PORT=3000
HOST=localhost

# データベース設定
DB_PATH=./database.sqlite
DB_MODE=development

# 認証設定
JWT_SECRET=your-jwt-secret-key-here
SESSION_SECRET=your-session-secret-key-here
JWT_EXPIRES_IN=30m
BCRYPT_ROUNDS=12

# セキュリティ設定
CORS_ORIGIN=http://localhost:5500
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CSRF_ENABLED=true

# ログ設定
LOG_LEVEL=info
LOG_FORMAT=combined
LOG_FILE=logs/app.log

# メール設定
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
ADMIN_EMAIL=admin@example.com

# 監視設定
MONITORING_ENABLED=true
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true

# キャッシュ設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 外部API設定
EXTERNAL_API_URL=https://api.example.com
EXTERNAL_API_KEY=your-api-key

# ファイルアップロード設定
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif
UPLOAD_PATH=./uploads

# バックアップ設定
BACKUP_ENABLED=true
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=30

# 開発ツール設定
DEBUG_MODE=false
HOT_RELOAD=false
MOCK_DATA=false
```

### 環境変数の検証
```javascript
// utils/envValidator.js
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
  PORT: Joi.number().port().default(3000),
  JWT_SECRET: Joi.string().min(32).required(),
  SESSION_SECRET: Joi.string().min(32).required(),
  DB_PATH: Joi.string().required(),
  SMTP_HOST: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_USER: Joi.string().email().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_PASS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

function validateEnv() {
  const { error, value } = envSchema.validate(process.env, {
    allowUnknown: true,
    stripUnknown: true
  });

  if (error) {
    console.error('Environment validation error:', error.details);
    process.exit(1);
  }

  return value;
}

module.exports = { validateEnv };
```

## 設定ファイル管理

### 設定ローダー
```javascript
// config/index.js
const path = require('path');
const { validateEnv } = require('../utils/envValidator');

// 環境変数の検証
const env = validateEnv();

// 基本設定
const baseConfig = {
  app: {
    name: 'Brain Training API',
    version: '1.0.0',
    description: 'Brain training game API server'
  },
  
  server: {
    port: parseInt(env.PORT) || 3000,
    host: env.HOST || 'localhost',
    trustProxy: env.NODE_ENV === 'production'
  },

  database: {
    path: env.DB_PATH,
    mode: env.DB_MODE || env.NODE_ENV,
    logging: env.NODE_ENV === 'development',
    pool: {
      max: env.NODE_ENV === 'production' ? 50 : 10,
      min: env.NODE_ENV === 'production' ? 10 : 2,
      acquire: 30000,
      idle: 10000
    }
  },

  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '30m',
    sessionSecret: env.SESSION_SECRET,
    sessionMaxAge: 30 * 60 * 1000,
    bcryptRounds: parseInt(env.BCRYPT_ROUNDS) || 12
  },

  security: {
    rateLimit: {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
      max: parseInt(env.RATE_LIMIT_MAX) || 100
    },
    cors: {
      origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : ['http://localhost:5500'],
      credentials: true
    }
  },

  logging: {
    level: env.LOG_LEVEL || 'info',
    format: env.LOG_FORMAT || 'combined',
    file: env.LOG_FILE || 'logs/app.log'
  }
};

// 環境別設定の読み込み
let envConfig = {};
try {
  const envConfigPath = path.join(__dirname, `${env.NODE_ENV}.js`);
  envConfig = require(envConfigPath);
} catch (error) {
  console.warn(`No specific config for ${env.NODE_ENV} environment`);
}

// 設定のマージ
const config = {
  ...baseConfig,
  ...envConfig,
  env: env.NODE_ENV
};

module.exports = config;
```

### 設定の動的更新
```javascript
// utils/configManager.js
const EventEmitter = require('events');

class ConfigManager extends EventEmitter {
  constructor() {
    super();
    this.config = {};
    this.watchers = new Map();
  }

  load(config) {
    this.config = config;
    this.emit('configLoaded', config);
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    
    target[lastKey] = value;
    this.emit('configChanged', { path, value });
  }

  watch(path, callback) {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, []);
    }
    this.watchers.get(path).push(callback);
  }

  unwatch(path, callback) {
    if (this.watchers.has(path)) {
      const callbacks = this.watchers.get(path);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

module.exports = new ConfigManager();
```

## パフォーマンス最適化

### 本番環境の最適化設定
```javascript
// config/optimization.js
module.exports = {
  // Node.js最適化
  node: {
    maxOldSpaceSize: 2048,
    gcInterval: 30000,
    enableSourceMaps: false
  },

  // データベース最適化
  database: {
    pragma: {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: -64000, // 64MB
      temp_store: 'MEMORY',
      mmap_size: 268435456, // 256MB
      page_size: 4096
    },
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_records_user_id ON game_records(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_records_game_id ON game_records(game_id)',
      'CREATE INDEX IF NOT EXISTS idx_records_created_at ON game_records(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires)'
    ]
  },

  // キャッシュ最適化
  cache: {
    memory: {
      max: 1000,
      ttl: 300000, // 5分
      checkPeriod: 60000 // 1分
    },
    redis: {
      maxMemory: '256mb',
      maxMemoryPolicy: 'allkeys-lru',
      save: [
        ['900', '1'],
        ['300', '10'],
        ['60', '10000']
      ]
    }
  },

  // 圧縮設定
  compression: {
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  },

  // 静的ファイル最適化
  static: {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    }
  }
};
```

### パフォーマンス監視
```javascript
// utils/performance.js
const performance = require('perf_hooks').performance;
const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  startTimer(name) {
    const timer = {
      name,
      start: performance.now(),
      end: null,
      duration: null
    };
    this.metrics.set(name, timer);
    return timer;
  }

  endTimer(name) {
    const timer = this.metrics.get(name);
    if (timer) {
      timer.end = performance.now();
      timer.duration = timer.end - timer.start;
      this.emit('timerEnd', timer);
    }
  }

  getMetrics() {
    const metrics = {};
    for (const [name, timer] of this.metrics) {
      metrics[name] = {
        duration: timer.duration,
        start: timer.start,
        end: timer.end
      };
    }
    return metrics;
  }

  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    return {
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: process.cpuUsage()
    };
  }
}

module.exports = new PerformanceMonitor();
```

この設定により、各環境に最適化された設定でアプリケーションを実行できます。 