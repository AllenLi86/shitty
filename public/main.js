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
    // 檢查是否需要重置分數
    const currentData = await firebaseGet('game');
    
    // 準備新的玩家資料
    const newPlayerData = {
      name: name,
      joinedAt: Date.now()
    };
    
    // 檢查玩家是否有變化
    if (currentData && currentData.gameStarted) {
      const otherPlayer = player === 'A' ? 'B' : 'A';
      const otherPlayerName = document.getElementById(`player${otherPlayer}-name`).value.trim();
      
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
      scores: { A: 0, B: 0 }
    };

    await firebaseSet('game', initialGameState);
  } catch (error) {
    console.error('載入題目失敗:', error);
    alert("載入題目失敗，請稍後再試！");
  }
}

// 更新遊戲顯示
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
    gameUI.showResult(gameState);
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
  
  // 更新分數顯示
  gameUI.updateScoreDisplay(gameState, currentPlayer);

  if (isGuesser) {
    // 顯示想想UI
    gameUI.showGuesserUI(question);
  } else if (isAnswerer) {
    // 顯示答題者UI
    gameUI.showAnswererUI(question, gameState.answererRole);
  }
}

// 做出猜測
async function makeGuess(guess) {
  try {
    const correct = guess === gameState.answererRole;
    
    // 計算分數變化
    const scoreChange = calculateScoreChange(correct ? 'correct' : 'wrong', gameState.answererRole);
    
    // 計算新分數
    const newScores = { ...gameState.scores };
    const guesserPlayer = gameState.currentGuesser;
    const answererPlayer = guesserPlayer === 'A' ? 'B' : 'A';
    
    newScores[guesserPlayer] += scoreChange.guesser;
    newScores[answererPlayer] += scoreChange.answerer;
    
    console.log('分數變化:', scoreChange, '新分數:', newScores);
    
    // 更新遊戲狀態，顯示結果
    await firebaseUpdate('game', {
      lastGuess: guess,
      guessResult: correct ? 'correct' : 'wrong',
      scores: newScores,
      showResult: true
    });
  } catch (error) {
    console.error('Error making guess:', error);
    alert('猜測失敗，請稍後再試！');
  }
}

// 下一回合
async function nextRound() {
  try {
    // 確保有題目可用
    if (questionsManager.getQuestionsCount() === 0) {
      alert("沒有可用的題目！");
      return;
    }

    // 輪換角色，重新分配答題者角色，選擇新題目
    const nextGuesser = gameState.currentGuesser === 'A' ? 'B' : 'A';
    const nextQuestion = questionsManager.selectRandomQuestion();
    
    await firebaseUpdate('game', {
      round: gameState.round + 1,
      currentGuesser: nextGuesser,
      currentQuestion: nextQuestion,
      answererRole: assignAnswererRole(), // 使用機率分配角色
      showResult: false,
      lastGuess: null,
      guessResult: null
    });
  } catch (error) {
    console.error('Error starting next round:', error);
    alert('開始下一回合失敗，請稍後再試！');
  }
}

// 結束遊戲
async function endGame() {
  console.log('🎯 結束遊戲按鈕被點擊了！');
  
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
    // 更新遊戲狀態為結束
    const updateData = {
      gameEnded: true,
      gameStarted: false,
      showResult: false
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
  
  if (!currentPlayer) {
    alert("請先選擇玩家身份");
    return;
  }

  console.log('🧹 正在清除舊遊戲狀態...');

  try {
    // 🔧 立即清除UI顯示，防止顯示舊結果
    gameUI.hideAllGameUI();
    gameUI.showLoginArea();
    
    // 清除本地遊戲狀態
    gameState = null;

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

// // ========== AI 題目生成（給 admin 使用）==========
// async function generateAIQuestions() {
//   const type = document.getElementById('ai-type')?.value || 'why';
//   const difficulty = parseInt(document.getElementById('ai-difficulty')?.value || '1');
//   const count = parseInt(document.getElementById('ai-count')?.value || '5');
  
//   try {
//     // 顯示載入狀態
//     const button = event.target;
//     const originalText = button.textContent;
//     button.textContent = '生成中...';
//     button.disabled = true;
    
//     const result = await generateQuestions(type, difficulty, count);
    
//     if (result.success) {
//       alert(`成功生成 ${result.generated.length} 道題目！\n總題目數：${result.totalCount}`);
//       // 重新載入題目列表（如果是在 admin 頁面）
//       if (typeof loadQuestions === 'function') {
//         loadQuestions();
//       }
//     } else {
//       alert('生成題目失敗：' + result.error);
//     }
    
//     // 恢復按鈕狀態
//     button.textContent = originalText;
//     button.disabled = false;
    
//   } catch (error) {
//     console.error('Error generating AI questions:', error);
//     alert('生成題目時發生錯誤，請稍後再試！');
    
//     // 恢復按鈕狀態
//     const button = event.target;
//     button.textContent = '生成題目';
//     button.disabled = false;
//   }
// }

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

// 除錯用：確認函數有正確綁定
console.log('🔗 函數綁定檢查:');
console.log('endGame:', typeof window.endGame);
console.log('newGame:', typeof window.newGame);
console.log('generateAIQuestions:', typeof window.generateAIQuestions);