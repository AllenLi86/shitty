// 計算分數變化
function calculateScoreChange(guessResult, answererRole) {
  const config = GAME_CONFIG.scoring;
  
  if (answererRole === 'honest') {
    // 答題者是老實人
    if (guessResult === 'correct') {
      // 想想猜對老實人
      return config.guesserCorrectHonest;
    } else {
      // 想想猜錯老實人
      return config.guesserWrongHonest;
    }
  } else {
    // 答題者是瞎掰人
    if (guessResult === 'correct') {
      // 想想猜對瞎掰人
      return config.guesserCorrectLiar;
    } else {
      // 想想猜錯瞎掰人（瞎掰人成功騙到想想）
      return config.guesserWrongLiar;
    }
  }
}

// 根據機率分配角色
function assignAnswererRole() {
  const random = Math.random();
  return random < GAME_CONFIG.roleRatio.honest ? 'honest' : 'liar';
}

// 智能選擇題目 - 同場遊戲內不重複
function selectRandomQuestion(questions, usedQuestions = []) {
  if (questions.length === 0) return null;
  
  // 根據設定的機率決定要選擇哪種類型的題目
  const whyQuestions = questions.map((q, i) => ({ ...q, index: i })).filter(q => q.type === 'why');
  const termQuestions = questions.map((q, i) => ({ ...q, index: i })).filter(q => q.type === 'term');
  
  let selectedType;
  const random = Math.random();
  
  if (random < GAME_CONFIG.typeRatio.why) {
    selectedType = 'why';
  } else {
    selectedType = 'term';
  }
  
  // 獲取對應類型且未使用過的題目
  let availableQuestions;
  if (selectedType === 'why') {
    availableQuestions = whyQuestions.filter(q => !usedQuestions.includes(q.index));
  } else {
    availableQuestions = termQuestions.filter(q => !usedQuestions.includes(q.index));
  }
  
  // 如果該類型沒有可用題目，則從另一類型選擇
  if (availableQuestions.length === 0) {
    if (selectedType === 'why') {
      availableQuestions = termQuestions.filter(q => !usedQuestions.includes(q.index));
    } else {
      availableQuestions = whyQuestions.filter(q => !usedQuestions.includes(q.index));
    }
  }
  
  // 如果所有題目都用過了，清空使用記錄重新開始
  if (availableQuestions.length === 0) {
    console.log('所有題目都用過了，重新開始選題');
    usedQuestions.length = 0; // 清空已使用題目列表
    availableQuestions = selectedType === 'why' ? whyQuestions : termQuestions;
  }
  
  // 隨機選擇一題
  const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  const questionIndex = selectedQuestion.index;
  
  console.log(`選擇了 ${selectedType} 類型題目 (索引: ${questionIndex}): ${questions[questionIndex].question}`);
  return questionIndex;
}

// 檢查玩家是否相同（用於判斷是否重聯）
function checkPlayersChanged(currentData, newPlayerA, newPlayerB) {
  if (!currentData || !currentData.playerA || !currentData.playerB) {
    return false; // 沒有現有資料，不算改變
  }
  
  const playerAChanged = currentData.playerA.name !== newPlayerA;
  const playerBChanged = currentData.playerB.name !== newPlayerB;
  
  return playerAChanged || playerBChanged;
}

// 判斷遊戲獲勝者
function determineWinner(scores, playerAName, playerBName) {
  if (scores.A > scores.B) {
    return { winner: 'A', winnerName: playerAName, loser: 'B', loserName: playerBName };
  } else if (scores.B > scores.A) {
    return { winner: 'B', winnerName: playerBName, loser: 'A', loserName: playerAName };
  } else {
    return { winner: 'tie', winnerName: null, loser: null, loserName: null };
  }
}