// UI 管理模組
class GameUI {
  constructor() {}

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
    
    document.getElementById('guesser-question').innerHTML = `題目：${question.question}`;
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
    
    // 顯示題目
    document.getElementById('answerer-question').innerHTML = `題目：${question.question}`;
    
    // 根據角色顯示解說
    const explanationEl = document.getElementById('answerer-explanation');
    if (role === 'honest') {
      explanationEl.innerHTML = `💡 正確解說：${question.explanation}`;
      explanationEl.style.display = 'block';
    } else {
      explanationEl.style.display = 'none';
    }
  }

  // 顯示結果
  showResult(gameState) {
    document.getElementById('guesser-ui').style.display = 'none';
    document.getElementById('answerer-ui').style.display = 'none';
    document.getElementById('result-display').style.display = 'block';
    
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
  }
}