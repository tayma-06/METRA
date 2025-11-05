import { initializeApp } from "firebase/app";
// 1. We need to import getAuth
import { getAuth } from "firebase/auth";

// This is your config object. Perfect!
const firebaseConfig = {
    apiKey: "AIzaSyDODUa-r44xdunMa-37ahfePERTbD8rVlk",
    authDomain: "metra-app.firebaseapp.com",
    projectId: "metra-app",
    storageBucket: "metra-app.firebasestorage.app",
    messagingSenderId: "654469394667",
    appId: "1:654469394667:web:86ad0c2bb34a21fcfa8eae",
    measurementId: "G-SDEKLLJX12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize auth AND EXPORT IT so other files can use it
export const auth = getAuth(app);