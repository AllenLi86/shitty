const { OpenAI } = require('openai');
const admin = require('./utils/firebase-admin');

// 🔥 確保正確引用
let verifyAdminToken;
try {
  const authModule = require('./admin-auth');
  verifyAdminToken = authModule.verifyAdminToken;
} catch (error) {
  console.error('Failed to load admin auth:', error);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  console.log('🤖 AI Generate API called');
  console.log('🤖 Request body:', req.body);
  console.log('🤖 Headers:', req.headers);
  
  // 檢查環境變數
  console.log('🤖 Environment check:', {
    has_openai_key: !!process.env.OPENAI_API_KEY,
    openai_key_length: process.env.OPENAI_API_KEY?.length || 0
  });
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, difficulty, count = 1 } = req.body;

    console.log('🤖 Generating questions:', { type, difficulty, count });

    // 檢查 OpenAI 初始化
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🤖 OpenAI client created');

    const prompt = `請生成 ${count} 道${type === 'why' ? '為什麼' : '什麼是'}類型的題目，難度為${difficulty}。

要求：
1. 題目要有趣、有教育意義  
2. 每題包含：問題、正確解說、類型、難度、主題
3. 回傳 JSON 格式：
{
  "questions": [
    {
      "question": "為什麼...",
      "explanation": "正確解說...",
      "type": "${type}",
      "difficulty": ${difficulty},
      "topic": "適當的主題分類"
    }
  ]
}`;

    console.log('🤖 Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    console.log('🤖 OpenAI response received');

    const generatedQuestions = JSON.parse(completion.choices[0].message.content);
    
    console.log('🤖 Questions parsed:', generatedQuestions);

    // 先不儲存到 Firebase，只回傳結果測試
    res.status(200).json({
      success: true,
      generated: generatedQuestions.questions,
      totalCount: generatedQuestions.questions.length
    });

  } catch (error) {
    console.error('🤖 Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message,
      type: error.name
    });
  }
}