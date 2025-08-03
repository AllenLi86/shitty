// 遊戲設定
const GAME_CONFIG = {
  // 題目類型出現機率 (why題目 : term題目)
  typeRatio: { why: 0.45, term: 0.55 },
  
  // 角色分配機率 (老實人 : 瞎掰人)
  roleRatio: { honest: 0.5, liar: 0.5 },
  
  // 題目重複控制：同場遊戲內不重複（除非題庫用盡）
  preventDuplicateInSameGame: true,
  
  // 遊戲結算設定
  game: {
    // 達到多少分可以考慮結算（可選功能，目前不使用）
    // winningScore: 10,
    
    // 遊戲最少回合數（避免太快結算）
    minimumRounds: 2
  },
  
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