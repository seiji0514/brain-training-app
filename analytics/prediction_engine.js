/**
 * 予測分析エンジン
 * ユーザーの将来の行動、スコア、離脱リスクなどを予測
 */

class PredictionEngine {
    constructor() {
        this.models = {
            scorePrediction: null,
            engagementPrediction: null,
            churnPrediction: null,
            difficultyRecommendation: null,
            gameRecommendation: null
        };
        
        this.features = {
            user: ['age', 'gender', 'experience_level', 'preferred_games'],
            behavior: ['play_frequency', 'session_duration', 'completion_rate', 'mistake_rate'],
            performance: ['average_score', 'score_trend', 'improvement_rate', 'consistency'],
            temporal: ['time_of_day', 'day_of_week', 'seasonal_patterns', 'recent_activity']
        };
        
        this.config = {
            predictionHorizon: 30, // 30日先まで予測
            minDataPoints: 20,
            confidenceThreshold: 0.7,
            updateInterval: 24 * 60 * 60 * 1000 // 24時間
        };

        this.cache = new Map();
        this.lastUpdate = 0;
    }

    /**
     * スコア予測を実行
     */
    async predictScore(userId, gameType, difficulty, horizon = 7) {
        const cacheKey = `score_${userId}_${gameType}_${difficulty}_${horizon}`;
        
        if (this.cache.has(cacheKey) && Date.now() - this.lastUpdate < this.config.updateInterval) {
            return this.cache.get(cacheKey);
        }

        try {
            const userData = await this.getUserData(userId);
            const features = this.extractScoreFeatures(userData, gameType, difficulty);
            
            const prediction = this.calculateScorePrediction(features, horizon);
            
            // キャッシュに保存
            this.cache.set(cacheKey, prediction);
            
            return prediction;
        } catch (error) {
            console.error('Score prediction failed:', error);
            return this.getDefaultPrediction();
        }
    }

    /**
     * エンゲージメント予測を実行
     */
    async predictEngagement(userId, horizon = 7) {
        const cacheKey = `engagement_${userId}_${horizon}`;
        
        if (this.cache.has(cacheKey) && Date.now() - this.lastUpdate < this.config.updateInterval) {
            return this.cache.get(cacheKey);
        }

        try {
            const userData = await this.getUserData(userId);
            const features = this.extractEngagementFeatures(userData);
            
            const prediction = this.calculateEngagementPrediction(features, horizon);
            
            this.cache.set(cacheKey, prediction);
            
            return prediction;
        } catch (error) {
            console.error('Engagement prediction failed:', error);
            return this.getDefaultEngagementPrediction();
        }
    }

    /**
     * 離脱リスク予測を実行
     */
    async predictChurnRisk(userId, horizon = 30) {
        const cacheKey = `churn_${userId}_${horizon}`;
        
        if (this.cache.has(cacheKey) && Date.now() - this.lastUpdate < this.config.updateInterval) {
            return this.cache.get(cacheKey);
        }

        try {
            const userData = await this.getUserData(userId);
            const features = this.extractChurnFeatures(userData);
            
            const prediction = this.calculateChurnPrediction(features, horizon);
            
            this.cache.set(cacheKey, prediction);
            
            return prediction;
        } catch (error) {
            console.error('Churn prediction failed:', error);
            return this.getDefaultChurnPrediction();
        }
    }

    /**
     * 難易度推奨を生成
     */
    async recommendDifficulty(userId, gameType) {
        try {
            const userData = await this.getUserData(userId);
            const features = this.extractDifficultyFeatures(userData, gameType);
            
            return this.calculateDifficultyRecommendation(features);
        } catch (error) {
            console.error('Difficulty recommendation failed:', error);
            return { recommended: 'medium', confidence: 0.5 };
        }
    }

    /**
     * ゲーム推奨を生成
     */
    async recommendGames(userId, count = 3) {
        try {
            const userData = await this.getUserData(userId);
            const features = this.extractGameRecommendationFeatures(userData);
            
            return this.calculateGameRecommendations(features, count);
        } catch (error) {
            console.error('Game recommendation failed:', error);
            return this.getDefaultGameRecommendations(count);
        }
    }

    /**
     * スコア予測特徴量を抽出
     */
    extractScoreFeatures(userData, gameType, difficulty) {
        const recentGames = userData.games.filter(g => 
            g.gameType === gameType && 
            g.difficulty === difficulty &&
            g.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000
        );

        if (recentGames.length < 5) {
            return this.getDefaultFeatures();
        }

        const scores = recentGames.map(g => g.score);
        const playTimes = recentGames.map(g => g.playTime);
        const mistakes = recentGames.map(g => g.mistakes || 0);

        return {
            averageScore: this.mean(scores),
            scoreTrend: this.calculateTrend(scores),
            scoreVariance: this.variance(scores),
            averagePlayTime: this.mean(playTimes),
            averageMistakes: this.mean(mistakes),
            completionRate: recentGames.filter(g => g.completed).length / recentGames.length,
            recentImprovement: this.calculateRecentImprovement(scores),
            consistency: this.calculateConsistency(scores),
            difficultyLevel: this.encodeDifficulty(difficulty),
            gameExperience: this.calculateGameExperience(userData, gameType)
        };
    }

    /**
     * エンゲージメント特徴量を抽出
     */
    extractEngagementFeatures(userData) {
        const recentActivity = userData.games.filter(g => 
            g.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        const dailyActivity = this.calculateDailyActivity(recentActivity);
        const sessionPatterns = this.analyzeSessionPatterns(recentActivity);
        const gameDiversity = this.calculateGameDiversity(recentActivity);

        return {
            dailyPlayFrequency: this.mean(dailyActivity),
            sessionDuration: this.mean(sessionPatterns.durations),
            sessionFrequency: sessionPatterns.frequency,
            gameDiversity: gameDiversity,
            completionRate: this.calculateCompletionRate(recentActivity),
            returnRate: this.calculateReturnRate(userData),
            socialEngagement: this.calculateSocialEngagement(userData),
            achievementRate: this.calculateAchievementRate(userData)
        };
    }

    /**
     * 離脱特徴量を抽出
     */
    extractChurnFeatures(userData) {
        const recentGames = userData.games.filter(g => 
            g.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000
        );

        const activityDecline = this.calculateActivityDecline(userData);
        const satisfactionMetrics = this.calculateSatisfactionMetrics(recentGames);
        const engagementMetrics = this.calculateEngagementMetrics(userData);

        return {
            activityDecline: activityDecline,
            averageScore: this.mean(recentGames.map(g => g.score)),
            scoreDecline: this.calculateScoreDecline(recentGames),
            sessionDropoff: this.calculateSessionDropoff(userData),
            gameAbandonment: this.calculateGameAbandonment(recentGames),
            satisfactionScore: satisfactionMetrics.score,
            engagementScore: engagementMetrics.score,
            daysSinceLastActivity: this.calculateDaysSinceLastActivity(userData)
        };
    }

    /**
     * 難易度推奨特徴量を抽出
     */
    extractDifficultyFeatures(userData, gameType) {
        const gameHistory = userData.games.filter(g => g.gameType === gameType);
        
        if (gameHistory.length === 0) {
            return this.getDefaultDifficultyFeatures();
        }

        const recentGames = gameHistory.slice(-10);
        const scores = recentGames.map(g => g.score);
        const difficulties = recentGames.map(g => g.difficulty);

        return {
            averageScore: this.mean(scores),
            scoreConsistency: this.calculateConsistency(scores),
            preferredDifficulty: this.getMostFrequent(difficulties),
            improvementRate: this.calculateImprovementRate(scores),
            challengePreference: this.calculateChallengePreference(recentGames),
            frustrationLevel: this.calculateFrustrationLevel(recentGames)
        };
    }

    /**
     * ゲーム推奨特徴量を抽出
     */
    extractGameRecommendationFeatures(userData) {
        const gamePreferences = this.analyzeGamePreferences(userData.games);
        const performanceByGame = this.analyzePerformanceByGame(userData.games);
        const engagementByGame = this.analyzeEngagementByGame(userData.games);

        return {
            gamePreferences: gamePreferences,
            performanceByGame: performanceByGame,
            engagementByGame: engagementByGame,
            explorationTendency: this.calculateExplorationTendency(userData),
            skillLevel: this.calculateOverallSkillLevel(userData),
            timeAvailability: this.calculateTimeAvailability(userData)
        };
    }

    /**
     * スコア予測を計算
     */
    calculateScorePrediction(features, horizon) {
        // 線形回帰ベースの予測
        const baseScore = features.averageScore;
        const trendEffect = features.scoreTrend * horizon;
        const improvementEffect = features.recentImprovement * Math.min(horizon, 7);
        const consistencyEffect = features.consistency * 10;
        
        let predictedScore = baseScore + trendEffect + improvementEffect + consistencyEffect;
        
        // 信頼度の計算
        const confidence = this.calculatePredictionConfidence(features);
        
        // 予測区間の計算
        const margin = this.calculatePredictionMargin(features, horizon);
        
        return {
            prediction: Math.max(0, Math.round(predictedScore)),
            confidence: confidence,
            range: {
                min: Math.max(0, Math.round(predictedScore - margin)),
                max: Math.round(predictedScore + margin)
            },
            factors: {
                baseScore: baseScore,
                trendEffect: trendEffect,
                improvementEffect: improvementEffect,
                consistencyEffect: consistencyEffect
            },
            horizon: horizon
        };
    }

    /**
     * エンゲージメント予測を計算
     */
    calculateEngagementPrediction(features, horizon) {
        const baseEngagement = features.dailyPlayFrequency;
        const trendEffect = this.calculateEngagementTrend(features);
        const seasonalEffect = this.calculateSeasonalEffect(horizon);
        
        let predictedEngagement = baseEngagement + trendEffect + seasonalEffect;
        
        const confidence = this.calculateEngagementConfidence(features);
        
        return {
            prediction: Math.max(0, Math.round(predictedEngagement * 100) / 100),
            confidence: confidence,
            trend: trendEffect > 0 ? 'increasing' : 'decreasing',
            factors: {
                baseEngagement: baseEngagement,
                trendEffect: trendEffect,
                seasonalEffect: seasonalEffect
            },
            horizon: horizon
        };
    }

    /**
     * 離脱予測を計算
     */
    calculateChurnPrediction(features, horizon) {
        // ロジスティック回帰ベースの予測
        const riskFactors = [
            features.activityDecline * 0.3,
            features.scoreDecline * 0.2,
            features.sessionDropoff * 0.25,
            features.gameAbandonment * 0.15,
            (30 - features.daysSinceLastActivity) * 0.1
        ];
        
        const riskScore = riskFactors.reduce((sum, factor) => sum + factor, 0);
        const churnProbability = 1 / (1 + Math.exp(-riskScore));
        
        const confidence = this.calculateChurnConfidence(features);
        
        return {
            probability: Math.round(churnProbability * 100) / 100,
            confidence: confidence,
            riskLevel: this.classifyRiskLevel(churnProbability),
            factors: {
                activityDecline: features.activityDecline,
                scoreDecline: features.scoreDecline,
                sessionDropoff: features.sessionDropoff,
                gameAbandonment: features.gameAbandonment,
                daysSinceLastActivity: features.daysSinceLastActivity
            },
            recommendations: this.generateChurnRecommendations(features),
            horizon: horizon
        };
    }

    /**
     * 難易度推奨を計算
     */
    calculateDifficultyRecommendation(features) {
        const score = features.averageScore;
        const consistency = features.scoreConsistency;
        const improvement = features.improvementRate;
        
        let recommendedDifficulty = 'medium';
        let confidence = 0.5;
        
        if (score > 80 && consistency > 0.8 && improvement > 0) {
            recommendedDifficulty = 'hard';
            confidence = 0.9;
        } else if (score > 60 && consistency > 0.6) {
            recommendedDifficulty = 'medium';
            confidence = 0.7;
        } else if (score < 40 || consistency < 0.4) {
            recommendedDifficulty = 'easy';
            confidence = 0.8;
        }
        
        return {
            recommended: recommendedDifficulty,
            confidence: confidence,
            reasoning: this.generateDifficultyReasoning(features)
        };
    }

    /**
     * ゲーム推奨を計算
     */
    calculateGameRecommendations(features, count) {
        const gameScores = [];
        
        // 各ゲームの推奨スコアを計算
        const gameTypes = ['memory_game', 'reaction_game', 'calculation_game', 'pattern_memory', 'puzzle_game'];
        
        gameTypes.forEach(gameType => {
            const performance = features.performanceByGame[gameType] || 0;
            const engagement = features.engagementByGame[gameType] || 0;
            const preference = features.gamePreferences[gameType] || 0;
            
            const score = performance * 0.4 + engagement * 0.3 + preference * 0.3;
            gameScores.push({ gameType, score });
        });
        
        // スコアでソート
        gameScores.sort((a, b) => b.score - a.score);
        
        return gameScores.slice(0, count).map((game, index) => ({
            rank: index + 1,
            gameType: game.gameType,
            gameName: this.getGameName(game.gameType),
            score: game.score,
            confidence: this.calculateGameRecommendationConfidence(game.score)
        }));
    }

    /**
     * ユーティリティ関数
     */
    async getUserData(userId) {
        // APIからユーザーデータを取得
        const response = await fetch(`/api/users/${userId}/data`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        return await response.json();
    }

    mean(array) {
        return array.reduce((sum, val) => sum + val, 0) / array.length;
    }

    variance(array) {
        const mean = this.mean(array);
        return array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
    }

    calculateTrend(array) {
        if (array.length < 2) return 0;
        
        const n = array.length;
        const x = Array.from({length: n}, (_, i) => i);
        const xMean = this.mean(x);
        const yMean = this.mean(array);
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (x[i] - xMean) * (array[i] - yMean);
            denominator += Math.pow(x[i] - xMean, 2);
        }
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateConsistency(array) {
        if (array.length < 2) return 1;
        
        const mean = this.mean(array);
        const variance = this.variance(array);
        const coefficientOfVariation = Math.sqrt(variance) / mean;
        
        return Math.max(0, 1 - coefficientOfVariation);
    }

    calculateRecentImprovement(array) {
        if (array.length < 10) return 0;
        
        const recent = array.slice(-5);
        const older = array.slice(-10, -5);
        
        return this.mean(recent) - this.mean(older);
    }

    encodeDifficulty(difficulty) {
        const encoding = { easy: 1, medium: 2, hard: 3, expert: 4 };
        return encoding[difficulty] || 2;
    }

    calculateGameExperience(userData, gameType) {
        return userData.games.filter(g => g.gameType === gameType).length;
    }

    calculateDailyActivity(games) {
        const dailyCounts = new Array(7).fill(0);
        
        games.forEach(game => {
            const day = new Date(game.timestamp).getDay();
            dailyCounts[day]++;
        });
        
        return dailyCounts;
    }

    analyzeSessionPatterns(games) {
        const sessions = this.groupIntoSessions(games);
        
        return {
            durations: sessions.map(s => s.duration),
            frequency: sessions.length / 7 // 週あたりのセッション数
        };
    }

    groupIntoSessions(games) {
        const sessions = [];
        let currentSession = [];
        
        games.sort((a, b) => a.timestamp - b.timestamp);
        
        games.forEach(game => {
            if (currentSession.length === 0) {
                currentSession = [game];
            } else {
                const lastGame = currentSession[currentSession.length - 1];
                const timeDiff = game.timestamp - lastGame.timestamp;
                
                if (timeDiff < 30 * 60 * 1000) { // 30分以内
                    currentSession.push(game);
                } else {
                    sessions.push({
                        games: currentSession,
                        duration: currentSession.length,
                        startTime: currentSession[0].timestamp,
                        endTime: currentSession[currentSession.length - 1].timestamp
                    });
                    currentSession = [game];
                }
            }
        });
        
        if (currentSession.length > 0) {
            sessions.push({
                games: currentSession,
                duration: currentSession.length,
                startTime: currentSession[0].timestamp,
                endTime: currentSession[currentSession.length - 1].timestamp
            });
        }
        
        return sessions;
    }

    calculateGameDiversity(games) {
        const gameTypes = new Set(games.map(g => g.gameType));
        return gameTypes.size / 5; // 5種類のゲームがあると仮定
    }

    calculateCompletionRate(games) {
        return games.filter(g => g.completed).length / games.length;
    }

    calculateReturnRate(userData) {
        const totalDays = userData.games.length;
        const uniqueDays = new Set(userData.games.map(g => 
            new Date(g.timestamp).toDateString()
        )).size;
        
        return uniqueDays / Math.max(totalDays, 1);
    }

    calculateSocialEngagement(userData) {
        // ソーシャル機能の実装に応じて調整
        return 0.5;
    }

    calculateAchievementRate(userData) {
        // 実績システムの実装に応じて調整
        return 0.3;
    }

    calculateActivityDecline(userData) {
        const recent = userData.games.filter(g => 
            g.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length;
        
        const older = userData.games.filter(g => 
            g.timestamp > Date.now() - 14 * 24 * 60 * 60 * 1000 &&
            g.timestamp <= Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length;
        
        return (older - recent) / Math.max(older, 1);
    }

    calculateSatisfactionMetrics(games) {
        const scores = games.map(g => g.score);
        const completionRate = this.calculateCompletionRate(games);
        
        return {
            score: (this.mean(scores) / 100) * 0.7 + completionRate * 0.3
        };
    }

    calculateEngagementMetrics(userData) {
        const recentActivity = userData.games.filter(g => 
            g.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        
        const dailyFrequency = recentActivity.length / 7;
        const sessionDuration = this.analyzeSessionPatterns(recentActivity).durations;
        
        return {
            score: Math.min(dailyFrequency / 3, 1) * 0.6 + Math.min(this.mean(sessionDuration) / 5, 1) * 0.4
        };
    }

    calculateScoreDecline(games) {
        if (games.length < 10) return 0;
        
        const recent = games.slice(-5).map(g => g.score);
        const older = games.slice(-10, -5).map(g => g.score);
        
        return this.mean(older) - this.mean(recent);
    }

    calculateSessionDropoff(userData) {
        const sessions = this.groupIntoSessions(userData.games);
        if (sessions.length < 2) return 0;
        
        const recentSessions = sessions.slice(-3);
        const olderSessions = sessions.slice(-6, -3);
        
        if (olderSessions.length === 0) return 0;
        
        const recentAvg = this.mean(recentSessions.map(s => s.duration));
        const olderAvg = this.mean(olderSessions.map(s => s.duration));
        
        return (olderAvg - recentAvg) / Math.max(olderAvg, 1);
    }

    calculateGameAbandonment(games) {
        return games.filter(g => !g.completed).length / games.length;
    }

    calculateDaysSinceLastActivity(userData) {
        if (userData.games.length === 0) return 999;
        
        const lastGame = userData.games[userData.games.length - 1];
        const daysDiff = (Date.now() - lastGame.timestamp) / (24 * 60 * 60 * 1000);
        
        return Math.floor(daysDiff);
    }

    getMostFrequent(array) {
        const counts = {};
        array.forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });
        
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    calculateImprovementRate(array) {
        if (array.length < 5) return 0;
        
        const recent = array.slice(-3);
        const older = array.slice(-6, -3);
        
        if (older.length === 0) return 0;
        
        return (this.mean(recent) - this.mean(older)) / Math.max(this.mean(older), 1);
    }

    calculateChallengePreference(games) {
        const difficulties = games.map(g => this.encodeDifficulty(g.difficulty));
        return this.mean(difficulties) / 4; // 4段階の難易度を仮定
    }

    calculateFrustrationLevel(games) {
        const incompleteGames = games.filter(g => !g.completed);
        const lowScores = games.filter(g => g.score < 30);
        
        return (incompleteGames.length + lowScores.length) / games.length;
    }

    analyzeGamePreferences(games) {
        const preferences = {};
        const gameTypes = ['memory_game', 'reaction_game', 'calculation_game', 'pattern_memory', 'puzzle_game'];
        
        gameTypes.forEach(gameType => {
            const gameCount = games.filter(g => g.gameType === gameType).length;
            preferences[gameType] = gameCount / games.length;
        });
        
        return preferences;
    }

    analyzePerformanceByGame(games) {
        const performance = {};
        const gameTypes = ['memory_game', 'reaction_game', 'calculation_game', 'pattern_memory', 'puzzle_game'];
        
        gameTypes.forEach(gameType => {
            const gameScores = games.filter(g => g.gameType === gameType).map(g => g.score);
            performance[gameType] = gameScores.length > 0 ? this.mean(gameScores) / 100 : 0;
        });
        
        return performance;
    }

    analyzeEngagementByGame(games) {
        const engagement = {};
        const gameTypes = ['memory_game', 'reaction_game', 'calculation_game', 'pattern_memory', 'puzzle_game'];
        
        gameTypes.forEach(gameType => {
            const gameCount = games.filter(g => g.gameType === gameType).length;
            engagement[gameType] = gameCount / games.length;
        });
        
        return engagement;
    }

    calculateExplorationTendency(userData) {
        const uniqueGames = new Set(userData.games.map(g => g.gameType)).size;
        return uniqueGames / 5; // 5種類のゲームがあると仮定
    }

    calculateOverallSkillLevel(userData) {
        const scores = userData.games.map(g => g.score);
        return this.mean(scores) / 100;
    }

    calculateTimeAvailability(userData) {
        const recentGames = userData.games.filter(g => 
            g.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
        );
        
        const totalPlayTime = recentGames.reduce((sum, g) => sum + (g.playTime || 0), 0);
        return Math.min(totalPlayTime / (7 * 60 * 60), 1); // 週7時間を最大とする
    }

    calculatePredictionConfidence(features) {
        const factors = [
            features.consistency * 0.3,
            Math.min(features.gameExperience / 20, 1) * 0.2,
            (1 - features.scoreVariance / 100) * 0.3,
            Math.min(features.recentImprovement / 10, 1) * 0.2
        ];
        
        return Math.min(factors.reduce((sum, factor) => sum + factor, 0), 1);
    }

    calculatePredictionMargin(features, horizon) {
        const baseMargin = features.scoreVariance * 0.5;
        const horizonFactor = Math.sqrt(horizon) * 0.1;
        return baseMargin * (1 + horizonFactor);
    }

    calculateEngagementTrend(features) {
        return features.dailyPlayFrequency * 0.1; // 簡易的なトレンド計算
    }

    calculateSeasonalEffect(horizon) {
        // 簡易的な季節効果
        const dayOfYear = new Date().getDayOfYear();
        return Math.sin(dayOfYear / 365 * 2 * Math.PI) * 0.1;
    }

    calculateEngagementConfidence(features) {
        return Math.min(features.sessionFrequency / 7, 1) * 0.8 + 0.2;
    }

    calculateChurnConfidence(features) {
        const factors = [
            Math.min(features.daysSinceLastActivity / 30, 1) * 0.3,
            Math.min(features.activityDecline, 1) * 0.3,
            Math.min(features.scoreDecline / 50, 1) * 0.2,
            Math.min(features.gameAbandonment, 1) * 0.2
        ];
        
        return Math.min(factors.reduce((sum, factor) => sum + factor, 0), 1);
    }

    classifyRiskLevel(probability) {
        if (probability < 0.3) return 'low';
        if (probability < 0.6) return 'medium';
        return 'high';
    }

    generateChurnRecommendations(features) {
        const recommendations = [];
        
        if (features.activityDecline > 0.5) {
            recommendations.push('新しいゲームを試してみましょう');
        }
        
        if (features.scoreDecline > 20) {
            recommendations.push('難易度を下げて練習しましょう');
        }
        
        if (features.daysSinceLastActivity > 7) {
            recommendations.push('定期的にゲームを楽しみましょう');
        }
        
        return recommendations;
    }

    generateDifficultyReasoning(features) {
        if (features.averageScore > 80) {
            return '高いスコアを維持しているため、より難しい課題に挑戦することをお勧めします';
        } else if (features.averageScore < 40) {
            return '基礎を固めるため、より簡単なレベルから始めることをお勧めします';
        } else {
            return '現在のレベルで安定した成績を上げているため、この難易度を継続することをお勧めします';
        }
    }

    calculateGameRecommendationConfidence(score) {
        return Math.min(score * 1.2, 1);
    }

    getGameName(gameType) {
        const gameNames = {
            memory_game: '記憶ゲーム',
            reaction_game: '反応速度ゲーム',
            calculation_game: '計算ゲーム',
            pattern_memory: 'パターンメモリーゲーム',
            puzzle_game: 'パズルゲーム'
        };
        return gameNames[gameType] || gameType;
    }

    getDefaultPrediction() {
        return {
            prediction: 50,
            confidence: 0.5,
            range: { min: 30, max: 70 },
            factors: {},
            horizon: 7
        };
    }

    getDefaultEngagementPrediction() {
        return {
            prediction: 0.5,
            confidence: 0.5,
            trend: 'stable',
            factors: {},
            horizon: 7
        };
    }

    getDefaultChurnPrediction() {
        return {
            probability: 0.3,
            confidence: 0.5,
            riskLevel: 'medium',
            factors: {},
            recommendations: [],
            horizon: 30
        };
    }

    getDefaultDifficultyFeatures() {
        return {
            averageScore: 50,
            scoreConsistency: 0.5,
            preferredDifficulty: 'medium',
            improvementRate: 0,
            challengePreference: 0.5,
            frustrationLevel: 0.3
        };
    }

    getDefaultGameRecommendations(count) {
        const defaultGames = [
            { gameType: 'memory_game', gameName: '記憶ゲーム' },
            { gameType: 'reaction_game', gameName: '反応速度ゲーム' },
            { gameType: 'calculation_game', gameName: '計算ゲーム' }
        ];
        
        return defaultGames.slice(0, count).map((game, index) => ({
            rank: index + 1,
            gameType: game.gameType,
            gameName: game.gameName,
            score: 0.5,
            confidence: 0.5
        }));
    }

    getDefaultFeatures() {
        return {
            averageScore: 50,
            scoreTrend: 0,
            scoreVariance: 25,
            averagePlayTime: 300,
            averageMistakes: 3,
            completionRate: 0.7,
            recentImprovement: 0,
            consistency: 0.5,
            difficultyLevel: 2,
            gameExperience: 5
        };
    }
}

// グローバルインスタンスを作成
window.predictionEngine = new PredictionEngine();

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PredictionEngine;
} 