// UI 管理模組
class GameUI {
  constructor() {}

  // 生成難度星星顯示
  generateDifficultyStars(difficulty) {
    if (!GAME_CONFIG.display.showDifficulty || !difficulty) {
      return '';
    }
    
    const config = GAME_CONFIG.display.difficulty;
    const stars = [];
    
    for (let i = 1; i <= config.maxStars; i++) {
      if (i <= difficulty) {
        stars.push(config.filledStar);
      } else {
        stars.push(config.emptyStar);
      }
    }
    
    return `<span class="difficulty-stars" title="難度 ${difficulty}/${config.maxStars}">${stars.join('')}</span>`;
  }

  // 生成主題標籤
  generateTopicBadge(topic) {
    if (!GAME_CONFIG.display.showTopic || !topic) {
      return '';
    }
    
    return `<span class="topic-badge" title="主題">${topic}</span>`;
  }

  // 生成題目資訊區塊
  generateQuestionInfo(question) {
    const difficultyStars = this.generateDifficultyStars(question.difficulty);
    const topicBadge = this.generateTopicBadge(question.topic);
    
    if (!difficultyStars && !topicBadge) {
      return '';
    }
    
    return `
      <div class="question-info">
        ${difficultyStars}
        ${topicBadge}
      </div>
    `;
  }

  // 更新分數顯示
  updateScoreDisplay(gameState, currentPlayer) {
    const scores = gameState.scores || { A: 0, B: 0 };
    const scoreDisplay = document.getElementById('score-display');
    
    if (scoreDisplay) {
      const isPlayerA = currentPlayer === 'A';
      scoreDisplay.innerHTML = `
        <div class="scores">
          <div class="score-item ${isPlayerA ? 'current-player' : ''}">
            <span class="player-name">${gameState.playerA.name}</span>
            <span class="score">${scores.A}</span>
            ${isPlayerA ? '<div class="player-indicator">👤 你</div>' : ''}
          </div>
          <div class="score-item ${!isPlayerA ? 'current-player' : ''}">
            <span class="player-name">${gameState.playerB.name}</span>
            <span class="score">${scores.B}</span>
            ${!isPlayerA ? '<div class="player-indicator">👤 你</div>' : ''}
          </div>
        </div>
      `;
    }
  }

  // 顯示想想UI
  showGuesserUI(question) {
    document.getElementById('guesser-ui').style.display = 'block';
    document.getElementById('answerer-ui').style.display = 'none';
    document.getElementById('result-display').style.display = 'none';
    
    const questionInfo = this.generateQuestionInfo(question);
    
    document.getElementById('guesser-question').innerHTML = `
      <div class="question-text">題目：${question.question}</div>
      ${questionInfo}
    `;
  }

  // 顯示答題者UI
  showAnswererUI(question, role) {
    document.getElementById('guesser-ui').style.display = 'none';
    document.getElementById('answerer-ui').style.display = 'block';
    document.getElementById('result-display').style.display = 'none';
    
    const roleText = role === 'honest' ? '老實人' : '瞎掰人';
    const roleEmoji = role === 'honest' ? '🙋‍♂️' : '🤥';
    
    // 設定角色徽章
    const roleBadge = document.getElementById('answerer-role-badge');
    roleBadge.innerHTML = `${roleEmoji} 你是${roleText}`;
    roleBadge.className = `role-badge ${role}`;
    
    // 設定指示文字
    const instruction = document.getElementById('answerer-instruction');
    if (role === 'honest') {
      instruction.innerHTML = '你看得到正確解說，請據實回答！';
    } else {
      instruction.innerHTML = '你看不到解說，請發揮創意瞎掰一個答案！';
    }
    
    // 顯示題目和題目資訊
    const questionInfo = this.generateQuestionInfo(question);
    document.getElementById('answerer-question').innerHTML = `
      <div class="question-text">題目：${question.question}</div>
      ${questionInfo}
    `;
    
    // 根據角色顯示解說
    const explanationEl = document.getElementById('answerer-explanation');
    if (role === 'honest') {
      explanationEl.innerHTML = `💡 正確解說：${question.explanation}`;
      explanationEl.style.display = 'block';
    } else {
      explanationEl.style.display = 'none';
    }
  }

  // 顯示遊戲結算
  showGameEnd(gameState, currentPlayer) {
    // 🔧 先隱藏所有UI，避免重複顯示
    this.hideAllGameUI();
    
    // 然後顯示結算頁面
    document.getElementById('game-end-display').style.display = 'block';
    
    // 🔧 重要：更新分數顯示區域
    this.updateScoreDisplay(gameState, currentPlayer);
    
    const scores = gameState.scores || { A: 0, B: 0 };
    const result = determineWinner(scores, gameState.playerA.name, gameState.playerB.name);
    const isWinner = currentPlayer === result.winner;
    const isLoser = currentPlayer === result.loser;
    
    let endHTML = '';
    
    if (result.winner === 'tie') {
      endHTML = `
        <div class="game-end-title tie">🤝 平手！</div>
        <div class="final-scores">
          <div class="final-score-item">
            <span class="player-name">${gameState.playerA.name}</span>
            <span class="score">${scores.A}</span>
          </div>
          <div class="final-score-item">
            <span class="player-name">${gameState.playerB.name}</span>
            <span class="score">${scores.B}</span>
          </div>
        </div>
        <div class="game-stats">
          <div>總回合數：${gameState.round - 1} 回</div>
        </div>
      `;
    } else {
      endHTML = `
        <div class="game-end-title ${isWinner ? 'winner' : 'loser'}">
          ${isWinner ? '🎉 你獲勝了！' : '😔 你輸了！'}
        </div>
        <div class="winner-announcement">
          <div class="winner-name">${result.winnerName} 獲勝！</div>
        </div>
        <div class="final-scores">
          <div class="final-score-item ${result.winner === 'A' ? 'winner-score' : ''}">
            <span class="player-name">${gameState.playerA.name}</span>
            <span class="score">${scores.A}</span>
          </div>
          <div class="final-score-item ${result.winner === 'B' ? 'winner-score' : ''}">
            <span class="player-name">${gameState.playerB.name}</span>
            <span class="score">${scores.B}</span>
          </div>
        </div>
        <div class="game-stats">
          <div>總回合數：${gameState.round - 1} 回</div>
        </div>
      `;
    }
    
    document.getElementById('game-end-text').innerHTML = endHTML;
  }

  // 顯示結果（加入結算按鈕）
  showResult(gameState) {
    document.getElementById('guesser-ui').style.display = 'none';
    document.getElementById('answerer-ui').style.display = 'none';
    document.getElementById('result-display').style.display = 'block';
    document.getElementById('game-end-display').style.display = 'none';
    
    const correct = gameState.guessResult === 'correct';
    const roleText = gameState.answererRole === 'honest' ? '老實人' : '瞎掰人';
    const guessText = gameState.lastGuess === 'honest' ? '老實人' : '瞎掰人';
    
    // 獲取玩家名稱
    const guesserPlayer = gameState.currentGuesser;
    const answererPlayer = guesserPlayer === 'A' ? 'B' : 'A';
    const guesserName = gameState[`player${guesserPlayer}`].name;
    const answererName = gameState[`player${answererPlayer}`].name;
    
    let resultHTML = '';
    if (correct) {
      resultHTML = `
        <div style="color: #4CAF50; font-size: 24px;">🎉 猜對了！</div>
        <div style="margin-top: 15px;"><strong>${guesserName}</strong> 猜測：${guessText}</div>
        <div><strong>${answererName}</strong> 實際角色：${roleText}</div>
      `;
    } else {
      resultHTML = `
        <div style="color: #f44336; font-size: 24px;">❌ 猜錯了！</div>
        <div style="margin-top: 15px;"><strong>${guesserName}</strong> 猜測：${guessText}</div>
        <div><strong>${answererName}</strong> 實際角色：${roleText}</div>
      `;
    }
    
    document.getElementById('result-text').innerHTML = resultHTML;
    
    // 顯示結算按鈕（如果滿足最少回合數要求）
    const endGameBtn = document.getElementById('end-game-btn');
    if (endGameBtn && gameState.round >= GAME_CONFIG.game.minimumRounds) {
      endGameBtn.style.display = 'inline-block';
      console.log('顯示結算按鈕，目前回合:', gameState.round); // 除錯用
    } else {
      if (endGameBtn) {
        endGameBtn.style.display = 'none';
      }
      console.log('隱藏結算按鈕，目前回合:', gameState.round); // 除錯用
    }
  }

  // 隱藏所有遊戲UI
  hideAllGameUI() {
    document.getElementById('guesser-ui').style.display = 'none';
    document.getElementById('answerer-ui').style.display = 'none';
    document.getElementById('result-display').style.display = 'none';
    document.getElementById('game-end-display').style.display = 'none';
  }

  // 顯示遊戲區域
  showGameArea() {
    console.log('Showing game area');
    document.getElementById('login').style.display = 'none';
    document.getElementById('game-area').style.display = 'block';
  }

  // 顯示登入區域
  showLoginArea() {
    console.log('Game not started, showing login');
    document.getElementById('login').style.display = 'block';
    document.getElementById('game-area').style.display = 'none';
    
    // 🔧 重要：隱藏所有遊戲UI，防止顯示舊結果
    this.hideAllGameUI();
  }
}