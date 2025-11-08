// server.js - Main entry point
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin
const admin = require('firebase-admin');
let db, FieldValue;

try {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc || svc === 'placeholder') throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  const serviceAccount = JSON.parse(svc);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  db = admin.firestore();
  FieldValue = admin.firestore.FieldValue;
  console.log('✅ Firebase Admin initialized');
} catch (err) {
  console.error('❌ Firebase Admin init failed:', err.message);
  db = null;
  FieldValue = {
    serverTimestamp: () => new Date(),
    arrayUnion: (...x) => x,
    arrayRemove: (...x) => x,
    delete: () => null,
  };
}

// Create app and middleware
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

// NEW: Import the personalized and notices routes
const registerPersonalized = require('./routes/personalized');
const buildNoticesRouter = require('./routes/notices');

// Use routes
app.use('/api', aiRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', hubRoutes);
app.use('/api', materialsRoutes);
app.use('/api', studyGroupsRoutes);
app.use('/api', dashboardRoutes);

// NEW: Register personalized routes and notices router
registerPersonalized(app, { 
  db, 
  FieldValue, 
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  fetch 
});

app.use('/api', buildNoticesRouter({ db }));

// Health check
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'METRA backend',
    firestore: !!db,
    gemini: !!process.env.GEMINI_API_KEY,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 METRA backend listening at http://localhost:${PORT}`);
  console.log(`🗄️  Firestore: ${db ? 'READY ✅' : 'NOT CONFIGURED ❌'}`);
  console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'READY ✅' : 'MOCK MODE ❕'}`);
});