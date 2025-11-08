// src/firebase.js (CRA version)
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
import { getStorage, connectStorageEmulator } from "firebase/storage";
// Optional analytics (only on secure origins and when measurementId exists)
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

/*
Create a client .env (or .env.local) at the React app root:

REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
REACT_APP_FIREBASE_MEASUREMENT_ID=           # optional
REACT_APP_USE_EMULATORS=false                # "true" to use local emulators
*/

const {
  REACT_APP_FIREBASE_API_KEY,
  REACT_APP_FIREBASE_AUTH_DOMAIN,
  REACT_APP_FIREBASE_PROJECT_ID,
  REACT_APP_FIREBASE_STORAGE_BUCKET,
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  REACT_APP_FIREBASE_APP_ID,
  REACT_APP_FIREBASE_MEASUREMENT_ID,
  REACT_APP_USE_EMULATORS,
} = process.env;

const firebaseConfig = {
  apiKey: REACT_APP_FIREBASE_API_KEY,
  authDomain: REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: REACT_APP_FIREBASE_APP_ID,
  measurementId: REACT_APP_FIREBASE_MEASUREMENT_ID || undefined,
};

// HMR-safe init
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Core SDKs
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Stay logged in across reloads
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* non-fatal */
});

// Optional analytics
(async () => {
  try {
    if (firebaseConfig.measurementId && (await analyticsSupported())) {
      getAnalytics(app);
    }
  } catch {
    // ignore analytics errors on http / unsupported envs
  }
})();

// Optional: Local emulators for dev
const useEmulators = String(REACT_APP_USE_EMULATORS || "").toLowerCase() === "true";
if (useEmulators) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
  } catch {
    /* ignore if already connected */
  }
}

/**
 * Add an achievement for a user.
 * Uses Firestore server time if date not provided.
 */
export const addAchievement = async (userId, achievement) => {
  const payload = {
    title: achievement.title || "Achievement",
    description: achievement.description || "",
    dateEarned: achievement.dateEarned || serverTimestamp(),
    icon: achievement.icon || null,
    points: typeof achievement.points === "number" ? achievement.points : null,
  };
  const ref = await addDoc(collection(db, "users", userId, "achievements"), payload);
  return ref;
};
