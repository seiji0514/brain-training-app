/**
 * マルチプレイヤー機能管理システム
 * リアルタイム対戦、ランキング、チャット機能を管理
 */

class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.rooms = new Map();
        this.currentRoom = null;
        this.currentUser = null;
        this.gameState = 'waiting'; // waiting, playing, finished
        this.players = new Map();
        this.gameResults = [];
        
        this.config = {
            serverUrl: 'ws://localhost:3000',
            reconnectInterval: 5000,
            maxReconnectAttempts: 5,
            heartbeatInterval: 30000
        };

        this.eventHandlers = new Map();
        this.reconnectAttempts = 0;
        this.heartbeatTimer = null;
    }

    /**
     * WebSocket接続を初期化
     */
    async initialize(userId, username) {
        this.currentUser = { id: userId, name: username };
        
        try {
            await this.connect();
            this.setupEventHandlers();
            this.startHeartbeat();
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
            throw error;
        }
    }

    /**
     * WebSocket接続を確立
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = new WebSocket(this.config.serverUrl);
            
            this.socket.onopen = () => {
                console.log('Connected to multiplayer server');
                this.reconnectAttempts = 0;
                this.authenticate();
                resolve();
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
            
            this.socket.onclose = () => {
                console.log('Disconnected from multiplayer server');
                this.handleDisconnect();
            };
        });
    }

    /**
     * 認証を実行
     */
    authenticate() {
        this.send('authenticate', {
            userId: this.currentUser.id,
            username: this.currentUser.name
        });
    }

    /**
     * イベントハンドラーを設定
     */
    setupEventHandlers() {
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };
    }

    /**
     * メッセージを処理
     */
    handleMessage(data) {
        const { type, payload } = data;
        
        switch (type) {
            case 'authenticated':
                this.handleAuthenticated(payload);
                break;
            case 'room_created':
                this.handleRoomCreated(payload);
                break;
            case 'room_joined':
                this.handleRoomJoined(payload);
                break;
            case 'player_joined':
                this.handlePlayerJoined(payload);
                break;
            case 'player_left':
                this.handlePlayerLeft(payload);
                break;
            case 'game_started':
                this.handleGameStarted(payload);
                break;
            case 'game_update':
                this.handleGameUpdate(payload);
                break;
            case 'game_finished':
                this.handleGameFinished(payload);
                break;
            case 'chat_message':
                this.handleChatMessage(payload);
                break;
            case 'error':
                this.handleError(payload);
                break;
            default:
                console.warn('Unknown message type:', type);
        }
    }

    /**
     * 認証完了を処理
     */
    handleAuthenticated(payload) {
        console.log('Authentication successful');
        this.emit('authenticated', payload);
    }

    /**
     * ルーム作成を処理
     */
    handleRoomCreated(payload) {
        const { roomId, room } = payload;
        this.currentRoom = roomId;
        this.rooms.set(roomId, room);
        this.emit('roomCreated', { roomId, room });
    }

    /**
     * ルーム参加を処理
     */
    handleRoomJoined(payload) {
        const { roomId, room, players } = payload;
        this.currentRoom = roomId;
        this.rooms.set(roomId, room);
        this.players.clear();
        players.forEach(player => this.players.set(player.id, player));
        this.emit('roomJoined', { roomId, room, players });
    }

    /**
     * プレイヤー参加を処理
     */
    handlePlayerJoined(payload) {
        const { player } = payload;
        this.players.set(player.id, player);
        this.emit('playerJoined', player);
    }

    /**
     * プレイヤー退出を処理
     */
    handlePlayerLeft(payload) {
        const { playerId } = payload;
        this.players.delete(playerId);
        this.emit('playerLeft', playerId);
    }

    /**
     * ゲーム開始を処理
     */
    handleGameStarted(payload) {
        const { gameConfig, players } = payload;
        this.gameState = 'playing';
        this.emit('gameStarted', { gameConfig, players });
    }

    /**
     * ゲーム更新を処理
     */
    handleGameUpdate(payload) {
        const { playerId, gameData } = payload;
        this.emit('gameUpdate', { playerId, gameData });
    }

    /**
     * ゲーム終了を処理
     */
    handleGameFinished(payload) {
        const { results, winner } = payload;
        this.gameState = 'finished';
        this.gameResults = results;
        this.emit('gameFinished', { results, winner });
    }

    /**
     * チャットメッセージを処理
     */
    handleChatMessage(payload) {
        const { playerId, message, timestamp } = payload;
        this.emit('chatMessage', { playerId, message, timestamp });
    }

    /**
     * エラーを処理
     */
    handleError(payload) {
        const { code, message } = payload;
        console.error('Multiplayer error:', code, message);
        this.emit('error', { code, message });
    }

    /**
     * ルームを作成
     */
    createRoom(gameType, maxPlayers = 4, isPrivate = false) {
        this.send('create_room', {
            gameType,
            maxPlayers,
            isPrivate,
            createdBy: this.currentUser.id
        });
    }

    /**
     * ルームに参加
     */
    joinRoom(roomId) {
        this.send('join_room', {
            roomId,
            playerId: this.currentUser.id
        });
    }

    /**
     * ルームから退出
     */
    leaveRoom() {
        if (this.currentRoom) {
            this.send('leave_room', {
                roomId: this.currentRoom,
                playerId: this.currentUser.id
            });
            this.currentRoom = null;
        }
    }

    /**
     * ゲーム準備完了を送信
     */
    ready() {
        this.send('ready', {
            roomId: this.currentRoom,
            playerId: this.currentUser.id
        });
    }

    /**
     * ゲーム結果を送信
     */
    submitGameResult(result) {
        this.send('game_result', {
            roomId: this.currentRoom,
            playerId: this.currentUser.id,
            result
        });
    }

    /**
     * チャットメッセージを送信
     */
    sendChatMessage(message) {
        this.send('chat_message', {
            roomId: this.currentRoom,
            playerId: this.currentUser.id,
            message
        });
    }

    /**
     * 利用可能なルーム一覧を取得
     */
    getAvailableRooms() {
        this.send('get_rooms', {});
    }

    /**
     * メッセージを送信
     */
    send(type, payload) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = { type, payload };
            this.socket.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    /**
     * 切断を処理
     */
    handleDisconnect() {
        this.stopHeartbeat();
        this.gameState = 'waiting';
        
        if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect();
            }, this.config.reconnectInterval);
        } else {
            this.emit('connectionFailed');
        }
    }

    /**
     * ハートビートを開始
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            this.send('heartbeat', { timestamp: Date.now() });
        }, this.config.heartbeatInterval);
    }

    /**
     * ハートビートを停止
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    /**
     * イベントリスナーを追加
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * イベントリスナーを削除
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * イベントを発火
     */
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error('Event handler error:', error);
                }
            });
        }
    }

    /**
     * 接続を切断
     */
    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    /**
     * 現在の状態を取得
     */
    getState() {
        return {
            connected: this.socket?.readyState === WebSocket.OPEN,
            currentRoom: this.currentRoom,
            gameState: this.gameState,
            players: Array.from(this.players.values()),
            gameResults: this.gameResults
        };
    }
}

/**
 * マルチプレイヤーゲームベースクラス
 */
class MultiplayerGame {
    constructor(gameType, multiplayerManager) {
        this.gameType = gameType;
        this.multiplayer = multiplayerManager;
        this.gameConfig = null;
        this.localPlayer = null;
        this.otherPlayers = new Map();
        this.gameData = {};
        
        this.setupMultiplayerHandlers();
    }

    /**
     * マルチプレイヤーハンドラーを設定
     */
    setupMultiplayerHandlers() {
        this.multiplayer.on('gameStarted', (data) => {
            this.onGameStarted(data);
        });

        this.multiplayer.on('gameUpdate', (data) => {
            this.onGameUpdate(data);
        });

        this.multiplayer.on('gameFinished', (data) => {
            this.onGameFinished(data);
        });

        this.multiplayer.on('playerJoined', (player) => {
            this.onPlayerJoined(player);
        });

        this.multiplayer.on('playerLeft', (playerId) => {
            this.onPlayerLeft(playerId);
        });
    }

    /**
     * ゲーム開始時の処理
     */
    onGameStarted(data) {
        this.gameConfig = data.gameConfig;
        this.localPlayer = this.multiplayer.currentUser;
        
        data.players.forEach(player => {
            if (player.id !== this.localPlayer.id) {
                this.otherPlayers.set(player.id, player);
            }
        });

        this.startGame();
    }

    /**
     * ゲーム更新時の処理
     */
    onGameUpdate(data) {
        const { playerId, gameData } = data;
        if (playerId !== this.localPlayer.id) {
            this.updateOtherPlayer(playerId, gameData);
        }
    }

    /**
     * ゲーム終了時の処理
     */
    onGameFinished(data) {
        this.endGame(data.results, data.winner);
    }

    /**
     * プレイヤー参加時の処理
     */
    onPlayerJoined(player) {
        this.otherPlayers.set(player.id, player);
    }

    /**
     * プレイヤー退出時の処理
     */
    onPlayerLeft(playerId) {
        this.otherPlayers.delete(playerId);
    }

    /**
     * ゲームを開始
     */
    startGame() {
        // サブクラスで実装
    }

    /**
     * 他のプレイヤーを更新
     */
    updateOtherPlayer(playerId, gameData) {
        // サブクラスで実装
    }

    /**
     * ゲームを終了
     */
    endGame(results, winner) {
        // サブクラスで実装
    }

    /**
     * ゲームデータを送信
     */
    sendGameData(data) {
        this.multiplayer.send('game_update', {
            roomId: this.multiplayer.currentRoom,
            playerId: this.localPlayer.id,
            gameData: data
        });
    }

    /**
     * ゲーム結果を送信
     */
    sendGameResult(result) {
        this.multiplayer.submitGameResult(result);
    }
}

/**
 * ランキングシステム
 */
class RankingSystem {
    constructor() {
        this.rankings = new Map();
        this.seasonData = {
            currentSeason: 1,
            seasonStart: new Date('2024-01-01'),
            seasonEnd: new Date('2024-12-31')
        };
    }

    /**
     * スコアを記録
     */
    recordScore(gameType, playerId, score, difficulty) {
        const key = `${gameType}_${difficulty}`;
        if (!this.rankings.has(key)) {
            this.rankings.set(key, []);
        }

        const ranking = this.rankings.get(key);
        const existingIndex = ranking.findIndex(entry => entry.playerId === playerId);

        if (existingIndex >= 0) {
            if (score > ranking[existingIndex].score) {
                ranking[existingIndex].score = score;
                ranking[existingIndex].timestamp = Date.now();
            }
        } else {
            ranking.push({
                playerId,
                score,
                difficulty,
                timestamp: Date.now()
            });
        }

        // スコアでソート
        ranking.sort((a, b) => b.score - a.score);
        
        // 上位100位のみ保持
        if (ranking.length > 100) {
            ranking.splice(100);
        }

        this.saveRankings();
    }

    /**
     * ランキングを取得
     */
    getRanking(gameType, difficulty, limit = 10) {
        const key = `${gameType}_${difficulty}`;
        const ranking = this.rankings.get(key) || [];
        return ranking.slice(0, limit);
    }

    /**
     * プレイヤーの順位を取得
     */
    getPlayerRank(gameType, difficulty, playerId) {
        const key = `${gameType}_${difficulty}`;
        const ranking = this.rankings.get(key) || [];
        const index = ranking.findIndex(entry => entry.playerId === playerId);
        return index >= 0 ? index + 1 : null;
    }

    /**
     * ランキングを保存
     */
    saveRankings() {
        try {
            localStorage.setItem('rankings', JSON.stringify(Array.from(this.rankings.entries())));
        } catch (error) {
            console.error('Failed to save rankings:', error);
        }
    }

    /**
     * ランキングを読み込み
     */
    loadRankings() {
        try {
            const saved = localStorage.getItem('rankings');
            if (saved) {
                this.rankings = new Map(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Failed to load rankings:', error);
        }
    }
}

// グローバルインスタンスを作成
window.multiplayerManager = new MultiplayerManager();
window.rankingSystem = new RankingSystem();

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MultiplayerManager, MultiplayerGame, RankingSystem };
} 