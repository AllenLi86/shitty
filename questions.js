// 題目管理模組
class QuestionsManager {
  constructor() {
    this.questions = [];
    this.recentQuestions = [];
  }

  // 載入題目從 Firebase
  async loadQuestions() {
    return new Promise((resolve, reject) => {
      db.ref('questions').once('value', (snapshot) => {
        const data = snapshot.val();
        if (data && Array.isArray(data)) {
          this.questions = data;
          console.log('題目已載入:', this.questions.length, '題');
          
          // 統計題目類型
          const whyCount = this.questions.filter(q => q.type === 'why').length;
          const termCount = this.questions.filter(q => q.type === 'term').length;
          console.log(`題目分布 - why: ${whyCount}題, term: ${termCount}題`);
          
          resolve(this.questions);
        } else {
          console.log('沒有找到題目，使用預設題目');
          // 如果沒有題目，可以設定預設題目
          this.questions = [
            {
              question: "為什麼企鵝不會飛？",
              explanation: "企鵝的祖先原本會飛，但為了適應水中生活，翅膀演化成了更適合游泳的鰭狀肢。牠們的骨骼也變得更重，以便在水中保持穩定。",
              type: "why"
            }
          ];
          resolve(this.questions);
        }
      }, (error) => {
        console.error('載入題目失敗:', error);
        reject(error);
      });
    });
  }

  // 選擇隨機題目
  selectRandomQuestion() {
    return selectRandomQuestion(this.questions, this.recentQuestions);
  }

  // 獲取題目
  getQuestion(index) {
    return this.questions[index];
  }

  // 獲取題目總數
  getQuestionsCount() {
    return this.questions.length;
  }
}