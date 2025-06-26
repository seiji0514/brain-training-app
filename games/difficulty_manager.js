/**
 * ゲーム難易度管理システム
 * 各ゲームの難易度設定と動的調整を管理
 */

class DifficultyManager {
    constructor() {
        this.difficultyLevels = {
            easy: { name: '初級', multiplier: 1.0 },
            medium: { name: '中級', multiplier: 1.5 },
            hard: { name: '上級', multiplier: 2.0 },
            expert: { name: 'エキスパート', multiplier: 3.0 }
        };

        this.gameSettings = {
            memory_game: {
                easy: { cardCount: 6, showTime: 3000, maxMistakes: 5 },
                medium: { cardCount: 8, showTime: 2500, maxMistakes: 3 },
                hard: { cardCount: 12, showTime: 2000, maxMistakes: 2 },
                expert: { cardCount: 16, showTime: 1500, maxMistakes: 1 }
            },
            reaction_game: {
                easy: { targetCount: 10, timeLimit: 30, minInterval: 1000 },
                medium: { targetCount: 15, timeLimit: 25, minInterval: 800 },
                hard: { targetCount: 20, timeLimit: 20, minInterval: 600 },
                expert: { targetCount: 25, timeLimit: 15, minInterval: 400 }
            },
            calculation_game: {
                easy: { maxNumber: 20, operationCount: 3, timeLimit: 60 },
                medium: { maxNumber: 50, operationCount: 4, timeLimit: 45 },
                hard: { maxNumber: 100, operationCount: 5, timeLimit: 30 },
                expert: { maxNumber: 200, operationCount: 6, timeLimit: 20 }
            },
            pattern_memory: {
                easy: { sequenceLength: 3, showTime: 2000, gridSize: 3 },
                medium: { sequenceLength: 4, showTime: 1500, gridSize: 4 },
                hard: { sequenceLength: 5, showTime: 1000, gridSize: 4 },
                expert: { sequenceLength: 6, showTime: 800, gridSize: 5 }
            },
            puzzle_game: {
                easy: { pieceCount: 9, timeLimit: 300, hints: 3 },
                medium: { pieceCount: 16, timeLimit: 240, hints: 2 },
                hard: { pieceCount: 25, timeLimit: 180, hints: 1 },
                expert: { pieceCount: 36, timeLimit: 120, hints: 0 }
            }
        };

        this.userProgress = this.loadUserProgress();
        this.adaptiveSettings = this.loadAdaptiveSettings();
    }

    /**
     * ゲーム設定を取得
     */
    getGameSettings(gameId, difficulty) {
        const settings = this.gameSettings[gameId];
        if (!settings || !settings[difficulty]) {
            throw new Error(`Invalid game or difficulty: ${gameId}, ${difficulty}`);
        }
        return { ...settings[difficulty] };
    }

    /**
     * ユーザーの実績に基づいて適応的難易度を計算
     */
    calculateAdaptiveDifficulty(gameId, userId) {
        const userStats = this.getUserStats(gameId, userId);
        const baseDifficulty = this.getBaseDifficulty(userStats);
        
        // 最近の成績を分析
        const recentScores = userStats.recentScores || [];
        const averageScore = recentScores.length > 0 
            ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length 
            : 50;

        // 難易度調整
        let adjustedDifficulty = baseDifficulty;
        if (averageScore > 80) {
            adjustedDifficulty = this.increaseDifficulty(baseDifficulty);
        } else if (averageScore < 30) {
            adjustedDifficulty = this.decreaseDifficulty(baseDifficulty);
        }

        return adjustedDifficulty;
    }

    /**
     * 基本難易度を取得
     */
    getBaseDifficulty(userStats) {
        const totalGames = userStats.totalGames || 0;
        const averageScore = userStats.averageScore || 50;

        if (totalGames < 5) {
            return 'easy';
        } else if (averageScore > 70) {
            return 'hard';
        } else if (averageScore > 40) {
            return 'medium';
        } else {
            return 'easy';
        }
    }

    /**
     * 難易度を上げる
     */
    increaseDifficulty(currentDifficulty) {
        const difficulties = Object.keys(this.difficultyLevels);
        const currentIndex = difficulties.indexOf(currentDifficulty);
        return difficulties[Math.min(currentIndex + 1, difficulties.length - 1)];
    }

    /**
     * 難易度を下げる
     */
    decreaseDifficulty(currentDifficulty) {
        const difficulties = Object.keys(this.difficultyLevels);
        const currentIndex = difficulties.indexOf(currentDifficulty);
        return difficulties[Math.max(currentIndex - 1, 0)];
    }

    /**
     * ユーザー統計を取得
     */
    getUserStats(gameId, userId) {
        return this.userProgress[userId]?.[gameId] || {
            totalGames: 0,
            averageScore: 0,
            bestScore: 0,
            recentScores: [],
            preferredDifficulty: 'easy'
        };
    }

    /**
     * ゲーム結果を記録
     */
    recordGameResult(gameId, userId, result) {
        if (!this.userProgress[userId]) {
            this.userProgress[userId] = {};
        }
        if (!this.userProgress[userId][gameId]) {
            this.userProgress[userId][gameId] = {
                totalGames: 0,
                averageScore: 0,
                bestScore: 0,
                recentScores: [],
                preferredDifficulty: 'easy'
            };
        }

        const stats = this.userProgress[userId][gameId];
        
        // 統計を更新
        stats.totalGames++;
        stats.recentScores.push(result.score);
        
        // 最近10回のスコアのみ保持
        if (stats.recentScores.length > 10) {
            stats.recentScores.shift();
        }

        // 平均スコアを計算
        stats.averageScore = stats.recentScores.reduce((sum, score) => sum + score, 0) / stats.recentScores.length;
        
        // 最高スコアを更新
        if (result.score > stats.bestScore) {
            stats.bestScore = result.score;
        }

        // 好みの難易度を更新
        if (result.completed && result.score > 70) {
            stats.preferredDifficulty = result.difficulty;
        }

        this.saveUserProgress();
    }

    /**
     * 動的難易度調整
     */
    adjustDifficultyDynamically(gameId, userId, currentPerformance) {
        const userStats = this.getUserStats(gameId, userId);
        const currentDifficulty = userStats.preferredDifficulty;
        
        // パフォーマンスに基づいて調整
        let newDifficulty = currentDifficulty;
        
        if (currentPerformance.score > 85 && currentPerformance.completed) {
            newDifficulty = this.increaseDifficulty(currentDifficulty);
        } else if (currentPerformance.score < 30 || !currentPerformance.completed) {
            newDifficulty = this.decreaseDifficulty(currentDifficulty);
        }

        // 難易度変更を記録
        if (newDifficulty !== currentDifficulty) {
            this.adaptiveSettings[userId] = this.adaptiveSettings[userId] || {};
            this.adaptiveSettings[userId][gameId] = {
                previousDifficulty: currentDifficulty,
                newDifficulty: newDifficulty,
                reason: currentPerformance.score > 85 ? 'high_performance' : 'low_performance',
                timestamp: Date.now()
            };
            
            userStats.preferredDifficulty = newDifficulty;
            this.saveUserProgress();
            this.saveAdaptiveSettings();
        }

        return newDifficulty;
    }

    /**
     * ゲーム固有の難易度設定を取得
     */
    getGameSpecificSettings(gameId, difficulty, customParams = {}) {
        const baseSettings = this.getGameSettings(gameId, difficulty);
        
        // カスタムパラメータで上書き
        return { ...baseSettings, ...customParams };
    }

    /**
     * 難易度別スコア計算
     */
    calculateScore(baseScore, difficulty, bonusFactors = {}) {
        const difficultyMultiplier = this.difficultyLevels[difficulty].multiplier;
        let finalScore = baseScore * difficultyMultiplier;

        // ボーナス要因を適用
        if (bonusFactors.timeBonus) {
            finalScore += bonusFactors.timeBonus;
        }
        if (bonusFactors.streakBonus) {
            finalScore += bonusFactors.streakBonus;
        }
        if (bonusFactors.accuracyBonus) {
            finalScore += bonusFactors.accuracyBonus;
        }

        return Math.round(finalScore);
    }

    /**
     * 難易度別目標設定
     */
    getDifficultyGoals(gameId, difficulty) {
        const goals = {
            memory_game: {
                easy: { targetScore: 100, targetTime: 60, targetAccuracy: 0.8 },
                medium: { targetScore: 150, targetTime: 45, targetAccuracy: 0.85 },
                hard: { targetScore: 200, targetTime: 30, targetAccuracy: 0.9 },
                expert: { targetScore: 250, targetTime: 20, targetAccuracy: 0.95 }
            },
            reaction_game: {
                easy: { targetScore: 80, targetTime: 30, targetAccuracy: 0.7 },
                medium: { targetScore: 120, targetTime: 25, targetAccuracy: 0.8 },
                hard: { targetScore: 160, targetTime: 20, targetAccuracy: 0.85 },
                expert: { targetScore: 200, targetTime: 15, targetAccuracy: 0.9 }
            },
            calculation_game: {
                easy: { targetScore: 90, targetTime: 60, targetAccuracy: 0.75 },
                medium: { targetScore: 135, targetTime: 45, targetAccuracy: 0.8 },
                hard: { targetScore: 180, targetTime: 30, targetAccuracy: 0.85 },
                expert: { targetScore: 225, targetTime: 20, targetAccuracy: 0.9 }
            }
        };

        return goals[gameId]?.[difficulty] || { targetScore: 100, targetTime: 60, targetAccuracy: 0.8 };
    }

    /**
     * 難易度別ヒントシステム
     */
    getHints(gameId, difficulty, currentProgress) {
        const hintSettings = {
            memory_game: {
                easy: { showTimer: true, highlightMatches: true, showProgress: true },
                medium: { showTimer: true, highlightMatches: false, showProgress: true },
                hard: { showTimer: false, highlightMatches: false, showProgress: false },
                expert: { showTimer: false, highlightMatches: false, showProgress: false }
            },
            calculation_game: {
                easy: { showTimer: true, showHints: true, allowCalculator: true },
                medium: { showTimer: true, showHints: false, allowCalculator: false },
                hard: { showTimer: false, showHints: false, allowCalculator: false },
                expert: { showTimer: false, showHints: false, allowCalculator: false }
            }
        };

        return hintSettings[gameId]?.[difficulty] || {};
    }

    /**
     * ユーザープログレスを保存
     */
    saveUserProgress() {
        try {
            localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
        } catch (error) {
            console.error('Failed to save user progress:', error);
        }
    }

    /**
     * ユーザープログレスを読み込み
     */
    loadUserProgress() {
        try {
            const saved = localStorage.getItem('userProgress');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load user progress:', error);
            return {};
        }
    }

    /**
     * 適応設定を保存
     */
    saveAdaptiveSettings() {
        try {
            localStorage.setItem('adaptiveSettings', JSON.stringify(this.adaptiveSettings));
        } catch (error) {
            console.error('Failed to save adaptive settings:', error);
        }
    }

    /**
     * 適応設定を読み込み
     */
    loadAdaptiveSettings() {
        try {
            const saved = localStorage.getItem('adaptiveSettings');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Failed to load adaptive settings:', error);
            return {};
        }
    }

    /**
     * 難易度レポートを生成
     */
    generateDifficultyReport(userId) {
        const report = {
            userId: userId,
            overallStats: {
                totalGames: 0,
                averageScore: 0,
                preferredDifficulty: 'easy'
            },
            gameStats: {},
            recommendations: []
        };

        let totalGames = 0;
        let totalScore = 0;

        for (const [gameId, stats] of Object.entries(this.userProgress[userId] || {})) {
            report.gameStats[gameId] = {
                totalGames: stats.totalGames,
                averageScore: stats.averageScore,
                bestScore: stats.bestScore,
                preferredDifficulty: stats.preferredDifficulty
            };

            totalGames += stats.totalGames;
            totalScore += stats.averageScore * stats.totalGames;
        }

        if (totalGames > 0) {
            report.overallStats.totalGames = totalGames;
            report.overallStats.averageScore = totalScore / totalGames;
        }

        // 推奨事項を生成
        report.recommendations = this.generateRecommendations(userId, report);

        return report;
    }

    /**
     * 推奨事項を生成
     */
    generateRecommendations(userId, report) {
        const recommendations = [];

        for (const [gameId, stats] of Object.entries(report.gameStats)) {
            if (stats.totalGames < 3) {
                recommendations.push({
                    gameId: gameId,
                    type: 'practice_more',
                    message: `${this.getGameName(gameId)}をもっと練習しましょう`,
                    priority: 'high'
                });
            } else if (stats.averageScore > 80) {
                recommendations.push({
                    gameId: gameId,
                    type: 'increase_difficulty',
                    message: `${this.getGameName(gameId)}の難易度を上げてみましょう`,
                    priority: 'medium'
                });
            } else if (stats.averageScore < 40) {
                recommendations.push({
                    gameId: gameId,
                    type: 'decrease_difficulty',
                    message: `${this.getGameName(gameId)}の難易度を下げてみましょう`,
                    priority: 'high'
                });
            }
        }

        return recommendations;
    }

    /**
     * ゲーム名を取得
     */
    getGameName(gameId) {
        const gameNames = {
            memory_game: '記憶ゲーム',
            reaction_game: '反応速度ゲーム',
            calculation_game: '計算ゲーム',
            pattern_memory: 'パターンメモリーゲーム',
            puzzle_game: 'パズルゲーム'
        };
        return gameNames[gameId] || gameId;
    }
}

// グローバルインスタンスを作成
window.difficultyManager = new DifficultyManager();

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifficultyManager;
} 