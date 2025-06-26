// テスト用の環境変数を設定
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-secret-key';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.DB_PATH = './test-database.sqlite';

// テスト用のデータベースを初期化
const fs = require('fs');
const path = require('path');

// テスト用データベースファイルが存在する場合は削除
const testDbPath = path.join(__dirname, '..', 'test-database.sqlite');
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

// テスト用のセッションファイルが存在する場合は削除
const testSessionPath = path.join(__dirname, '..', 'db', 'test-sessions.db');
if (fs.existsSync(testSessionPath)) {
  fs.unlinkSync(testSessionPath);
}

// グローバルテストタイムアウトを設定
jest.setTimeout(30000);

// モック設定
global.console = {
  ...console,
  // テスト中のログ出力を抑制
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}; 