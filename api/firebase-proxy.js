export default async function handler(req, res) {
  console.log('🔥 API Request received:', {
    method: req.method,
    body: req.body,
    headers: req.headers
  });

  // 檢查環境變數
  console.log('🔥 Environment check:', {
    has_project_id: !!process.env.FIREBASE_PROJECT_ID,
    has_private_key: !!process.env.FIREBASE_PRIVATE_KEY,
    has_client_email: !!process.env.FIREBASE_CLIENT_EMAIL,
    has_database_url: !!process.env.FIREBASE_DATABASE_URL,
    project_id: process.env.FIREBASE_PROJECT_ID,
    database_url: process.env.FIREBASE_DATABASE_URL
  });

  try {
    // 嘗試初始化 Firebase Admin
    const admin = require('./utils/firebase-admin');
    console.log('🔥 Firebase admin loaded successfully');

    const { method, path, data } = req.body;
    console.log('🔥 Firebase operation:', { method, path });

    const db = admin.database();
    console.log('🔥 Database reference created');

    const ref = db.ref(path);
    console.log('🔥 Database ref for path:', path);

    switch (method) {
      case 'GET':
        console.log('🔥 Attempting GET operation...');
        const snapshot = await ref.once('value');
        const result = snapshot.val();
        console.log('🔥 GET result:', result ? 'data found' : 'no data');
        return res.status(200).json(result);
        
      case 'PUT':
        console.log('🔥 Attempting PUT operation...');
        await ref.set(data);
        console.log('🔥 PUT successful');
        return res.status(200).json({ success: true });
        
      default:
        console.log('🔥 Method not allowed:', method);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('🔥 Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    return res.status(500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN',
      details: error.stack
    });
  }
}