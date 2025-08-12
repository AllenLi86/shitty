export default async function handler(req, res) {
  console.log('🧪 Testing AI service initialization...');
  
  const results = {};
  
  // 測試 Groq
  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    results.groq = { status: '✅ 初始化成功', error: null };
    console.log('✅ Groq initialized');
  } catch (error) {
    results.groq = { status: '❌ 初始化失敗', error: error.message };
    console.error('❌ Groq failed:', error);
  }
  
  // 測試 Google Gemini
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    results.gemini = { status: '✅ 初始化成功', error: null };
    console.log('✅ Gemini initialized');
  } catch (error) {
    results.gemini = { status: '❌ 初始化失敗', error: error.message };
    console.error('❌ Gemini failed:', error);
  }
  
  // 測試 OpenAI
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    results.openai = { status: '✅ 初始化成功', error: null };
    console.log('✅ OpenAI initialized');
  } catch (error) {
    results.openai = { status: '❌ 初始化失敗', error: error.message };
    console.error('❌ OpenAI failed:', error);
  }
  
  // 測試完整 AI Service
  try {
    const AIService = require('./utils/ai-service');
    const aiService = new AIService();
    const models = aiService.getAvailableModels();
    results.aiService = { 
      status: '✅ AI Service 成功', 
      modelCount: models.length,
      models: models.map(m => m.name)
    };
    console.log('✅ AI Service initialized with', models.length, 'models');
  } catch (error) {
    results.aiService = { status: '❌ AI Service 失敗', error: error.message };
    console.error('❌ AI Service failed:', error);
  }
  
  res.status(200).json({
    success: true,
    results: results,
    timestamp: new Date().toISOString()
  });
}