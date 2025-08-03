// 遊戲設定
const GAME_CONFIG = {
  // 題目類型出現機率 (why題目 : term題目)
  typeRatio: { why: 0.6, term: 0.4 },
  
  // 角色分配機率 (老實人 : 瞎掰人)
  roleRatio: { honest: 0.5, liar: 0.5 },
  
  // 降低重複機率的設定
  recentQuestionsLimit: 5, // 最近幾題不會重複
  
  // 計分邏輯設定
  scoring: {
    // 想想猜對老實人時的得分
    guesserCorrectHonest: { guesser: 1, answerer: 0 },
    
    // 想想猜錯老實人時的得分變化
    guesserWrongHonest: { guesser: -1, answerer: -1 },
    
    // 想想猜對瞎掰人時的得分
    guesserCorrectLiar: { guesser: 1, answerer: 0 },
    
    // 想想猜錯瞎掰人時的得分變化（瞎掰人成功騙到想想）
    guesserWrongLiar: { guesser: 0, answerer: 2 }
  }
};

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