// 初始化 Firebase
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

// 加入遊戲函式，會把玩家名字寫入 Firebase
function joinGame() {
  const nameInput = document.getElementById("nameInput");
  const name = nameInput.value.trim();

  if (!name) {
    alert("請輸入名稱！");
    return;
  }

  const playerRef = db.ref("players").push();
  playerRef.set({
    name: name,
    joinedAt: Date.now()
  });

  alert(`${name} 已成功加入遊戲！`);
}

// 將函式掛到全域，讓 HTML 可以呼叫
window.joinGame = joinGame;
