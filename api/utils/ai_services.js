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

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        services.push({
          name: 'openai',
          displayName: 'OpenAI GPT-3.5',
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
      } catch (error) {
        console.log('OpenAI not available:', error.message);
      }
    }

    // Groq
    if (process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        services.push({
          name: 'groq-mixtral',
          displayName: 'Groq Mixtral 8x7B',
          model: 'mixtral-8x7b-32768',
          client: groq,
          type: 'groq'
        });
        
        services.push({
          name: 'groq-llama',
          displayName: 'Groq Llama2 70B',
          model: 'llama2-70b-4096',
          client: groq,
          type: 'groq'
        });
      } catch (error) {
        console.log('Groq not available:', error.message);
      }
    }

    // Google Gemini
    if (process.env.GOOGLE_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        services.push({
          name: 'gemini-pro',
          displayName: 'Google Gemini Pro',
          model: 'gemini-pro',
          client: genAI,
          type: 'gemini'
        });
      } catch (error) {
        console.log('Gemini not available:', error.message);
      }
    }

    // Anthropic Claude
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        services.push({
          name: 'claude-sonnet',
          displayName: 'Claude 3 Sonnet',
          model: 'claude-3-sonnet-20240229',
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
      } catch (error) {
        console.log('Claude not available:', error.message);
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
        case 'groq':
          response = await service.client.chat.completions.create({
            model: service.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2000,
          });
          return this.parseResponse(response.choices[0].message.content, modelName);
          
        case 'gemini':
          const model = service.client.getGenerativeModel({ model: service.model });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return this.parseResponse(text, modelName);
          
        case 'claude':
          const message = await service.client.messages.create({
            model: service.model,
            max_tokens: 2000,
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
    return `請生成 ${count} 道${type === 'why' ? '為什麼' : '什麼是'}類型的題目，難度為${difficulty}。

要求：
1. 題目要有趣、有教育意義，並且需基於事實，不能是幻覺
2. 每題包含：問題、正確解說、類型、難度、主題
3. 必須回傳標準 JSON 格式，不要包含任何其他文字
4. JSON 格式如下：
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