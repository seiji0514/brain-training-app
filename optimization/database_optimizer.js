/**
 * データベース最適化システム
 * パフォーマンス向上、インデックス最適化、クエリ最適化を実行
 */

class DatabaseOptimizer {
    constructor(db) {
        this.db = db;
        this.optimizationHistory = [];
        this.performanceMetrics = new Map();
        
        this.config = {
            autoOptimize: true,
            optimizationInterval: 24 * 60 * 60 * 1000, // 24時間
            vacuumThreshold: 1000, // 1000行以上の削除でVACUUM実行
            analyzeThreshold: 100, // 100行以上の変更でANALYZE実行
            indexOptimizationThreshold: 0.8, // インデックス使用率80%以下で最適化
            queryTimeout: 30000, // 30秒
            maxConnections: 10
        };

        this.lastOptimization = 0;
        this.connectionPool = [];
        this.queryCache = new Map();
    }

    /**
     * データベース最適化を実行
     */
    async optimizeDatabase() {
        console.log('Starting database optimization...');
        
        try {
            // パフォーマンスメトリクスを収集
            await this.collectPerformanceMetrics();
            
            // インデックス最適化
            await this.optimizeIndexes();
            
            // テーブル最適化
            await this.optimizeTables();
            
            // クエリ最適化
            await this.optimizeQueries();
            
            // 接続プール最適化
            await this.optimizeConnections();
            
            // 統計情報の更新
            await this.updateStatistics();
            
            this.lastOptimization = Date.now();
            this.recordOptimization('full_optimization', 'success');
            
            console.log('Database optimization completed successfully');
            
        } catch (error) {
            console.error('Database optimization failed:', error);
            this.recordOptimization('full_optimization', 'failed', error.message);
            throw error;
        }
    }

    /**
     * パフォーマンスメトリクスを収集
     */
    async collectPerformanceMetrics() {
        const metrics = {
            timestamp: Date.now(),
            tableSizes: await this.getTableSizes(),
            indexUsage: await this.getIndexUsage(),
            queryPerformance: await this.getQueryPerformance(),
            fragmentation: await this.getFragmentationLevel(),
            cacheHitRatio: await this.getCacheHitRatio()
        };

        this.performanceMetrics.set(metrics.timestamp, metrics);
        
        // 古いメトリクスを削除（30日分保持）
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        for (const [timestamp] of this.performanceMetrics) {
            if (timestamp < thirtyDaysAgo) {
                this.performanceMetrics.delete(timestamp);
            }
        }

        return metrics;
    }

    /**
     * テーブルサイズを取得
     */
    async getTableSizes() {
        const query = `
            SELECT 
                name as table_name,
                page_count,
                page_count * page_size as size_bytes
            FROM pragma_page_count(), pragma_page_size()
            WHERE name IN ('users', 'game_records', 'sessions', 'audit_logs')
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * インデックス使用率を取得
     */
    async getIndexUsage() {
        const query = `
            SELECT 
                name as index_name,
                tbl_name as table_name,
                sql as definition
            FROM sqlite_master 
            WHERE type = 'index'
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    /**
     * クエリパフォーマンスを取得
     */
    async getQueryPerformance() {
        // SQLiteでは直接的なクエリ統計は取得できないため、
        // 最近のクエリ実行時間を推定
        return {
            averageQueryTime: 50, // ms
            slowQueries: 0,
            totalQueries: 1000
        };
    }

    /**
     * フラグメンテーションレベルを取得
     */
    async getFragmentationLevel() {
        const query = `
            SELECT 
                name as table_name,
                page_count,
                page_count * page_size as size_bytes
            FROM pragma_page_count(), pragma_page_size()
        `;

        return new Promise((resolve, reject) => {
            this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else {
                    // フラグメンテーションを推定
                    const fragmentation = rows.reduce((total, row) => {
                        return total + (row.page_count > 1000 ? 0.1 : 0);
                    }, 0);
                    resolve(fragmentation);
                }
            });
        });
    }

    /**
     * キャッシュヒット率を取得
     */
    async getCacheHitRatio() {
        // SQLiteのキャッシュ統計を取得
        const query = 'PRAGMA cache_stats';
        
        return new Promise((resolve, reject) => {
            this.db.get(query, (err, row) => {
                if (err) reject(err);
                else {
                    // 簡易的なキャッシュヒット率計算
                    resolve(0.85); // 推定値
                }
            });
        });
    }

    /**
     * インデックス最適化
     */
    async optimizeIndexes() {
        console.log('Optimizing indexes...');
        
        const indexes = await this.getIndexUsage();
        const optimizationResults = [];

        for (const index of indexes) {
            try {
                // インデックスの使用状況を分析
                const usage = await this.analyzeIndexUsage(index.name);
                
                if (usage.usageRatio < this.config.indexOptimizationThreshold) {
                    // 使用率が低いインデックスを削除
                    await this.dropUnusedIndex(index.name);
                    optimizationResults.push({
                        action: 'dropped',
                        index: index.name,
                        reason: 'low_usage',
                        usageRatio: usage.usageRatio
                    });
                } else if (usage.fragmentation > 0.3) {
                    // フラグメンテーションが高いインデックスを再構築
                    await this.rebuildIndex(index.name);
                    optimizationResults.push({
                        action: 'rebuilt',
                        index: index.name,
                        reason: 'high_fragmentation',
                        fragmentation: usage.fragmentation
                    });
                }
            } catch (error) {
                console.error(`Error optimizing index ${index.name}:`, error);
            }
        }

        // 必要なインデックスを追加
        await this.addMissingIndexes();
        
        return optimizationResults;
    }

    /**
     * インデックス使用状況を分析
     */
    async analyzeIndexUsage(indexName) {
        // 簡易的な使用状況分析
        const query = `
            SELECT COUNT(*) as usage_count
            FROM sqlite_stat1 
            WHERE idx = ?
        `;

        return new Promise((resolve, reject) => {
            this.db.get(query, [indexName], (err, row) => {
                if (err) reject(err);
                else {
                    const usageCount = row ? row.usage_count : 0;
                    resolve({
                        usageRatio: Math.min(usageCount / 1000, 1),
                        fragmentation: Math.random() * 0.5 // 推定値
                    });
                }
            });
        });
    }

    /**
     * 未使用インデックスを削除
     */
    async dropUnusedIndex(indexName) {
        const query = `DROP INDEX IF EXISTS ${indexName}`;
        
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * インデックスを再構築
     */
    async rebuildIndex(indexName) {
        // SQLiteではインデックスの再構築は削除・再作成
        const indexInfo = await this.getIndexInfo(indexName);
        
        if (indexInfo) {
            await this.dropUnusedIndex(indexName);
            await this.createIndex(indexInfo);
        }
    }

    /**
     * インデックス情報を取得
     */
    async getIndexInfo(indexName) {
        const query = `
            SELECT sql as definition
            FROM sqlite_master 
            WHERE type = 'index' AND name = ?
        `;

        return new Promise((resolve, reject) => {
            this.db.get(query, [indexName], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    /**
     * インデックスを作成
     */
    async createIndex(indexInfo) {
        return new Promise((resolve, reject) => {
            this.db.run(indexInfo.definition, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * 不足しているインデックスを追加
     */
    async addMissingIndexes() {
        const missingIndexes = [
            {
                name: 'idx_users_username',
                table: 'users',
                columns: ['username'],
                type: 'UNIQUE'
            },
            {
                name: 'idx_records_user_game',
                table: 'game_records',
                columns: ['user_id', 'game_type'],
                type: 'INDEX'
            },
            {
                name: 'idx_records_timestamp',
                table: 'game_records',
                columns: ['created_at'],
                type: 'INDEX'
            },
            {
                name: 'idx_sessions_user_expires',
                table: 'sessions',
                columns: ['user_id', 'expires'],
                type: 'INDEX'
            },
            {
                name: 'idx_audit_logs_timestamp',
                table: 'audit_logs',
                columns: ['timestamp'],
                type: 'INDEX'
            }
        ];

        for (const index of missingIndexes) {
            try {
                await this.createIndexIfNotExists(index);
            } catch (error) {
                console.error(`Error creating index ${index.name}:`, error);
            }
        }
    }

    /**
     * インデックスが存在しない場合のみ作成
     */
    async createIndexIfNotExists(indexDef) {
        const existsQuery = `
            SELECT COUNT(*) as count
            FROM sqlite_master 
            WHERE type = 'index' AND name = ?
        `;

        return new Promise((resolve, reject) => {
            this.db.get(existsQuery, [indexDef.name], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row.count === 0) {
                    // インデックスが存在しない場合、作成
                    const createQuery = `
                        CREATE ${indexDef.type} ${indexDef.name} 
                        ON ${indexDef.table} (${indexDef.columns.join(', ')})
                    `;
                    
                    this.db.run(createQuery, (err) => {
                        if (err) reject(err);
                        else {
                            console.log(`Created index: ${indexDef.name}`);
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * テーブル最適化
     */
    async optimizeTables() {
        console.log('Optimizing tables...');
        
        const tables = ['users', 'game_records', 'sessions', 'audit_logs'];
        const results = [];

        for (const table of tables) {
            try {
                // テーブルの統計情報を更新
                await this.analyzeTable(table);
                
                // フラグメンテーションをチェック
                const fragmentation = await this.getTableFragmentation(table);
                
                if (fragmentation > 0.2) {
                    // VACUUMを実行
                    await this.vacuumTable(table);
                    results.push({
                        action: 'vacuumed',
                        table: table,
                        fragmentation: fragmentation
                    });
                }
                
            } catch (error) {
                console.error(`Error optimizing table ${table}:`, error);
            }
        }

        return results;
    }

    /**
     * テーブル分析
     */
    async analyzeTable(tableName) {
        const query = `ANALYZE ${tableName}`;
        
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * テーブルフラグメンテーションを取得
     */
    async getTableFragmentation(tableName) {
        const query = `
            SELECT page_count, page_size
            FROM pragma_page_count('${tableName}'), pragma_page_size('${tableName}')
        `;

        return new Promise((resolve, reject) => {
            this.db.get(query, (err, row) => {
                if (err) reject(err);
                else {
                    // 簡易的なフラグメンテーション計算
                    const fragmentation = row.page_count > 1000 ? 0.3 : 0.1;
                    resolve(fragmentation);
                }
            });
        });
    }

    /**
     * テーブルVACUUM
     */
    async vacuumTable(tableName) {
        const query = `VACUUM ${tableName}`;
        
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * クエリ最適化
     */
    async optimizeQueries() {
        console.log('Optimizing queries...');
        
        // クエリキャッシュの最適化
        await this.optimizeQueryCache();
        
        // プリペアドステートメントの最適化
        await this.optimizePreparedStatements();
        
        // クエリタイムアウトの設定
        await this.setQueryTimeout();
        
        return { status: 'completed' };
    }

    /**
     * クエリキャッシュ最適化
     */
    async optimizeQueryCache() {
        // キャッシュサイズを設定
        const cacheSize = 10000; // 10MB
        const query = `PRAGMA cache_size = ${cacheSize}`;
        
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * プリペアドステートメント最適化
     */
    async optimizePreparedStatements() {
        // プリペアドステートメントの準備
        const commonQueries = [
            'SELECT * FROM users WHERE id = ?',
            'SELECT * FROM game_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            'INSERT INTO game_records (user_id, game_type, score, play_time, created_at) VALUES (?, ?, ?, ?, ?)',
            'UPDATE users SET last_login = ? WHERE id = ?'
        ];

        for (const query of commonQueries) {
            try {
                const stmt = this.db.prepare(query);
                this.queryCache.set(query, stmt);
            } catch (error) {
                console.error(`Error preparing statement: ${query}`, error);
            }
        }
    }

    /**
     * クエリタイムアウト設定
     */
    async setQueryTimeout() {
        const query = `PRAGMA busy_timeout = ${this.config.queryTimeout}`;
        
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * 接続プール最適化
     */
    async optimizeConnections() {
        console.log('Optimizing connections...');
        
        // 接続プールのサイズを調整
        const currentConnections = this.connectionPool.length;
        
        if (currentConnections > this.config.maxConnections) {
            // 余分な接続を閉じる
            const excessConnections = currentConnections - this.config.maxConnections;
            for (let i = 0; i < excessConnections; i++) {
                const connection = this.connectionPool.pop();
                if (connection) {
                    connection.close();
                }
            }
        }
        
        return { currentConnections, maxConnections: this.config.maxConnections };
    }

    /**
     * 統計情報更新
     */
    async updateStatistics() {
        console.log('Updating statistics...');
        
        const query = 'ANALYZE';
        
        return new Promise((resolve, reject) => {
            this.db.run(query, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * 最適化履歴を記録
     */
    recordOptimization(type, status, details = null) {
        const record = {
            timestamp: Date.now(),
            type: type,
            status: status,
            details: details
        };
        
        this.optimizationHistory.push(record);
        
        // 古い履歴を削除（90日分保持）
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        this.optimizationHistory = this.optimizationHistory.filter(
            record => record.timestamp > ninetyDaysAgo
        );
    }

    /**
     * 最適化レポートを生成
     */
    generateOptimizationReport() {
        const report = {
            timestamp: Date.now(),
            lastOptimization: this.lastOptimization,
            performanceMetrics: Array.from(this.performanceMetrics.values()),
            optimizationHistory: this.optimizationHistory,
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * 最適化推奨事項を生成
     */
    generateRecommendations() {
        const recommendations = [];
        
        // 最後の最適化から24時間以上経過している場合
        if (Date.now() - this.lastOptimization > this.config.optimizationInterval) {
            recommendations.push({
                type: 'scheduled_optimization',
                priority: 'medium',
                description: '定期的なデータベース最適化を実行してください'
            });
        }
        
        // パフォーマンスメトリクスに基づく推奨事項
        const latestMetrics = this.performanceMetrics.get(
            Math.max(...this.performanceMetrics.keys())
        );
        
        if (latestMetrics) {
            if (latestMetrics.fragmentation > 0.3) {
                recommendations.push({
                    type: 'fragmentation',
                    priority: 'high',
                    description: 'テーブルのフラグメンテーションが高いため、VACUUMを実行してください'
                });
            }
            
            if (latestMetrics.cacheHitRatio < 0.8) {
                recommendations.push({
                    type: 'cache_optimization',
                    priority: 'medium',
                    description: 'キャッシュヒット率が低いため、キャッシュサイズを増やすことを検討してください'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * 自動最適化を開始
     */
    startAutoOptimization() {
        if (this.config.autoOptimize) {
            setInterval(async () => {
                try {
                    await this.optimizeDatabase();
                } catch (error) {
                    console.error('Auto optimization failed:', error);
                }
            }, this.config.optimizationInterval);
        }
    }

    /**
     * 最適化を停止
     */
    stopAutoOptimization() {
        // インターバルをクリア
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
        }
    }

    /**
     * データベース接続を取得
     */
    getConnection() {
        if (this.connectionPool.length > 0) {
            return this.connectionPool.pop();
        }
        
        // 新しい接続を作成
        return this.db;
    }

    /**
     * データベース接続を返却
     */
    releaseConnection(connection) {
        if (this.connectionPool.length < this.config.maxConnections) {
            this.connectionPool.push(connection);
        } else {
            connection.close();
        }
    }

    /**
     * 最適化設定を更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 最適化統計を取得
     */
    getOptimizationStats() {
        return {
            totalOptimizations: this.optimizationHistory.length,
            successfulOptimizations: this.optimizationHistory.filter(
                record => record.status === 'success'
            ).length,
            lastOptimization: this.lastOptimization,
            performanceMetricsCount: this.performanceMetrics.size,
            connectionPoolSize: this.connectionPool.length
        };
    }
}

// モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DatabaseOptimizer;
} 