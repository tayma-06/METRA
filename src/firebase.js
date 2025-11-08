// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDODUa-r44xdunMa-37ahfePERTbD8rVlk",
  authDomain: "metra-app.firebaseapp.com",
  projectId: "metra-app",
  storageBucket: "metra-app.appspot.com",
  messagingSenderId: "654469394667",
  appId: "1:654469394667:web:86ad0c2bb34a21fcfa8eae",
  measurementId: "G-SDEKLLJX12"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize and export Auth
export const auth = getAuth(app);

// Initialize and export Firestore
export const db = getFirestore(app);

// Initialize and export Storage (for files, images, voice messages)
export const storage = getStorage(app);

// ----------------------
// Add achievement function
// ----------------------
export const addAchievement = async (userId, achievement) => {
  try {
    const docRef = await addDoc(collection(db, "users", userId, "achievements"), {
      ...achievement,
      dateEarned: achievement.dateEarned || Timestamp.now()
    });
    return docRef;
  } catch (err) {
    console.error("Failed to add achievement:", err);
    throw err;
  }
};

// Optional: export Timestamp if you need it elsewhere
export { Timestamp };
