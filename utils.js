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

// 智能選擇題目
function selectRandomQuestion(questions, recentQuestions) {
  if (questions.length === 0) return null;
  
  // 如果題目總數不多，就簡單隨機選擇
  if (questions.length <= GAME_CONFIG.recentQuestionsLimit) {
    return Math.floor(Math.random() * questions.length);
  }
  
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
  
  // 獲取對應類型的題目，排除最近使用過的
  let availableQuestions;
  if (selectedType === 'why') {
    availableQuestions = whyQuestions.filter(q => !recentQuestions.includes(q.index));
  } else {
    availableQuestions = termQuestions.filter(q => !recentQuestions.includes(q.index));
  }
  
  // 如果該類型沒有可用題目，則從另一類型選擇
  if (availableQuestions.length === 0) {
    if (selectedType === 'why') {
      availableQuestions = termQuestions.filter(q => !recentQuestions.includes(q.index));
    } else {
      availableQuestions = whyQuestions.filter(q => !recentQuestions.includes(q.index));
    }
  }
  
  // 如果所有題目都在最近使用過，清空記錄重新開始
  if (availableQuestions.length === 0) {
    recentQuestions.length = 0; // 清空陣列
    availableQuestions = selectedType === 'why' ? whyQuestions : termQuestions;
  }
  
  // 隨機選擇一題
  const selectedQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  const questionIndex = selectedQuestion.index;
  
  // 更新最近使用記錄
  recentQuestions.push(questionIndex);
  if (recentQuestions.length > GAME_CONFIG.recentQuestionsLimit) {
    recentQuestions.shift(); // 移除最舊的記錄
  }
  
  console.log(`選擇了 ${selectedType} 類型題目 (索引: ${questionIndex}): ${questions[questionIndex].question}`);
  return questionIndex;
}