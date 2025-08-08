const { OpenAI } = require('openai');
const admin = require('./utils/firebase-admin');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, difficulty, count = 1 } = req.body;

    // AI 生成題目的 prompt
    const prompt = `請生成 ${count} 道${type === 'why' ? '為什麼' : '什麼是'}類型的題目，難度為${difficulty}。
    
要求：
1. 題目要有趣、有教育意義
2. 每題包含：問題、正確解說、類型、難度
3. 回傳 JSON 格式：
{
  "questions": [
    {
      "question": "為什麼...",
      "explanation": "正確解說...",
      "type": "${type}",
      "difficulty": ${difficulty}
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const generatedQuestions = JSON.parse(completion.choices[0].message.content);
    
    // 儲存到 Firebase
    const db = admin.database();
    const questionsRef = db.ref('questions');
    
    // 取得現有題目
    const snapshot = await questionsRef.once('value');
    const existingQuestions = snapshot.val() || [];
    
    // 新增新題目
    const newQuestions = [...existingQuestions, ...generatedQuestions.questions];
    await questionsRef.set(newQuestions);

    res.status(200).json({
      success: true,
      generated: generatedQuestions.questions,
      totalCount: newQuestions.length
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message 
    });
  }
}