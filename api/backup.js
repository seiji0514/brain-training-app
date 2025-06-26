const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { checkPermission } = require('./middleware');

// データベースエクスポート（ダウンロード）
router.get('/backup', checkPermission('admin'), (req, res) => {
  const file = path.join(__dirname, '../db/database.sqlite');
  res.download(file, 'database_backup.sqlite');
});

// データベースリストア（アップロード）
router.post('/restore', checkPermission('admin'), upload.single('dbfile'), (req, res) => {
  try {
    const src = req.file.path;
    const dst = path.join(__dirname, '../db/database.sqlite');
    // 既存DBをバックアップ
    const backupName = 'restore_backup_' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15) + '.sqlite';
    const backupPath = path.join(__dirname, '../db/', backupName);
    if (fs.existsSync(dst)) {
      fs.copyFileSync(dst, backupPath);
    }
    fs.copyFileSync(src, dst);
    fs.unlinkSync(src); // 一時ファイル削除
    res.json({ message: 'リストア完了。サーバー再起動が必要です。' });
  } catch (err) {
    res.status(500).json({ error: 'リストアに失敗しました', details: err.message });
  }
});

// 古いバックアップの自動整理（7日より古いものを削除）
router.post('/cleanup-backups', checkPermission('admin'), (req, res) => {
  const dir = path.join(__dirname, '../db');
  const files = fs.readdirSync(dir);
  const now = Date.now();
  let deleted = 0;
  files.forEach(file => {
    if (file.startsWith('backup_') && file.endsWith('.sqlite')) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 7 * 24 * 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    }
  });
  res.json({ message: `${deleted} 件の古いバックアップを削除しました。` });
});

module.exports = router; 