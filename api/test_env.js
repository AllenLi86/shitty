export default function handler(req, res) {
  const envCheck = {
    GROQ_API_KEY: process.env.GROQ_API_KEY ? '✅ 存在' : '❌ 缺少',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? '✅ 存在' : '❌ 缺少',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ 存在' : '❌ 缺少',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✅ 存在' : '❌ 缺少',
    
    // 顯示 key 的長度（安全起見不顯示完整內容）
    GROQ_KEY_LENGTH: process.env.GROQ_API_KEY?.length || 0,
    GOOGLE_KEY_LENGTH: process.env.GOOGLE_API_KEY?.length || 0,
    OPENAI_KEY_LENGTH: process.env.OPENAI_API_KEY?.length || 0,
    ANTHROPIC_KEY_LENGTH: process.env.ANTHROPIC_API_KEY?.length || 0,
    
    // 顯示 key 的前幾個字元
    GROQ_KEY_PREFIX: process.env.GROQ_API_KEY?.substring(0, 10) || 'N/A',
    GOOGLE_KEY_PREFIX: process.env.GOOGLE_API_KEY?.substring(0, 10) || 'N/A'
  };

  res.status(200).json(envCheck);
}