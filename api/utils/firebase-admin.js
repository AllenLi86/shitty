const admin = require('firebase-admin');

console.log('🔥 Starting Firebase Admin initialization...');

if (!admin.apps.length) {
  try {
    // 檢查必需的環境變數
    const requiredVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_PRIVATE_KEY', 
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_DATABASE_URL'
    ];
    
    console.log('🔥 Checking environment variables...');
    
    const missingVars = requiredVars.filter(varName => {
      const exists = !!process.env[varName];
      console.log(`🔥 ${varName}: ${exists ? 'EXISTS' : 'MISSING'}`);
      return !exists;
    });
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    console.log('🔥 All environment variables present');

    // 處理 private key
    let privateKey;
    try {
      privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      console.log('🔥 Private key processed, length:', privateKey.length);
      console.log('🔥 Private key starts with:', privateKey.substring(0, 50));
    } catch (keyError) {
      console.error('🔥 Private key processing failed:', keyError);
      throw new Error('Failed to process private key: ' + keyError.message);
    }

    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    console.log('🔥 Service account config prepared for project:', serviceAccount.project_id);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    console.log('🔥 Firebase Admin initialized successfully!');
  } catch (error) {
    console.error('🔥 Firebase Admin initialization FAILED:', error);
    throw error;
  }
} else {
  console.log('🔥 Firebase Admin already initialized');
}

module.exports = admin;