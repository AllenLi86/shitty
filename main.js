// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyB95BnsfKtB__X6K7KbPCT0zng4eofZ3Ks",
  authDomain: "shitty-24b2f.firebaseapp.com",
  databaseURL: "https://shitty-24b2f-default-rtdb.firebaseio.com",
  projectId: "shitty-24b2f",
  storageBucket: "shitty-24b2f.appspot.com",
  messagingSenderId: "370223390160",
  appId: "1:370223390160:web:8be6cba5345de0f73eadd5"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 遊戲狀態
let currentPlayer = null;
let gameState = null;
let questions = []; // 從 Firebase 載入的題目

// 載入題目從 Firebase
function loadQuestions() {
  return new Promise((resolve, reject) => {
    db.ref('questions').once('value', (snapshot) => {
      const data = snapshot.val();
      if (data && Array.isArray(data)) {
        questions = data;
        console.log('題目已載入:', questions.length, '題');
        resolve(questions);
      } else {
        console.log('沒有找到題目，使用預設題目');
        // 如果沒有題目，可以設定預設題目
        questions = [
          {
            question: "為什麼企鵝不會飛？",
            explanation: "企鵝的祖先原本會飛，但為了適應水中生活，翅膀演化成了更適合游泳的鰭狀肢。牠們的骨骼也變得更重，以便在水中保持穩定。"
          }
        ];
        resolve(questions);
      }
    }, (error) => {
      console.error('載入題目失敗:', error);
      reject(error);
    });
  });
}

// 加入遊戲
function joinAsPlayer(player) {
  const nameInput = document.getElementById(`player${player}-name`);
  const name = nameInput.value.trim();
  
  if (!name) {
    alert("請輸入名稱");
    return;
  }

  currentPlayer = player;
  
  // 更新Firebase中的玩家資訊（會覆蓋原有的）
  db.ref(`game/player${player}`).set({
    name: name,
    joinedAt: Date.now()
  });

  // 立即更新當前玩家的UI
  document.getElementById(`player${player}-section`).classList.add('filled');
  document.getElementById(`player${player}-status`).innerHTML = `✅ ${name} 已加入`;
  nameInput.disabled = true;
  document.querySelector(`#player${player}-section button`).disabled = true;
  
  // 開始監聽遊戲狀態（只監聽一次）
  if (!gameState) {
    listenToGameState();
  }
}

// 監聽遊戲狀態
function listenToGameState() {
  db.ref('game').on('value', (snapshot) => {
    const data = snapshot.val();
    console.log('Firebase data:', data); // 除錯用
    
    if (!data) return;

    // 更新玩家狀態顯示
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

    // 檢查兩個玩家是否都已加入
    if (data.playerA && data.playerB && data.playerA.name && data.playerB.name) {
      document.getElementById('startGame').disabled = false;
      document.getElementById('startGame').innerHTML = '🚀 開始遊戲（兩人都已就緒）';
      console.log('Both players joined, start button enabled'); // 除錯用
    } else {
      document.getElementById('startGame').disabled = true;
      document.getElementById('startGame').innerHTML = '開始遊戲';
      console.log('Waiting for players...'); // 除錯用
    }

    // 重要：只有當遊戲明確開始 (gameStarted: true) 且當前用戶已選擇角色時才進入遊戲畫面
    if (data.gameStarted === true && currentPlayer && data.playerA && data.playerB) {
      console.log('Game started, showing game area'); // 除錯用
      gameState = data;
      showGameArea();
    } else if (!data.gameStarted && document.getElementById('game-area').style.display === 'block') {
      // 如果遊戲還沒開始但已經在遊戲畫面，返回登入畫面
      console.log('Game not started, showing login'); // 除錯用
      document.getElementById('login').style.display = 'block';
      document.getElementById('game-area').style.display = 'none';
    }
  });
}

// 開始遊戲
async function startGame() {
  console.log('Start game clicked, current player:', currentPlayer); // 除錯用
  
  if (!currentPlayer) {
    alert("請先選擇玩家身份");
    return;
  }

  try {
    // 先載入題目
    await loadQuestions();
    
    if (questions.length === 0) {
      alert("沒有可用的題目！");
      return;
    }

    // 檢查當前遊戲狀態
    db.ref('game').once('value', (snapshot) => {
      const data = snapshot.val();
      console.log('Checking game state before start:', data); // 除錯用
      
      if (!data || !data.playerA || !data.playerB || !data.playerA.name || !data.playerB.name) {
        alert("請等待兩個玩家都加入遊戲！");
        return;
      }

      console.log('Starting game...'); // 除錯用
      
      // 初始化遊戲狀態
      const initialGameState = {
        ...data, // 保留現有的玩家資訊
        gameStarted: true, // 重要：設置遊戲開始標記
        round: 1,
        currentGuesser: 'A', // A先當想想
        currentQuestion: 0,
        answererRole: Math.random() < 0.5 ? 'honest' : 'liar', // 隨機分配答題者的角色
        showResult: false
      };

      db.ref('game').set(initialGameState); // 使用 set 而不是 update 確保數據完整
    });
  } catch (error) {
    console.error('載入題目失敗:', error);
    alert("載入題目失敗，請稍後再試！");
  }
}

// 顯示遊戲區域
function showGameArea() {
  console.log('Showing game area'); // 除錯用
  document.getElementById('login').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  
  updateGameDisplay();
}

// 更新遊戲顯示
function updateGameDisplay() {
  // 確保有題目可用
  if (questions.length === 0) {
    console.error('沒有可用的題目');
    return;
  }

  const question = questions[gameState.currentQuestion % questions.length]; // 使用模運算避免超出範圍
  const isGuesser = currentPlayer === gameState.currentGuesser;
  const isAnswerer = currentPlayer !== gameState.currentGuesser;
  
  console.log('Updating display - isGuesser:', isGuesser, 'isAnswerer:', isAnswerer); // 除錯用
  
  // 隱藏所有UI
  document.getElementById('guesser-ui').style.display = 'none';
  document.getElementById('answerer-ui').style.display = 'none';
  document.getElementById('result-display').style.display = 'none';

  if (gameState.showResult) {
    showResult();
    return;
  }

  if (isGuesser) {
    // 顯示想想UI
    document.getElementById('guesser-ui').style.display = 'block';
    document.getElementById('guesser-question').innerHTML = `題目：${question.question}`;
  } else if (isAnswerer) {
    // 顯示答題者UI
    document.getElementById('answerer-ui').style.display = 'block';
    
    const role = gameState.answererRole;
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
}

// 做出猜測
function makeGuess(guess) {
  const correct = guess === gameState.answererRole;
  
  // 更新遊戲狀態，顯示結果
  db.ref('game').update({
    lastGuess: guess,
    guessResult: correct ? 'correct' : 'wrong',
    showResult: true
  });
}

// 顯示結果
function showResult() {
  document.getElementById('guesser-ui').style.display = 'none';
  document.getElementById('answerer-ui').style.display = 'none';
  document.getElementById('result-display').style.display = 'block';
  
  const correct = gameState.guessResult === 'correct';
  const roleText = gameState.answererRole === 'honest' ? '老實人' : '瞎掰人';
  const guessText = gameState.lastGuess === 'honest' ? '老實人' : '瞎掰人';
  
  let resultHTML = '';
  if (correct) {
    resultHTML = `
      <div style="color: #4CAF50; font-size: 24px;">🎉 猜對了！</div>
      <div>想想猜測：${guessText}</div>
      <div>實際角色：${roleText}</div>
    `;
  } else {
    resultHTML = `
      <div style="color: #f44336; font-size: 24px;">❌ 猜錯了！</div>
      <div>想想猜測：${guessText}</div>
      <div>實際角色：${roleText}</div>
    `;
  }
  
  document.getElementById('result-text').innerHTML = resultHTML;
}

// 下一回合
function nextRound() {
  // 確保有題目可用
  if (questions.length === 0) {
    alert("沒有可用的題目！");
    return;
  }

  // 輪換角色，重新分配答題者角色
  const nextGuesser = gameState.currentGuesser === 'A' ? 'B' : 'A';
  const nextQuestion = (gameState.currentQuestion + 1) % questions.length;
  
  db.ref('game').update({
    round: gameState.round + 1,
    currentGuesser: nextGuesser,
    currentQuestion: nextQuestion,
    answererRole: Math.random() < 0.5 ? 'honest' : 'liar',
    showResult: false,
    lastGuess: null,
    guessResult: null
  });
}

// 頁面載入時先載入題目
window.addEventListener('load', () => {
  loadQuestions().catch(error => {
    console.error('初始載入題目失敗:', error);
  });
});

// 綁定到 window
window.joinAsPlayer = joinAsPlayer;
window.startGame = startGame;
window.makeGuess = makeGuess;
window.nextRound = nextRound;