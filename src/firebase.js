// src/firebase.js - UPDATED FOR CREATE REACT APP
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  connectFirestoreEmulator,
} from "firebase/firestore";
import {
  getStorage,
  connectStorageEmulator,
} from "firebase/storage";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

// Your Firebase web app configuration - USING process.env for CRA
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDODUa-r44xdunMa-37ahfePERTbD8rVlk",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "metra-app.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "metra-app",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "metra-app.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "654469394667",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:654469394667:web:86ad0c2bb34a21fcfa8eae",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-SDEKLLJX12"
};

// Validate critical configuration
console.log("Firebase Config:", {
  apiKey: firebaseConfig.apiKey ? "✓ Set" : "✗ Missing",
  projectId: firebaseConfig.projectId,
  usingEnv: !!process.env.REACT_APP_FIREBASE_API_KEY
});

// Initialize Firebase
let app;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization failed:", error);
  throw error;
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Set auth persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence failed:", error);
});

// Initialize Analytics
(async () => {
  try {
    if (firebaseConfig.measurementId && (await analyticsSupported())) {
      getAnalytics(app);
      console.log("✅ Analytics initialized");
    }
  } catch (error) {
    console.log("ℹ️  Analytics not available in this environment");
  }
})();

// Emulators for development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === "true") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("✅ Connected to Firebase emulators");
  } catch (error) {
    console.log("ℹ️  Using production Firebase services");
  }
}

// Achievement helper function
export const addAchievement = async (userId, achievement) => {
  try {
    const payload = {
      title: achievement.title || "Achievement",
      description: achievement.description || "",
      dateEarned: achievement.dateEarned || serverTimestamp(),
      icon: achievement.icon || null,
      points: typeof achievement.points === "number" ? achievement.points : null,
    };
    
    const ref = await addDoc(collection(db, "users", userId, "achievements"), payload);
    return ref;
  } catch (error) {
    console.error("Error adding achievement:", error);
    throw error;
  }
};

export default app;