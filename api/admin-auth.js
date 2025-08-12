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
    try {
      // 生成安全的 token
      const token = require('crypto').randomBytes(32).toString('hex');
      const sessionData = {
        token,
        createdAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24小時過期
      };
      
      // 🔥 儲存到 Firebase 而不是記憶體
      const admin = require('./utils/firebase-admin');
      const db = admin.database();
      const sessionsRef = db.ref('admin_sessions');
      
      // 清理過期的 sessions
      const snapshot = await sessionsRef.once('value');
      const allSessions = snapshot.val() || {};
      const now = Date.now();
      
      for (const [sessionToken, session] of Object.entries(allSessions)) {
        if (session.expiresAt < now) {
          await sessionsRef.child(sessionToken).remove();
          console.log('🔒 Removed expired session:', sessionToken.substring(0, 10) + '...');
        }
      }
      
      // 儲存新的 session
      await sessionsRef.child(token).set(sessionData);
      
      console.log('🔒 Admin login successful:', {
        token: token.substring(0, 10) + '...',
        expiresAt: sessionData.expiresAt
      });

      res.status(200).json({ 
        success: true, 
        token,
        expiresAt: sessionData.expiresAt
      });
    } catch (error) {
      console.error('🔒 Error saving session to Firebase:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  } else {
    console.log('🔒 Admin login failed: incorrect password');
    // 防止暴力破解，加入延遲
    await new Promise(resolve => setTimeout(resolve, 1000));
    res.status(401).json({ error: 'Invalid password' });
  }
}

// 🔥 修改為 async 函數，從 Firebase 驗證 token
async function verifyAdminToken(token) {
  console.log('🔒 Verifying token:', {
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
  });
  
  if (!token) {
    console.log('🔒 Token verification failed: no token provided');
    return false;
  }
  
  try {
    // 🔥 從 Firebase 讀取 session
    const admin = require('./utils/firebase-admin');
    const db = admin.database();
    const sessionRef = db.ref(`admin_sessions/${token}`);
    const snapshot = await sessionRef.once('value');
    const session = snapshot.val();
    
    if (!session) {
      console.log('🔒 Token verification failed: session not found in Firebase');
      return false;
    }
    
    if (session.expiresAt < Date.now()) {
      console.log('🔒 Token verification failed: session expired');
      // 清理過期的 session
      await sessionRef.remove();
      return false;
    }
    
    console.log('🔒 Token verification successful');
    return true;
  } catch (error) {
    console.error('🔒 Error verifying token in Firebase:', error);
    return false;
  }
}

// 使用 CommonJS export
module.exports = handler;
module.exports.verifyAdminToken = verifyAdminToken;