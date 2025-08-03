const firebaseConfig = {
  apiKey: "AIzaSyB95BnsfKtB__X6K7KbPCT0zng4eofZ3Ks",
  authDomain: "shitty-24b2f.firebaseapp.com",
  databaseURL: "https://shitty-24b2f-default-rtdb.firebaseio.com",
  projectId: "shitty-24b2f",
  storageBucket: "shitty-24b2f.appspot.com",
  messagingSenderId: "370223390160",
  appId: "1:370223390160:web:8be6cba5345de0f73eadd5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 暫存玩家資訊
let localPlayerName = "";
let localRole = ""; // thinker / truth / liar

const sampleQuestion = {
  question: "為什麼貓咪會舔人？",
  explanation: "貓咪舔人代表牠喜歡你，把你當家人。"
};

function joinGame() {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("請輸入名稱");

  localPlayerName = name;

  // 寫入 Firebase
  const playerRef = db.ref("players").push();
  playerRef.set({
    name: name,
    joinedAt: Date.now()
  });

  // 監聽目前所有玩家（進兩個人後開始遊戲）
  db.ref("players").on("value", (snapshot) => {
    const players = snapshot.val();
    const keys = Object.keys(players || {});
    if (keys.length === 2) {
      startGame(keys.map(k => players[k]));
    }
  });

  document.getElementById("login").style.display = "none";
}

function startGame(playerList) {
  const playerA = playerList[0];
  const playerB = playerList[1];

  const thinker = playerA.name;
  const responder = playerB.name;
  const responderRole = Math.random() < 0.5 ? "truth" : "liar";

  if (localPlayerName === thinker) {
    localRole = "thinker";
    showThinkerView();
  } else if (localPlayerName === responder) {
    localRole = responderRole;
    showResponderView(responderRole);
  }
}

function showThinkerView() {
  document.body.innerHTML = `
    <h2>你是「想想」</h2>
    <p><strong>題目：</strong> ${sampleQuestion.question}</p>
    <button onclick="submitGuess('truth')">他是老實人</button>
    <button onclick="submitGuess('liar')">他是瞎掰人</button>
  `;
}

function showResponderView(role) {
  document.body.innerHTML = `
    <h2>你是 ${role === "truth" ? "老實人" : "瞎掰人"}</h2>
    <p><strong>題目：</strong> ${sampleQuestion.question}</p>
    ${role === "truth" ? `<p><strong>解說：</strong> ${sampleQuestion.explanation}</p>` : ""}
  `;
}

function submitGuess(choice) {
  alert(`你選擇了：${choice}`);
}

window.joinGame = joinGame;
