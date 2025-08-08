const admin = require('./utils/firebase-admin');

export default async function handler(req, res) {
  const { method } = req;
  const { path, data } = req.body;

  try {
    const db = admin.database();
    const ref = db.ref(path);

    switch (method) {
      case 'GET':
        const snapshot = await ref.once('value');
        res.status(200).json(snapshot.val());
        break;
        
      case 'POST':
      case 'PUT':
        await ref.set(data);
        res.status(200).json({ success: true });
        break;
        
      case 'PATCH':
        await ref.update(data);
        res.status(200).json({ success: true });
        break;
        
      case 'DELETE':
        await ref.remove();
        res.status(200).json({ success: true });
        break;
        
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Firebase proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}