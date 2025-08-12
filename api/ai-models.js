const AIService = require('./utils/ai-service');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🤖 AI Models API called');
    
    const aiService = new AIService();
    const models = aiService.getAvailableModels();
    
    console.log('🤖 Available models:', models.map(m => m.name));
    
    // 🔥 構建完整的模型列表，包含自動選擇選項
    const fullModelList = [
      { 
        name: 'auto', 
        displayName: '自動選擇 (推薦)', 
        type: 'auto',
        description: '智能選擇最佳可用模型'
      },
      ...models.map(model => ({
        ...model,
        description: `${model.type.toUpperCase()} 模型`
      }))
    ];
    
    res.status(200).json({
      success: true,
      models: fullModelList,
      totalCount: models.length,
      availableTypes: [...new Set(models.map(m => m.type))],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🤖 AI Models API error:', error);
    res.status(500).json({ 
      error: 'Failed to get models',
      details: error.message
    });
  }
}