export default async function handler(req, res) {
  console.log('🧪 Test AI API called');
  
  try {
    // 1. 檢查環境變數
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const keyLength = process.env.OPENAI_API_KEY?.length || 0;
    
    console.log('🧪 Environment check:', { hasOpenAI, keyLength });
    
    if (!hasOpenAI) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured',
        step: 'env_check'
      });
    }
    
    // 2. 測試 OpenAI 載入
    const { OpenAI } = require('openai');
    console.log('🧪 OpenAI module loaded');
    
    // 3. 測試 OpenAI 初始化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('🧪 OpenAI client created');
    
    // 4. 測試簡單 API 調用
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    });
    
    console.log('🧪 OpenAI API call successful');
    
    res.status(200).json({
      success: true,
      message: 'All tests passed',
      response: completion.choices[0].message.content
    });
    
  } catch (error) {
    console.error('🧪 Test failed:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Test failed',
      details: error.message,
      name: error.name,
      code: error.code
    });
  }
}