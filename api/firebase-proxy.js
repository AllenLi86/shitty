const { verifyAdminToken } = require('./admin-auth');

export default async function handler(req, res) {
  console.log('🔥 API Request received:', {
    method: req.method,
    body: req.body?.method,
    path: req.body?.path
  });

  try {
    const admin = require('./utils/firebase-admin');
    const { method, path, data } = req.body;

    // 🔒 權限檢查：只有寫入操作需要管理員權限
    // 🔥 重要：讀取 questions 不需要權限，遊戲需要讀取題目！
    const isWriteOperation = ['PUT', 'PATCH', 'DELETE'].includes(method);
    const isQuestionsWrite = path === 'questions' && isWriteOperation;
    
    if (isQuestionsWrite) {
      const adminToken = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
      
      console.log('🔒 Questions write operation, checking admin token:', {
        hasToken: !!adminToken,
        tokenPrefix: adminToken ? adminToken.substring(0, 10) + '...' : 'none'
      });
      
      // 🔥 現在是 async 調用
      const isValidToken = await verifyAdminToken(adminToken);
      console.log('🔒 Token validation result:', isValidToken);
      
      if (!isValidToken) {
        console.log('🔒 Admin access denied - invalid token');
        return res.status(403).json({ 
          error: 'Admin access required',
          message: 'This operation requires valid admin authentication'
        });
      }
      
      console.log('🔒 Admin access granted');
    }

    const db = admin.database();
    const ref = db.ref(path);

    switch (method) {
      case 'GET':
        const snapshot = await ref.once('value');
        const result = snapshot.val();
        return res.status(200).json(result);
        
      case 'PUT':
        await ref.set(data);
        return res.status(200).json({ success: true });
        
      case 'PATCH':
        await ref.update(data);
        return res.status(200).json({ success: true });
        
      case 'DELETE':
        await ref.remove();
        return res.status(200).json({ success: true });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('🔥 Firebase proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
}