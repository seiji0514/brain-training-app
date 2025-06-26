const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const authRouter = require('./api/auth');
const { createUsageLoggerMiddleware, createUsageLoggerRouter } = require('./server_usage_logger');

const app = express();

// CORS設定
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  credentials: true
}));

app.use(express.json());

// 利用履歴記録ミドルウェアを追加
app.use(createUsageLoggerMiddleware());

// 利用履歴記録APIルーターを追加
app.use('/api/usage', createUsageLoggerRouter());

// APIルートを先に定義
app.get('/api/games', (req, res) => {
  const filePath = path.join(__dirname, 'games.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error');
    // 配列形式で返す
    const obj = JSON.parse(data);
    const arr = Object.entries(obj).map(([id, v]) => ({ id, ...v }));
    res.json(arr);
  });
});

app.get('/api/progress', (req, res) => {
  const filePath = path.join(__dirname, 'progress.json');
  console.log('progress.json path:', filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error');
    res.json(JSON.parse(data));
  });
});

app.get('/api/notices', (req, res) => {
  const filePath = path.join(__dirname, 'notices.json');
  console.log('notices.json path:', filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error');
    res.json(JSON.parse(data));
  });
});

app.get('/api/backup', (req, res) => {
  const filePath = path.join(__dirname, 'backup.json');
  console.log('backup.json path:', filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error');
    res.json(JSON.parse(data));
  });
});

app.get('/api/games/:id', (req, res) => {
  const gamesPath = path.join(__dirname, 'games.json');
  fs.readFile(gamesPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error');
    let games = JSON.parse(data);
    let game;
    if (Array.isArray(games)) {
      game = games.find(g => g.id === req.params.id);
    } else {
      game = games[req.params.id];
      if (game) game = { id: req.params.id, ...game };
    }
    if (game) {
      res.json(game);
    } else {
      res.status(404).send('Not found');
    }
  });
});

// 利用履歴統計API
app.get('/api/usage-stats', async (req, res) => {
  try {
    const stats = await req.usageLogger.getStatistics();
    res.json({ success: true, statistics: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// データベースバックアップAPI
app.post('/api/backup-database', async (req, res) => {
  try {
    const backupPath = await req.usageLogger.backupDatabase();
    res.json({ success: true, backupPath });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// セッションクリーンアップAPI
app.post('/api/cleanup-sessions', async (req, res) => {
  try {
    const cleanedCount = await req.usageLogger.cleanupExpiredSessions();
    res.json({ success: true, cleanedCount });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 静的ファイル配信はversion2フォルダ直下
app.use(express.static(path.join(__dirname)));
// ルートアクセス時は game_admin.html を返す
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'game_admin.html'));
});

app.use('/api', authRouter);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log('利用履歴記録機能が有効化されました');
}); 