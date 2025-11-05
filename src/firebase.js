// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);