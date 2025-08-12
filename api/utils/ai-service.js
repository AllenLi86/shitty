const { OpenAI } = require('openai');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

class AIService {
  constructor() {
    this.services = this.initializeServices();
  }

  initializeServices() {
    const services = [];

    // Groq (更新最新模型)
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        // 🔥 使用最新的 Groq 模型（2024年8月更新）
        services.push({
          name: 'groq-llama-8b',
          displayName: 'Groq Llama 3.1 8B (免費・最快)',
          model: 'llama-3.1-8b-instant',
          client: groq,
          type: 'groq'
        });
        
        services.push({
          name: 'groq-llama-70b',
          displayName: 'Groq Llama 3.1 70B (免費・高品質)',
          model: 'llama-3.3-70b-versatile',
          client: groq,
          type: 'groq'
        });
                
        console.log('✅ Groq services initialized');
      } catch (error) {
        console.log('❌ Groq not available:', error.message);
      }
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        services.push({
          name: 'openai-gpt35',
          displayName: 'OpenAI GPT-3.5 Turbo',
          model: 'gpt-3.5-turbo',
          client: openai,
          type: 'openai'
        });
        
        services.push({
          name: 'openai-gpt4',
          displayName: 'OpenAI GPT-4',
          model: 'gpt-4',
          client: openai,
          type: 'openai'
        });

        services.push({
          name: 'openai-gpt4o-mini',
          displayName: 'OpenAI GPT-4o Mini',
          model: 'gpt-4o-mini',
          client: openai,
          type: 'openai'
        });
        console.log('✅ OpenAI services initialized');
      } catch (error) {
        console.log('❌ OpenAI not available:', error.message);
      }
    }

    // Google Gemini
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        services.push({
          name: 'gemini-pro',
          displayName: 'Google Gemini Pro (免費)',
          model: 'gemini-pro',
          client: genAI,
          type: 'gemini'
        });

        services.push({
          name: 'gemini-1.5-flash',
          displayName: 'Google Gemini 1.5 Flash (免費・快速)',
          model: 'gemini-1.5-flash',
          client: genAI,
          type: 'gemini'
        });
        console.log('✅ Gemini services initialized');
      } catch (error) {
        console.log('❌ Gemini not available:', error.message);
      }
    }

    // Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        services.push({
          name: 'claude-sonnet',
          displayName: 'Claude 3.5 Sonnet',
          model: 'claude-3-5-sonnet-20240620',
          client: anthropic,
          type: 'claude'
        });
        
        services.push({
          name: 'claude-haiku',
          displayName: 'Claude 3 Haiku',
          model: 'claude-3-haiku-20240307',
          client: anthropic,
          type: 'claude'
        });
        console.log('✅ Claude services initialized');
      } catch (error) {
        console.log('❌ Claude not available:', error.message);
      }
    }

    console.log(`Initialized ${services.length} AI services:`, services.map(s => s.name));
    return services;
  }

  getAvailableModels() {
    return this.services.map(service => ({
      name: service.name,
      displayName: service.displayName,
      type: service.type
    }));
  }

  async generateQuestions(modelName, type, difficulty, count = 1) {
    const service = this.services.find(s => s.name === modelName);
    if (!service) {
      throw new Error(`Model ${modelName} not available`);
    }

    const prompt = this.buildPrompt(type, difficulty, count);
    
    try {
      let response;
      
      switch (service.type) {
        case 'openai':
          response = await service.client.chat.completions.create({
            model: service.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 1500,
          });
          return this.parseResponse(response.choices[0].message.content, modelName);
          
        case 'groq':
          response = await service.client.chat.completions.create({
            model: service.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 1500,
            top_p: 0.9,
            stream: false,
          });
          return this.parseResponse(response.choices[0].message.content, modelName);
          
        case 'gemini':
          const model = service.client.getGenerativeModel({ 
            model: service.model,
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.8,
            }
          });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return this.parseResponse(text, modelName);
          
        case 'claude':
          const message = await service.client.messages.create({
            model: service.model,
            max_tokens: 1500,
            temperature: 0.8,
            messages: [{ role: "user", content: prompt }]
          });
          return this.parseResponse(message.content[0].text, modelName);
          
        default:
          throw new Error(`Unknown service type: ${service.type}`);
      }
      
    } catch (error) {
      console.error(`Error with ${modelName}:`, error);
      throw new Error(`${service.displayName} 生成失敗: ${error.message}`);
    }
  }

  buildPrompt(type, difficulty, count) {
    return `生成${count}道${type === 'why' ? '為什麼' : '什麼是'}題目，難度${difficulty}。

要求：
1. 有趣且有教育意義，並且要基於事實，不能是幻覺
2. 回傳JSON格式，無其他文字
3. 格式：
{
  "questions": [
    {
      "question": "為什麼...",
      "explanation": "簡潔解說(100字內)",
      "type": "${type}",
      "difficulty": ${difficulty},
      "topic": "主題"
    }
  ]
}`;
  }

  parseResponse(text, modelName) {
    try {
      // 清理回應文字，提取 JSON
      let jsonText = text.trim();
      
      // 移除可能的 markdown 代碼塊標記
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // 嘗試找到 JSON 部分
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd);
      }
      
      const parsed = JSON.parse(jsonText);
      
      // 為每個題目加入來源標籤
      if (parsed.questions && Array.isArray(parsed.questions)) {
        parsed.questions = parsed.questions.map(q => ({
          ...q,
          source: modelName,
          created_at: new Date().toISOString(),
          quality_score: null
        }));
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI 回應格式錯誤，無法解析 JSON');
    }
  }
}

module.exports = AIService;