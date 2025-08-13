// ========== 遊戲狀態 ==========
let currentPlayer = null;
let gameState = null;
let gameTimer = null; // 🔥 新的線性進度條計時器實例
let gameStateListener = null;
let timerSettings = { // 🔥 計時設定
  seconds: 15,
  effect: 'hide'
};

// 初始化管理器
const questionsManager = new QuestionsManager();
const gameUI = new GameUI();

// ========== Firebase 監聽器 ==========
function listenToGameState() {
  if (gameStateListener) {
    clearInterval(gameStateListener);
  }

  gameStateListener = setInterval(async () => {
    try {
      const data = await firebaseGet('game');
      handleGameStateChange(data);
    } catch (error) {
      console.error('監聽遊戲狀態失敗:', error);
    }
  }, 1000);
}

function handleGameStateChange(data) {
  if (data && data.gameStarted === true && data.gameEnded !== true) {
    console.log('Game state changed, showing game area');
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

async function generateAIQuestions() {
  const button = document.getElementById('generate-questions-btn');
  const originalText = button.textContent;
  
  try {
    button.disabled = true;
    button.textContent = '🤖 AI生成中...';

    const questionsData = await generateQuestions('mixed', 'medium', 10);
    
    if (questionsData.questions && questionsData.questions.length > 0) {
      await questionsManager.addQuestions(questionsData.questions);
      
      button.textContent = `✅ 成功生成 ${questionsData.questions.length} 題`;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
      }, 2000);
      
      console.log('✅ AI題目生成成功:', questionsData.questions.length, '題');
    } else {
      throw new Error('沒有生成到題目');
    }
  } catch (error) {
    console.error('❌ AI題目生成失敗:', error);
    button.textContent = '❌ 生成失敗';
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
    alert('AI題目生成失敗：' + error.message);
  }
}

// 🔥 新增：計時設定驗證函數
function validateTimerInput() {
  const secondsInput = document.getElementById('timer-seconds');
  const effectSelect = document.getElementById('timer-effect');
  
  let seconds = parseInt(secondsInput.value);
  
  // 驗證和修正輸入值
  if (isNaN(seconds) || seconds < 0) {
    seconds = 0;
    secondsInput.value = 0;
  } else if (seconds > 300) {
    seconds = 300;
    secondsInput.value = 300;
  }
  
  // 更新計時設定
  timerSettings = {
    seconds: seconds,
    effect: effectSelect.value
  };
  
  console.log('🔥 計時設定已更新:', timerSettings);
  return timerSettings;
}

// ========== 🔥 新的線性進度條計時器函數 ==========

function startGameTimer() {
  console.log('🔥 startGameTimer 被調用');
  console.log('🔥 gameState:', gameState);
  console.log('🔥 gameState.timerSettings:', gameState?.timerSettings);

  // 如果設定為不計時，則不啟動計時器
  if (!gameState || !gameState.timerSettings || gameState.timerSettings.seconds === 0) {
    console.log('🔥 計時設定為0或不存在，不啟動計時器');
    return;
  }

  console.log('🔥 開始計時器，時間:', gameState.timerSettings.seconds, '秒');

  // 確保先停止任何現有的計時器
  stopGameTimer();

  // 檢查 Timer 類別是否存在
  if (typeof Timer === 'undefined') {
    console.error('❌ Timer 類別未載入！請確保 timer.js 已正確引入');
    return;
  }

  // 創建新的計時器實例
  gameTimer = new Timer('timer-display', {
    warningTime: 5,        // 警告時間閾值
    criticalTime: 3,       // 危險時間閾值
    hideOnExpired: false,  // 時間到期後不隱藏計時器
    onUpdate: (timeLeft, totalTime) => {
      // 每秒更新回調（可用於其他邏輯）
      console.log('🔥 計時器更新:', timeLeft, '秒剩餘');
    },
    onExpired: () => {
      // 時間到期回調
      onTimerExpired();
    }
  });

  // 開始計時
  gameTimer.start(gameState.timerSettings.seconds);
}

function stopGameTimer() {
  console.log('🔥 停止計時器');

  if (gameTimer) {
    gameTimer.destroy();
    gameTimer = null;
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

  // 檢查當前玩家狀態和設定
  console.log('🔥 當前玩家:', currentPlayer);
  console.log('🔥 當前想想者:', gameState?.currentGuesser);
  console.log('🔥 計時效果設定:', gameState?.timerSettings?.effect);

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
    }
  }
}

// ========== 主要遊戲函數 ==========

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
    const otherInput = document.getElementById(`player${otherPlayer}-name`);
    const otherButton = document.querySelector(`#player${otherPlayer}-section button`);
    const otherSection = document.getElementById(`player${otherPlayer}-section`);

    // 鎖定對方的輸入框，避免衝突
    otherInput.disabled = true;
    otherButton.disabled = true;
    otherSection.classList.add('locked');

    // 🔥 新增：立即標記當前玩家為已填入
    nameInput.disabled = true;
    const currentButton = document.querySelector(`#player${player}-section button`);
    const currentSection = document.getElementById(`player${player}-section`);
    currentButton.disabled = true;
    currentSection.classList.add('filled');

    // 🔥 新增：顯示加入狀態
    const currentStatus = document.getElementById(`player${player}-status`);
    currentStatus.innerHTML = `<span style="color: #4CAF50;">✓ ${name} 已加入</span>`;

    // 獲取當前遊戲狀態
    const currentData = await firebaseGet('game');

    // 檢查玩家是否改變（用於偵測重聯）
    const playerField = `player${player}`;
    const hasPlayerChanged = currentData && currentData[playerField] && currentData[playerField].name !== name;

    if (hasPlayerChanged) {
      console.log(`玩家 ${player} 改變了，清除遊戲狀態`);
      
      // 重置遊戲狀態
      await firebaseSet('game', {
        [playerField]: { name, joinedAt: Date.now() },
        gameStarted: false,
        gameEnded: false,
        round: 1,
        scores: { A: 0, B: 0 },
        showResult: false
      });
    } else {
      // 正常加入或重聯
      await firebaseUpdate('game', {
        [playerField]: { name, joinedAt: Date.now() }
      });
    }

    // 開始監聽遊戲狀態
    listenToGameState();

    console.log(`玩家 ${player} (${name}) 已加入遊戲`);

    // 檢查是否可以開始遊戲
    checkStartGameButton();

  } catch (error) {
    // 🔥 新增：如果加入失敗，解鎖介面
    nameInput.disabled = false;
    const currentButton = document.querySelector(`#player${player}-section button`);
    const currentSection = document.getElementById(`player${player}-section`);
    currentButton.disabled = false;
    currentSection.classList.remove('filled');

    const otherInput = document.getElementById(`player${otherPlayer}-name`);
    const otherButton = document.querySelector(`#player${otherPlayer}-section button`);
    const otherSection = document.getElementById(`player${otherPlayer}-section`);
    otherInput.disabled = false;
    otherButton.disabled = false;
    otherSection.classList.remove('locked');

    console.error('加入遊戲失敗:', error);
    alert("加入遊戲失敗，請稍後再試！");
  }
}

// 檢查開始遊戲按鈕狀態
async function checkStartGameButton() {
  try {
    const data = await firebaseGet('game');
    const startButton = document.getElementById('startGame');

    if (data && data.playerA && data.playerB && data.playerA.name && data.playerB.name) {
      startButton.disabled = false;
      startButton.innerHTML = `🚀 開始遊戲 (${data.playerA.name} vs ${data.playerB.name})`;

      // 🔥 新增：顯示對方玩家狀態
      const playerAStatus = document.getElementById('playerA-status');
      const playerBStatus = document.getElementById('playerB-status');
      playerAStatus.innerHTML = `<span style="color: #4CAF50;">✓ ${data.playerA.name} 已加入</span>`;
      playerBStatus.innerHTML = `<span style="color: #4CAF50;">✓ ${data.playerB.name} 已加入</span>`;
    } else {
      startButton.disabled = true;
      startButton.innerHTML = '等待玩家加入...';
    }
  } catch (error) {
    console.error('檢查開始遊戲按鈕狀態失敗:', error);
  }
}

// 開始遊戲
async function startGame() {
  try {
    // 🔥 新增：驗證並獲取計時設定
    validateTimerInput();

    // 確保有題目可用
    await questionsManager.loadQuestions();

    if (questionsManager.getQuestionsCount() === 0) {
      alert("沒有可用的題目！請先載入題目。");
      return;
    }

    // 檢查玩家是否都已加入
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

function updateGameDisplay() {
  // 確保遊戲狀態存在且有效
  if (!gameState) {
    console.log('⚠️ 遊戲狀態不存在，無法更新顯示');
    return;
  }

  // 確保有題目可用
  if (questionsManager.getQuestionsCount() === 0) {
    console.error('❌ 沒有可用的題目，題目數量:', questionsManager.getQuestionsCount());
    return;
  }

  console.log('🔥 題目檢查通過，題目總數:', questionsManager.getQuestionsCount());

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

    // 🔥 新增：確保結果頁面時停止計時器
    stopGameTimer();

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

  console.log('🔥 檢查題目索引:', gameState.currentQuestion);

  const question = questionsManager.getQuestion(gameState.currentQuestion);
  if (!question) {
    console.error('❌ 題目不存在:', gameState.currentQuestion);
    console.error('❌ 題目總數:', questionsManager.getQuestionsCount());
    return;
  }

  console.log('🔥 成功獲取題目:', question.question);

  const isGuesser = currentPlayer === gameState.currentGuesser;
  const isAnswerer = currentPlayer !== gameState.currentGuesser;

  console.log('Updating display - isGuesser:', isGuesser, 'isAnswerer:', isAnswerer);

  // 🔥 更新分數顯示（不顯示變化）
  try {
    console.log('🔥 執行更新分數顯示...');
    gameUI.updateScoreDisplay(gameState, currentPlayer);
    console.log('🔥 分數顯示更新完成');
  } catch (error) {
    console.error('🔥 分數顯示更新失敗:', error);
  }

  // 🔥 啟動計時器（對答題者）
  if (isAnswerer) {
    console.log('🔥 當前玩家是答題者，準備啟動計時器');
    startGameTimer();
  } else {
    console.log('🔥 當前玩家是想想者，不啟動計時器');
    stopGameTimer();
  }

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

  // 🔥 修改：不要立即清除 currentPlayer，先停止監聽
  if (gameStateListener) {
    clearInterval(gameStateListener);
    gameStateListener = null;
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

    // 🔥 重置開始遊戲按鈕
    document.getElementById('startGame').disabled = true;
    document.getElementById('startGame').innerHTML = '開始遊戲';

    // 🔥 重置計時設定為預設值
    document.getElementById('timer-seconds').value = '15';
    document.getElementById('timer-effect').value = 'hide';
    timerSettings = { seconds: 15, effect: 'hide' };

    // 完全重置遊戲狀態
    await firebaseSet('game', {  // 🔥 改用 firebaseSet 完全重置
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
      playerA: null,
      playerB: null,
      timerSettings: null,
      usedQuestions: null
    });

    console.log('✅ Firebase 狀態已重置');

    // 重置題目使用記錄
    questionsManager.resetUsedQuestions();

    // 🔥 清除本地遊戲狀態，但保持 currentPlayer 讓使用者知道自己是誰
    gameState = null;
    // currentPlayer = null;  // 🔥 註解掉這行，保持玩家身份

    // 🔥 重新啟動監聽器，讓玩家可以重新加入
    listenToGameState();

    console.log('🎯 新遊戲重置完成，當前玩家身份保持為:', currentPlayer);
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

// 🔥 確保 Timer 類別已載入
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Timer === 'undefined') {
    console.error('❌ Timer 類別未載入！請確保 timer.js 已正確引入');
  } else {
    console.log('✅ Timer 類別已載入');
  }
});

// 🔥 頁面卸載時清理計時器
window.addEventListener('beforeunload', () => {
  if (gameTimer) {
    gameTimer.destroy();
    gameTimer = null;
  }
});

// ========== 綁定到 window（這很重要！）==========
window.joinAsPlayer = joinAsPlayer;
window.startGame = startGame;
window.makeGuess = makeGuess;
window.nextRound = nextRound;
window.endGame = endGame;
window.newGame = newGame;
window.generateAIQuestions = generateAIQuestions;