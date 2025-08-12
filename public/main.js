// 🔥 新增：輸入驗證函數
function validateTimerInput(input) {
  let value = parseInt(input.value);
  
  // 移除邊框顏色類別
  input.classList.remove('input-warning', 'input-error');
  
  if (isNaN(value) || value < 0) {
    input.classList.add('input-error');
    return;
  }
  
  if (value > 300) {
    input.classList.add('input-warning');
    input.value = 300; // 自動限制為最大值
    return;
  }
  
  // 值正常，移除所有警告樣式
  input.classList.remove('input-warning', 'input-error');
}

// ========== Firebase 代理函數 ==========
// 替換原本的 Firebase 直接操作

async function firebaseGet(path) {
  try {
    const response = await fetch('/api/firebase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'GET',
        path: path
      })
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Firebase GET error:', error);
    throw error;
  }
}

async function firebaseSet(path, data) {
  try {
    const response = await fetch('/api/firebase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'PUT',
        path: path,
        data: data
      })
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Firebase SET error:', error);
    throw error;
  }
}

async function firebaseUpdate(path, data) {
  try {
    const response = await fetch('/api/firebase-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'PATCH',
        path: path,
        data: data
      })
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Firebase UPDATE error:', error);
    throw error;
  }
}

// 監聽 Firebase 變化（使用輪詢方式，因為 serverless 無法維持長連接）
let gameStateListener = null;
let lastGameStateHash = '';

function listenToGameState() {
  if (gameStateListener) {
    clearInterval(gameStateListener);
  }
  
  gameStateListener = setInterval(async () => {
    try {
      const data = await firebaseGet('game');
      const currentHash = JSON.stringify(data);
      
      if (currentHash !== lastGameStateHash) {
        lastGameStateHash = currentHash;
        handleGameStateChange(data);
      }
    } catch (error) {
      console.error('Error listening to game state:', error);
    }
  }, 1000); // 每秒檢查一次
}

function handleGameStateChange(data) {
  console.log('Firebase data:', data);
  
  if (!data) return;

  // 更新玩家狀態顯示
  updatePlayerStatus(data);

  // 檢查兩個玩家是否都已加入
  updateStartButton(data);

  // 重要：處理不同的遊戲狀態
  if (data.gameEnded === true && currentPlayer && data.playerA && data.playerB) {
    // 遊戲結束狀態
    console.log('Game ended, showing end screen');
    gameState = data;
    gameUI.showGameArea();
    gameUI.showGameEnd(gameState, currentPlayer);
  } else if (data.gameStarted === true && currentPlayer && data.playerA && data.playerB) {
    console.log('Game started, showing game area');
    gameState = data;
    gameUI.showGameArea();
    updateGameDisplay();
  } else if ((!data.gameStarted || data.gameStarted === false) && (!data.gameEnded || data.gameEnded === false)) {
    // 遊戲尚未開始或已重置
    if (document.getElementById('game-area').style.display === 'block') {
      console.log('Game reset or not started, showing login');
      gameUI.showLoginArea();
      // 清除本地狀態
      gameState = null;
    }
  }
}

// ========== AI 題目生成函數 ==========
async function generateQuestions(type, difficulty, count = 5) {
  try {
    const response = await fetch('/api/generate-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, difficulty, count })
    });
    
    if (!response.ok) throw new Error('Failed to generate questions');
    return await response.json();
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

// ========== 遊戲狀態 ==========
let currentPlayer = null;
let gameState = null;
let gameTimer = null; // 🔥 新增：遊戲計時器
let timerSettings = { // 🔥 新增：計時設定
  seconds: 15,
  effect: 'hide'
};

// 初始化管理器
const questionsManager = new QuestionsManager();
const gameUI = new GameUI();

// ========== 主要遊戲函數（修改後的版本）==========

// 加入遊戲
async function joinAsPlayer(player) {
  const nameInput = document.getElementById(`player${player}-name`);
  const name = nameInput.value.trim();
  
  if (!name) {
    alert("請輸入名稱");
    return;
  }

  currentPlayer = player;
  
  try {
    // 🔥 新增：立即鎖定另一個玩家的輸入框
    const otherPlayer = player === 'A' ? 'B' : 'A';
    const otherNameInput = document.getElementById(`player${otherPlayer}-name`);
    const otherButton = document.querySelector(`#player${otherPlayer}-section button`);
    const otherSection = document.getElementById(`player${otherPlayer}-section`);
    
    // 鎖定另一個玩家的輸入和按鈕
    otherNameInput.disabled = true;
    otherButton.disabled = true;
    otherSection.classList.add('locked');
    
    // 顯示鎖定提示
    document.getElementById(`player${otherPlayer}-status`).innerHTML = `🔒 此欄位已鎖定（${name} 已選擇玩家${player}）`;

    // 檢查是否需要重置分數
    const currentData = await firebaseGet('game');
    
    // 準備新的玩家資料
    const newPlayerData = {
      name: name,
      joinedAt: Date.now()
    };
    
    // 檢查玩家是否有變化
    if (currentData && currentData.gameStarted) {
      const otherPlayerName = otherNameInput.value.trim();
      
      // 如果有一方玩家名稱改變，重置分數並清除遊戲狀態
      const currentPlayerName = currentData[`player${player}`]?.name;
      const otherCurrentName = currentData[`player${otherPlayer}`]?.name;
      
      if (currentPlayerName !== name || (otherPlayerName && otherCurrentName !== otherPlayerName)) {
        console.log('玩家有變化，重置遊戲狀態');
        
        // 重置整個遊戲狀態
        await firebaseSet('game', {
          [`player${player}`]: newPlayerData,
          gameStarted: false,
          scores: { A: 0, B: 0 }
        });
        
        // 重置題目使用記錄
        questionsManager.resetUsedQuestions();
      } else {
        // 相同玩家重聯，保持分數
        console.log('相同玩家重聯，保持分數');
        await firebaseUpdate('game', { [`player${player}`]: newPlayerData });
      }
    } else {
      // 首次加入或遊戲未開始
      await firebaseUpdate('game', { [`player${player}`]: newPlayerData });
    }

    // 立即更新當前玩家的UI
    document.getElementById(`player${player}-section`).classList.add('filled');
    document.getElementById(`player${player}-status`).innerHTML = `✅ ${name} 已加入`;
    nameInput.disabled = true;
    document.querySelector(`#player${player}-section button`).disabled = true;
    
    // 開始監聽遊戲狀態（只監聽一次）
    if (!gameStateListener) {
      listenToGameState();
    }
  } catch (error) {
    console.error('Error joining game:', error);
    alert('加入遊戲失敗，請稍後再試！');
    
    // 🔥 失敗時恢復另一個玩家的輸入框
    const otherPlayer = player === 'A' ? 'B' : 'A';
    const otherNameInput = document.getElementById(`player${otherPlayer}-name`);
    const otherButton = document.querySelector(`#player${otherPlayer}-section button`);
    const otherSection = document.getElementById(`player${otherPlayer}-section`);
    
    otherNameInput.disabled = false;
    otherButton.disabled = false;
    otherSection.classList.remove('locked');
    document.getElementById(`player${otherPlayer}-status`).innerHTML = '';
  }
}

// 更新玩家狀態顯示
function updatePlayerStatus(data) {
  if (data.playerA && data.playerA.name) {
    document.getElementById('playerA-section').classList.add('filled');
    document.getElementById('playerA-status').innerHTML = `✅ ${data.playerA.name} 已加入`;
    document.getElementById('playerA-name').disabled = true;
    document.querySelector('#playerA-section button').disabled = true;
  }
  
  if (data.playerB && data.playerB.name) {
    document.getElementById('playerB-section').classList.add('filled');
    document.getElementById('playerB-status').innerHTML = `✅ ${data.playerB.name} 已加入`;
    document.getElementById('playerB-name').disabled = true;
    document.querySelector('#playerB-section button').disabled = true;
  }
}

// 更新開始遊戲按鈕
function updateStartButton(data) {
  if (data.playerA && data.playerB && data.playerA.name && data.playerB.name) {
    document.getElementById('startGame').disabled = false;
    document.getElementById('startGame').innerHTML = '🚀 開始遊戲（兩人都已就緒）';
    console.log('Both players joined, start button enabled');
  } else {
    document.getElementById('startGame').disabled = true;
    document.getElementById('startGame').innerHTML = '開始遊戲';
    console.log('Waiting for players...');
  }
}

// 開始遊戲
async function startGame() {
  console.log('Start game clicked, current player:', currentPlayer);
  
  if (!currentPlayer) {
    alert("請先選擇玩家身份");
    return;
  }

  try {
    // 🔥 新增：獲取遊戲設定（加入數值驗證）
    let timerSeconds = parseInt(document.getElementById('timer-seconds').value) || 0;
    
    // 🔥 限制範圍和取整數
    timerSeconds = Math.max(0, Math.min(300, Math.floor(timerSeconds)));
    
    timerSettings.seconds = timerSeconds;
    timerSettings.effect = document.getElementById('timer-effect').value;
    
    console.log('🔥 遊戲設定:', timerSettings);
    
    // 🔥 驗證設定值
    if (timerSeconds > 0) {
      console.log('🔥 將啟用計時器:', timerSeconds, '秒，效果:', timerSettings.effect);
    } else {
      console.log('🔥 計時器已停用（設定為0秒）');
    }

    // 先載入題目
    await questionsManager.loadQuestions();
    
    if (questionsManager.getQuestionsCount() === 0) {
      alert("沒有可用的題目！");
      return;
    }

    // 檢查當前遊戲狀態
    const data = await firebaseGet('game');
    console.log('Checking game state before start:', data);
    
    if (!data || !data.playerA || !data.playerB || !data.playerA.name || !data.playerB.name) {
      alert("請等待兩個玩家都加入遊戲！");
      return;
    }

    console.log('Starting game...');
    
    // 選擇第一題
    const firstQuestionIndex = questionsManager.selectRandomQuestion();
    
    // 初始化遊戲狀態
    const initialGameState = {
      ...data, // 保留現有的玩家資訊
      gameStarted: true, // 重要：設置遊戲開始標記
      gameEnded: false, // 確保遊戲未結束
      round: 1,
      currentGuesser: 'A', // A先當想想
      currentQuestion: firstQuestionIndex,
      answererRole: assignAnswererRole(), // 使用機率分配角色
      showResult: false,
      // 初始化分數
      scores: { A: 0, B: 0 },
      // 🔥 新增：儲存遊戲設定
      timerSettings: timerSettings
    };

    await firebaseSet('game', initialGameState);
  } catch (error) {
    console.error('載入題目失敗:', error);
    alert("載入題目失敗，請稍後再試！");
  }
}

// 🔥 修正：計時器功能
function startGameTimer() {
  console.log('🔥 startGameTimer 被調用');
  console.log('🔥 gameState:', gameState);
  console.log('🔥 gameState.timerSettings:', gameState?.timerSettings);
  
  // 如果設定為不計時，則不啟動計時器
  if (!gameState || !gameState.timerSettings || gameState.timerSettings.seconds === 0) {
    console.log('🔥 計時設定為0或不存在，不啟動計時器');
    console.log('🔥 gameState存在:', !!gameState);
    console.log('🔥 timerSettings存在:', !!gameState?.timerSettings);
    console.log('🔥 seconds值:', gameState?.timerSettings?.seconds);
    return;
  }

  console.log('🔥 開始計時器，時間:', gameState.timerSettings.seconds, '秒');

  // 確保先停止任何現有的計時器
  stopGameTimer();

  // 顯示計時器
  const timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) {
    console.error('❌ 找不到計時器顯示元素');
    return;
  }
  
  console.log('🔥 找到計時器元素，準備顯示');
  timerDisplay.style.display = 'flex';

  let timeLeft = gameState.timerSettings.seconds;
  const totalTime = gameState.timerSettings.seconds;
  
  // 獲取計時器元素
  const timerNumber = document.getElementById('timer-number');
  const timerCircle = document.getElementById('timer-circle');
  
  if (!timerNumber || !timerCircle) {
    console.error('❌ 找不到計時器子元素');
    console.error('❌ timerNumber:', timerNumber);
    console.error('❌ timerCircle:', timerCircle);
    return;
  }
  
  console.log('🔥 找到所有計時器子元素，開始計時');
  
  // 更新計時器顯示
  function updateTimer() {
    console.log('🔥 更新計時器:', timeLeft, '秒剩餘');
    
    // 更新數字
    timerNumber.textContent = timeLeft;
    
    // 更新圓圈進度
    const circumference = 2 * Math.PI * 42; // r=42，周長≈264
    const progress = (totalTime - timeLeft) / totalTime; // 已過去的時間比例
    const strokeDashoffset = circumference * (1 - progress); // 剩餘部分
    timerCircle.style.strokeDashoffset = strokeDashoffset;
    
    console.log('🔥 圓圈進度:', progress, 'strokeDashoffset:', strokeDashoffset);
    
    // 根據剩餘時間改變顏色和狀態
    timerDisplay.className = 'timer-display';
    if (timeLeft <= 3) {
      timerDisplay.classList.add('timer-critical');
      timerCircle.style.stroke = '#f44336';
    } else if (timeLeft <= 5) {
      timerDisplay.classList.add('timer-warning');
      timerCircle.style.stroke = '#ff9800';
    } else {
      timerCircle.style.stroke = '#ff6b6b';
    }
  }

  // 初始顯示
  updateTimer();

  // 啟動計時器
  console.log('🔥 啟動 setInterval');
  gameTimer = setInterval(() => {
    timeLeft--;
    updateTimer();

    if (timeLeft <= 0) {
      clearInterval(gameTimer);
      gameTimer = null;
      onTimerExpired();
    }
  }, 1000);
}

function stopGameTimer() {
  console.log('🔥 停止計時器');
  
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
  
  // 隱藏計時器
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.style.display = 'none';
  }
  
  // 清除解答區的效果
  const explanation = document.getElementById('answerer-explanation');
  if (explanation) {
    explanation.classList.remove('timer-hidden', 'timer-dimmed');
    console.log('🔥 已清除解答區效果');
  }
}

function onTimerExpired() {
  console.log('🔥 計時器到期！');
  
  // 隱藏計時器
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    timerDisplay.style.display = 'none';
  }
  
  // 檢查當前玩家狀態和設定
  console.log('🔥 當前玩家:', currentPlayer);
  console.log('🔥 當前想想:', gameState.currentGuesser);
  console.log('🔥 答題者角色:', gameState.answererRole);
  console.log('🔥 計時效果:', gameState.timerSettings.effect);
  
  // 只有老實人才會受到影響
  const isAnswerer = currentPlayer !== gameState.currentGuesser;
  const isHonest = gameState.answererRole === 'honest';
  
  if (isAnswerer && isHonest) {
    const explanation = document.getElementById('answerer-explanation');
    if (explanation && explanation.style.display !== 'none') {
      console.log('🔥 對老實人應用計時效果:', gameState.timerSettings.effect);
      
      if (gameState.timerSettings.effect === 'hide') {
        explanation.classList.add('timer-hidden');
        console.log('🔥 已隱藏解答');
      } else if (gameState.timerSettings.effect === 'dim') {
        explanation.classList.add('timer-dimmed');
        console.log('🔥 已變淡解答');
      }
    } else {
      console.log('🔥 解答區域不存在或已隱藏');
    }
  } else {
    console.log('🔥 不需要應用計時效果 - isAnswerer:', isAnswerer, 'isHonest:', isHonest);
  }
}
function updateGameDisplay() {
  // 確保遊戲狀態存在且有效
  if (!gameState) {
    console.log('⚠️ 遊戲狀態不存在，無法更新顯示');
    return;
  }

  // 確保有題目可用
  if (questionsManager.getQuestionsCount() === 0) {
    console.error('沒有可用的題目');
    return;
  }

  // 優先檢查遊戲是否結束
  if (gameState.gameEnded === true) {
    console.log('遊戲已結束，顯示結算頁面');
    gameUI.showGameEnd(gameState, currentPlayer);
    return;
  }

  // 檢查遊戲是否尚未開始或已重置
  if (gameState.gameStarted !== true) {
    console.log('遊戲尚未開始或已重置');
    return;
  }

  // 檢查是否要顯示結果
  if (gameState.showResult === true) {
    console.log('顯示回合結果');
    
    // 🔥 計算分數變化以便顯示
    const correct = gameState.guessResult === 'correct';
    const scoreChanges = calculateScoreChange(correct ? 'correct' : 'wrong', gameState.answererRole);
    
    // 🔥 先顯示分數變化在記分板上
    gameUI.updateScoreDisplay(gameState, currentPlayer, scoreChanges);
    
    // 🔥 然後顯示結果頁面
    gameUI.showResult(gameState, scoreChanges);
    return;
  }

  // 檢查當前題目是否有效
  if (gameState.currentQuestion === null || gameState.currentQuestion === undefined) {
    console.log('⚠️ 當前題目索引無效:', gameState.currentQuestion);
    return;
  }

  const question = questionsManager.getQuestion(gameState.currentQuestion);
  if (!question) {
    console.error('題目不存在:', gameState.currentQuestion);
    return;
  }
  
  const isGuesser = currentPlayer === gameState.currentGuesser;
  const isAnswerer = currentPlayer !== gameState.currentGuesser;
  
  console.log('Updating display - isGuesser:', isGuesser, 'isAnswerer:', isAnswerer);
  
  // 🔥 更新分數顯示（不顯示變化）
  gameUI.updateScoreDisplay(gameState, currentPlayer);

  if (isGuesser) {
    // 顯示想想UI
    gameUI.showGuesserUI(question);
  } else if (isAnswerer) {
    // 顯示答題者UI
    gameUI.showAnswererUI(question, gameState.answererRole);
  }
}

// 🔥 修改：做出猜測（不立即更新分數到 Firebase，只顯示預覽）
async function makeGuess(guess) {
  try {
    // 🔥 停止計時器
    stopGameTimer();
    
    const correct = guess === gameState.answererRole;
    
    // 🔥 重要：這裡不更新實際分數，只更新猜測結果和顯示狀態
    await firebaseUpdate('game', {
      lastGuess: guess,
      guessResult: correct ? 'correct' : 'wrong',
      showResult: true
      // 🔥 注意：不在這裡更新 scores
    });
  } catch (error) {
    console.error('Error making guess:', error);
    alert('猜測失敗，請稍後再試！');
  }
}

// 🔥 修改：下一回合（這時才真正更新分數）
async function nextRound() {
  try {
    // 🔥 確保計時器已停止
    stopGameTimer();
    
    // 確保有題目可用
    if (questionsManager.getQuestionsCount() === 0) {
      alert("沒有可用的題目！");
      return;
    }

    // 🔥 計算並應用分數變化
    const correct = gameState.guessResult === 'correct';
    const scoreChange = calculateScoreChange(correct ? 'correct' : 'wrong', gameState.answererRole);
    
    // 🔥 計算新分數
    const newScores = { ...gameState.scores };
    const guesserPlayer = gameState.currentGuesser;
    const answererPlayer = guesserPlayer === 'A' ? 'B' : 'A';
    
    newScores[guesserPlayer] += scoreChange.guesser;
    newScores[answererPlayer] += scoreChange.answerer;
    
    console.log('🔥 應用分數變化:', scoreChange, '新分數:', newScores);

    // 輪換角色，重新分配答題者角色，選擇新題目
    const nextGuesser = gameState.currentGuesser === 'A' ? 'B' : 'A';
    const nextQuestion = questionsManager.selectRandomQuestion();
    
    // 🔥 更新遊戲狀態，包含新分數
    await firebaseUpdate('game', {
      round: gameState.round + 1,
      currentGuesser: nextGuesser,
      currentQuestion: nextQuestion,
      answererRole: assignAnswererRole(), // 使用機率分配角色
      showResult: false,
      lastGuess: null,
      guessResult: null,
      scores: newScores, // 🔥 這時才真正更新分數
      // 🔥 確保保持計時設定
      timerSettings: gameState.timerSettings || timerSettings
    });
  } catch (error) {
    console.error('Error starting next round:', error);
    alert('開始下一回合失敗，請稍後再試！');
  }
}

// 結束遊戲
async function endGame() {
  console.log('🎯 結束遊戲按鈕被點擊了！');
  
  // 🔥 停止計時器
  stopGameTimer();
  
  if (!gameState) {
    console.log('❌ 遊戲狀態不存在');
    alert("遊戲尚未開始！");
    return;
  }

  console.log('📊 當前遊戲狀態:', gameState);
  console.log('🔢 當前回合數:', gameState.round);
  console.log('⚡ 最少回合數要求:', GAME_CONFIG.game.minimumRounds);

  if (gameState.round < GAME_CONFIG.game.minimumRounds) {
    alert(`至少需要進行 ${GAME_CONFIG.game.minimumRounds} 回合才能結算！`);
    return;
  }

  console.log('✅ 正在結算遊戲...');
  
  try {
    // 🔥 如果現在正在顯示結果頁面，需要先應用分數變化
    let finalScores = { ...gameState.scores };
    
    if (gameState.showResult === true && gameState.guessResult) {
      console.log('🔥 結算前先應用當前回合的分數變化');
      
      const correct = gameState.guessResult === 'correct';
      const scoreChange = calculateScoreChange(correct ? 'correct' : 'wrong', gameState.answererRole);
      
      const guesserPlayer = gameState.currentGuesser;
      const answererPlayer = guesserPlayer === 'A' ? 'B' : 'A';
      
      finalScores[guesserPlayer] += scoreChange.guesser;
      finalScores[answererPlayer] += scoreChange.answerer;
      
      console.log('🔥 結算時的最終分數:', finalScores);
    }
    
    // 更新遊戲狀態為結束
    const updateData = {
      gameEnded: true,
      gameStarted: false,
      showResult: false,
      scores: finalScores // 🔥 確保使用最終分數
    };
    
    console.log('📤 準備更新的資料:', updateData);
    
    await firebaseUpdate('game', updateData);
    console.log('✅ 遊戲狀態已更新為結束');
  } catch (error) {
    console.error('❌ 更新遊戲狀態失敗:', error);
    alert('結算遊戲失敗，請稍後再試！');
  }
}

// 開新遊戲
async function newGame() {
  console.log('🎮 開新遊戲按鈕被點擊了！');
  
  // 🔥 停止計時器
  stopGameTimer();
  
  if (!currentPlayer) {
    alert("請先選擇玩家身份");
    return;
  }

  console.log('🧹 正在清除舊遊戲狀態...');

  try {
    // 🔧 立即清除UI顯示，防止顯示舊結果
    gameUI.hideAllGameUI();
    gameUI.showLoginArea();
    
    // 🔥 重置登入介面的鎖定狀態
    ['A', 'B'].forEach(player => {
      const nameInput = document.getElementById(`player${player}-name`);
      const button = document.querySelector(`#player${player}-section button`);
      const section = document.getElementById(`player${player}-section`);
      const status = document.getElementById(`player${player}-status`);
      
      nameInput.disabled = false;
      nameInput.value = '';
      button.disabled = false;
      section.classList.remove('filled', 'locked');
      status.innerHTML = '';
    });
    
    // 🔥 重置計時設定為預設值
    document.getElementById('timer-seconds').value = '15';
    document.getElementById('timer-effect').value = 'hide';
    timerSettings = { seconds: 15, effect: 'hide' };
    
    // 清除本地遊戲狀態
    gameState = null;
    currentPlayer = null; // 🔥 重置當前玩家

    // 完全重置遊戲狀態，保留玩家資訊但清除所有遊戲相關資料
    await firebaseUpdate('game', {
      gameStarted: false,
      gameEnded: false,
      round: 1,
      scores: { A: 0, B: 0 },
      showResult: false,
      currentGuesser: null,
      currentQuestion: null,
      answererRole: null,
      lastGuess: null,
      guessResult: null,
      // 🔥 清除玩家資訊，讓他們重新加入
      playerA: null,
      playerB: null,
      // 🔥 清除計時設定
      timerSettings: null,
      // 確保移除任何可能殘留的狀態
      usedQuestions: null
    });
    
    console.log('✅ Firebase 狀態已重置');
    
    // 重置題目使用記錄
    questionsManager.resetUsedQuestions();
    
    console.log('🎯 新遊戲重置完成');
  } catch (error) {
    console.error('❌ 重置遊戲狀態失敗:', error);
    alert('重置遊戲失敗，請稍後再試！');
  }
}

// ========== 頁面載入時初始化 ==========
window.addEventListener('load', () => {
  questionsManager.loadQuestions().catch(error => {
    console.error('初始載入題目失敗:', error);
  });
});

// ========== 綁定到 window（這很重要！）==========
window.joinAsPlayer = joinAsPlayer;
window.startGame = startGame;
window.makeGuess = makeGuess;
window.nextRound = nextRound;
window.endGame = endGame;
window.newGame = newGame;
window.generateAIQuestions = generateAIQuestions;
window.validateTimerInput = validateTimerInput; // 🔥 新增

// 除錯用：確認函數有正確綁定
console.log('🔗 函數綁定檢查:');
console.log('endGame:', typeof window.endGame);
console.log('newGame:', typeof window.newGame);
console.log('generateAIQuestions:', typeof window.generateAIQuestions);
console.log('validateTimerInput:', typeof window.validateTimerInput); // 🔥 新增