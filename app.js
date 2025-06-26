const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 3000;

// HTTPS用証明書・秘密鍵の読み込み
const key = fs.readFileSync(path.join(__dirname, 'server.key'));
const cert = fs.readFileSync(path.join(__dirname, 'server.cert'));

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// APIルート
app.use('/api/auth', require('./api/auth'));
app.use('/api/backup', require('./api/backup'));

// 静的ファイル（HTMLなど）
app.use(express.static(path.join(__dirname)));

https.createServer({ key, cert }, app).listen(PORT, () => {
  console.log(`HTTPS Server started on https://localhost:${PORT}`);
}); 