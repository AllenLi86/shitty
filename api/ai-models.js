const AIService = require('./utils/ai-service');

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const aiService = new AIService();
    const models = aiService.getAvailableModels();
    
    res.status(200).json({
      success: true,
      models: [
        { name: 'auto', displayName: '🚀 自動選擇 (推薦)', type: 'auto' },
        ...models
      ]
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get models' });
  }
}