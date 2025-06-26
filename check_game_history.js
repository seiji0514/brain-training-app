const db = require('./db/database');

async function checkGameHistory() {
    try {
        console.log('=== ゲーム利用履歴確認 ===\n');

        // 1. 全ユーザーのゲーム利用状況
        console.log('1. 全ユーザーのゲーム利用状況:');
        const userGameStats = await db.query(`
            SELECT 
                u.username,
                u.role,
                COUNT(r.id) as total_plays,
                COUNT(DISTINCT r.game_id) as games_played,
                AVG(r.score) as avg_score,
                MAX(r.created_at) as last_play
            FROM users u
            LEFT JOIN game_records r ON u.id = r.user_id
            GROUP BY u.id, u.username, u.role
            ORDER BY total_plays DESC
        `);

        userGameStats.forEach(user => {
            console.log(`  ${user.username} (${user.role}):`);
            console.log(`    総プレイ回数: ${user.total_plays || 0}`);
            console.log(`    利用ゲーム数: ${user.games_played || 0}`);
            console.log(`    平均スコア: ${user.avg_score ? user.avg_score.toFixed(1) : 'N/A'}`);
            console.log(`    最終プレイ: ${user.last_play || 'N/A'}`);
            console.log('');
        });

        // 2. ゲーム別利用状況
        console.log('2. ゲーム別利用状況:');
        const gameStats = await db.query(`
            SELECT 
                g.name as game_name,
                COUNT(r.id) as total_plays,
                COUNT(DISTINCT r.user_id) as unique_users,
                AVG(r.score) as avg_score,
                AVG(r.play_time) as avg_play_time
            FROM games g
            LEFT JOIN game_records r ON g.id = r.game_id
            GROUP BY g.id, g.name
            ORDER BY total_plays DESC
        `);

        gameStats.forEach(game => {
            console.log(`  ${game.game_name}:`);
            console.log(`    総プレイ回数: ${game.total_plays || 0}`);
            console.log(`    利用ユーザー数: ${game.unique_users || 0}`);
            console.log(`    平均スコア: ${game.avg_score ? game.avg_score.toFixed(1) : 'N/A'}`);
            console.log(`    平均プレイ時間: ${game.avg_play_time ? game.avg_play_time.toFixed(1) + '秒' : 'N/A'}`);
            console.log('');
        });

        // 3. 最近のゲーム利用履歴（最新10件）
        console.log('3. 最近のゲーム利用履歴（最新10件）:');
        const recentHistory = await db.query(`
            SELECT 
                u.username,
                g.name as game_name,
                r.score,
                r.play_time,
                r.mistakes,
                r.completed,
                r.created_at
            FROM game_records r
            JOIN users u ON r.user_id = u.id
            JOIN games g ON r.game_id = g.id
            ORDER BY r.created_at DESC
            LIMIT 10
        `);

        recentHistory.forEach(record => {
            console.log(`  ${record.created_at}: ${record.username} → ${record.game_name}`);
            console.log(`    スコア: ${record.score}, 時間: ${record.play_time}秒, ミス: ${record.mistakes}, 完了: ${record.completed ? 'Yes' : 'No'}`);
            console.log('');
        });

        // 4. リハビリスタッフ（userロール）の詳細分析
        console.log('4. リハビリスタッフ（userロール）の詳細分析:');
        const staffAnalysis = await db.query(`
            SELECT 
                u.username,
                g.name as game_name,
                COUNT(*) as play_count,
                AVG(r.score) as avg_score,
                MAX(r.score) as best_score,
                AVG(r.play_time) as avg_time,
                SUM(r.mistakes) as total_mistakes,
                MAX(r.created_at) as last_play
            FROM game_records r
            JOIN users u ON r.user_id = u.id
            JOIN games g ON r.game_id = g.id
            WHERE u.role = 'user'
            GROUP BY u.id, u.username, g.id, g.name
            ORDER BY u.username, play_count DESC
        `);

        let currentUser = '';
        staffAnalysis.forEach(record => {
            if (currentUser !== record.username) {
                currentUser = record.username;
                console.log(`\n  ${record.username}:`);
            }
            console.log(`    ${record.game_name}: ${record.play_count}回, 平均スコア: ${record.avg_score.toFixed(1)}, 最高スコア: ${record.best_score}, 平均時間: ${record.avg_time.toFixed(1)}秒`);
        });

    } catch (error) {
        console.error('エラーが発生しました:', error);
    } finally {
        process.exit(0);
    }
}

checkGameHistory(); 