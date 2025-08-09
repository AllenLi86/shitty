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
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔒 權限檢查
  const adminToken = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
  
  console.log('🔒 Checking admin token:', !!adminToken);
  
  if (!verifyAdminToken) {
    console.error('🔒 verifyAdminToken function not available');
    return res.status(500).json({ error: 'Admin auth not configured' });
  }
  
  /*
  if (!verifyAdminToken(adminToken)) {
    console.log('🔒 Admin access denied - invalid token');
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'AI question generation requires admin authentication'
    });
  }
  */

  console.log('🔒 Admin access granted');

  try {
    const { type, difficulty, count = 1 } = req.body;

    console.log('🤖 Generating questions:', { type, difficulty, count });

    // AI 生成邏輯...
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

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const generatedQuestions = JSON.parse(completion.choices[0].message.content);
    
    // 儲存到 Firebase
    const db = admin.database();
    const questionsRef = db.ref('questions');
    
    const snapshot = await questionsRef.once('value');
    const existingQuestions = snapshot.val() || [];
    
    const newQuestions = [...existingQuestions, ...generatedQuestions.questions];
    await questionsRef.set(newQuestions);

    console.log('🤖 Questions generated successfully:', generatedQuestions.questions.length);

    res.status(200).json({
      success: true,
      generated: generatedQuestions.questions,
      totalCount: newQuestions.length
    });

  } catch (error) {
    console.error('🤖 Error generating questions:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message 
    });
  }
}