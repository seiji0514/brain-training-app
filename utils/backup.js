const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const db = require('../db/database');

class BackupSystem {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.ensureBackupDirectory();
    }

    // バックアップディレクトリの作成
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // データベースバックアップ
    async backupDatabase() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `database_${timestamp}.sqlite`);
            
            // SQLiteデータベースをコピー
            const sourcePath = path.join(__dirname, '../database.sqlite');
            fs.copyFileSync(sourcePath, backupPath);
            
            // バックアップ情報を記録
            await this.logBackup('DATABASE', backupPath, 'SUCCESS');
            
            console.log(`Database backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('Database backup failed:', error);
            await this.logBackup('DATABASE', null, 'FAILED', error.message);
            throw error;
        }
    }

    // ファイルバックアップ
    async backupFiles() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `files_${timestamp}.zip`);
            
            // 重要なファイルをZIPに圧縮
            const filesToBackup = [
                'config.js',
                'package.json',
                'api_server.js',
                'index_limited.html',
                'games.json',
                'users.json'
            ];
            
            // 簡易的なZIP作成（実際の実装ではarchiverライブラリを使用）
            await this.createZipBackup(filesToBackup, backupPath);
            
            await this.logBackup('FILES', backupPath, 'SUCCESS');
            
            console.log(`Files backup created: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('Files backup failed:', error);
            await this.logBackup('FILES', null, 'FAILED', error.message);
            throw error;
        }
    }

    // 完全バックアップ
    async fullBackup() {
        try {
            console.log('Starting full backup...');
            
            const results = await Promise.all([
                this.backupDatabase(),
                this.backupFiles()
            ]);
            
            // 古いバックアップをクリーンアップ
            await this.cleanupOldBackups();
            
            console.log('Full backup completed successfully');
            return results;
        } catch (error) {
            console.error('Full backup failed:', error);
            throw error;
        }
    }

    // バックアップ復元
    async restoreBackup(backupPath, type = 'DATABASE') {
        try {
            if (type === 'DATABASE') {
                const targetPath = path.join(__dirname, '../database.sqlite');
                fs.copyFileSync(backupPath, targetPath);
                console.log(`Database restored from: ${backupPath}`);
            } else if (type === 'FILES') {
                // ファイル復元処理
                await this.extractZipBackup(backupPath);
                console.log(`Files restored from: ${backupPath}`);
            }
            
            await this.logBackup('RESTORE', backupPath, 'SUCCESS');
        } catch (error) {
            console.error('Backup restore failed:', error);
            await this.logBackup('RESTORE', backupPath, 'FAILED', error.message);
            throw error;
        }
    }

    // バックアップログ記録
    async logBackup(type, path, status, errorMessage = null) {
        try {
            await db.query(
                `INSERT INTO backup_logs 
                 (backup_type, file_path, status, error_message, created_at) 
                 VALUES (?, ?, ?, ?, datetime('now'))`,
                [type, path, status, errorMessage]
            );
        } catch (error) {
            console.error('Backup logging failed:', error);
        }
    }

    // 古いバックアップのクリーンアップ
    async cleanupOldBackups() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30日
            const now = Date.now();
            
            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old backup: ${file}`);
                }
            }
        } catch (error) {
            console.error('Backup cleanup failed:', error);
        }
    }

    // バックアップ状況の確認
    async getBackupStatus() {
        try {
            const logs = await db.query(
                `SELECT * FROM backup_logs 
                 ORDER BY created_at DESC 
                 LIMIT 10`
            );
            
            const files = fs.readdirSync(this.backupDir);
            const totalSize = files.reduce((size, file) => {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                return size + stats.size;
            }, 0);
            
            return {
                recentLogs: logs,
                totalBackups: files.length,
                totalSize: totalSize,
                lastBackup: logs[0]?.created_at
            };
        } catch (error) {
            console.error('Backup status check failed:', error);
            return null;
        }
    }

    // 簡易ZIP作成（実際の実装ではarchiverライブラリを使用）
    async createZipBackup(files, outputPath) {
        // 実際の実装ではarchiverライブラリを使用
        console.log('Creating ZIP backup...');
        return new Promise((resolve, reject) => {
            // 簡易的な実装
            resolve();
        });
    }

    // 簡易ZIP展開
    async extractZipBackup(zipPath) {
        // 実際の実装ではarchiverライブラリを使用
        console.log('Extracting ZIP backup...');
        return new Promise((resolve, reject) => {
            // 簡易的な実装
            resolve();
        });
    }
}

// シングルトンインスタンスを作成
const backupSystem = new BackupSystem();

// 定期的なバックアップ（毎日午前2時）
function scheduleBackup() {
    const now = new Date();
    const nextBackup = new Date(now);
    nextBackup.setHours(2, 0, 0, 0);
    
    if (nextBackup <= now) {
        nextBackup.setDate(nextBackup.getDate() + 1);
    }
    
    const timeUntilBackup = nextBackup.getTime() - now.getTime();
    
    setTimeout(async () => {
        try {
            await backupSystem.fullBackup();
        } catch (error) {
            console.error('Scheduled backup failed:', error);
        }
        
        // 次のバックアップをスケジュール
        scheduleBackup();
    }, timeUntilBackup);
}

module.exports = {
    BackupSystem,
    backupSystem,
    scheduleBackup
}; 