// 結果表示の設定を取得
function getResultSettings() {
    const defaultSettings = {
        resultTitle: "お疲れ様でした！",
        correctText: "正解数：",
        missText: "ミス回数：",
        retryText: "もう一度挑戦",
        topText: "トップ画面へ",
        missColor: "#e74c3c"
    };
    
    const savedSettings = JSON.parse(localStorage.getItem('gameResultSettings') || '{}');
    return { ...defaultSettings, ...savedSettings };
}

// ゲーム設定を取得
function getGameSettings(gameId) {
    const defaultSettings = {
        difficulty: 'normal',
        totalQuestions: 10,
        timeLimit: 30,
        scoreMethod: 'simple'
    };
    
    const savedSettings = JSON.parse(localStorage.getItem(`game_${gameId}_settings`) || '{}');
    const globalSettings = JSON.parse(localStorage.getItem('globalSettings') || '{}');
    
    return { 
        ...defaultSettings, 
        ...globalSettings,
        ...savedSettings 
    };
}

// 結果画面を表示
function showGameResult(correctCount, totalCount, missCount) {
    const settings = getResultSettings();
    const gameResult = document.getElementById('gameResult');
    
    gameResult.innerHTML = `
        <h2>${settings.resultTitle}</h2>
        <div>${settings.correctText}<span>${correctCount}</span> / <span>${totalCount}</span></div>
        <div>${settings.missText}<span style="color: ${settings.missColor}; font-weight: bold;">${missCount}</span></div>
        <button onclick="restartGame()">${settings.retryText}</button>
        <a href="brain_training_game.html">${settings.topText}</a>
    `;
    
    gameResult.style.display = 'block';
}

// 結果画面を非表示
function hideGameResult() {
    const gameResult = document.getElementById('gameResult');
    if (gameResult) {
        gameResult.style.display = 'none';
    }
}

// スコアを計算
function calculateScore(correctCount, totalCount, timeUsed, comboCount = 0) {
    const settings = getGameSettings('current');
    let score = 0;
    
    switch (settings.scoreMethod) {
        case 'time':
            // 時間を考慮したスコア計算
            const timeBonus = Math.max(0, settings.timeLimit - timeUsed);
            score = (correctCount * 10) + (timeBonus * 0.5);
            break;
            
        case 'combo':
            // コンボボーナスありのスコア計算
            score = (correctCount * 10) + (comboCount * 5);
            break;
            
        default:
            // 正解数のみ
            score = correctCount * 10;
    }
    
    return Math.round(score);
}

// 難易度に応じた設定を取得
function getDifficultySettings(gameId) {
    const settings = getGameSettings(gameId);
    const difficultySettings = {
        easy: {
            timeLimit: settings.timeLimit * 1.5,
            totalQuestions: Math.min(settings.totalQuestions, 5)
        },
        normal: {
            timeLimit: settings.timeLimit,
            totalQuestions: settings.totalQuestions
        },
        hard: {
            timeLimit: settings.timeLimit * 0.7,
            totalQuestions: Math.min(settings.totalQuestions + 5, 20)
        }
    };
    
    return difficultySettings[settings.difficulty] || difficultySettings.normal;
} 