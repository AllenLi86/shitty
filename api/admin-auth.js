// 簡單的 session 儲存
const adminSessions = new Map();

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  const correctPassword = process.env.ADMIN_PASSWORD;

  console.log('🔒 Admin auth attempt:', {
    hasPassword: !!password,
    hasEnvPassword: !!correctPassword,
    passwordLength: password?.length
  });

  if (!correctPassword) {
    console.log('🔒 Admin password not configured in environment');
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
    
    console.log('🔒 Admin login successful:', {
      token: token.substring(0, 10) + '...',
      expiresAt: sessionData.expiresAt,
      sessionCount: adminSessions.size
    });
    
    // 清理過期的 sessions
    for (const [key, session] of adminSessions.entries()) {
      if (session.expiresAt < Date.now()) {
        adminSessions.delete(key);
        console.log('🔒 Removed expired session:', key.substring(0, 10) + '...');
      }
    }

    res.status(200).json({ 
      success: true, 
      token,
      expiresAt: sessionData.expiresAt
    });
  } else {
    console.log('🔒 Admin login failed: incorrect password');
    // 防止暴力破解，加入延遲
    await new Promise(resolve => setTimeout(resolve, 1000));
    res.status(401).json({ error: 'Invalid password' });
  }
}

// 驗證 token 的函數
function verifyAdminToken(token) {
  console.log('🔒 Verifying token:', {
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 10) + '...' : 'none',
    sessionCount: adminSessions.size
  });
  
  if (!token) {
    console.log('🔒 Token verification failed: no token provided');
    return false;
  }
  
  const session = adminSessions.get(token);
  if (!session) {
    console.log('🔒 Token verification failed: session not found');
    console.log('🔒 Available sessions:', Array.from(adminSessions.keys()).map(k => k.substring(0, 10) + '...'));
    return false;
  }
  
  if (session.expiresAt < Date.now()) {
    console.log('🔒 Token verification failed: session expired');
    adminSessions.delete(token);
    return false;
  }
  
  console.log('🔒 Token verification successful');
  return true;
}

// 使用 CommonJS export
module.exports = handler;
module.exports.verifyAdminToken = verifyAdminToken;