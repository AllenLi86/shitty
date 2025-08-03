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

// 測試題目和解說
const testQuestions = [
  {
    question: "為什麼企鵝不會飛？",
    explanation: "企鵝的祖先原本會飛，但為了適應水中生活，翅膀演化成了更適合游泳的鰭狀肢。牠們的骨骼也變得更重，以便在水中保持穩定。"
  },
  {
    question: "為什麼天空是藍色的？",
    explanation: "陽光進入大氣層時，藍光的波長較短，更容易被空氣分子散射，所以我們看到的天空呈現藍色。這種現象叫做瑞利散射。"
  },
  {
    question: "為什麼洋蔥會讓人流淚？",
    explanation: "洋蔥被切開時會釋放含硫化合物，這些化合物與眼睛接觸時會形成硫酸，刺激淚腺分泌眼淚來沖洗刺激物。"
  }
];

// 加入遊戲
function joinAsPlayer(player) {
  const nameInput = document.getElementById(`player${player}-name`);
  const name = nameInput.value.trim();
  
  if (!name) {
    alert("請輸入名稱");
    return;
  }

  currentPlayer = player;
  
  // 更新Firebase中的玩家資訊
  db.ref(`game/player${player}`).set({
    name: name,
    joinedAt: Date.now()
  });

  // 更新UI
  document.getElementById(`player${player}-section`).classList.add('filled');
  document.getElementById(`player${player}-status`).innerHTML = `✅ ${name} 已加入`;
  nameInput.disabled = true;
  
  // 監聽遊戲狀態
  listenToGameState();
}

// 監聽遊戲狀態
function listenToGameState() {
  db.ref('game').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    // 更新玩家狀態顯示
    if (data.playerA) {
      document.getElementById('playerA-section').classList.add('filled');
      document.getElementById('playerA-status').innerHTML = `✅ ${data.playerA.name} 已加入`;
      // 禁用玩家A的輸入框和按鈕
      document.getElementById('playerA-name').disabled = true;
      document.querySelector('#playerA-section button').disabled = true;
    }
    if (data.playerB) {
      document.getElementById('playerB-section').classList.add('filled');
      document.getElementById('playerB-status').innerHTML = `✅ ${data.playerB.name} 已加入`;
      // 禁用玩家B的輸入框和按鈕
      document.getElementById('playerB-name').disabled = true;
      document.querySelector('#playerB-section button').disabled = true;
    }

    // 檢查兩個玩家是否都已加入
    if (data.playerA && data.playerB) {
      document.getElementById('startGame').disabled = false;
      document.getElementById('startGame').innerHTML = '🚀 開始遊戲（兩人都已就緒）';
    }

    // 只有當遊戲明確開始且兩個玩家都在時才進入遊戲畫面
    if (data.gameStarted && data.playerA && data.playerB && currentPlayer) {
      gameState = data;
      showGameArea();
    }
  });
}

// 開始遊戲
function startGame() {
  if (!currentPlayer) {
    alert("請先選擇玩家身份");
    return;
  }

  // 檢查兩個玩家是否都已加入
  db.ref('game').once('value', (snapshot) => {
    const data = snapshot.val();
    if (!data || !data.playerA || !data.playerB) {
      alert("請等待兩個玩家都加入遊戲！");
      return;
    }

    // 初始化遊戲狀態
    const initialGameState = {
      gameStarted: true,
      round: 1,
      currentGuesser: 'A', // A先當想想
      currentQuestion: 0,
      answererRole: Math.random() < 0.5 ? 'honest' : 'liar', // 隨機分配答題者的角色
      showResult: false
    };

    db.ref('game').update(initialGameState);
  });
}

// 顯示遊戲區域
function showGameArea() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('game-area').style.display = 'block';
  
  updateGameDisplay();
}

// 更新遊戲顯示
function updateGameDisplay() {
  const question = testQuestions[gameState.currentQuestion];
  const isGuesser = currentPlayer === gameState.currentGuesser;
  const isAnswerer = currentPlayer !== gameState.currentGuesser;
  
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
  // 輪換角色，重新分配答題者角色
  const nextGuesser = gameState.currentGuesser === 'A' ? 'B' : 'A';
  const nextQuestion = (gameState.currentQuestion + 1) % testQuestions.length;
  
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

// 綁定到 window
window.joinAsPlayer = joinAsPlayer;
window.startGame = startGame;
window.makeGuess = makeGuess;
window.nextRound = nextRound;