/**
 * キャッシュ管理システム
 * メモリキャッシュ、Redisキャッシュ、CDNキャッシュを統合管理
 */

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: 0
        };
        
        this.config = {
            maxSize: 1000, // 最大キャッシュエントリ数
            defaultTTL: 300000, // 5分
            cleanupInterval: 60000, // 1分
            compressionThreshold: 1024, // 1KB以上で圧縮
            enableCompression: true,
            enableStats: true,
            cacheLevels: {
                L1: 'memory', // メモリキャッシュ
                L2: 'redis',  // Redisキャッシュ
                L3: 'cdn'     // CDNキャッシュ
            }
        };

        this.redisClient = null;
        this.compressionWorker = null;
        this.cleanupTimer = null;
        
        this.initializeCache();
    }

    /**
     * キャッシュを初期化
     */
    async initializeCache() {
        // クリーンアップタイマーを開始
        this.startCleanupTimer();
        
        // Redis接続を初期化（利用可能な場合）
        await this.initializeRedis();
        
        // 圧縮ワーカーを初期化
        this.initializeCompressionWorker();
        
        console.log('Cache manager initialized');
    }

    /**
     * Redis接続を初期化
     */
    async initializeRedis() {
        try {
            // Redisクライアントの初期化（実際の実装ではredisライブラリを使用）
            this.redisClient = {
                get: async (key) => {
                    // Redisからの取得をシミュレート
                    return null;
                },
                set: async (key, value, ttl) => {
                    // Redisへの保存をシミュレート
                    return true;
                },
                del: async (key) => {
                    // Redisからの削除をシミュレート
                    return true;
                },
                exists: async (key) => {
                    // Redisでの存在確認をシミュレート
                    return false;
                }
            };
            
            console.log('Redis connection initialized');
        } catch (error) {
            console.warn('Redis connection failed, using memory cache only:', error);
            this.redisClient = null;
        }
    }

    /**
     * 圧縮ワーカーを初期化
     */
    initializeCompressionWorker() {
        if (this.config.enableCompression && typeof Worker !== 'undefined') {
            try {
                this.compressionWorker = new Worker('compression-worker.js');
                this.compressionWorker.onmessage = (event) => {
                    const { id, compressedData } = event.data;
                    this.handleCompressionResult(id, compressedData);
                };
            } catch (error) {
                console.warn('Compression worker initialization failed:', error);
                this.compressionWorker = null;
            }
        }
    }

    /**
     * データをキャッシュに保存
     */
    async set(key, value, options = {}) {
        const ttl = options.ttl || this.config.defaultTTL;
        const level = options.level || 'L1';
        const compress = options.compress !== undefined ? options.compress : this.shouldCompress(value);
        
        try {
            // データを準備
            let dataToCache = value;
            let isCompressed = false;
            
            if (compress && this.config.enableCompression) {
                dataToCache = await this.compressData(value);
                isCompressed = true;
            }
            
            const cacheEntry = {
                value: dataToCache,
                timestamp: Date.now(),
                ttl: ttl,
                compressed: isCompressed,
                accessCount: 0,
                lastAccessed: Date.now()
            };

            // レベルに応じてキャッシュに保存
            switch (level) {
                case 'L1':
                    await this.setL1Cache(key, cacheEntry);
                    break;
                case 'L2':
                    await this.setL2Cache(key, cacheEntry);
                    break;
                case 'L3':
                    await this.setL3Cache(key, cacheEntry);
                    break;
                default:
                    await this.setL1Cache(key, cacheEntry);
            }

            this.updateStats('sets');
            return true;
            
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * データをキャッシュから取得
     */
    async get(key, options = {}) {
        const level = options.level || 'L1';
        const fallback = options.fallback !== undefined ? options.fallback : true;
        
        try {
            let cacheEntry = null;
            
            // レベルに応じてキャッシュから取得
            switch (level) {
                case 'L1':
                    cacheEntry = await this.getL1Cache(key);
                    break;
                case 'L2':
                    cacheEntry = await this.getL2Cache(key);
                    break;
                case 'L3':
                    cacheEntry = await this.getL3Cache(key);
                    break;
                default:
                    cacheEntry = await this.getL1Cache(key);
            }

            if (cacheEntry && !this.isExpired(cacheEntry)) {
                // キャッシュヒット
                this.updateCacheEntry(cacheEntry);
                this.updateStats('hits');
                
                // データを解凍
                let value = cacheEntry.value;
                if (cacheEntry.compressed) {
                    value = await this.decompressData(value);
                }
                
                return value;
            } else {
                // キャッシュミス
                this.updateStats('misses');
                
                if (fallback && level !== 'L1') {
                    // 下位レベルから取得を試行
                    return await this.get(key, { level: this.getLowerLevel(level), fallback: true });
                }
                
                return null;
            }
            
        } catch (error) {
            console.error('Cache get error:', error);
            this.updateStats('misses');
            return null;
        }
    }

    /**
     * データをキャッシュから削除
     */
    async delete(key, options = {}) {
        const level = options.level || 'all';
        
        try {
            switch (level) {
                case 'L1':
                    await this.deleteL1Cache(key);
                    break;
                case 'L2':
                    await this.deleteL2Cache(key);
                    break;
                case 'L3':
                    await this.deleteL3Cache(key);
                    break;
                case 'all':
                    await Promise.all([
                        this.deleteL1Cache(key),
                        this.deleteL2Cache(key),
                        this.deleteL3Cache(key)
                    ]);
                    break;
            }
            
            this.updateStats('deletes');
            return true;
            
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    /**
     * キャッシュの存在確認
     */
    async exists(key, options = {}) {
        const level = options.level || 'L1';
        
        try {
            let exists = false;
            
            switch (level) {
                case 'L1':
                    exists = this.memoryCache.has(key);
                    break;
                case 'L2':
                    exists = await this.redisClient?.exists(key) || false;
                    break;
                case 'L3':
                    exists = await this.checkCDNCache(key);
                    break;
            }
            
            return exists;
            
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }

    /**
     * キャッシュをクリア
     */
    async clear(options = {}) {
        const level = options.level || 'all';
        
        try {
            switch (level) {
                case 'L1':
                    this.memoryCache.clear();
                    this.cacheStats.size = 0;
                    break;
                case 'L2':
                    if (this.redisClient) {
                        await this.redisClient.del('*');
                    }
                    break;
                case 'L3':
                    await this.clearCDNCache();
                    break;
                case 'all':
                    this.memoryCache.clear();
                    this.cacheStats.size = 0;
                    if (this.redisClient) {
                        await this.redisClient.del('*');
                    }
                    await this.clearCDNCache();
                    break;
            }
            
            console.log(`Cache cleared: ${level}`);
            return true;
            
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * L1キャッシュ（メモリ）の操作
     */
    async setL1Cache(key, cacheEntry) {
        // キャッシュサイズ制限をチェック
        if (this.memoryCache.size >= this.config.maxSize) {
            this.evictL1Cache();
        }
        
        this.memoryCache.set(key, cacheEntry);
        this.cacheStats.size = this.memoryCache.size;
    }

    async getL1Cache(key) {
        return this.memoryCache.get(key);
    }

    async deleteL1Cache(key) {
        const deleted = this.memoryCache.delete(key);
        if (deleted) {
            this.cacheStats.size = this.memoryCache.size;
        }
        return deleted;
    }

    /**
     * L2キャッシュ（Redis）の操作
     */
    async setL2Cache(key, cacheEntry) {
        if (!this.redisClient) return false;
        
        const serialized = JSON.stringify(cacheEntry);
        return await this.redisClient.set(key, serialized, cacheEntry.ttl / 1000);
    }

    async getL2Cache(key) {
        if (!this.redisClient) return null;
        
        const serialized = await this.redisClient.get(key);
        return serialized ? JSON.parse(serialized) : null;
    }

    async deleteL2Cache(key) {
        if (!this.redisClient) return false;
        
        return await this.redisClient.del(key);
    }

    /**
     * L3キャッシュ（CDN）の操作
     */
    async setL3Cache(key, cacheEntry) {
        // CDNキャッシュの実装（実際のCDN APIを使用）
        try {
            const url = this.generateCDNUrl(key);
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': `max-age=${cacheEntry.ttl / 1000}`
                },
                body: JSON.stringify(cacheEntry)
            });
            
            return response.ok;
        } catch (error) {
            console.error('CDN cache set error:', error);
            return false;
        }
    }

    async getL3Cache(key) {
        try {
            const url = this.generateCDNUrl(key);
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                return data;
            }
            
            return null;
        } catch (error) {
            console.error('CDN cache get error:', error);
            return null;
        }
    }

    async deleteL3Cache(key) {
        try {
            const url = this.generateCDNUrl(key);
            const response = await fetch(url, { method: 'DELETE' });
            
            return response.ok;
        } catch (error) {
            console.error('CDN cache delete error:', error);
            return false;
        }
    }

    async checkCDNCache(key) {
        try {
            const url = this.generateCDNUrl(key);
            const response = await fetch(url, { method: 'HEAD' });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async clearCDNCache() {
        // CDN全体のクリア（実際の実装ではCDN APIを使用）
        console.log('CDN cache cleared');
        return true;
    }

    /**
     * データ圧縮
     */
    async compressData(data) {
        if (!this.config.enableCompression) {
            return data;
        }

        if (this.compressionWorker) {
            return new Promise((resolve, reject) => {
                const id = Date.now() + Math.random();
                
                const timeout = setTimeout(() => {
                    reject(new Error('Compression timeout'));
                }, 5000);
                
                this.compressionWorker.onmessage = (event) => {
                    if (event.data.id === id) {
                        clearTimeout(timeout);
                        resolve(event.data.compressedData);
                    }
                };
                
                this.compressionWorker.postMessage({
                    id: id,
                    action: 'compress',
                    data: data
                });
            });
        } else {
            // フォールバック: 簡易圧縮
            return this.simpleCompress(data);
        }
    }

    /**
     * データ解凍
     */
    async decompressData(compressedData) {
        if (this.compressionWorker) {
            return new Promise((resolve, reject) => {
                const id = Date.now() + Math.random();
                
                const timeout = setTimeout(() => {
                    reject(new Error('Decompression timeout'));
                }, 5000);
                
                this.compressionWorker.onmessage = (event) => {
                    if (event.data.id === id) {
                        clearTimeout(timeout);
                        resolve(event.data.decompressedData);
                    }
                };
                
                this.compressionWorker.postMessage({
                    id: id,
                    action: 'decompress',
                    data: compressedData
                });
            });
        } else {
            // フォールバック: 簡易解凍
            return this.simpleDecompress(compressedData);
        }
    }

    /**
     * 簡易圧縮
     */
    simpleCompress(data) {
        const stringData = JSON.stringify(data);
        return btoa(stringData);
    }

    /**
     * 簡易解凍
     */
    simpleDecompress(compressedData) {
        const stringData = atob(compressedData);
        return JSON.parse(stringData);
    }

    /**
     * 圧縮結果を処理
     */
    handleCompressionResult(id, compressedData) {
        // 圧縮ワーカーからの結果を処理
        console.log('Compression completed:', id);
    }

    /**
     * 圧縮が必要かどうかを判定
     */
    shouldCompress(data) {
        if (!this.config.enableCompression) {
            return false;
        }
        
        const dataSize = JSON.stringify(data).length;
        return dataSize > this.config.compressionThreshold;
    }

    /**
     * キャッシュエントリが期限切れかどうかをチェック
     */
    isExpired(cacheEntry) {
        return Date.now() - cacheEntry.timestamp > cacheEntry.ttl;
    }

    /**
     * キャッシュエントリを更新
     */
    updateCacheEntry(cacheEntry) {
        cacheEntry.accessCount++;
        cacheEntry.lastAccessed = Date.now();
    }

    /**
     * L1キャッシュのエビクション
     */
    evictL1Cache() {
        // LRU（Least Recently Used）アルゴリズム
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.memoryCache) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
        }
    }

    /**
     * 下位レベルを取得
     */
    getLowerLevel(level) {
        const levels = ['L1', 'L2', 'L3'];
        const currentIndex = levels.indexOf(level);
        return currentIndex > 0 ? levels[currentIndex - 1] : 'L1';
    }

    /**
     * CDN URLを生成
     */
    generateCDNUrl(key) {
        // 実際のCDN URL生成ロジック
        return `https://cdn.example.com/cache/${key}`;
    }

    /**
     * 統計情報を更新
     */
    updateStats(operation) {
        if (this.config.enableStats) {
            this.cacheStats[operation]++;
        }
    }

    /**
     * キャッシュ統計を取得
     */
    getStats() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
            ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
            : 0;
        
        return {
            ...this.cacheStats,
            hitRate: hitRate,
            memoryUsage: this.memoryCache.size,
            maxSize: this.config.maxSize
        };
    }

    /**
     * クリーンアップタイマーを開始
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.config.cleanupInterval);
    }

    /**
     * 期限切れエントリをクリーンアップ
     */
    cleanupExpiredEntries() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, entry] of this.memoryCache) {
            if (this.isExpired(entry)) {
                this.memoryCache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            this.cacheStats.size = this.memoryCache.size;
            console.log(`Cleaned up ${cleanedCount} expired cache entries`);
        }
    }

    /**
     * キャッシュマネージャーを破棄
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        if (this.compressionWorker) {
            this.compressionWorker.terminate();
        }
        
        this.memoryCache.clear();
        this.redisClient = null;
        
        console.log('Cache manager destroyed');
    }

    /**
     * キャッシュ設定を更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * キャッシュパフォーマンスレポートを生成
     */
    generatePerformanceReport() {
        const stats = this.getStats();
        const report = {
            timestamp: Date.now(),
            stats: stats,
            recommendations: this.generateRecommendations(stats)
        };

        return report;
    }

    /**
     * パフォーマンス改善推奨事項を生成
     */
    generateRecommendations(stats) {
        const recommendations = [];
        
        if (stats.hitRate < 0.8) {
            recommendations.push({
                type: 'hit_rate',
                priority: 'high',
                description: 'キャッシュヒット率が低いため、キャッシュサイズの増加またはTTLの調整を検討してください'
            });
        }
        
        if (stats.memoryUsage / stats.maxSize > 0.9) {
            recommendations.push({
                type: 'memory_usage',
                priority: 'medium',
                description: 'メモリキャッシュの使用率が高いため、キャッシュサイズの増加を検討してください'
            });
        }
        
        return recommendations;
    }
}

// グローバルインスタンスを作成
window.cacheManager = new CacheManager();

// モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CacheManager;
} 