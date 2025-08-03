import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB95BnsfKtB__X6K7KbPCT0zng4eofZ3Ks",
  authDomain: "shitty-24b2f.firebaseapp.com",
  databaseURL: "https://shitty-24b2f-default-rtdb.firebaseio.com",
  projectId: "shitty-24b2f",
  storageBucket: "shitty-24b2f.firebasestorage.app",
  messagingSenderId: "370223390160",
  appId: "1:370223390160:web:8be6cba5345de0f73eadd5",
  measurementId: "G-GRVPKCK8VY"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let playerName = "";
let myRole = "";
let isJudge = false;

const questions = [
  { q: "貓為什麼會發出呼嚕聲？", a: "因為它們放鬆快樂" },
  { q: "為什麼天空是藍色的？", a: "因為光的散射原理" }
];

// Join Game
window.joinGame = function () {
  playerName = document.getElementById("nameInput").value.trim();
  if (!playerName) return alert("請輸入名稱");

  const playerRef = ref(db, "players/" + playerName);
  set(playerRef, { name: playerName, score: 0 });

  document.getElementById("login").style.display = "none";
  document.getElementById("game").style.display = "block";

  onValue(ref(db, "game"), snapshot => {
    const data = snapshot.val();
    if (!data) return;

    document.getElementById("question").innerText = data.question;
    document.getElementById("reason").value = "";
    document.getElementById("opponentReason").innerText = data.opponentReason || "-";
    document.getElementById("result").innerText = data.result || "-";

    const isYou = data.current === playerName;
    myRole = isYou ? "想想" : data.roles[playerName];
    isJudge = isYou;

    document.getElementById("roleDisplay").innerText = myRole;
    document.getElementById("answer").innerText = (myRole === "老實人") ? data.answer : "(瞎掰人看不到)";
  });
};

// 提交理由
window.submitReason = function () {
  const reason = document.getElementById("reason").value;
  update(ref(db, "game"), {
    [playerName + "_reason"]: reason
  });
};

// 判斷對方身份
window.judge = function (guessIsHonest) {
  onValue(ref(db, "game"), snapshot => {
    const data = snapshot.val();
    const otherPlayer = Object.keys(data.roles).find(name => name !== playerName);
    const actual = data.roles[otherPlayer];
    let result = "";
    const scoresRef = ref(db, "players/");

    if ((actual === "老實人" && !guessIsHonest)) {
      result = "你冤枉了老實人，他扣分";
      update(scoresRef, { [otherPlayer + "/score"]: data[otherPlayer + "_score"] - 1 });
    } else if (actual === "瞎掰人" && guessIsHonest) {
      result = "你被騙了，瞎掰人加分！";
      update(scoresRef, { [otherPlayer + "/score"]: data[otherPlayer + "_score"] + 1 });
    } else {
      result = "判斷正確，無加扣分";
    }

    update(ref(db, "game"), { result });
  }, { onlyOnce: true });
};

// 下一回合
window.nextRound = function () {
  const q = questions[Math.floor(Math.random() * questions.length)];
  const players = [playerName, "另一位"]; // TODO: 動態取得玩家名單

  const roles = {};
  const liarIndex = Math.floor(Math.random() * 2);
  roles[players[0]] = (liarIndex === 0) ? "瞎掰人" : "老實人";
  roles[players[1]] = (liarIndex === 1) ? "瞎掰人" : "老實人";

  const next = (players[0] === playerName) ? players[1] : players[0];

  set(ref(db, "game"), {
    question: q.q,
    answer: q.a,
    current: next,
    roles: roles,
    result: "",
    [players[0] + "_reason"]: "",
    [players[1] + "_reason"]: ""
  });
};

