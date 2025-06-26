/**
 * ロードバランシングシステム
 * 複数サーバー間での負荷分散、ヘルスチェック、フェイルオーバーを管理
 */

class LoadBalancer {
    constructor() {
        this.servers = new Map();
        this.healthChecks = new Map();
        this.routingAlgorithms = {
            roundRobin: this.roundRobin.bind(this),
            leastConnections: this.leastConnections.bind(this),
            weightedRoundRobin: this.weightedRoundRobin.bind(this),
            ipHash: this.ipHash.bind(this),
            leastResponseTime: this.leastResponseTime.bind(this)
        };
        
        this.config = {
            algorithm: 'roundRobin',
            healthCheckInterval: 30000, // 30秒
            healthCheckTimeout: 5000,   // 5秒
            maxRetries: 3,
            retryDelay: 1000,           // 1秒
            sessionAffinity: true,
            stickySessionTimeout: 300000, // 5分
            circuitBreaker: {
                enabled: true,
                failureThreshold: 5,
                recoveryTimeout: 60000,  // 1分
                halfOpenMaxRequests: 3
            }
        };

        this.currentIndex = 0;
        this.sessionMap = new Map();
        this.circuitBreakers = new Map();
        this.healthCheckTimer = null;
        
        this.initializeLoadBalancer();
    }

    /**
     * ロードバランサーを初期化
     */
    initializeLoadBalancer() {
        // デフォルトサーバーを追加
        this.addServer({
            id: 'server-1',
            host: 'localhost',
            port: 3000,
            weight: 1,
            maxConnections: 100,
            healthCheckPath: '/health'
        });

        // ヘルスチェックを開始
        this.startHealthChecks();
        
        console.log('Load balancer initialized');
    }

    /**
     * サーバーを追加
     */
    addServer(serverConfig) {
        const server = {
            id: serverConfig.id,
            host: serverConfig.host,
            port: serverConfig.port,
            weight: serverConfig.weight || 1,
            maxConnections: serverConfig.maxConnections || 100,
            currentConnections: 0,
            healthCheckPath: serverConfig.healthCheckPath || '/health',
            status: 'healthy',
            lastHealthCheck: Date.now(),
            responseTime: 0,
            errorCount: 0,
            successCount: 0,
            uptime: Date.now()
        };

        this.servers.set(server.id, server);
        this.circuitBreakers.set(server.id, this.createCircuitBreaker());
        
        console.log(`Server added: ${server.id} (${server.host}:${server.port})`);
        
        return server.id;
    }

    /**
     * サーバーを削除
     */
    removeServer(serverId) {
        const server = this.servers.get(serverId);
        if (server) {
            this.servers.delete(serverId);
            this.circuitBreakers.delete(serverId);
            this.sessionMap.delete(serverId);
            
            console.log(`Server removed: ${serverId}`);
            return true;
        }
        return false;
    }

    /**
     * サーバーを更新
     */
    updateServer(serverId, updates) {
        const server = this.servers.get(serverId);
        if (server) {
            Object.assign(server, updates);
            console.log(`Server updated: ${serverId}`);
            return true;
        }
        return false;
    }

    /**
     * リクエストをルーティング
     */
    async routeRequest(request, options = {}) {
        const algorithm = options.algorithm || this.config.algorithm;
        const sessionId = options.sessionId;
        const clientIP = options.clientIP;
        
        try {
            // セッションアフィニティをチェック
            if (this.config.sessionAffinity && sessionId) {
                const stickyServer = this.getStickyServer(sessionId);
                if (stickyServer && this.isServerHealthy(stickyServer)) {
                    return await this.forwardRequest(stickyServer, request);
                }
            }

            // 利用可能なサーバーを取得
            const availableServers = this.getAvailableServers();
            
            if (availableServers.length === 0) {
                throw new Error('No available servers');
            }

            // ルーティングアルゴリズムでサーバーを選択
            const selectedServer = this.routingAlgorithms[algorithm](
                availableServers,
                { sessionId, clientIP }
            );

            if (!selectedServer) {
                throw new Error('No suitable server found');
            }

            // セッションアフィニティを設定
            if (this.config.sessionAffinity && sessionId) {
                this.setStickySession(sessionId, selectedServer.id);
            }

            // リクエストを転送
            return await this.forwardRequest(selectedServer, request);
            
        } catch (error) {
            console.error('Request routing failed:', error);
            throw error;
        }
    }

    /**
     * ラウンドロビンアルゴリズム
     */
    roundRobin(servers) {
        if (servers.length === 0) return null;
        
        this.currentIndex = (this.currentIndex + 1) % servers.length;
        return servers[this.currentIndex];
    }

    /**
     * 最少接続アルゴリズム
     */
    leastConnections(servers) {
        if (servers.length === 0) return null;
        
        return servers.reduce((min, server) => 
            server.currentConnections < min.currentConnections ? server : min
        );
    }

    /**
     * 重み付きラウンドロビンアルゴリズム
     */
    weightedRoundRobin(servers) {
        if (servers.length === 0) return null;
        
        // 重みの合計を計算
        const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
        
        // 重みに基づいてサーバーを選択
        let random = Math.random() * totalWeight;
        
        for (const server of servers) {
            random -= server.weight;
            if (random <= 0) {
                return server;
            }
        }
        
        return servers[0]; // フォールバック
    }

    /**
     * IPハッシュアルゴリズム
     */
    ipHash(servers, options) {
        if (servers.length === 0) return null;
        
        const clientIP = options.clientIP || '127.0.0.1';
        const hash = this.hashString(clientIP);
        const index = hash % servers.length;
        
        return servers[index];
    }

    /**
     * 最少応答時間アルゴリズム
     */
    leastResponseTime(servers) {
        if (servers.length === 0) return null;
        
        return servers.reduce((min, server) => 
            server.responseTime < min.responseTime ? server : min
        );
    }

    /**
     * 利用可能なサーバーを取得
     */
    getAvailableServers() {
        return Array.from(this.servers.values()).filter(server => 
            this.isServerHealthy(server) && 
            server.currentConnections < server.maxConnections &&
            this.isCircuitBreakerClosed(server.id)
        );
    }

    /**
     * サーバーが健全かどうかをチェック
     */
    isServerHealthy(server) {
        return server.status === 'healthy';
    }

    /**
     * セッションアフィニティサーバーを取得
     */
    getStickyServer(sessionId) {
        const serverId = this.sessionMap.get(sessionId);
        if (serverId) {
            const session = this.sessionMap.get(sessionId);
            if (Date.now() - session.timestamp < this.config.stickySessionTimeout) {
                return this.servers.get(serverId);
            } else {
                this.sessionMap.delete(sessionId);
            }
        }
        return null;
    }

    /**
     * スティッキーセッションを設定
     */
    setStickySession(sessionId, serverId) {
        this.sessionMap.set(sessionId, {
            serverId: serverId,
            timestamp: Date.now()
        });
    }

    /**
     * リクエストを転送
     */
    async forwardRequest(server, request) {
        const startTime = Date.now();
        
        try {
            // 接続数を増加
            server.currentConnections++;
            
            // サーキットブレーカーをチェック
            if (!this.isCircuitBreakerClosed(server.id)) {
                throw new Error('Circuit breaker is open');
            }

            // リクエストを転送
            const response = await this.sendRequest(server, request);
            
            // 成功を記録
            this.recordSuccess(server, Date.now() - startTime);
            
            return response;
            
        } catch (error) {
            // 失敗を記録
            this.recordFailure(server, error);
            
            // リトライを試行
            return await this.retryRequest(server, request, error);
            
        } finally {
            // 接続数を減少
            server.currentConnections--;
        }
    }

    /**
     * リクエストを送信
     */
    async sendRequest(server, request) {
        const url = `http://${server.host}:${server.port}${request.path}`;
        
        const response = await fetch(url, {
            method: request.method || 'GET',
            headers: request.headers || {},
            body: request.body,
            timeout: this.config.healthCheckTimeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
    }

    /**
     * リクエストをリトライ
     */
    async retryRequest(originalServer, request, originalError) {
        const availableServers = this.getAvailableServers().filter(
            server => server.id !== originalServer.id
        );
        
        if (availableServers.length === 0) {
            throw originalError;
        }

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                // 別のサーバーを選択
                const server = this.roundRobin(availableServers);
                
                console.log(`Retrying request on server ${server.id} (attempt ${attempt})`);
                
                // リクエストを転送
                const response = await this.forwardRequest(server, request);
                
                return response;
                
            } catch (error) {
                console.error(`Retry attempt ${attempt} failed:`, error);
                
                if (attempt === this.config.maxRetries) {
                    throw originalError;
                }
                
                // リトライ前に待機
                await this.delay(this.config.retryDelay * attempt);
            }
        }
    }

    /**
     * 成功を記録
     */
    recordSuccess(server, responseTime) {
        server.successCount++;
        server.responseTime = responseTime;
        server.errorCount = 0;
        
        // サーキットブレーカーを更新
        this.updateCircuitBreaker(server.id, 'success');
    }

    /**
     * 失敗を記録
     */
    recordFailure(server, error) {
        server.errorCount++;
        server.status = 'unhealthy';
        
        // サーキットブレーカーを更新
        this.updateCircuitBreaker(server.id, 'failure');
        
        console.error(`Server ${server.id} failure:`, error.message);
    }

    /**
     * ヘルスチェックを開始
     */
    startHealthChecks() {
        this.healthCheckTimer = setInterval(() => {
            this.performHealthChecks();
        }, this.config.healthCheckInterval);
    }

    /**
     * ヘルスチェックを実行
     */
    async performHealthChecks() {
        const healthChecks = Array.from(this.servers.values()).map(
            server => this.checkServerHealth(server)
        );
        
        await Promise.allSettled(healthChecks);
    }

    /**
     * サーバーのヘルスチェック
     */
    async checkServerHealth(server) {
        const startTime = Date.now();
        
        try {
            const url = `http://${server.host}:${server.port}${server.healthCheckPath}`;
            
            const response = await fetch(url, {
                method: 'GET',
                timeout: this.config.healthCheckTimeout
            });
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                server.status = 'healthy';
                server.responseTime = responseTime;
                server.lastHealthCheck = Date.now();
                server.successCount++;
                server.errorCount = 0;
                
                this.updateCircuitBreaker(server.id, 'success');
            } else {
                server.status = 'unhealthy';
                server.errorCount++;
                
                this.updateCircuitBreaker(server.id, 'failure');
            }
            
        } catch (error) {
            server.status = 'unhealthy';
            server.errorCount++;
            
            this.updateCircuitBreaker(server.id, 'failure');
            
            console.error(`Health check failed for server ${server.id}:`, error.message);
        }
    }

    /**
     * サーキットブレーカーを作成
     */
    createCircuitBreaker() {
        return {
            state: 'closed', // closed, open, half-open
            failureCount: 0,
            lastFailureTime: 0,
            successCount: 0
        };
    }

    /**
     * サーキットブレーカーが閉じているかチェック
     */
    isCircuitBreakerClosed(serverId) {
        if (!this.config.circuitBreaker.enabled) {
            return true;
        }
        
        const breaker = this.circuitBreakers.get(serverId);
        if (!breaker) return true;
        
        return breaker.state === 'closed' || breaker.state === 'half-open';
    }

    /**
     * サーキットブレーカーを更新
     */
    updateCircuitBreaker(serverId, result) {
        if (!this.config.circuitBreaker.enabled) {
            return;
        }
        
        const breaker = this.circuitBreakers.get(serverId);
        if (!breaker) return;
        
        if (result === 'success') {
            breaker.failureCount = 0;
            breaker.successCount++;
            
            if (breaker.state === 'half-open' && 
                breaker.successCount >= this.config.circuitBreaker.halfOpenMaxRequests) {
                breaker.state = 'closed';
                console.log(`Circuit breaker for server ${serverId} closed`);
            }
        } else if (result === 'failure') {
            breaker.failureCount++;
            breaker.lastFailureTime = Date.now();
            
            if (breaker.state === 'closed' && 
                breaker.failureCount >= this.config.circuitBreaker.failureThreshold) {
                breaker.state = 'open';
                console.log(`Circuit breaker for server ${serverId} opened`);
            } else if (breaker.state === 'half-open') {
                breaker.state = 'open';
                console.log(`Circuit breaker for server ${serverId} opened (half-open failure)`);
            }
        }
        
        // リカバリータイマーを設定
        if (breaker.state === 'open') {
            setTimeout(() => {
                breaker.state = 'half-open';
                breaker.successCount = 0;
                console.log(`Circuit breaker for server ${serverId} half-open`);
            }, this.config.circuitBreaker.recoveryTimeout);
        }
    }

    /**
     * 文字列をハッシュ化
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 32ビット整数に変換
        }
        return Math.abs(hash);
    }

    /**
     * 遅延関数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * ロードバランサーの統計を取得
     */
    getStats() {
        const stats = {
            totalServers: this.servers.size,
            healthyServers: Array.from(this.servers.values()).filter(s => s.status === 'healthy').length,
            totalConnections: Array.from(this.servers.values()).reduce((sum, s) => sum + s.currentConnections, 0),
            totalSessions: this.sessionMap.size,
            algorithm: this.config.algorithm,
            circuitBreakers: {}
        };
        
        // サーキットブレーカーの統計
        for (const [serverId, breaker] of this.circuitBreakers) {
            stats.circuitBreakers[serverId] = {
                state: breaker.state,
                failureCount: breaker.failureCount,
                successCount: breaker.successCount
            };
        }
        
        return stats;
    }

    /**
     * サーバー詳細統計を取得
     */
    getServerStats(serverId) {
        const server = this.servers.get(serverId);
        if (!server) return null;
        
        const breaker = this.circuitBreakers.get(serverId);
        
        return {
            id: server.id,
            host: server.host,
            port: server.port,
            status: server.status,
            currentConnections: server.currentConnections,
            maxConnections: server.maxConnections,
            responseTime: server.responseTime,
            successCount: server.successCount,
            errorCount: server.errorCount,
            uptime: Date.now() - server.uptime,
            lastHealthCheck: server.lastHealthCheck,
            circuitBreaker: breaker ? {
                state: breaker.state,
                failureCount: breaker.failureCount,
                successCount: breaker.successCount
            } : null
        };
    }

    /**
     * ロードバランサーを停止
     */
    stop() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
        
        console.log('Load balancer stopped');
    }

    /**
     * ロードバランサー設定を更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
}

// グローバルインスタンスを作成
window.loadBalancer = new LoadBalancer();

// モジュールエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadBalancer;
} 