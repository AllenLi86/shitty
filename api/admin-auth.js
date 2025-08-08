// 簡單的 session 儲存
const adminSessions = new Map();

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctPassword) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }

  if (password === correctPassword) {
    // 生成安全的 token
    const token = require('crypto').randomBytes(32).toString('hex');
    const sessionData = {
      token,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24小時過期
    };
    
    adminSessions.set(token, sessionData);
    
    // 清理過期的 sessions
    for (const [key, session] of adminSessions.entries()) {
      if (session.expiresAt < Date.now()) {
        adminSessions.delete(key);
      }
    }

    res.status(200).json({ 
      success: true, 
      token,
      expiresAt: sessionData.expiresAt
    });
  } else {
    // 防止暴力破解，加入延遲
    await new Promise(resolve => setTimeout(resolve, 1000));
    res.status(401).json({ error: 'Invalid password' });
  }
}

// 驗證 token 的函數
function verifyAdminToken(token) {
  if (!token) return false;
  
  const session = adminSessions.get(token);
  if (!session) return false;
  
  if (session.expiresAt < Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  
  return true;
}

// 使用 CommonJS export
module.exports = handler;
module.exports.verifyAdminToken = verifyAdminToken;