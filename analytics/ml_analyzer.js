/**
 * 機械学習分析システム
 * ユーザー行動分析、予測分析、パターン検出を実行
 */

class MLAnalyzer {
    constructor() {
        this.models = new Map();
        this.features = new Map();
        this.predictions = new Map();
        this.clusters = new Map();
        
        this.config = {
            minDataPoints: 50,
            predictionHorizon: 7, // 7日先まで予測
            clusterCount: 5,
            confidenceThreshold: 0.7
        };

        this.initializeModels();
    }

    /**
     * 機械学習モデルを初期化
     */
    initializeModels() {
        // 線形回帰モデル（スコア予測）
        this.models.set('score_prediction', {
            type: 'linear_regression',
            features: ['previous_scores', 'play_frequency', 'difficulty_level', 'time_of_day'],
            trained: false,
            coefficients: null,
            intercept: null
        });

        // 分類モデル（難易度推奨）
        this.models.set('difficulty_recommendation', {
            type: 'logistic_regression',
            features: ['average_score', 'completion_rate', 'play_time', 'mistake_rate'],
            trained: false,
            coefficients: null,
            intercept: null
        });

        // クラスタリングモデル（ユーザーセグメンテーション）
        this.models.set('user_clustering', {
            type: 'kmeans',
            features: ['total_games', 'average_score', 'preferred_games', 'play_pattern'],
            trained: false,
            centroids: null,
            labels: null
        });

        // 時系列モデル（トレンド予測）
        this.models.set('trend_prediction', {
            type: 'time_series',
            features: ['daily_scores', 'weekly_patterns', 'seasonal_factors'],
            trained: false,
            parameters: null
        });
    }

    /**
     * データを前処理
     */
    preprocessData(rawData) {
        const processedData = {
            features: [],
            labels: [],
            metadata: []
        };

        rawData.forEach(record => {
            const features = this.extractFeatures(record);
            const label = this.extractLabel(record);
            
            if (features && label !== null) {
                processedData.features.push(features);
                processedData.labels.push(label);
                processedData.metadata.push({
                    userId: record.userId,
                    timestamp: record.timestamp,
                    gameType: record.gameType
                });
            }
        });

        return processedData;
    }

    /**
     * 特徴量を抽出
     */
    extractFeatures(record) {
        const features = {};

        // 基本統計
        features.previous_scores = this.calculatePreviousScores(record.userId, record.timestamp);
        features.play_frequency = this.calculatePlayFrequency(record.userId, record.timestamp);
        features.average_score = this.calculateAverageScore(record.userId);
        features.completion_rate = this.calculateCompletionRate(record.userId);
        features.play_time = record.playTime || 0;
        features.mistake_rate = this.calculateMistakeRate(record.userId);
        features.difficulty_level = this.encodeDifficulty(record.difficulty);
        features.time_of_day = this.extractTimeOfDay(record.timestamp);
        features.day_of_week = this.extractDayOfWeek(record.timestamp);

        // ゲーム固有の特徴
        features.game_type = this.encodeGameType(record.gameType);
        features.score_variance = this.calculateScoreVariance(record.userId);
        features.improvement_rate = this.calculateImprovementRate(record.userId);

        return features;
    }

    /**
     * ラベルを抽出
     */
    extractLabel(record) {
        // スコア予測の場合
        if (this.currentModel === 'score_prediction') {
            return record.score;
        }
        
        // 難易度推奨の場合
        if (this.currentModel === 'difficulty_recommendation') {
            return this.classifyDifficulty(record.score, record.difficulty);
        }

        return null;
    }

    /**
     * 線形回帰モデルを訓練
     */
    trainLinearRegression(features, labels) {
        const n = features.length;
        const m = features[0].length;
        
        // 正規化
        const normalizedFeatures = this.normalizeFeatures(features);
        
        // 最小二乗法で係数を計算
        const X = this.addBias(normalizedFeatures);
        const y = labels;
        
        // (X^T * X)^(-1) * X^T * y
        const Xt = this.transpose(X);
        const XtX = this.multiply(Xt, X);
        const XtX_inv = this.inverse(XtX);
        const Xty = this.multiply(Xt, y.map(val => [val]));
        
        const coefficients = this.multiply(XtX_inv, Xty);
        
        return {
            coefficients: coefficients.slice(1).map(row => row[0]),
            intercept: coefficients[0][0],
            featureMeans: this.calculateFeatureMeans(features),
            featureStds: this.calculateFeatureStds(features)
        };
    }

    /**
     * ロジスティック回帰モデルを訓練
     */
    trainLogisticRegression(features, labels) {
        const n = features.length;
        const m = features[0].length;
        
        // 正規化
        const normalizedFeatures = this.normalizeFeatures(features);
        
        // 勾配降下法でパラメータを最適化
        let weights = new Array(m + 1).fill(0);
        const learningRate = 0.01;
        const iterations = 1000;
        
        for (let i = 0; i < iterations; i++) {
            const gradients = this.calculateLogisticGradients(normalizedFeatures, labels, weights);
            weights = weights.map((w, j) => w - learningRate * gradients[j]);
        }
        
        return {
            coefficients: weights.slice(1),
            intercept: weights[0],
            featureMeans: this.calculateFeatureMeans(features),
            featureStds: this.calculateFeatureStds(features)
        };
    }

    /**
     * K-meansクラスタリングを実行
     */
    trainKMeans(features, k = 5) {
        const n = features.length;
        const m = features[0].length;
        
        // 初期クラスタ中心をランダムに選択
        let centroids = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * n);
            centroids.push([...features[randomIndex]]);
        }
        
        let labels = new Array(n).fill(0);
        let converged = false;
        let iterations = 0;
        const maxIterations = 100;
        
        while (!converged && iterations < maxIterations) {
            const oldLabels = [...labels];
            
            // 各データポイントを最も近いクラスタに割り当て
            for (let i = 0; i < n; i++) {
                let minDistance = Infinity;
                let bestCluster = 0;
                
                for (let j = 0; j < k; j++) {
                    const distance = this.euclideanDistance(features[i], centroids[j]);
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestCluster = j;
                    }
                }
                
                labels[i] = bestCluster;
            }
            
            // クラスタ中心を更新
            for (let j = 0; j < k; j++) {
                const clusterPoints = features.filter((_, i) => labels[i] === j);
                if (clusterPoints.length > 0) {
                    centroids[j] = this.calculateCentroid(clusterPoints);
                }
            }
            
            // 収束チェック
            converged = this.arraysEqual(oldLabels, labels);
            iterations++;
        }
        
        return { centroids, labels, iterations };
    }

    /**
     * モデルを訓練
     */
    async trainModel(modelName, data) {
        const model = this.models.get(modelName);
        if (!model) {
            throw new Error(`Unknown model: ${modelName}`);
        }

        this.currentModel = modelName;
        const processedData = this.preprocessData(data);
        
        if (processedData.features.length < this.config.minDataPoints) {
            throw new Error(`Insufficient data points. Need at least ${this.config.minDataPoints}`);
        }

        try {
            switch (model.type) {
                case 'linear_regression':
                    const lrResult = this.trainLinearRegression(processedData.features, processedData.labels);
                    model.coefficients = lrResult.coefficients;
                    model.intercept = lrResult.intercept;
                    model.featureMeans = lrResult.featureMeans;
                    model.featureStds = lrResult.featureStds;
                    break;
                    
                case 'logistic_regression':
                    const logResult = this.trainLogisticRegression(processedData.features, processedData.labels);
                    model.coefficients = logResult.coefficients;
                    model.intercept = logResult.intercept;
                    model.featureMeans = logResult.featureMeans;
                    model.featureStds = logResult.featureStds;
                    break;
                    
                case 'kmeans':
                    const kmeansResult = this.trainKMeans(processedData.features, this.config.clusterCount);
                    model.centroids = kmeansResult.centroids;
                    model.labels = kmeansResult.labels;
                    break;
                    
                default:
                    throw new Error(`Unsupported model type: ${model.type}`);
            }
            
            model.trained = true;
            model.lastTrained = Date.now();
            
            console.log(`Model ${modelName} trained successfully`);
            return model;
            
        } catch (error) {
            console.error(`Error training model ${modelName}:`, error);
            throw error;
        }
    }

    /**
     * 予測を実行
     */
    predict(modelName, inputData) {
        const model = this.models.get(modelName);
        if (!model || !model.trained) {
            throw new Error(`Model ${modelName} is not trained`);
        }

        const features = this.extractFeatures(inputData);
        const featureVector = this.createFeatureVector(features, model.features);
        
        switch (model.type) {
            case 'linear_regression':
                return this.predictLinearRegression(featureVector, model);
                
            case 'logistic_regression':
                return this.predictLogisticRegression(featureVector, model);
                
            case 'kmeans':
                return this.predictKMeans(featureVector, model);
                
            default:
                throw new Error(`Unsupported model type: ${model.type}`);
        }
    }

    /**
     * 線形回帰予測
     */
    predictLinearRegression(features, model) {
        const normalizedFeatures = this.normalizeFeatureVector(features, model.featureMeans, model.featureStds);
        const prediction = model.intercept + this.dotProduct(normalizedFeatures, model.coefficients);
        
        return {
            prediction: Math.max(0, Math.round(prediction)),
            confidence: this.calculateConfidence(features, model),
            type: 'regression'
        };
    }

    /**
     * ロジスティック回帰予測
     */
    predictLogisticRegression(features, model) {
        const normalizedFeatures = this.normalizeFeatureVector(features, model.featureMeans, model.featureStds);
        const logit = model.intercept + this.dotProduct(normalizedFeatures, model.coefficients);
        const probability = 1 / (1 + Math.exp(-logit));
        
        return {
            prediction: probability > 0.5 ? 'hard' : 'easy',
            probability: probability,
            confidence: Math.abs(probability - 0.5) * 2,
            type: 'classification'
        };
    }

    /**
     * K-means予測
     */
    predictKMeans(features, model) {
        let minDistance = Infinity;
        let bestCluster = 0;
        
        for (let i = 0; i < model.centroids.length; i++) {
            const distance = this.euclideanDistance(features, model.centroids[i]);
            if (distance < minDistance) {
                minDistance = distance;
                bestCluster = i;
            }
        }
        
        return {
            prediction: bestCluster,
            distance: minDistance,
            confidence: 1 / (1 + minDistance),
            type: 'clustering'
        };
    }

    /**
     * ユーザー行動分析
     */
    analyzeUserBehavior(userId, gameData) {
        const analysis = {
            userId: userId,
            patterns: this.detectPatterns(gameData),
            preferences: this.analyzePreferences(gameData),
            performance: this.analyzePerformance(gameData),
            recommendations: []
        };

        // パフォーマンス予測
        try {
            const scorePrediction = this.predict('score_prediction', {
                userId: userId,
                gameData: gameData
            });
            analysis.predictions = {
                nextScore: scorePrediction.prediction,
                confidence: scorePrediction.confidence
            };
        } catch (error) {
            console.warn('Score prediction failed:', error);
        }

        // 難易度推奨
        try {
            const difficultyRecommendation = this.predict('difficulty_recommendation', {
                userId: userId,
                gameData: gameData
            });
            analysis.recommendations.push({
                type: 'difficulty',
                value: difficultyRecommendation.prediction,
                confidence: difficultyRecommendation.confidence
            });
        } catch (error) {
            console.warn('Difficulty recommendation failed:', error);
        }

        return analysis;
    }

    /**
     * パターン検出
     */
    detectPatterns(gameData) {
        const patterns = {
            timePatterns: this.analyzeTimePatterns(gameData),
            scorePatterns: this.analyzeScorePatterns(gameData),
            gamePatterns: this.analyzeGamePatterns(gameData)
        };

        return patterns;
    }

    /**
     * 時間パターン分析
     */
    analyzeTimePatterns(gameData) {
        const timeSlots = new Array(24).fill(0);
        const daySlots = new Array(7).fill(0);
        
        gameData.forEach(record => {
            const date = new Date(record.timestamp);
            timeSlots[date.getHours()]++;
            daySlots[date.getDay()]++;
        });

        const peakHour = timeSlots.indexOf(Math.max(...timeSlots));
        const peakDay = daySlots.indexOf(Math.max(...daySlots));

        return {
            peakHour,
            peakDay,
            timeDistribution: timeSlots,
            dayDistribution: daySlots
        };
    }

    /**
     * スコアパターン分析
     */
    analyzeScorePatterns(gameData) {
        const scores = gameData.map(record => record.score);
        const sortedScores = [...scores].sort((a, b) => a - b);
        
        return {
            mean: this.mean(scores),
            median: this.median(sortedScores),
            std: this.standardDeviation(scores),
            trend: this.calculateTrend(scores),
            improvement: this.calculateImprovement(scores)
        };
    }

    /**
     * ゲームパターン分析
     */
    analyzeGamePatterns(gameData) {
        const gameCounts = {};
        const difficultyCounts = {};
        
        gameData.forEach(record => {
            gameCounts[record.gameType] = (gameCounts[record.gameType] || 0) + 1;
            difficultyCounts[record.difficulty] = (difficultyCounts[record.difficulty] || 0) + 1;
        });

        return {
            favoriteGame: Object.keys(gameCounts).reduce((a, b) => gameCounts[a] > gameCounts[b] ? a : b),
            preferredDifficulty: Object.keys(difficultyCounts).reduce((a, b) => difficultyCounts[a] > difficultyCounts[b] ? a : b),
            gameDistribution: gameCounts,
            difficultyDistribution: difficultyCounts
        };
    }

    /**
     * ユーティリティ関数
     */
    normalizeFeatures(features) {
        const means = this.calculateFeatureMeans(features);
        const stds = this.calculateFeatureStds(features);
        
        return features.map(feature => 
            feature.map((val, i) => (val - means[i]) / stds[i])
        );
    }

    calculateFeatureMeans(features) {
        const m = features[0].length;
        const means = new Array(m).fill(0);
        
        features.forEach(feature => {
            feature.forEach((val, i) => means[i] += val);
        });
        
        return means.map(sum => sum / features.length);
    }

    calculateFeatureStds(features) {
        const means = this.calculateFeatureMeans(features);
        const m = features[0].length;
        const variances = new Array(m).fill(0);
        
        features.forEach(feature => {
            feature.forEach((val, i) => {
                variances[i] += Math.pow(val - means[i], 2);
            });
        });
        
        return variances.map(variance => Math.sqrt(variance / features.length));
    }

    euclideanDistance(a, b) {
        return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
    }

    dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }

    mean(array) {
        return array.reduce((sum, val) => sum + val, 0) / array.length;
    }

    median(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 === 0
            ? (sortedArray[mid - 1] + sortedArray[mid]) / 2
            : sortedArray[mid];
    }

    standardDeviation(array) {
        const mean = this.mean(array);
        const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
        return Math.sqrt(variance);
    }

    arraysEqual(a, b) {
        return a.length === b.length && a.every((val, i) => val === b[i]);
    }

    // その他のヘルパー関数...
    calculatePreviousScores(userId, timestamp) {
        // 実装が必要
        return 0;
    }

    calculatePlayFrequency(userId, timestamp) {
        // 実装が必要
        return 0;
    }

    calculateAverageScore(userId) {
        // 実装が必要
        return 0;
    }

    calculateCompletionRate(userId) {
        // 実装が必要
        return 0;
    }

    calculateMistakeRate(userId) {
        // 実装が必要
        return 0;
    }

    encodeDifficulty(difficulty) {
        const encoding = { easy: 1, medium: 2, hard: 3, expert: 4 };
        return encoding[difficulty] || 1;
    }

    extractTimeOfDay(timestamp) {
        return new Date(timestamp).getHours();
    }

    extractDayOfWeek(timestamp) {
        return new Date(timestamp).getDay();
    }

    encodeGameType(gameType) {
        const encoding = {
            memory_game: 1,
            reaction_game: 2,
            calculation_game: 3,
            pattern_memory: 4,
            puzzle_game: 5
        };
        return encoding[gameType] || 0;
    }

    calculateScoreVariance(userId) {
        // 実装が必要
        return 0;
    }

    calculateImprovementRate(userId) {
        // 実装が必要
        return 0;
    }

    classifyDifficulty(score, difficulty) {
        if (score > 80) return 'hard';
        if (score > 50) return 'medium';
        return 'easy';
    }

    createFeatureVector(features, featureList) {
        return featureList.map(feature => features[feature] || 0);
    }

    normalizeFeatureVector(features, means, stds) {
        return features.map((val, i) => (val - means[i]) / stds[i]);
    }

    calculateConfidence(features, model) {
        // 簡易的な信頼度計算
        return 0.8;
    }

    addBias(features) {
        return features.map(feature => [1, ...feature]);
    }

    transpose(matrix) {
        return matrix[0].map((_, i) => matrix.map(row => row[i]));
    }

    multiply(a, b) {
        const result = [];
        for (let i = 0; i < a.length; i++) {
            result[i] = [];
            for (let j = 0; j < b[0].length; j++) {
                result[i][j] = 0;
                for (let k = 0; k < a[0].length; k++) {
                    result[i][j] += a[i][k] * b[k][j];
                }
            }
        }
        return result;
    }

    inverse(matrix) {
        // 簡易的な逆行列計算（2x2行列のみ対応）
        const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
        return [
            [matrix[1][1] / det, -matrix[0][1] / det],
            [-matrix[1][0] / det, matrix[0][0] / det]
        ];
    }

    calculateLogisticGradients(features, labels, weights) {
        const gradients = new Array(weights.length).fill(0);
        const n = features.length;
        
        for (let i = 0; i < n; i++) {
            const prediction = 1 / (1 + Math.exp(-this.dotProduct([1, ...features[i]], weights)));
            const error = prediction - labels[i];
            
            gradients[0] += error;
            for (let j = 0; j < features[i].length; j++) {
                gradients[j + 1] += error * features[i][j];
            }
        }
        
        return gradients.map(g => g / n);
    }

    calculateCentroid(points) {
        const m = points[0].length;
        const centroid = new Array(m).fill(0);
        
        points.forEach(point => {
            point.forEach((val, i) => centroid[i] += val);
        });
        
        return centroid.map(sum => sum / points.length);
    }

    calculateTrend(scores) {
        if (scores.length < 2) return 0;
        
        const n = scores.length;
        const x = Array.from({length: n}, (_, i) => i);
        const xMean = this.mean(x);
        const yMean = this.mean(scores);
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (x[i] - xMean) * (scores[i] - yMean);
            denominator += Math.pow(x[i] - xMean, 2);
        }
        
        return denominator === 0 ? 0 : numerator / denominator;
    }

    calculateImprovement(scores) {
        if (scores.length < 10) return 0;
        
        const recentScores = scores.slice(-10);
        const olderScores = scores.slice(0, 10);
        
        const recentAvg = this.mean(recentScores);
        const olderAvg = this.mean(olderScores);
        
        return recentAvg - olderAvg;
    }

    analyzePreferences(gameData) {
        // 実装が必要
        return {};
    }

    analyzePerformance(gameData) {
        // 実装が必要
        return {};
    }
}

// グローバルインスタンスを作成
window.mlAnalyzer = new MLAnalyzer();

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MLAnalyzer;
} 