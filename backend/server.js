// server.js - Updated with better error handling
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
const admin = require('firebase-admin');

let db, FieldValue;

try {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountJson || serviceAccountJson === 'placeholder') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing or not configured');
  }
  
  // Parse the service account JSON
  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Fix the private key format
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  
  console.log('Initializing Firebase Admin with project:', serviceAccount.project_id);
  
  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  db = admin.firestore();
  FieldValue = admin.firestore.FieldValue;
  
  // Test the connection
  db.listCollections().then(() => {
    console.log('✅ Firebase Admin initialized successfully');
  }).catch(err => {
    console.error('❌ Firebase Firestore connection test failed:', err.message);
  });
  
} catch (err) {
  console.error('❌ Firebase Admin initialization failed:', err.message);
  console.log('⚠️  Running in mock mode - some features will be limited');
  
  // Fallback mock implementations
  db = {
    collection: (name) => ({
      doc: (id) => ({
        set: (data) => {
          console.log(`[MOCK] Setting doc ${name}/${id}:`, data);
          return Promise.resolve();
        },
        get: () => Promise.resolve({ exists: false, data: () => null }),
        update: (data) => {
          console.log(`[MOCK] Updating doc ${name}/${id}:`, data);
          return Promise.resolve();
        },
        delete: () => {
          console.log(`[MOCK] Deleting doc ${name}/${id}`);
          return Promise.resolve();
        },
        collection: (subName) => ({
          add: (data) => {
            console.log(`[MOCK] Adding to ${name}/${id}/${subName}:`, data);
            return Promise.resolve({ id: 'mock-id' });
          }
        })
      }),
      where: () => ({
        get: () => Promise.resolve({ docs: [] }),
        limit: () => ({
          get: () => Promise.resolve({ docs: [] })
        })
      }),
      get: () => Promise.resolve({ docs: [] }),
      add: (data) => {
        console.log(`[MOCK] Adding to collection ${name}:`, data);
        return Promise.resolve({ id: 'mock-id' });
      }
    })
  };
  
  FieldValue = {
    serverTimestamp: () => new Date(),
    arrayUnion: (...elements) => elements,
    arrayRemove: (...elements) => elements,
    delete: () => 'DELETE_FIELD',
    increment: (n) => n
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));

const PORT = process.env.PORT || 8000;

// Make db and FieldValue available to routes
app.locals.db = db;
app.locals.FieldValue = FieldValue;
app.locals.admin = admin;

// Import route modules
const aiRoutes = require('./routes/ai');
const reviewsRoutes = require('./routes/reviews');
const hubRoutes = require('./routes/hub');
const materialsRoutes = require('./routes/materials');
const studyGroupsRoutes = require('./routes/study-groups');
const dashboardRoutes = require('./routes/dashboard');

// Import the personalized and notices routes
const registerPersonalized = require('./routes/personalized');
const buildNoticesRouter = require('./routes/notices');

// Use routes
app.use('/api', aiRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', hubRoutes);
app.use('/api', materialsRoutes);
app.use('/api', studyGroupsRoutes);
app.use('/api', dashboardRoutes);

// Register personalized routes and notices router
registerPersonalized(app, { 
  db, 
  FieldValue, 
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  fetch 
});

app.use('/api', buildNoticesRouter({ db }));

// Health check with detailed status
app.get('/', async (_req, res) => {
  let firestoreStatus = 'DISCONNECTED';
  
  if (db && db.listCollections) {
    try {
      await db.listCollections();
      firestoreStatus = 'CONNECTED';
    } catch (err) {
      firestoreStatus = 'ERROR: ' + err.message;
    }
  }
  
  res.json({
    ok: true,
    service: 'METRA backend',
    timestamp: new Date().toISOString(),
    firestore: firestoreStatus,
    gemini: !!process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 METRA backend listening at http://localhost:${PORT}`);
  console.log(`🗄️  Firestore: ${db && db.listCollections ? 'INITIALIZED' : 'MOCK MODE'}`);
  console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});