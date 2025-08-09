const admin = require('./utils/firebase-admin');
const AIService = require('./utils/ai-service');
const { verifyAdminToken } = require('./admin-auth');

export default async function handler(req, res) {
  console.log('🤖 Multi-AI Generate API called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔒 權限檢查
  const adminToken = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!verifyAdminToken(adminToken)) {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'AI question generation requires admin authentication'
    });
  }

  try {
    const { type, difficulty, count = 1, model = 'auto' } = req.body;

    console.log('🤖 Request:', { type, difficulty, count, model });

    const aiService = new AIService();
    const availableModels = aiService.getAvailableModels();
    
    if (availableModels.length === 0) {
      return res.status(500).json({ 
        error: 'No AI models available',
        message: 'Please configure at least one AI service API key'
      });
    }

    // 自動選擇模型或使用指定模型
    let selectedModel = model;
    if (model === 'auto') {
      // 優先級：Groq > Gemini > Claude > OpenAI (基於免費額度和速度)
      const priority = ['groq-mixtral', 'groq-llama', 'gemini-pro', 'claude-haiku', 'openai'];
      selectedModel = priority.find(m => availableModels.some(am => am.name === m)) || availableModels[0].name;
    }

    console.log('🤖 Using model:', selectedModel);

    const result = await aiService.generateQuestions(selectedModel, type, difficulty, count);
    
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('Invalid response format from AI');
    }

    // 儲存到 Firebase
    const db = admin.database();
    const questionsRef = db.ref('questions');
    
    const snapshot = await questionsRef.once('value');
    const existingQuestions = snapshot.val() || [];
    
    const newQuestions = [...existingQuestions, ...result.questions];
    await questionsRef.set(newQuestions);

    console.log('🤖 Questions generated successfully:', result.questions.length);

    res.status(200).json({
      success: true,
      generated: result.questions,
      totalCount: newQuestions.length,
      usedModel: selectedModel
    });

  } catch (error) {
    console.error('🤖 Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions',
      details: error.message
    });
  }
}