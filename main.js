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

// 加入遊戲
function joinGame() {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("請輸入名稱");

  db.ref("players").push({
    name: name,
    joinedAt: Date.now()
  });

  alert(`玩家 ${name} 已加入遊戲！`);
}

// 綁到 window，讓 HTML 可以呼叫
window.joinGame = joinGame;
