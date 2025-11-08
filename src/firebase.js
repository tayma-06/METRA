// src/firebase.js
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
// Optional analytics (only in secure origins and when measurementId exists)
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

/**
 * Environment-driven config (create .env.local)
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *   VITE_FIREBASE_MEASUREMENT_ID=...   (optional)
 *   VITE_USE_EMULATORS=true            (optional for local dev)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

// HMR-safe app init
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Core SDKs
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth persistence (stay logged in across reloads)
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* non-fatal; falls back to default */
});

// Optional: Analytics (only if supported + measurementId present)
(async () => {
  try {
    if (firebaseConfig.measurementId && (await analyticsSupported())) {
      getAnalytics(app);
    }
  } catch {
    // Ignore analytics errors in unsupported environments (e.g., http, SSR)
  }
})();

// Optional: Local emulators for dev
if (import.meta.env.VITE_USE_EMULATORS === "true") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    // console.info("Connected to Firebase emulators.");
  } catch {
    /* ignore if already connected */
  }
}

/**
 * Add an achievement for a user.
 * If no date provided, uses Firestore server time (preferred over client clock).
 */
export const addAchievement = async (userId, achievement) => {
  const payload = {
    title: achievement.title || "Achievement",
    description: achievement.description || "",
    // Prefer server time if not provided
    dateEarned: achievement.dateEarned || serverTimestamp(),
    icon: achievement.icon || null,
    points: typeof achievement.points === "number" ? achievement.points : null,
  };
  const ref = await addDoc(collection(db, "users", userId, "achievements"), payload);
  return ref;
};

// If you still need Timestamp in some components, you can import from firestore directly:
// import { Timestamp } from "firebase/firestore";
