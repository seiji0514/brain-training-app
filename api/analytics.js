const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { checkAuth } = require('./middleware');

// ユーザー行動分析
router.get('/user-behavior', checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // ゲームプレイ統計
        const gameStats = await db.query(
            `SELECT 
                g.name as game_name,
                COUNT(*) as play_count,
                AVG(r.score) as avg_score,
                MAX(r.score) as best_score,
                AVG(r.play_time) as avg_play_time,
                SUM(CASE WHEN r.completed = 1 THEN 1 ELSE 0 END) as completed_count
             FROM game_records r
             JOIN games g ON r.game_id = g.id
             WHERE r.user_id = ?
             GROUP BY g.id, g.name
             ORDER BY play_count DESC`,
            [userId]
        );

        // プレイ時間の傾向
        const timeTrend = await db.query(
            `SELECT 
                DATE(created_at) as play_date,
                COUNT(*) as daily_plays,
                AVG(play_time) as avg_daily_time
             FROM game_records
             WHERE user_id = ? AND created_at > datetime('now', '-30 days')
             GROUP BY DATE(created_at)
             ORDER BY play_date DESC`,
            [userId]
        );

        // 改善傾向分析
        const improvementTrend = await db.query(
            `SELECT 
                g.name as game_name,
                DATE(r.created_at) as play_date,
                AVG(r.score) as daily_avg_score
             FROM game_records r
             JOIN games g ON r.game_id = g.id
             WHERE r.user_id = ? AND r.created_at > datetime('now', '-7 days')
             GROUP BY g.id, g.name, DATE(r.created_at)
             ORDER BY g.name, play_date`,
            [userId]
        );

        res.json({
            gameStats,
            timeTrend,
            improvementTrend
        });
    } catch (error) {
        console.error('User behavior analysis error:', error);
        res.status(500).json({ error: '分析データの取得に失敗しました' });
    }
});

// ゲーム成績レポート
router.get('/game-reports', checkAuth, async (req, res) => {
    try {
        const { gameId, period = '7' } = req.query;
        const userId = req.user.id;

        let whereClause = 'WHERE r.user_id = ?';
        let params = [userId];

        if (gameId) {
            whereClause += ' AND r.game_id = ?';
            params.push(gameId);
        }

        // 期間別統計
        const periodStats = await db.query(
            `SELECT 
                g.name as game_name,
                COUNT(*) as total_plays,
                AVG(r.score) as avg_score,
                MAX(r.score) as best_score,
                MIN(r.score) as worst_score,
                AVG(r.play_time) as avg_time,
                SUM(CASE WHEN r.completed = 1 THEN 1 ELSE 0 END) as completed_count,
                SUM(r.mistakes) as total_mistakes,
                AVG(r.mistakes) as avg_mistakes
             FROM game_records r
             JOIN games g ON r.game_id = g.id
             ${whereClause} AND r.created_at > datetime('now', '-${period} days')
             GROUP BY g.id, g.name
             ORDER BY total_plays DESC`,
            params
        );

        // 詳細な成績履歴
        const detailedHistory = await db.query(
            `SELECT 
                r.*,
                g.name as game_name
             FROM game_records r
             JOIN games g ON r.game_id = g.id
             ${whereClause} AND r.created_at > datetime('now', '-${period} days')
             ORDER BY r.created_at DESC`,
            params
        );

        res.json({
            periodStats,
            detailedHistory,
            period: period
        });
    } catch (error) {
        console.error('Game reports error:', error);
        res.status(500).json({ error: 'レポートの取得に失敗しました' });
    }
});

// 統計ダッシュボード（管理者用）
router.get('/dashboard-stats', checkAuth, async (req, res) => {
    try {
        // 管理者権限チェック
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: '管理者権限が必要です' });
        }

        // 全体統計
        const overallStats = await db.query(
            `SELECT 
                COUNT(DISTINCT u.id) as total_users,
                COUNT(DISTINCT r.user_id) as active_users,
                COUNT(r.id) as total_plays,
                AVG(r.score) as avg_score,
                SUM(r.play_time) as total_play_time
             FROM users u
             LEFT JOIN game_records r ON u.id = r.user_id
             WHERE u.role = 'user'`
        );

        // 人気ゲームランキング
        const popularGames = await db.query(
            `SELECT 
                g.name as game_name,
                COUNT(*) as play_count,
                AVG(r.score) as avg_score
             FROM game_records r
             JOIN games g ON r.game_id = g.id
             GROUP BY g.id, g.name
             ORDER BY play_count DESC
             LIMIT 10`
        );

        // 日別アクティブユーザー数
        const dailyActiveUsers = await db.query(
            `SELECT 
                DATE(created_at) as date,
                COUNT(DISTINCT user_id) as active_users
             FROM game_records
             WHERE created_at > datetime('now', '-30 days')
             GROUP BY DATE(created_at)
             ORDER BY date DESC`
        );

        // ユーザーエンゲージメント
        const userEngagement = await db.query(
            `SELECT 
                u.username,
                COUNT(r.id) as total_plays,
                AVG(r.score) as avg_score,
                SUM(r.play_time) as total_time,
                MAX(r.created_at) as last_play
             FROM users u
             LEFT JOIN game_records r ON u.id = r.user_id
             WHERE u.role = 'user'
             GROUP BY u.id, u.username
             ORDER BY total_plays DESC
             LIMIT 20`
        );

        res.json({
            overallStats: overallStats[0],
            popularGames,
            dailyActiveUsers,
            userEngagement
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: '統計データの取得に失敗しました' });
    }
});

// パフォーマンス分析
router.get('/performance-analysis', checkAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameId } = req.query;

        let whereClause = 'WHERE r.user_id = ?';
        let params = [userId];

        if (gameId) {
            whereClause += ' AND r.game_id = ?';
            params.push(gameId);
        }

        // スコアの分布
        const scoreDistribution = await db.query(
            `SELECT 
                CASE 
                    WHEN score >= 90 THEN 'Excellent (90-100)'
                    WHEN score >= 80 THEN 'Good (80-89)'
                    WHEN score >= 70 THEN 'Fair (70-79)'
                    WHEN score >= 60 THEN 'Poor (60-69)'
                    ELSE 'Very Poor (<60)'
                END as score_range,
                COUNT(*) as count
             FROM game_records r
             ${whereClause}
             GROUP BY score_range
             ORDER BY MIN(score)`,
            params
        );

        // 改善率分析
        const improvementRate = await db.query(
            `SELECT 
                g.name as game_name,
                AVG(CASE 
                    WHEN r.created_at > datetime('now', '-7 days') THEN r.score
                    ELSE NULL 
                END) as recent_avg,
                AVG(CASE 
                    WHEN r.created_at <= datetime('now', '-7 days') AND r.created_at > datetime('now', '-14 days') THEN r.score
                    ELSE NULL 
                END) as previous_avg
             FROM game_records r
             JOIN games g ON r.game_id = g.id
             ${whereClause} AND r.created_at > datetime('now', '-14 days')
             GROUP BY g.id, g.name`,
            params
        );

        res.json({
            scoreDistribution,
            improvementRate
        });
    } catch (error) {
        console.error('Performance analysis error:', error);
        res.status(500).json({ error: 'パフォーマンス分析の取得に失敗しました' });
    }
});

module.exports = router; 